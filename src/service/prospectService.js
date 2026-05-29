<<<<<<< HEAD
import db from '../config/db.js';

export const moveStage = async ({ prospectId, newStageLg, reasonId, userId }, db) => {
import { CreateError } from '../middleware/createError.js';
import { STAGE_KEYS, isReasonRequiredStage } from '../constants/stages.js';

const REFERRAL_SOURCE_KEY = 'REFERRAL';
const DIRECT_SOURCE_KEY = 'DIRECT';

const allowedProspectColumns = new Set([
  'company_name',
  'contact_name',
  'job_title',
  'email',
  'phone',
  'linkedin_url',
  'twitter_url',
  'facebook_url',
  'instagram_url',
  'industry_id',
  'industry_size_id',
  'source_id',
  'referral_name',
  'sourced_date',
  'sourced_by_name',
  'stage_code',
  'assigned_user_id',
  'reason_id',
  'notes',
  'follow_up_date',
  'preferred_lang_id'
]);

const toNullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
};

const toNullablePositiveInteger = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw CreateError(400, `Invalid ${fieldName}`);
  }

  return normalized;
};

const toRequiredPositiveInteger = (value, fieldName) => {
  const normalized = toNullablePositiveInteger(value, fieldName);

  if (normalized === null) {
    throw CreateError(400, `${fieldName} is required`);
  }

  return normalized;
};

const getSourceKey = async (sourceId, dbOrConnection) => {
  if (!sourceId) {
    return null;
  }

  const [rows] = await dbOrConnection.query(
    'SELECT source_key FROM md_sources WHERE source_id = ? LIMIT 1',
    [sourceId]
  );

  if (rows.length === 0) {
    throw CreateError(400, 'Invalid source_id');
  }

  return String(rows[0].source_key || '').trim().toUpperCase();
};

const getDirectSourceId = async (dbOrConnection) => {
  const [rows] = await dbOrConnection.query(
    'SELECT source_id FROM md_sources WHERE UPPER(source_key) = ? ORDER BY source_id LIMIT 1',
    [DIRECT_SOURCE_KEY]
  );

  if (rows.length > 0) {
    return rows[0].source_id;
  }

  return 1;
};

const assertReferenceExists = async ({ table, column, value, fieldName }, dbOrConnection) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const [rows] = await dbOrConnection.query(
    `SELECT ${column} FROM ${table} WHERE ${column} = ? LIMIT 1`,
    [value]
  );

  if (rows.length === 0) {
    throw CreateError(400, `Invalid ${fieldName}`);
  }

  return value;
};

const getStageMeta = async (stageCode, dbOrConnection) => {
  const normalizedStageCode = toNullablePositiveInteger(stageCode, 'stage_code');

  if (normalizedStageCode === null) {
    throw CreateError(400, 'stage_code is required');
  }

  const [rows] = await dbOrConnection.query(
    'SELECT stage_code, stage_key FROM md_stages WHERE stage_code = ? LIMIT 1',
    [normalizedStageCode]
  );

  if (rows.length === 0) {
    throw CreateError(400, 'Invalid stage_code');
  }

  return {
    stage_code: rows[0].stage_code,
    stage_key: String(rows[0].stage_key || '').trim().toUpperCase()
  };
};

const getStageCodeByLabel = async (stageLabel, dbOrConnection) => {
  const normalizedLabel = toNullableString(stageLabel);

  if (!normalizedLabel) {
    return null;
  }

  const [rows] = await dbOrConnection.query(
    `SELECT sm.stage_code
     FROM md_stages sm
     INNER JOIN md_stages_translation st
       ON st.stage_code = sm.stage_code
     WHERE UPPER(st.stage_in_lang) = ?
     ORDER BY COALESCE(sm.seq, sm.stage_code), sm.stage_code
     LIMIT 1`,
    [normalizedLabel.toUpperCase()]
  );

  if (rows.length === 0) {
    throw CreateError(400, 'Invalid stage label');
  }

  return rows[0].stage_code;
};

