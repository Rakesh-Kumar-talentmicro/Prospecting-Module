import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { createPendingMessageActivity } from './activityService.js';

const ALLOWED_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'];

const normalizeChannel = (channel) => {
  const normalized = String(channel || '').trim().toUpperCase();
  if (!ALLOWED_CHANNELS.includes(normalized)) {
    throw CreateError(400, 'channel must be EMAIL, SMS, or WHATSAPP');
  }
  return normalized;
};

const getChannelRow = async (channel, executor) => {
  const channelName = normalizeChannel(channel);
  const [[channelRow]] = await executor.query(
    'SELECT id, channel_name FROM md_message_channel_enum WHERE channel_name = ? LIMIT 1',
    [channelName]
  );
  if (!channelRow) {
    throw CreateError(500, `Message channel "${channelName}" not found`);
  }
  return channelRow;
};

const getProspectRecipient = async (prospectId, channelName, executor) => {
  const [rows] = await executor.query(
    'SELECT id, email, phone FROM md_prospects WHERE id = ? LIMIT 1',
    [prospectId]
  );
  if (rows.length === 0) {
    throw CreateError(404, 'Prospect not found');
  }
  const prospect = rows[0];
  const toAddress = channelName === 'EMAIL' ? prospect.email : prospect.phone;
  if (!toAddress) {
    throw CreateError(400, 'Recipient address not found');
  }
  return { prospectId: prospect.id, toAddress };
};

const enqueueRenderedMessage = async ({
  channelId,
  channelName,
  prospectId,
  toAddress,
  subject,
  body,
  connection
}) => {
  const [[callRows]] = await connection.query(
    `CALL sp_enqueue_message(?, ?, ?, ?, ?)`,
    [channelId, prospectId, toAddress, subject, body]
  );
  const queueId = callRows[0].queue_id;
  const activity = await createPendingMessageActivity({
    prospectId,
    channelName,
    messageQueueId: queueId
  }, connection);

  return {
    queue_id: queueId,
    activity_id: activity.t_id,
    message: 'Message queued successfully'
  };
};

const renderTemplateText = (text, payload) => {
  if (!text) {
    return '';
  }

  return String(text).replace(/{{(.*?)}}/g, (_, key) => {
    const normalizedKey = String(key || '').trim();
    const value = payload?.[normalizedKey];
    return value === undefined || value === null ? '' : String(value);
  });
};


export const enqueueMessage = async ({ template_id, prospect_id, payload = {}, userId }) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(`
      SELECT
        t.id          AS template_id,
        c.channel_name,
        c.id          AS channel,
        t.subject,
        t.body,
        t.variables,
        p.id          AS prospect_id,
        p.contact_name,
        p.company_name,
        p.email,
        p.phone
      FROM md_message_templates t
      INNER JOIN td_prospects p ON p.id = ?
      WHERE t.id = ?
        AND p.isActive = TRUE
    `, [prospect_id, template_id]);

    if (rows.length === 0) throw CreateError(404, 'Template or Prospect not found');

    const data = rows[0];

    // Extract and validate template variables
    const matches = data.body.match(/{{(.*?)}}/g) || [];
    const requiredVars = [...new Set(matches.map(v => v.replace(/[{}]/g, '').trim()))];

    const prospectData = {
      name:         data.contact_name,
      company_name: data.company_name,
      email:        data.email,
      phone:        data.phone,
    };

    const finalPayload = { ...prospectData, ...payload };

    for (const variable of requiredVars) {
      if (!(variable in finalPayload)) {
        throw CreateError(400, `Missing variable: ${variable}`);
      }
    }

    // Render template variables into subject and body
    let finalSubject = data.subject || '';
    let finalBody    = data.body    || '';
    for (const [key, val] of Object.entries(finalPayload)) {
      const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      finalSubject = finalSubject.replace(re, val);
      finalBody    = finalBody.replace(re, val);
    }

    // Determine recipient using channel_name (string), not channel (numeric FK)
    let toAddress = null;
    if (data.channel_name === 'EMAIL')                                  toAddress = data.email;
    if (data.channel_name === 'SMS' || data.channel_name === 'WHATSAPP') toAddress = data.phone;
    if (!toAddress) throw CreateError(400, 'Recipient address not found');

    const result = await enqueueRenderedMessage({
      channelId:   data.channel,
      channelName: data.channel_name,
      prospectId:  data.prospect_id,
      toAddress,
      subject:     finalSubject,
      body:        finalBody,
      connection,
    });

    await connection.commit();
    return result;

  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// ─── Enqueue bulk messages ────────────────────────────────────────────────────

