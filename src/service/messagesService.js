import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { createPendingMessageActivity } from './activityService.js';

export const enqueueMessage = async ({
  id,
  prospect_id,
  payload = {},
  created_by
}) => {

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT
          t.id AS template_id,
          t.channel,
          t.subject,
          t.body,
          t.variables,

          p.id AS prospect_id,
          p.first_name,
          p.last_name,
          p.company_name,
          p.email,
          p.phone,
          p.city,
          p.country

      FROM md_message_templates t
      INNER JOIN md_prospects p
          ON p.id = ?

      WHERE t.id = ?
      `,
      [prospect_id, id]
    );

    if (!rows.length) {
      throw CreateError(
        404,
        'Template or Prospect not found'
      );
    }

    const data = rows[0];

    const matches =
      data.body?.match(/{{(.*?)}}/g) || [];

    const requiredVars = [
      ...new Set(
        matches.map(variable =>
          variable
            .replace(/[{}]/g, '')
            .trim()
        )
      )
    ];

    const prospectData = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      city: data.city,
      country: data.country,
      company_name: data.company_name
    };

    const finalPayload = {
      ...prospectData,
      ...payload
    };

    for (const variable of requiredVars) {
      if (
        finalPayload[variable] === undefined ||
        finalPayload[variable] === null
      ) {
        throw CreateError(
          400,
          `Missing variable: ${variable}`
        );
      }
    }

    let toAddress = null;

    if (data.channel === 'EMAIL') {
      toAddress = data.email;
    } else if (
      data.channel === 'SMS' ||
      data.channel === 'WHATSAPP'
    ) {
      toAddress = data.phone;
    } else {
      throw CreateError(400, 'Invalid channel');
    }

    if (!toAddress) {
      throw CreateError(
        400,
        'Recipient address not found'
      );
    }

    const [result] = await connection.query(
      `
      INSERT INTO td_messages_queue
      (
          prospect_id,
          channel,
          template_id,
          to_address,
          payload,
          created_by
      )
      VALUES
      (?, ?, ?, ?, ?, ?)
      `,
      [
        data.prospect_id,
        data.channel,
        data.template_id,
        toAddress,
        JSON.stringify(finalPayload),
        created_by
      ]
    );
    await connection.query(`
      INSERT INTO td_activity
      (
        prospect_id,
        activity_type_id,
        message_queue_id
      )
      VALUES (?, ?, ?)
    `, [
      data.prospect_id,
      data.channel === 'EMAIL' ? 1 :
      data.channel === 'SMS' ? 2 : 3,
      result.insertId
    ]);
    
    await connection.commit();

    return {
      queueId: result.insertId,
      message: 'Message queued successfully'
    };

  } catch (err) {

    await connection.rollback();
    throw err;

  } finally {

    connection.release();

  }
};
/* 
{
  "template_id": 2,
  "prospect_id": 101,
  "userId": 10,
  "payload": {
    "meeting_date": "2026-05-02",
    "meeting_link": "https://meet.google.com/abc"
  }
}
*/
export const enqueueBulkMessages = async ({
  id,
  created_by,
  messages
}) => {

  const connection =
    await db.getConnection();

  try {

    await connection.beginTransaction();

    const [templates] =
      await connection.query(
        `
        SELECT
          id,
          channel,
          subject,
          body,
          variables
        FROM md_message_templates
        WHERE id = ?
        `,
        [id]
      );

    if (!templates.length) {
      throw CreateError(
        404,
        'Template not found'
      );
    }

    const template = templates[0];

    let requiredVars = [];

    try {

      requiredVars =
        Array.isArray(template.variables)
          ? template.variables
          : JSON.parse(
            template.variables || '[]'
          );

    } catch {

      const matches =
        template.body?.match(
          /{{(.*?)}}/g
        ) || [];

      requiredVars = [
        ...new Set(
          matches.map(variable =>
            variable
              .replace(/[{}]/g, '')
              .trim()
          )
        )
      ];
    }

    const queueIds = [];

    for (const item of messages) {

      const prospectId =
        item.prospectId ||
        item.prospect_id;

      const [prospects] =
        await connection.query(
          `
          SELECT
            id,
            first_name,
            last_name,
            company_name,
            email,
            phone,
            city,
            country
          FROM md_prospects
          WHERE id = ?
          `,
          [prospectId]
        );

      if (!prospects.length) {
        throw CreateError(
          404,
          `Prospect not found: ${prospectId}`
        );
      }

      const prospect =
        prospects[0];

      const prospectData = {
        first_name:
          prospect.first_name,
        last_name:
          prospect.last_name,
        email:
          prospect.email,
        phone:
          prospect.phone,
        city:
          prospect.city,
        country:
          prospect.country,
        company_name:
          prospect.company_name
      };

      const finalPayload = {
        ...prospectData,
        ...(item.payload || {})
      };

      for (const variable of requiredVars) {

        if (
          finalPayload[variable] === undefined || finalPayload[variable] === null) {
          throw CreateError(
            400,
            `Missing variable: ${variable} for prospect ${prospect.id}`
          );
        }
      }

      let toAddress = null;

      if (template.channel === 'EMAIL') {
        toAddress = prospect.email;
      } else if (template.channel === 'SMS' ||template.channel === 'WHATSAPP'){
        toAddress = prospect.phone;
      } else {
        throw CreateError(
          400,
          `Unsupported channel: ${template.channel}`
        );
      }

      if (!toAddress) {
        throw CreateError(
          400,
          `Recipient address not found for prospect ${prospect.id}`
        );
      }

      const [result] = await connection.query(
          `INSERT INTO td_messages_queue
          (
            prospect_id,
            channel,
            template_id,
            to_address,
            payload,
            created_by
          )
          VALUES
          (?, ?, ?, ?, ?, ?)
          `,
          [
            prospect.id,
            template.channel,
            template.id,
            toAddress,
            JSON.stringify(
              finalPayload
            ),
            created_by
          ]
        );

      queueIds.push(
        result.insertId
      );
    }

    await db.query(`INSERT INTO td_activity(
    prospect_id,
    activity_type_id,
    message_queue_id
  )
  VALUES (?, ?, ?)
  `, [
      data.prospect_id,
      data.channel === 'EMAIL' ? 1 :
        data.channel === 'SMS' ? 2 : 3,
      result.insertId
    ]);
    await connection.commit();

    return {
      totalMessages:
        queueIds.length,
      queueIds,
      message:
        'Bulk messages queued successfully'
    };

  } catch (err) {

    await connection.rollback();
    throw err;

  } finally {

    connection.release();

  }
};

export const queue = async ({ status, channel, prospect_id, limit, lastId }) => {
  let query = `
    SELECT
        id,
        channel,
        prospect_id,
        to_address,
        status,
        retry_count,
        locked_at,
        error_message,
        worker_id,
        created_at,
        updated_at
    FROM td_message_queue
    WHERE 1 = 1
    `;

  const values = [];
  if (status?.length) {
    query += `
          AND status IN (${status.map(() => '?').join(',')})
      `;
    values.push(...status);
  }

  if (channel?.length) {
    query += `
          AND channel IN (${channel.map(() => '?').join(',')})
      `;
    values.push(...channel);
  }

  if (prospect_id?.length) {
    query += `
          AND prospect_id IN (${prospect_id.map(() => '?').join(',')})
      `;
    values.push(...prospect_id);
  }

  if (lastId > 0) {
    query += ` AND id > ?`;
    values.push(lastId);
  }
  query += `ORDER BY id ASC LIMIT ? `;
  values.push(limit);
  console.log(query);
  console.log(value);
  const [rows] = await db.query(query, values);
  return { rows, nextLastId: rows.length ? rows[rows.length - 1].id : null };
};

// postTemplates - create template
export const postTemplates = async ({
  template_code,
  channel,
  language_id,
  subject,
  body
}) => {
  try {

    const [existing] = await db.query(
      `
            SELECT id
            FROM md_message_templates
            WHERE template_code = ?
              AND language_id = ?
              AND channel = ?
            LIMIT 1
            `,
      [
        template_code,
        language_id,
        channel
      ]
    );

    if (existing.length) {
      throw CreateError(
        409,
        'Template with same code, language and channel already exists'
      );
    }

    const matches =
      body.match(/{{(.*?)}}/g) || [];

    const variables = [
      ...new Set(
        matches.map(variable =>
          variable
            .replace(/[{}]/g, '')
            .trim()
        )
      )
    ];

    const [result] = await db.query(
      `
            INSERT INTO md_message_templates
            (
                template_code,
                language_id,
                channel,
                subject,
                body,
                variables
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
      [
        template_code,
        language_id,
        channel,
        subject,
        body,
        JSON.stringify(variables)
      ]
    );

    return result;

  } catch (err) {
    throw err;
  }
};

