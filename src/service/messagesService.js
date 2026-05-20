import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';

// enqueueBulkMessages - batch queue messages
export const enqueueBulkMessages = async ({ template_id, userId, messages }) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [templates] = await connection.query('SELECT * FROM md_message_templates WHERE id = ?', [template_id]);
    if (templates.length === 0) throw CreateError(404, 'Template not found');
    const template = templates[0];

    let requiredVars = [];
    if (Array.isArray(template.variables)) {
      requiredVars = template.variables;
    } else {
      try {
        requiredVars = JSON.parse(template.variables || '[]');
      } catch (e) {
        const matches = (template.body || '').match(/{{(.*?)}}/g) || [];
        requiredVars = [...new Set(matches.map(v => v.replace(/[{}]/g, '').trim()))];
      }
    }

    const insertedQueueIds = [];

    for (const item of messages) {
      const [prospects] = await connection.query(
        'SELECT id, contact_name, company_name, email, phone FROM md_prospects WHERE id = ?',
        [item.prospect_id]
      );
      if (prospects.length === 0) throw CreateError(404, `Prospect not found: ${item.prospect_id}`);
      const prospect = prospects[0];

      const prospectData = {
        company_name: prospect.company_name,
        contact_name: prospect.contact_name,
        email: prospect.email,
        phone: prospect.phone
      };

      const finalPayload = { ...prospectData, ...(item.payload || {}) };

      for (const variable of requiredVars) {
        if (
          finalPayload[variable] === undefined ||
          finalPayload[variable] === null ||
          finalPayload[variable] === ''
        ) {
          throw CreateError(400, `Missing variable: ${variable} for prospect ${item.prospect_id}`);
        }
      }

      let toAddress = null;
      if (template.channel === 'EMAIL') toAddress = prospect.email;
      else if (template.channel === 'SMS' || template.channel === 'WHATSAPP') toAddress = prospect.phone;

      if (!toAddress) throw CreateError(400, `Recipient not found for prospect ${item.prospect_id}`);

      const [result] = await connection.query(
        `INSERT INTO td_messages_queue (prospect_id, channel, template_id, to_address, payload, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [prospect.id, template.channel, template.id, toAddress, JSON.stringify(finalPayload), userId, 'PENDING']
      );

      insertedQueueIds.push(result.insertId);
    }

    await connection.commit();

    return {
      total_messages: insertedQueueIds.length,
      queue_ids: insertedQueueIds,
      status: 'PENDING'
    };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// enqueueMessage - single message
export const enqueueMessage = async ({ template_id, prospect_id, payload = {}, userId }) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT
        t.id AS template_id,
        t.channel,
        t.body,
        t.variables,
        p.id AS prospect_id,
        p.contact_name,
        p.company_name,
        p.email,
        p.phone
      FROM md_message_templates t
      INNER JOIN md_prospects p ON p.id = ?
      WHERE t.id = ?`,
      [prospect_id, template_id]
    );

    if (rows.length === 0) throw CreateError(404, 'Template or Prospect not found');

    const data = rows[0];

    let requiredVars = [];
    if (Array.isArray(data.variables)) {
      requiredVars = data.variables;
    } else {
      try {
        requiredVars = JSON.parse(data.variables || '[]');
      } catch (e) {
        const matches = (data.body || '').match(/{{(.*?)}}/g) || [];
        requiredVars = [...new Set(matches.map(v => v.replace(/[{}]/g, '').trim()))];
      }
    }

    const prospectData = {
      contact_name: data.contact_name,
      company_name: data.company_name,
      email: data.email,
      phone: data.phone
    };

    const finalPayload = { ...prospectData, ...payload };

    for (const variable of requiredVars) {
      if (
        finalPayload[variable] === undefined ||
        finalPayload[variable] === null ||
        finalPayload[variable] === ''
      ) {
        throw CreateError(400, `Missing variable: ${variable}`);
      }
    }

    let toAddress = null;
    if (data.channel === 'EMAIL') toAddress = data.email;
    else if (data.channel === 'SMS' || data.channel === 'WHATSAPP') toAddress = data.phone;

    if (!toAddress) throw CreateError(400, 'Recipient address not found');

    const [result] = await connection.query(
      `INSERT INTO td_messages_queue (prospect_id, channel, template_id, to_address, payload, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.prospect_id, data.channel, data.template_id, toAddress, JSON.stringify(finalPayload), userId, 'PENDING']
    );

    await connection.commit();

    return {
      queue_id: result.insertId,
      status: 'PENDING',
      message: 'Message queued successfully'
    };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// queue - list queued messages
export const queue = async ({ channel = [], prospect_id = [], limit = 50, offset = 0 } = {}) => {
  let baseQuery = `FROM td_messages_queue WHERE 1=1`;
  const values = [];

  if (channel && channel.length > 0) {
    baseQuery += ` AND channel IN (${channel.map(() => '?').join(',')})`;
    values.push(...channel);
  }

  if (prospect_id && prospect_id.length > 0) {
    baseQuery += ` AND prospect_id IN (${prospect_id.map(() => '?').join(',')})`;
    values.push(...prospect_id);
  }

  const [[countResult]] = await db.query(`SELECT COUNT(*) as total ${baseQuery}`, values);

  const [rows] = await db.query(
    `SELECT
      id,
      channel,
      prospect_id,
      template_id,
      to_address,
      status,
      retry_count,
      scheduled_at,
      sent_at,
      created_at
    ${baseQuery}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return { rows, total: countResult.total };
};

// postTemplates - create template
export const postTemplates = async ({ templateCode, channel, language_id, subject, body }) => {
  const matches = body.match(/{{(.*?)}}/g) || [];
  const variables = [...new Set(matches.map(v => v.replace(/[{}]/g, '').trim()))];

  const [result] = await db.query(
    `INSERT INTO md_message_templates
     (template_code, language_id, channel, subject, body, variables)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [templateCode, language_id, channel, subject, body, JSON.stringify(variables)]
  );

  return result;
};

// updateTemplates - update an existing template
export const updateTemplates = async ({ id, data }) => {
  const { subject, body } = data;
  const matches = (body || '').match(/{{(.*?)}}/g) || [];
  const variables = [...new Set(matches.map(v => v.replace(/[{}]/g, '').trim()))];

  const [result] = await db.query(
    `UPDATE md_message_templates SET subject = ?, body = ?, variables = ? WHERE id = ?`,
    [subject, body, JSON.stringify(variables), id]
  );

  return result;
};