const resolveStageCode = async ({ stageCode, stageLabel }, dbOrConnection) => {
  if (stageCode !== undefined && stageCode !== null && stageCode !== '') {
    return stageCode;
  }

  const stageCodeFromLabel = await getStageCodeByLabel(stageLabel, dbOrConnection);
  if (stageCodeFromLabel !== null) {
    return stageCodeFromLabel;
  }

  throw CreateError(400, 'stage_code or stage label is required');
};

const assertReasonExists = async (reasonId, dbOrConnection) => {
  const normalizedReasonId = toNullablePositiveInteger(reasonId, 'reason_id');

  if (normalizedReasonId === null) {
    return null;
  }

  const [rows] = await dbOrConnection.query(
    'SELECT reason_id FROM md_reasons WHERE reason_id = ? LIMIT 1',
    [normalizedReasonId]
  );

  if (rows.length === 0) {
    throw CreateError(400, 'Invalid reason_id');
  }

  return normalizedReasonId;
};

const validateStageReason = async ({ stageCode, reasonId }, dbOrConnection) => {
  const stageMeta = await getStageMeta(stageCode, dbOrConnection);
  const normalizedReasonId = await assertReasonExists(reasonId, dbOrConnection);
  const requiresReason = isReasonRequiredStage(stageMeta.stage_key);

  if (requiresReason && normalizedReasonId === null) {
    throw CreateError(400, 'reason_id is required when stage is Parked');
  }

  if (!requiresReason && normalizedReasonId !== null) {
    throw CreateError(400, 'reason_id is allowed only when stage is Parked');
  }

  return {
    stageCode: stageMeta.stage_code,
    stageKey: stageMeta.stage_key,
    reasonId: normalizedReasonId
  };
};

const assertProspectReferences = async (prospect, dbOrConnection) => {
  await assertReferenceExists({
    table: 'md_industry_types',
    column: 'industry_id',
    value: prospect.industry_id,
    fieldName: 'industry_id'
  }, dbOrConnection);

  await assertReferenceExists({
    table: 'md_industry_size',
    column: 'industry_size_id',
    value: prospect.industry_size_id,
    fieldName: 'industry_size_id'
  }, dbOrConnection);

  await assertReferenceExists({
    table: 'md_sources',
    column: 'source_id',
    value: prospect.source_id,
    fieldName: 'source_id'
  }, dbOrConnection);
};

const getInitialStageCode = async (dbOrConnection) => {
  const [firstStageRows] = await dbOrConnection.query(
    'SELECT stage_code FROM md_stages WHERE stage_key = ? LIMIT 1',
    [STAGE_KEYS.PENDING]
  );

  if (firstStageRows.length > 0) {
    return firstStageRows[0].stage_code;
  }

  const [anyFirst] = await dbOrConnection.query('SELECT stage_code FROM md_stages ORDER BY COALESCE(seq, stage_code), stage_code LIMIT 1');
  return anyFirst[0]?.stage_code || 1;
};

const filterProspectUpdates = (updates) => {
  const filtered = {};

  for (const [key, value] of Object.entries(updates || {})) {
    if (!allowedProspectColumns.has(key)) {
      throw CreateError(400, `Unsupported prospect field: ${key}`);
    }

    filtered[key] = value;
  }

  return filtered;
};

const insertProspectLog = async ({ prospectId, changeType, oldValues = null, newValues = null, changedBy }, dbOrConnection) => {
  await dbOrConnection.query(
    `INSERT INTO td_prospect_update_logs
       (prospect_id, change_type, old_values, new_values, changed_by)
     VALUES (?, ?, ?, ?, ?)`,
    [
      prospectId,
      changeType,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      changedBy || null
    ]
  );
};