export const updateTemplates = async ({ id, data }) => {
  try {
    const [rows] = await db.query(
      `SELECT id FROM md_message_templates WHERE id = ?`,
      [id]
    );

    if (!rows.length) {
      throw CreateError(404, 'Template not found');
    }

    const updates = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (data.body !== undefined) {
      const matches = data.body.match(/{{(.*?)}}/g) || [];

      const variables = [
        ...new Set(
          matches.map(v => v.replace(/[{}]/g, '').trim())
        )
      ];

      updates.push('variables = ?');
      values.push(JSON.stringify(variables));
    }

    if (!updates.length) {
      throw CreateError(400, 'No fields provided for update');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    await db.query(
      `
      UPDATE md_message_templates
      SET ${updates.join(', ')}
      WHERE id = ?
      `,
      [...values, id]
    );

    return {
      success: true,
      message: 'Template updated successfully'
    };
  } catch (err) {
    throw err;
  }
};
/* 
API for update template:
id is passed as path params( id ->> Primary key of template table)
{
  "subject": "Updated Order Confirmation",
  "body": "Hello {{name}}, your order {{order_id}} confirmed."
}
  */

export const getTemplates = async ({
  template_code,
  channel,
  language_id,
  limit,
  lastId
}) => {
  try {
    let query = `
            SELECT *
            FROM md_message_templates
            WHERE 1 = 1
        `;

    const values = [];

    if (template_code) {
      query += ` AND template_code = ?`;
      values.push(template_code);
    }

    if (channel?.length) {
      query += ` AND channel IN (${channel.map(() => '?').join(',')})`;
      values.push(...channel);
    }

    if (language_id) {
      query += ` AND language_id = ?`;
      values.push(language_id);
    }

    if (lastId > 0) {
      query += ` AND id > ?`;
      values.push(lastId);
    }

    query += `
            ORDER BY id ASC
            LIMIT ?
        `;

    values.push(limit);

    const [rows] = await db.query(query, values);

    return {
      templates: rows,
      nextLastId: rows.length
        ? rows[rows.length - 1].id
        : null
    };

  } catch (err) {
    throw err;
  }
};
