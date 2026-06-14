import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { createPendingMessageActivity } from './activityService.js';

// const ALLOWED_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'];

// const normalizeChannel = (channel) => {
//   const normalized = String(channel || '').trim().toUpperCase();

//   if (!ALLOWED_CHANNELS.includes(normalized)) {
//     throw CreateError(400, 'channel must be EMAIL, SMS, or WHATSAPP');
//   }

//   return normalized;
// };

// const getChannelRow = async (channel, executor) => {
//   const channelName = normalizeChannel(channel);
//   const [[channelRow]] = await executor.query(
//     'SELECT id, channel_name FROM md_message_channel_enum WHERE channel_name = ? LIMIT 1',
//     [channelName]
//   );

//   if (!channelRow) {
//     throw CreateError(500, `Message channel "${channelName}" not found`);
//   }

//   return channelRow;
// };

// const getProspectRecipient = async (prospectId, channelName, executor) => {
//   const [rows] = await executor.query(
//     'SELECT id, email, phone FROM md_prospects WHERE id = ? LIMIT 1',
//     [prospectId]
//   );

//   if (rows.length === 0) {
//     throw CreateError(404, 'Prospect not found');
//   }

//   const prospect = rows[0];
//   const toAddress = channelName === 'EMAIL' ? prospect.email : prospect.phone;

//   if (!toAddress) {
//     throw CreateError(400, 'Recipient address not found');
//   }

//   return {
//     prospectId: prospect.id,
//     toAddress
//   };
// };

// const enqueueRenderedMessage = async ({
//   channelId,
//   channelName,
//   prospectId,
//   toAddress,
//   subject,
//   body,
//   connection
// }) => {
//   const [[callRows]] = await connection.query(
//     `CALL sp_enqueue_message(?, ?, ?, ?, ?)`,
//     [
//       channelId,
//       prospectId,
//       toAddress,
//       subject,
//       body
//     ]
//   );
//   const queueId = callRows[0].queue_id;
//   const activity = await createPendingMessageActivity({
//     prospectId,
//     channelName,
//     messageQueueId: queueId
//   }, connection);

//   return {
//     queue_id: queueId,
//     activity_id: activity.t_id,
//     message: 'Message queued successfully'
//   };
// };

export const enqueueBulkMessages = async ({
  template_id,
  created_by,
  messages
}) => {

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [templates] = await connection.query(
      `
            SELECT *
            FROM md_message_templates
            WHERE id = ?
            `,
      [template_id]
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
      requiredVars = Array.isArray(template.variables)
        ? template.variables
        : JSON.parse(
          template.variables || '[]'
        );
    } catch {
      const matches =
        (template.body || '')
          .match(/{{(.*?)}}/g) || [];

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

      const [prospects] =
        await connection.query(
          `
                    SELECT
                        id,
                        first_name,
                        last_name,
                        company_name,
                        email,
                        phone
                    FROM td_prospects
                    WHERE id = ?
                      AND isActive = TRUE
                    `,
          [item.prospectId || item.prospect_id]
        );

      if (!prospects.length) {
        throw CreateError(
          404,
          `Prospect not found: ${item.prospectId ||
          item.prospect_id
          }`
        );
      }

      const prospect = prospects[0];

      const prospectData = {
        name:
          `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim(),
        company_name:
          prospect.company_name,
        email: prospect.email,
        phone: prospect.phone
      };

      const finalPayload = {
        ...prospectData,
        ...(item.payload || {})
      };

      for (const variable of requiredVars) {
        if (!(variable in finalPayload)) {
          throw CreateError(
            400,
            `Missing variable: ${variable} for prospect ${prospect.id}`
          );
        }
      }

      let toAddress = null;

      if (template.channel === 'EMAIL') {
        toAddress = prospect.email;
      }

      if (
        template.channel === 'SMS' ||
        template.channel === 'WHATSAPP'
      ) {
        toAddress = prospect.phone;
      }

      if (!toAddress) {
        throw CreateError(
          400,
          `Recipient address not found for prospect ${prospect.id}`
        );
      }

      const [result] =
        await connection.query(
          `
                    INSERT INTO td_messages_queue
                    (
                        prospect_id,
                        channel,
                        template_id,
                        to_address,
                        payload,
                        status,
                        created_by
                    )
                    VALUES
                    (?, ?, ?, ?, ?, 'PENDING', ?)
                    `,
          [
            prospect.id,
            template.channel,
            template.id,
            toAddress,
            JSON.stringify(finalPayload),
            created_by
          ]
        );

      queueIds.push(result.insertId);
    }

    await connection.commit();

    return {
      totalMessages: queueIds.length,
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

export const enqueueMessage = async ({
  template_id,
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
                CONCAT(
                    COALESCE(p.first_name, ''),
                    ' ',
                    COALESCE(p.last_name, '')
                ) AS contact_name,
                p.company_name,
                p.email,
                p.phone

            FROM md_message_templates t
            INNER JOIN td_prospects p
                ON p.id = ?

            WHERE t.id = ?
              AND p.isActive = TRUE
            `,
      [prospect_id, template_id]
    );

    if (!rows.length) {
      throw CreateError(
        404,
        'Template or Prospect not found'
      );
    }

    const data = rows[0];

    const matches =
      data.body.match(/{{(.*?)}}/g) || [];

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
      name: data.contact_name,
      company_name: data.company_name,
      email: data.email,
      phone: data.phone
    };

    const finalPayload = {
      ...prospectData,
      ...payload
    };

    for (const variable of requiredVars) {
      if (!(variable in finalPayload)) {
        throw CreateError(
          400,
          `Missing variable: ${variable}`
        );
      }
    }

    let toAddress = null;

    if (data.channel === 'EMAIL') {
      toAddress = data.email;
    }

    if (
      data.channel === 'SMS' ||
      data.channel === 'WHATSAPP'
    ) {
      toAddress = data.phone;
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
      `
            SELECT id
            FROM md_message_templates
            WHERE id = ?
            `,
      [id]
    );

    if (!rows.length) {
      throw CreateError(404, 'Template not found');
    }

    const { subject, body } = data;

    const matches = body?.match(/{{(.*?)}}/g) || [];

    const variables = [
      ...new Set(
        matches.map(variable =>
          variable.replace(/[{}]/g, '').trim()
        )
      )
    ];

    await db.query(
      `
            UPDATE md_message_templates
            SET
                subject = ?,
                body = ?,
                variables = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
      [
        subject || null,
        body,
        JSON.stringify(variables),
        id
      ]
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
