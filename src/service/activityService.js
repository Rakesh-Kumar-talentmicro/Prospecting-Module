import { CreateError } from '../middleware/createError.js';

const PENDING_STATUS_TITLE = 'Pending';
const CLOSED_STATUS_TITLE = 'Closed';
const CANCELLED_STATUS_TITLE = 'Cancelled';
const CHANNEL_ACTIVITY_TITLES = {
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp'
};

const toPositiveInteger = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw CreateError(400, `${fieldName} must be a positive integer`);
  }

  return parsed;
};

const toOptionalPositiveInteger = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return toPositiveInteger(value, fieldName);
};

const toNullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
};

const toNullableDate = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw CreateError(400, `${fieldName} must be a valid date/time`);
  }

  return date;
};

const normalizeAttachmentPaths = (attachmentPaths) => {
  if (attachmentPaths === undefined || attachmentPaths === null || attachmentPaths === '') {
    return null;
  }

  if (Array.isArray(attachmentPaths)) {
    return JSON.stringify(attachmentPaths.map((item) => String(item)));
  }

  if (typeof attachmentPaths === 'string') {
    return JSON.stringify([attachmentPaths]);
  }

  throw CreateError(400, 'attachment_paths must be a string or array of strings');
};

const getActivityStatusId = async (connection, statusTitle) => {
  const [rows] = await connection.query(
    'SELECT activity_id FROM md_activity_status WHERE UPPER(activity_title) = ? LIMIT 1',
    [statusTitle.toUpperCase()]
  );

  if (rows.length === 0) {
    throw CreateError(500, `Activity status "${statusTitle}" not found`);
  }

  return rows[0].activity_id;
};

const getProspectContact = async (connection, prospectId) => {
  const [rows] = await connection.query(
    'SELECT id, email, phone FROM md_prospects WHERE id = ? LIMIT 1',
    [prospectId]
  );

  if (rows.length === 0) {
    throw CreateError(404, 'Prospect not found');
  }

  return rows[0];
};

const assertProspectExists = async (connection, prospectId) => {
  await getProspectContact(connection, prospectId);
};

const assertActivityTypeExists = async (connection, activityTypeId) => {
  if (!activityTypeId) {
    return;
  }

  const [rows] = await connection.query(
    'SELECT activity_type_id FROM md_activity_type WHERE activity_type_id = ? LIMIT 1',
    [activityTypeId]
  );

  if (rows.length === 0) {
    throw CreateError(404, 'Activity type not found');
  }
};

const buildActionLinks = (prospect) => {
  const phone = prospect?.phone ? String(prospect.phone).replace(/\D/g, '') : '';
  const email = prospect?.email || '';
  const phoneWithCountry = phone.startsWith('91') ? phone : `91${phone}`;

  return {
    call: phone ? `tel:${phone}` : null,
    email: email ? `mailto:${email}` : null,
    whatsapp: phone ? `https://wa.me/${phoneWithCountry}` : null
  };
};

const normalizeActivityPayload = (payload = {}) => {
  return {
    outcome: toNullableString(payload.outcome),
    activityNotes: toNullableString(payload.activityNotes ?? payload.activity_notes),
    attachmentPaths: normalizeAttachmentPaths(payload.attachmentPaths ?? payload.attachment_paths),
    nextActionTypeId: toOptionalPositiveInteger(
      payload.nextActionTypeId ?? payload.next_action_type_id,
      'nextActionTypeId'
    ),
    nextActionAt: toNullableDate(payload.nextActionAt ?? payload.next_action_at, 'nextActionAt')
  };
};

const getActivityTypeIdByTitle = async (connection, activityTypeTitle) => {
  const [rows] = await connection.query(
    'SELECT activity_type_id FROM md_activity_type WHERE UPPER(activity_type_title) = ? LIMIT 1',
    [activityTypeTitle.toUpperCase()]
  );

  if (rows.length === 0) {
    throw CreateError(500, `Activity type "${activityTypeTitle}" not found`);
  }

  return rows[0].activity_type_id;
};

