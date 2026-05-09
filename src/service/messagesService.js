import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';

export const enqueueBulkMessages = async ({ template_id, userId, messages }) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const insertedQueueIds = [];
    // Process each message

    for(const item of messages){
      const result = enqueueMessage({template_id, prospect_id:item.prospect_id, payload:item, userId});
      if(result){
        insertedQueueIds.push(result.queue_id);
      }else{
        await connection.rollback();
      }
    }
    await connection.commit();

    return {
      total_messages: insertedQueueIds.length,
      queue_ids: insertedQueueIds,
      message: 'Bulk messages queued successfully'
    };

  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    throw err;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const enqueueMessage = async ({ template_id, prospect_id, payload = {}, userId }) => {
  console.log(template_id, prospect_id, payload, userId);
  let connection;
  try {
    connection = await db.getConnection();

    // Fetch template + prospect + channel using JOIN
    const [rows] = await connection.query(
      `SELECT
      t.id AS template_id,
      c.channel_name,
      t.channel,
      t.subject,
      t.body,
      t.variables,
      p.id AS prospect_id,
      p.contact_name,
      p.company_name,
      p.email,
      p.phone
      FROM md_message_templates t
      INNER JOIN md_message_channel_enum c ON t.channel = c.id
      INNER JOIN md_prospects p ON p.id = ?
      WHERE t.id = ? `, [prospect_id, template_id]);

    if (rows.length === 0) {
      throw CreateError(404, 'Template or Prospect not found');
    }

    const data = rows[0];

    let requiredVariables  = [];

    if (Array.isArray(data.variables)) {
      requiredVariables  = data.variables;
    } else {
      requiredVariables  = JSON.parse(data.variables || '[]');
    }

    // Prospect based variables
    const prospectData = {
      contact_name: data.contact_name,
      company_name: data.company_name,
      email: data.email,
      phone: data.phone
    };
    const customVariables  = requiredVariables.filter(
      variable => !(variable in prospectData)
    );

    for (const variable of customVariables) {
      if (
        payload[variable] === undefined ||
        payload[variable] === null ||
        payload[variable] === ''
      ) {
        throw CreateError(400, `Missing payload variable: ${variable}`);
      }
    }
    // Merge prospect data + dynamic payload
    const finalPayload = { ...prospectData, ...payload };
    let finalSubject = data.subject;
    let finalBody = data.body;
    for (const variable of requiredVariables) {
      const regex = new RegExp(
        `{{${variable}}}`,
        'g'
      );
      finalSubject = finalSubject.replace(regex,finalPayload[variable]);
      finalBody = finalBody.replace(regex,finalPayload[variable]);
    }
    // Determine recipient automatically
    let toAddress = data.channel_name === 'EMAIL' ? data.email : data.phone;
    if (!toAddress) {
      throw CreateError(400, 'Recipient address not found');
    }

    // Insert message into queue
    const [result] = await connection.query(
      `CALL sp_enqueue_message(?, ?, ?, ?, ?)`,
      [
      data.channel,
      data.prospect_id,
      toAddress,
      finalSubject,
      finalBody
    ]);

    return {
      queue_id: result[0][0].queue_id,
      message: 'Message queued successfully'
    };

  } catch (err) {
    throw err;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const queue = async ({ channel, prospect_id, limit, offset }) => {
  try{
    let baseQuery = `FROM td_message_queue q
    JOIN md_message_channel_enum c ON q.channel = c.id
    WHERE 1=1`;
    let values = [];

    // Channel filter
    if (channel && channel.length > 0) {
      baseQuery += ` AND c.channel_name IN (${channel.map(() => '?').join(',')})`;
      values.push(...channel);
    }

    // prospect_id filter
    if (prospect_id && prospect_id.length > 0) {
      baseQuery += ` AND q.prospect_id IN (${prospect_id.map(() => '?').join(',')})`;
      values.push(...prospect_id);
    }

    // Count query
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const [[countResult]] = await db.query(countQuery, values);

    // Data query
    const dataQuery = `
      SELECT 
        q.id,
        q.channel,
        q.prospect_id,
        q.template_id,
        q.to_address,
        q.status,
        q.retry_count,
        q.scheduled_at,
        q.sent_at,
        q.created_at
      ${baseQuery}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(dataQuery, [...values, limit, offset]);
    return { rows, total: countResult.total };
  }
  catch(err){
    throw err;
  }
};

export const postTemplates = async ({ templateCode, channel, language_id, subject, body }) => {
  try {
    const [[channelRow]] = await db.query(`SELECT id from md_message_channel_enum WHERE channel_name = ?`,[channel]);
    const channel_id = channelRow.id;
    // Extract variables from body ({{variable}})
    const matches = body.match(/{{(.*?)}}/g) || [];

    // Clean and deduplicate
    const variables = [...new Set(
      matches.map(v => v.replace(/[{}]/g, '').trim())
    )];

    const query = `
      INSERT INTO md_message_templates
      (template_code, language_id, channel, subject, body, variables)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      templateCode,
      language_id,
      channel_id,
      subject,
      body,
      JSON.stringify(variables)
    ];
    const [result] = await db.query(query, values);
    return result;
  } catch (err) {
    throw err;
  }
};

export const updateTemplates = async ({ id, data }) => {
  try {
    const { subject, body } = data;
    const [rows] = await db.query("SELECT id FROM md_message_templates WHERE id = ?", [id]);

    if (rows.length === 0) {
      return rows;
    }

    const matches = body.match(/{{(.*?)}}/g) || [];

    const variables = [...new Set(
      matches.map(v => v.replace(/[{}]/g, '').trim())
    )];

    const query = `
      UPDATE md_message_templates
      SET 
        subject = ?,
        body = ?,
        variables = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const values = [
      subject || null,
      body,
      JSON.stringify(variables),
      id
    ];

    await db.query(query, values);

    return { success: true, message: "Template updated successfully", };
  } catch (err) {
    throw err;
  }
}

export const getTemplates = async ({ templateCode, channelNames, language_id, limit, offset }) => {
  try {
    let baseQuery = `
      FROM md_message_templates t
      JOIN md_message_channel_enum c ON t.channel = c.id
      WHERE 1=1
    `;
    let values = [];

    if (templateCode) {
      baseQuery += ` AND t.template_code = ?`;
      values.push(templateCode);
    }

    if (channelNames && channelNames.length > 0) {
      baseQuery += ` AND c.channel_name IN (${channelNames.map(() => '?').join(',')})`;
      values.push(...channelNames);
    }

    if (language_id) {
      baseQuery += ` AND t.language_id = ?`;
      values.push(language_id);
    }

    // Total count query
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const [[countResult]] = await db.query(countQuery, values);

    // Data query with pagination
    const dataQuery = `SELECT t.*, c.channel_name ${baseQuery} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await db.query(dataQuery, [...values, limit, offset]);

    return {
      total: countResult.total,
      templates: rows
    }
  }
  catch (err) {
    throw err;
  }
};