const validateReferralName = async ({ sourceId, referralName, currentProspectId = null }, dbOrConnection) => {
  let effectiveSourceId = sourceId;
  let effectiveReferralName = referralName;

  if (currentProspectId) {
    const [rows] = await dbOrConnection.query(
      'SELECT source_id, referral_name FROM md_prospects WHERE id = ? LIMIT 1',
      [currentProspectId]
    );

    if (rows.length === 0) {
      throw CreateError(404, 'Prospect not found');
    }

    if (effectiveSourceId === undefined) {
      effectiveSourceId = rows[0].source_id;
    }

    if (effectiveReferralName === undefined && String(effectiveSourceId) === String(rows[0].source_id)) {
      effectiveReferralName = rows[0].referral_name;
    }
  }

  const sourceKey = await getSourceKey(effectiveSourceId, dbOrConnection);
  const normalizedReferralName = toNullableString(effectiveReferralName);

  if (sourceKey === REFERRAL_SOURCE_KEY && !normalizedReferralName) {
    throw CreateError(400, 'referral_name is required when source is Referral');
  }

  if (sourceKey !== REFERRAL_SOURCE_KEY && normalizedReferralName) {
    throw CreateError(400, 'referral_name is allowed only when source is Referral');
  }

  return normalizedReferralName;
};

export const bulkInsertProspects = async (prospects, userId, langId = 'EN', db, sourcedByName = null) => {
  const stageCode = await getInitialStageCode(db);
  const defaultSourceId = await getDirectSourceId(db);

  const rows = prospects.filter(p => p.email || p.phone);
  if (rows.length === 0) return { inserted: 0, skipped: prospects.length };

  const emails = rows.map(p => p.email).filter(Boolean);
  const phones = rows.map(p => p.phone).filter(Boolean);

  let existingEmails = new Set();
  let existingPhones = new Set();

  if (emails.length > 0) {
    const [existingEmailRows] = await db.query('SELECT email FROM md_prospects WHERE email IN (?)', [emails]);
    existingEmailRows.forEach(r => existingEmails.add(r.email));
  }
  if (phones.length > 0) {
    const [existingPhoneRows] = await db.query('SELECT phone FROM md_prospects WHERE phone IN (?)', [phones]);
    existingPhoneRows.forEach(r => existingPhones.add(r.phone));
  }

  const validRows = rows.filter(p => !existingEmails.has(p.email) && !existingPhones.has(p.phone));
  if (validRows.length === 0) return { inserted: 0, skipped: prospects.length };

  const validValues = [];
  for (const p of validRows) {
    p.source_id = p.source_id || defaultSourceId;
    p.sourced_date = p.sourced_date || new Date();
    p.sourced_by_name = p.sourced_by_name || sourcedByName || null;
    await assertProspectReferences(p, db);
    const referralName = await validateReferralName({
      sourceId: p.source_id,
      referralName: p.referral_name
    }, db);

    validValues.push([
      p.company_name || null, p.contact_name || null, p.job_title || null,
      p.email || null, p.phone || null,
      p.linkedin_url || null, p.twitter_url || null, p.facebook_url || null, p.instagram_url || null,
      p.industry_id || null, p.industry_size_id || null, stageCode, userId,
      p.source_id, referralName, p.sourced_date, p.sourced_by_name
    ]);
  }

  const [result] = await db.query(
    `INSERT INTO md_prospects
       (
         company_name, contact_name, job_title, email, phone,
         linkedin_url, twitter_url, facebook_url, instagram_url,
         industry_id, industry_size_id, stage_code, created_by,
         source_id, referral_name, sourced_date, sourced_by_name
       )
     VALUES ?`,
    [validValues]
  );

  return { inserted: result.affectedRows, skipped: prospects.length - result.affectedRows };
};

