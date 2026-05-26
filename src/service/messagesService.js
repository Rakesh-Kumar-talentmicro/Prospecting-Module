import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';

const ALLOWED_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'];


export const enqueueBulkMessages = async ({ template_id, userId, messages }) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const insertedQueueIds = [];

    for (const item of messages) {
      if (!item.prospect_id) {
        throw CreateError(400, 'prospect_id is required for each message');
      }
      if (item.payload !== undefined && (typeof item.payload !== 'object' || Array.isArray(item.payload))) {
        throw CreateError(400, 'payload must be JSON object');
      }

      const result = await enqueueMessage({
        template_id,
        prospect_id: item.prospect_id,
        payload: item.payload || {},
        userId,
        connection,
      });

      insertedQueueIds.push(result.queue_id);
    }

    await connection.commit();

    return {
      total_messages: insertedQueueIds.length,
      queue_ids: insertedQueueIds,
      message: 'Bulk messages queued successfully',
    };
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
};


export const enqueueMessage = async ({
  template_id,
  prospect_id,
  payload = {},
  userId,
  connection = null,
}) => {
  try {
    const executor = connection || db;

    
    const [rows] = await executor.query(
      `SELECT
         t.id          AS template_id,
         t.channel,
         t.subject,
         t.body,
         t.variables,
         p.id          AS prospect_id,
         p.first_name,
         p.last_name,
         p.company_name,
         p.email,
         p.phone
       FROM md_message_templates t
       INNER JOIN md_prospects p ON p.id = ?
       WHERE t.id = ?`,
      [prospect_id, template_id]
    );

    if (rows.length === 0) {
      throw CreateError(404, 'Template or Prospect not found');
    }

    const data = rows[0];

    // Parse variables
    let requiredVariables = [];
    if (Array.isArray(data.variables)) {
      requiredVariables = data.variables;
    } else {
      requiredVariables = JSON.parse(data.variables || '[]');
    }

   
    const allField = { ...data, ...payload };

    for (const variable of requiredVariables) {
      if (allField[variable] === undefined || allField[variable] === null || allField[variable] === '') {
        throw CreateError(400, `Missing payload variable: ${variable}`);
      }
    }

 
    let finalSubject = data.subject;
    let finalBody = data.body;
    for (const variable of requiredVariables) {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      finalSubject = finalSubject.replace(regex, allField[variable]);
      finalBody = finalBody.replace(regex, allField[variable]);
    }

  
    const toAddress = data.channel === 'EMAIL' ? data.email : data.phone;
    if (!toAddress) {
      throw CreateError(400, 'Recipient address not found on prospect');
    }

   
    const [insertResult] = await executor.query(
      `INSERT INTO td_messages_queue
         (prospect_id, channel, template_id, to_address, payload, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
      [
        data.prospect_id,
        data.channel,
        template_id,
        toAddress,
        JSON.stringify({ subject: finalSubject, body: finalBody, ...payload }),
        userId,
      ]
    );

    return {
      queue_id: insertResult.insertId,
      message: 'Message queued successfully',
    };
  } catch (err) {
    throw err;
  }
};


export const queue = async ({ channel, prospect_id, limit, offset }) => {
  try {
    
    let baseQuery = `FROM td_messages_queue q WHERE 1=1`;
    let values = [];

    if (channel && channel.length > 0) {
      
      baseQuery += ` AND q.channel IN (${channel.map(() => '?').join(',')})`;
      values.push(...channel);
    }

    if (prospect_id && prospect_id.length > 0) {
      baseQuery += ` AND q.prospect_id IN (${prospect_id.map(() => '?').join(',')})`;
      values.push(...prospect_id);
    }

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const [[countResult]] = await db.query(countQuery, values);

    
    const dataQuery = `
      SELECT
        q.id,
        q.channel,
        q.prospect_id,
        q.template_id,
        q.to_address,
        q.status,
        q.attempt_number,
        q.last_attempt_at,
        q.sent_at,
        q.created_at,
        q.created_by
      ${baseQuery}
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(dataQuery, [...values, limit, offset]);
    return { rows, total: countResult.total };
  } catch (err) {
    throw err;
  }
};


export const postTemplates = async ({ templateCode, channel, language_id, subject, body }) => {
  try {
    
    if (!ALLOWED_CHANNELS.includes(channel)) {
      throw CreateError(400, `Invalid channel. Must be one of: ${ALLOWED_CHANNELS.join(', ')}`);
    }

    const matches = body.match(/{{(.*?)}}/g) || [];
    const variables = [...new Set(matches.map((v) => v.replace(/[{}]/g, '').trim()))];

    const [result] = await db.query(
      `INSERT INTO md_message_templates
         (template_code, language_id, channel, subject, body, variables)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [templateCode, language_id, channel, subject, body, JSON.stringify(variables)]
    );

    return result;
  } catch (err) {
    throw err;
  }
};


export const updateTemplates = async ({ id, data }) => {
  try {
    const { subject, body } = data;
    const [rows] = await db.query('SELECT id FROM md_message_templates WHERE id = ?', [id]);

    if (rows.length === 0) return rows;

    const matches = body.match(/{{(.*?)}}/g) || [];
    const variables = [...new Set(matches.map((v) => v.replace(/[{}]/g, '').trim()))];

    await db.query(
      `UPDATE md_message_templates
       SET subject = ?, body = ?, variables = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [subject || null, body, JSON.stringify(variables), id]
    );

    return { success: true, message: 'Template updated successfully' };
  } catch (err) {
    throw err;
  }
};


export const getTemplates = async ({ templateCode, channel, language_id, limit, offset }) => {
  try {
    // FIX: no JOIN — filter directly on t.channel ENUM string
    let baseQuery = `FROM md_message_templates t WHERE 1=1`;
    let values = [];

    if (templateCode) {
      baseQuery += ` AND t.template_code = ?`;
      values.push(templateCode);
    }

    if (channel && channel.length > 0) {
      baseQuery += ` AND t.channel IN (${channel.map(() => '?').join(',')})`;
      values.push(...channel);
    }

    if (language_id) {
      baseQuery += ` AND t.language_id = ?`;
      values.push(language_id);
    }

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const [[countResult]] = await db.query(countQuery, values);

    const dataQuery = `SELECT t.* ${baseQuery} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await db.query(dataQuery, [...values, limit, offset]);

    return { total: countResult.total, templates: rows };
  } catch (err) {
    throw err;
  }
};