const getActivityById = async (connection, activityId, prospectId) => {
  const [rows] = await connection.query(
    `SELECT
       a.t_id,
       a.prospect_id,
       a.activity_type_id,
       at.activity_type_title,
       a.activity_status_id,
       ast.activity_title AS activity_status_title,
       a.message_queue_id,
       a.outcome,
       a.activity_notes,
       a.attachment_paths,
       a.next_action_type_id,
       nat.activity_type_title AS next_action_type_title,
       a.next_action_at,
       a.created_at,
       a.updated_at,
       p.email,
       p.phone
     FROM td_activity a
     INNER JOIN md_activity_type at
       ON at.activity_type_id = a.activity_type_id
     INNER JOIN md_activity_status ast
       ON ast.activity_id = a.activity_status_id
     INNER JOIN md_prospects p
       ON p.id = a.prospect_id
     LEFT JOIN md_activity_type nat
       ON nat.activity_type_id = a.next_action_type_id
     WHERE a.t_id = ?
       AND a.prospect_id = ?
     LIMIT 1`,
    [activityId, prospectId]
  );

  if (!rows[0]) {
    return null;
  }

  const { email, phone, ...activity } = rows[0];
  return {
    ...activity,
    action_links: buildActionLinks({ email, phone })
  };
};

export const createActivity = async ({ prospectId, activityTypeId, payload = {} }, db) => {
  const parsedProspectId = toPositiveInteger(prospectId, 'prospectId');
  const parsedActivityTypeId = toPositiveInteger(activityTypeId, 'activityTypeId');
  const activityPayload = normalizeActivityPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await assertProspectExists(connection, parsedProspectId);
    await assertActivityTypeExists(connection, parsedActivityTypeId);
    await assertActivityTypeExists(connection, activityPayload.nextActionTypeId);
    const pendingStatusId = await getActivityStatusId(connection, PENDING_STATUS_TITLE);

    const [result] = await connection.query(
      `INSERT INTO td_activity
         (
           prospect_id,
           activity_type_id,
           activity_status_id,
           outcome,
           activity_notes,
           attachment_paths,
           next_action_type_id,
           next_action_at
         )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parsedProspectId,
        parsedActivityTypeId,
        pendingStatusId,
        activityPayload.outcome,
        activityPayload.activityNotes,
        activityPayload.attachmentPaths,
        activityPayload.nextActionTypeId,
        activityPayload.nextActionAt
      ]
    );

    const activity = await getActivityById(connection, result.insertId, parsedProspectId);
    await connection.commit();

    return activity;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const createCallActivity = async ({ prospectId, payload = {} }, db) => {
  const parsedProspectId = toPositiveInteger(prospectId, 'prospectId');
  const connection = await db.getConnection();

  try {
    const activityTypeId = await getActivityTypeIdByTitle(connection, 'Call');
    return createActivity({ prospectId: parsedProspectId, activityTypeId, payload }, db);
  } finally {
    connection.release();
  }
};

export const listActivities = async ({ prospectId }, db) => {
  const parsedProspectId = toPositiveInteger(prospectId, 'prospectId');

  const [rows] = await db.query(
    `SELECT
       a.t_id,
       a.prospect_id,
       a.activity_type_id,
       at.activity_type_title,
       a.activity_status_id,
       ast.activity_title AS activity_status_title,
       a.message_queue_id,
       a.outcome,
       a.activity_notes,
       a.attachment_paths,
       a.next_action_type_id,
       nat.activity_type_title AS next_action_type_title,
       a.next_action_at,
       a.created_at,
       a.updated_at,
       p.email,
       p.phone
     FROM td_activity a
     INNER JOIN md_activity_type at
       ON at.activity_type_id = a.activity_type_id
     INNER JOIN md_activity_status ast
       ON ast.activity_id = a.activity_status_id
     INNER JOIN md_prospects p
       ON p.id = a.prospect_id
     LEFT JOIN md_activity_type nat
       ON nat.activity_type_id = a.next_action_type_id
     WHERE a.prospect_id = ?
     ORDER BY a.created_at DESC, a.t_id DESC`,
    [parsedProspectId]
  );

  return rows.map(({ email, phone, ...activity }) => ({
    ...activity,
    action_links: buildActionLinks({ email, phone })
  }));
};

export const createPendingMessageActivity = async ({ prospectId, channelName, messageQueueId }, connection) => {
  const activityTypeTitle = CHANNEL_ACTIVITY_TITLES[String(channelName || '').toUpperCase()];

  if (!activityTypeTitle) {
    throw CreateError(400, `Unsupported activity channel: ${channelName}`);
  }

  const parsedProspectId = toPositiveInteger(prospectId, 'prospectId');
  const parsedMessageQueueId = toPositiveInteger(messageQueueId, 'messageQueueId');
  const activityTypeId = await getActivityTypeIdByTitle(connection, activityTypeTitle);
  const pendingStatusId = await getActivityStatusId(connection, PENDING_STATUS_TITLE);

  const [result] = await connection.query(
    `INSERT INTO td_activity
       (prospect_id, activity_type_id, activity_status_id, message_queue_id)
     VALUES (?, ?, ?, ?)`,
    [parsedProspectId, activityTypeId, pendingStatusId, parsedMessageQueueId]
  );

  return getActivityById(connection, result.insertId, parsedProspectId);
};

export const closeActivitiesByQueueIds = async (queueIds, connection) => {
  if (!Array.isArray(queueIds) || queueIds.length === 0) {
    return { affectedRows: 0 };
  }

  const parsedQueueIds = queueIds.map((queueId) => toPositiveInteger(queueId, 'queueId'));
  const closedStatusId = await getActivityStatusId(connection, CLOSED_STATUS_TITLE);

  const [result] = await connection.query(
    `UPDATE td_activity
     SET activity_status_id = ?,
         updated_at = NOW()
     WHERE message_queue_id IN (?)`,
    [closedStatusId, parsedQueueIds]
  );

  return { affectedRows: result.affectedRows };
};

export const updateActivity = async ({ prospectId, activityId, payload = {} }, db) => {
  const parsedProspectId = toPositiveInteger(prospectId, 'prospectId');
  const parsedActivityId = toPositiveInteger(activityId, 'activityId');
  const activityPayload = normalizeActivityPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const existingActivity = await getActivityById(connection, parsedActivityId, parsedProspectId);
    if (!existingActivity) {
      throw CreateError(404, 'Activity not found');
    }

    await assertActivityTypeExists(connection, activityPayload.nextActionTypeId);

    await connection.query(
      `UPDATE td_activity
       SET outcome = COALESCE(?, outcome),
           activity_notes = COALESCE(?, activity_notes),
           attachment_paths = COALESCE(?, attachment_paths),
           next_action_type_id = COALESCE(?, next_action_type_id),
           next_action_at = COALESCE(?, next_action_at),
           updated_at = NOW()
       WHERE t_id = ?
         AND prospect_id = ?`,
      [
        activityPayload.outcome,
        activityPayload.activityNotes,
        activityPayload.attachmentPaths,
        activityPayload.nextActionTypeId,
        activityPayload.nextActionAt,
        parsedActivityId,
        parsedProspectId
      ]
    );

    const activity = await getActivityById(connection, parsedActivityId, parsedProspectId);
    await connection.commit();

    return activity;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const updateActivityStatus = async ({ prospectId, activityId, statusTitle, payload = {} }, db) => {
  const parsedProspectId = toPositiveInteger(prospectId, 'prospectId');
  const parsedActivityId = toPositiveInteger(activityId, 'activityId');
  const activityPayload = normalizeActivityPayload(payload);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const existingActivity = await getActivityById(connection, parsedActivityId, parsedProspectId);
    if (!existingActivity) {
      throw CreateError(404, 'Activity not found');
    }

    if (activityPayload.nextActionTypeId) {
      await assertActivityTypeExists(connection, activityPayload.nextActionTypeId);
    }

    const statusId = await getActivityStatusId(connection, statusTitle);

    await connection.query(
      `UPDATE td_activity
       SET activity_status_id = ?,
           outcome = COALESCE(?, outcome),
           activity_notes = COALESCE(?, activity_notes),
           attachment_paths = COALESCE(?, attachment_paths),
           next_action_type_id = COALESCE(?, next_action_type_id),
           next_action_at = COALESCE(?, next_action_at),
           updated_at = NOW()
       WHERE t_id = ?
         AND prospect_id = ?`,
      [
        statusId,
        activityPayload.outcome,
        activityPayload.activityNotes,
        activityPayload.attachmentPaths,
        activityPayload.nextActionTypeId,
        activityPayload.nextActionAt,
        parsedActivityId,
        parsedProspectId
      ]
    );

    const activity = await getActivityById(connection, parsedActivityId, parsedProspectId);
    await connection.commit();

    return activity;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const closeActivity = async ({ prospectId, activityId, payload }, db) => {
  return updateActivityStatus({ prospectId, activityId, statusTitle: CLOSED_STATUS_TITLE, payload }, db);
};

export const cancelActivity = async ({ prospectId, activityId, payload }, db) => {
  return updateActivityStatus({ prospectId, activityId, statusTitle: CANCELLED_STATUS_TITLE, payload }, db);
};