export const createProspect = async ({ prospect, userId }, db) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const stageCode = prospect.stage_code !== undefined && prospect.stage_code !== null && prospect.stage_code !== ''
      ? prospect.stage_code
      : await getInitialStageCode(connection);
    const sourceId = prospect.source_id || await getDirectSourceId(connection);
    const sourcedDate = prospect.sourced_date || new Date();

    const newProspect = {
      ...filterProspectUpdates(prospect),
      source_id: sourceId,
      stage_code: stageCode,
      sourced_date: sourcedDate
    };

    await assertProspectReferences(newProspect, connection);
    const stageReason = await validateStageReason({
      stageCode: newProspect.stage_code,
      reasonId: newProspect.reason_id
    }, connection);
    newProspect.stage_code = stageReason.stageCode;
    newProspect.reason_id = stageReason.reasonId;
    newProspect.referral_name = await validateReferralName({
      sourceId,
      referralName: newProspect.referral_name
    }, connection);

    const columns = [
      'company_name', 'contact_name', 'job_title', 'email', 'phone',
      'linkedin_url', 'twitter_url', 'facebook_url', 'instagram_url',
      'industry_id', 'industry_size_id', 'source_id', 'referral_name',
      'sourced_date', 'sourced_by_name', 'stage_code', 'assigned_user_id',
      'reason_id', 'notes', 'follow_up_date', 'preferred_lang_id', 'created_by'
    ];
    const values = columns.map((column) => {
      if (column === 'created_by') return userId;
      return newProspect[column] ?? null;
    });

    const [result] = await connection.query(
      `INSERT INTO md_prospects (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      values
    );

    const [rows] = await connection.query('SELECT * FROM md_prospects WHERE id = ?', [result.insertId]);
    await insertProspectLog({
      prospectId: result.insertId,
      changeType: 'CREATE',
      newValues: rows[0],
      changedBy: userId
    }, connection);

    await connection.commit();
    return rows[0];
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const updateProspect = async ({ id, updates, userId }, db) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    const safeUpdates = filterProspectUpdates(updates);
    const [existingRows] = await connection.query('SELECT * FROM md_prospects WHERE id = ? FOR UPDATE', [id]);
    if (existingRows.length === 0) {
      throw CreateError(404, 'Prospect not found');
    }
    const oldProspect = existingRows[0];

    if (safeUpdates.stage_code !== undefined || safeUpdates.reason_id !== undefined) {
      const stageReason = await validateStageReason({
        stageCode: safeUpdates.stage_code !== undefined ? safeUpdates.stage_code : oldProspect.stage_code,
        reasonId: safeUpdates.reason_id !== undefined
          ? safeUpdates.reason_id
          : safeUpdates.stage_code !== undefined
            ? null
            : oldProspect.reason_id
      }, connection);

      if (safeUpdates.stage_code !== undefined) {
        safeUpdates.stage_code = stageReason.stageCode;
      }
      safeUpdates.reason_id = stageReason.reasonId;
    }

    if (safeUpdates.source_id === undefined && safeUpdates.referral_name === undefined) {
      // no-op
    } else {
      safeUpdates.referral_name = await validateReferralName({
        sourceId: safeUpdates.source_id,
        referralName: safeUpdates.referral_name,
        currentProspectId: id
      }, connection);
    }
    await assertProspectReferences(safeUpdates, connection);

    let query = 'UPDATE md_prospects SET ';
    const params = [];
    for (const [key, value] of Object.entries(safeUpdates)) {
      query += `${key} = ?, `;
      params.push(value);
    }
    query += 'updated_at = NOW(), updated_by = ? WHERE id = ?';
    params.push(userId, id);

    await connection.query(query, params);
    const [updatedRows] = await connection.query('SELECT * FROM md_prospects WHERE id = ?', [id]);
    await insertProspectLog({
      prospectId: id,
      changeType: 'UPDATE',
      oldValues: oldProspect,
      newValues: updatedRows[0],
      changedBy: userId
    }, connection);

    await connection.commit();
    return { success: true };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const moveStage = async ({ prospectId, newStage, newStageLg, reasonId, userId }, db) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const parsedProspectId = toRequiredPositiveInteger(prospectId, 'prospectId');
    const [rows] = await connection.query(
      'SELECT stage_code FROM md_prospects WHERE id = ? FOR UPDATE',
      [parsedProspectId]
    );
    if (rows.length === 0) throw CreateError(404, 'Prospect not found');
    const currentStage = rows[0].stage_code;
    const resolvedStageCode = await resolveStageCode({
      stageCode: newStage,
      stageLabel: newStageLg
    }, connection);

    const stageReason = await validateStageReason({
      stageCode: resolvedStageCode,
      reasonId
    }, connection);

    await connection.query(
      'UPDATE md_prospects SET stage_code=?, reason_id=?, updated_at=NOW(), updated_by=? WHERE id=?',
      [stageReason.stageCode, stageReason.reasonId, userId, parsedProspectId]
    );
    await connection.query(
      `INSERT INTO td_prospect_stage_history
         (prospect_id, stage_code, reason_id, updated_by)
       VALUES (?, ?, ?, ?)`,
      [parsedProspectId, stageReason.stageCode, stageReason.reasonId, userId]
    );
    await connection.commit();
    return {
      success: true,
      from: currentStage,
      to: stageReason.stageCode,
      reasonId: stageReason.reasonId
    };
=======
export const bulkInsertProspects = async (prospects, userId, langId = 'EN', db) => {
  const [firstStageRows] = await db.query(
    'SELECT stage_code FROM stage_master WHERE language_id = ? AND sequence = 1 LIMIT 1',
    [langId]
  );
  let stageCode = 1;
  if (firstStageRows.length > 0) {
    stageCode = firstStageRows[0].stage_code;
  } else {
    const [anyFirst] = await db.query('SELECT stage_code FROM stage_master WHERE sequence = 1 LIMIT 1');
    if (anyFirst.length > 0) stageCode = anyFirst[0].stage_code;
  }

  const rows = prospects.filter(p => p.email || p.phone);
  if (rows.length === 0) return { inserted: 0, skipped: prospects.length };

  const emails = rows.map(p => p.email).filter(Boolean);
  const phones = rows.map(p => p.phone).filter(Boolean);

  let existingEmails = new Set();
  let existingPhones = new Set();

  if (emails.length > 0) {
    const [existingEmailRows] = await db.query('SELECT email FROM md_prospects WHERE email IN (?)', [emails]);
    existingEmailRows.forEach(r => existingEmails.add(r.email));
  }
  if (phones.length > 0) {
    const [existingPhoneRows] = await db.query('SELECT phone FROM md_prospects WHERE phone IN (?)', [phones]);
    existingPhoneRows.forEach(r => existingPhones.add(r.phone));
  }

  const validRows = rows.filter(p => !existingEmails.has(p.email) && !existingPhones.has(p.phone));
  if (validRows.length === 0) return { inserted: 0, skipped: prospects.length };

  const validValues = validRows.map(p => [
    p.company_name || null, p.contact_name || null, p.job_title || null,
    p.email || null, p.phone || null,
    p.linkedin_url || null, p.twitter_url || null, p.facebook_url || null, p.instagram_url || null,
    stageCode, userId, p.source_id || null
  ]);

  const [result] = await db.query(
    'INSERT INTO md_prospects (company_name, contact_name, job_title, email, phone, linkedin_url, twitter_url, facebook_url, instagram_url, stage_code, created_by, source_id) VALUES ?',
    [validValues]
  );

  return { inserted: result.affectedRows, skipped: prospects.length - result.affectedRows };
};

export const moveStage = async ({ prospectId, newStage, reasonId, userId }, db) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const [rows] = await connection.query(
      'SELECT stage_code FROM md_prospects WHERE id = ? FOR UPDATE',
      [prospectId]
    );
    if (rows.length === 0) throw new Error('PROSPECT_NOT_FOUND');
    const currentStage = rows[0].stage_code;

    const [stageMeta] = await connection.query(
      'SELECT requires_reason FROM stage_master WHERE stage_code=? AND language_id=? LIMIT 1',
      [newStage, 'EN']
    );
    if (stageMeta.length > 0 && stageMeta[0].requires_reason && !reasonId) {
      throw new Error('REASON_REQUIRED');
    }

    await connection.query(
      'UPDATE md_prospects SET stage_code=?, reason_id=?, updated_at=NOW(), updated_by=? WHERE id=?',
      [newStage, reasonId || null, userId, prospectId]
    );
    await connection.query(
      'INSERT INTO stage_logs (prospect_id,from_stage,to_stage,moved_by,reason_id) VALUES (?,?,?,?,?)',
      [prospectId, currentStage, newStage, userId, reasonId || null]
    );
    await connection.query(
      'INSERT INTO td_stage_logs (prospect_id,from_stage,to_stage,moved_by,reason_id) VALUES (?,?,?,?,?)',
      [prospectId, currentStage, newStage, userId, reasonId || null]
    );
    await connection.commit();
    return { success: true, from: currentStage, to: newStage };
>>>>>>> 953ff5fdede7dbb6782480a08a604c5be3f1ce46
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const transferProspects = async ({ prospectIds, toUserId, fromUserId, adminId }, db) => {
<<<<<<< HEAD
  const ids = (Array.isArray(prospectIds) ? prospectIds : [prospectIds])
    .map((id) => toNullablePositiveInteger(id, 'prospectId'))
    .filter((id) => id !== null);

  if (ids.length === 0) {
    throw CreateError(400, 'prospectIds is required');
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const ids = Array.isArray(prospectIds) ? prospectIds : [prospectIds];
    const assignee = toRequiredPositiveInteger(toUserId, 'toUserId');
    const assignRows = ids.map((id) => [id, assignee, fromUserId || null, fromUserId || null]);

    await connection.query(
      `INSERT INTO td_prospect_assignment (prospect_id, assigned_to, assigned_by, source_by)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         assigned_to = VALUES(assigned_to),
         assigned_by = VALUES(assigned_by),
         source_by = VALUES(source_by)`,
      [assignRows]
    );

    await connection.query(
      'UPDATE md_prospects SET assigned_user_id=?, updated_at=NOW() WHERE id IN (?)',
      [assignee, ids]
    );
    await connection.commit();
    return { transferred: ids.length };
=======
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    await connection.query(
      'UPDATE md_prospects SET assigned_user_id=?, updated_at=NOW() WHERE id IN (?)',
      [toUserId, prospectIds]
    );
    const logRows = prospectIds.map(id => [id, fromUserId, toUserId, adminId]);
    await connection.query(
      'INSERT INTO transfer_logs (prospect_id,from_user,to_user,transferred_by) VALUES ?',
      [logRows]
    );
    await connection.query(
      'INSERT INTO td_transfer_logs (prospect_id,from_user,to_user,transferred_by) VALUES ?',
      [logRows]
    );
    await connection.commit();
    return { transferred: prospectIds.length };
>>>>>>> 953ff5fdede7dbb6782480a08a604c5be3f1ce46
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const bulkInsertProspects = async (
  prospects,
  userId,
  lag_id = 'EN',
  db
) => {
  const values = [];
  const InvalidProspect = [];

  for (const p of prospects) {
    if (!p.email && !p.phone) {
      InvalidProspect.push(p);
      continue;
    }

    // Check for duplicate by email or phone
    const [existing] = await db.query(
      `SELECT id FROM md_prospects WHERE email = ? OR phone = ? LIMIT 1`,
      [p.email || null, p.phone || null]
    );
    if (existing.length > 0) continue;

    // If country_iso is provided, fetch the dial_code automatically from md_countries
    let dial_code = p.dial_code || null;
    if (p.country_iso && !dial_code) {
      const [countryRows] = await db.query(
        `SELECT dial_code FROM md_countries WHERE iso_code = ? LIMIT 1`,
        [p.country_iso]
      );
      if (countryRows.length > 0) {
        dial_code = countryRows[0].dial_code;
      }
    }

    values.push([
      p.company_name   || null,
      p.first_name     || null,
      p.last_name      || null,
      p.job_title      || null,
      p.email          || null,
      p.phone          || null,
      p.country_iso    || null,   
      dial_code,                  
      p.linkedin_url   || null,
      p.twitter_url    || null,
      p.facebook_url   || null,
      p.instagram_url  || null,
      1,                          // stage_code default = 1 (PENDING)
      userId,
      p.source_id      || null,
    ]);
  }

  if (values.length === 0) {
    return { inserted: 0, skipped: prospects.length };
  }

  const [result] = await db.query(
    `INSERT INTO md_prospects (
      company_name, first_name, last_name, job_title,
      email, phone,
      country_iso, dial_code,
      linkedin_url, twitter_url, facebook_url, instagram_url,
      stage_code, created_by, source_id
    ) VALUES ?`,
    [values]
  );

  return {
    inserted: result.affectedRows,
    skipped: prospects.length - result.affectedRows,
  };
};
export const getCountries = async () => {
  const [rows] = await db.query(
    `SELECT
       id,
       iso_code,
       iso_code3,
       country_name,
       dial_code,
       flag_svg_url
     FROM md_countries
     WHERE is_active = 1
     ORDER BY country_name ASC`
  );
  return rows;
};