export const enqueueBulkMessages = async ({ template_id, userId, messages }) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [templates] = await connection.query(
      'SELECT * FROM md_message_templates WHERE id = ?',
      [template_id]
    );
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

    const insertedQueueIds    = [];
    const insertedActivityIds = [];

    for (const item of messages) {
      const [prospects] = await connection.query(`
        SELECT id, contact_name, company_name, email, phone
        FROM td_prospects
        WHERE id = ? AND isActive = TRUE
      `, [item.prospect_id]);

      if (prospects.length === 0) {
        throw CreateError(404, `Prospect not found: ${item.prospect_id}`);
      }

      const prospect = prospects[0];

      const prospectData = {
        name:         prospect.contact_name,
        company_name: prospect.company_name,
        email:        prospect.email,
        phone:        prospect.phone,
      };

      const finalPayload = { ...prospectData, ...(item.payload || {}) };

      for (const variable of requiredVars) {
        if (!(variable in finalPayload)) {
          throw CreateError(400, `Missing variable: ${variable} for prospect ${item.prospect_id}`);
        }
      }

      // Render template variables into subject and body
      let finalSubject = template.subject || '';
      let finalBody    = template.body    || '';
      for (const [key, val] of Object.entries(finalPayload)) {
        const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        finalSubject = finalSubject.replace(re, val);
        finalBody    = finalBody.replace(re, val);
      }

      // Determine recipient using channel string directly (stored as ENUM in templates table)
      let toAddress = null;
      if (template.channel === 'EMAIL')                               toAddress = prospect.email;
      if (template.channel === 'SMS' || template.channel === 'WHATSAPP') toAddress = prospect.phone;
      if (!toAddress) {
        throw CreateError(400, `Recipient not found for prospect ${item.prospect_id}`);
      }

      const [result] = await connection.query(`
        INSERT INTO td_messages_queue (
          prospect_id, channel, template_id,
          to_address, payload, status, created_by
        ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
      `, [
        prospect.id,
        template.channel,
        template.id,
        toAddress,
        JSON.stringify(finalPayload),
        userId,
      ]);

      insertedQueueIds.push(result.insertId);
    }

    await connection.commit();

    return {
      total_messages: insertedQueueIds.length,
      queue_ids:      insertedQueueIds,
      activity_ids:   insertedActivityIds,
      message:        'Bulk messages queued successfully',
    };

  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// ─── Queue listing with filters ───────────────────────────────────────────────

export const queue = async ({ status, channel, prospect_id, limit, offset }) => {
  let baseQuery = `FROM td_messages_queue WHERE 1=1`;
  let values = [];

  if (status && status.length > 0) {
    baseQuery += ` AND status IN (${status.map(() => '?').join(',')})`;
    values.push(...status);
  }

  if (channel && channel.length > 0) {
    baseQuery += ` AND channel IN (${channel.map(() => '?').join(',')})`;
    values.push(...channel);
  }

  if (prospect_id && prospect_id.length > 0) {
    baseQuery += ` AND prospect_id IN (${prospect_id.map(() => '?').join(',')})`;
    values.push(...prospect_id);
  }

  const [[countResult]] = await db.query(`SELECT COUNT(*) as total ${baseQuery}`, values);

  const [rows] = await db.query(`
    SELECT
      id, channel, prospect_id, template_id,
      to_address, status, retry_count,
      scheduled_at, sent_at, created_at
    ${baseQuery}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...values, limit, offset]);

  return { total: countResult.total, rows };
};

// ─── Templates ────────────────────────────────────────────────────────────────

export const postTemplates = async ({ templateCode, channel, language_id, subject, body }) => {
  try {
    const matches = body.match(/{{(.*?)}}/g) || [];
    const variables = [...new Set(matches.map(v => v.replace(/[{}]/g, '').trim()))];

    const [result] = await db.query(`
      INSERT INTO md_message_templates
        (template_code, language_id, channel, subject, body, variables)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [templateCode, language_id, channel, subject, body, JSON.stringify(variables)]);

    return result;
  } catch (err) {
    throw err;
  }
};

export const updateTemplates = async (id, data) => {
  try {
    const { subject, body } = data;

    const [rows] = await db.query(
      'SELECT id FROM md_message_templates WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return rows;

    const matches = body.match(/{{(.*?)}}/g) || [];
    const variables = [...new Set(matches.map(v => v.replace(/[{}]/g, '').trim()))];

    await db.query(`
      UPDATE md_message_templates
      SET subject = ?, body = ?, variables = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [subject || null, body, JSON.stringify(variables), id]);

    return { success: true, message: 'Template updated successfully' };
  } catch (error) {
    throw error;
  }
};

export const getTemplates = async ({ templateCode, channel, language_id, limit, offset }) => {
  try {
    let baseQuery = `FROM md_message_templates WHERE 1=1`;
    let values = [];

    if (templateCode) {
      baseQuery += ` AND template_code = ?`;
      values.push(templateCode);
    }

    if (channel && channel.length > 0) {
      baseQuery += ` AND channel IN (${channel.map(() => '?').join(',')})`;
      values.push(...channel);
    }

    if (language_id) {
      baseQuery += ` AND language_id = ?`;
      values.push(language_id);
    }

    const [[countResult]] = await db.query(`SELECT COUNT(*) as total ${baseQuery}`, values);

    const [rows] = await db.query(
      `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return { total: countResult.total, templates: rows };
  } catch (err) {
    throw err;
  }
};