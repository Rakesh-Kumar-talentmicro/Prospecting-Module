import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { STAGE_KEYS, isReasonRequiredStage } from '../constants/stages.js';

const REFERRAL_SOURCE_KEY = 'REFERRAL';
const DIRECT_SOURCE_KEY = 'DIRECT';

const allowedProspectColumns = new Set([
  'company_name',
  'contact_name',
  'first_name',
  'last_name',
  'job_title',
  'email',
  'phone',
  'linkedin_url',
  'twitter_url',
  'facebook_url',
  'instagram_url',
  'city',
  'state',
  'country',
  'country_iso',
  'dial_code',
  'website_url',
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

let prospectColumnsCache = null;
let duplicateSchemaPromise = null;

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

const getTableColumns = async (tableName, dbOrConnection = db) => {
  const [rows] = await dbOrConnection.query(`SHOW COLUMNS FROM ${tableName}`);
  return new Set(rows.map((row) => row.Field));
};

const getProspectColumns = async (dbOrConnection = db) => {
  if (!prospectColumnsCache) {
    prospectColumnsCache = await getTableColumns('md_prospects', dbOrConnection);
  }

  return prospectColumnsCache;
};

const addProspectColumnIfMissing = async (columnName, definition) => {
  const columns = await getTableColumns('md_prospects');
  if (!columns.has(columnName)) {
    await db.query(`ALTER TABLE md_prospects ADD COLUMN ${definition}`);
    prospectColumnsCache = null;
  }
};

const dropProspectIndexIfExists = async (indexName) => {
  const [rows] = await db.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    ['md_prospects', indexName]
  );

  if (rows.length > 0) {
    await db.query(`ALTER TABLE md_prospects DROP INDEX ${indexName}`);
  }
};

const ensureBulkDuplicateSchema = async () => {
  duplicateSchemaPromise = duplicateSchemaPromise || (async () => {
    await addProspectColumnIfMissing('is_duplicate', 'is_duplicate TINYINT NOT NULL DEFAULT 0');
    await addProspectColumnIfMissing(
      'duplicate_of_prospect_id',
      'duplicate_of_prospect_id BIGINT NULL'
    );
    await dropProspectIndexIfExists('uq_prospect');
  })();

  try {
    await duplicateSchemaPromise;
  } catch (err) {
    duplicateSchemaPromise = null;
    throw err;
  }
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

const getExistingProspectMatches = async (dbOrConnection, prospects) => {
  const emails = [...new Set(prospects.map((p) => toNullableString(p.email)?.toLowerCase()).filter(Boolean))];
  const phones = [...new Set(prospects.map((p) => toNullableString(p.phone)).filter(Boolean))];

  if (emails.length === 0 && phones.length === 0) {
    return {
      byEmail: new Map(),
      byPhone: new Map()
    };
  }

  const clauses = [];
  const values = [];
  if (emails.length > 0) {
    clauses.push('LOWER(email) IN (?)');
    values.push(emails);
  }
  if (phones.length > 0) {
    clauses.push('phone IN (?)');
    values.push(phones);
  }

  const [rows] = await dbOrConnection.query(
    `SELECT id, email, phone
     FROM md_prospects
     WHERE ${clauses.join(' OR ')}
     ORDER BY id ASC`,
    values
  );

  const byEmail = new Map();
  const byPhone = new Map();
  for (const row of rows) {
    const email = toNullableString(row.email)?.toLowerCase();
    const phone = toNullableString(row.phone);
    if (email && !byEmail.has(email)) {
      byEmail.set(email, row.id);
    }
    if (phone && !byPhone.has(phone)) {
      byPhone.set(phone, row.id);
    }
  }

  return { byEmail, byPhone };
};

const resolveDialCode = async (prospect, dbOrConnection) => {
  if (prospect.dial_code || !prospect.country_iso) {
    return prospect.dial_code || null;
  }

  const [countryRows] = await dbOrConnection.query(
    'SELECT dial_code FROM md_countries WHERE iso_code = ? LIMIT 1',
    [prospect.country_iso]
  );

  return countryRows[0]?.dial_code || null;
};

const insertProspectRow = async ({ row, columns, dbOrConnection }) => {
  const insertColumns = columns.filter((column) => row[column] !== undefined);
  const values = insertColumns.map((column) => row[column] ?? null);

  const [result] = await dbOrConnection.query(
    `INSERT INTO md_prospects (${insertColumns.join(', ')})
     VALUES (${insertColumns.map(() => '?').join(', ')})`,
    values
  );

  return result.insertId;
};

export const bulkInsertProspects = async (prospects, userId, langId = 'EN', db, sourcedByName = null) => {
  await ensureBulkDuplicateSchema();

  const stageCode = await getInitialStageCode(db);
  const defaultSourceId = await getDirectSourceId(db);
  const rows = Array.isArray(prospects) ? prospects : [];
  const candidateRows = rows.filter((p) => p.email || p.phone);

  if (candidateRows.length === 0) {
    return { inserted: 0, skipped: rows.length };
  }

  const existingMatches = await getExistingProspectMatches(db, candidateRows);
  const prospectColumns = await getProspectColumns(db);
  const insertableColumns = [
    'company_name',
    'contact_name',
    'first_name',
    'last_name',
    'job_title',
    'email',
    'phone',
    'country_iso',
    'dial_code',
    'linkedin_url',
    'twitter_url',
    'facebook_url',
    'instagram_url',
    'city',
    'state',
    'country',
    'website_url',
    'industry_id',
    'industry_size_id',
    'stage_code',
    'created_by',
    'source_id',
    'referral_name',
    'sourced_date',
    'sourced_by_name',
    'preferred_lang_id',
    'is_duplicate',
    'duplicate_of_prospect_id'
  ].filter((column) => prospectColumns.has(column));

  const seenKeys = new Map();
  let inserted = 0;
  let skipped = rows.length - candidateRows.length;

  for (const prospect of candidateRows) {
    try {
      const email = toNullableString(prospect.email)?.toLowerCase() || null;
      const phone = toNullableString(prospect.phone);
      const keys = [
        email ? `email:${email}` : null,
        phone ? `phone:${phone}` : null
      ].filter(Boolean);

      const existingDuplicateId = email && existingMatches.byEmail.has(email)
        ? existingMatches.byEmail.get(email)
        : phone && existingMatches.byPhone.has(phone)
          ? existingMatches.byPhone.get(phone)
          : null;
      const batchDuplicateId = keys.map((key) => seenKeys.get(key)).find(Boolean) || null;
      const duplicateOfProspectId = existingDuplicateId || batchDuplicateId;

      const sourceId = prospect.source_id || defaultSourceId;
      const row = {
        ...filterProspectUpdates(prospect),
        email,
        phone,
        source_id: sourceId,
        stage_code: prospect.stage_code || stageCode,
        created_by: userId || null,
        sourced_date: prospect.sourced_date || new Date(),
        sourced_by_name: prospect.sourced_by_name || sourcedByName || null,
        dial_code: await resolveDialCode(prospect, db),
        is_duplicate: duplicateOfProspectId ? 1 : 0,
        duplicate_of_prospect_id: duplicateOfProspectId
      };

      await assertProspectReferences(row, db);
      row.referral_name = await validateReferralName({
        sourceId,
        referralName: row.referral_name
      }, db);

      const prospectId = await insertProspectRow({
        row,
        columns: insertableColumns,
        dbOrConnection: db
      });

      inserted += 1;
      for (const key of keys) {
        if (!seenKeys.has(key)) {
          seenKeys.set(key, prospectId);
        }
      }
    } catch {
      skipped += 1;
    }
  }

  return { inserted, skipped };
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

    const prospectColumns = await getProspectColumns(connection);
    const columns = [
      'company_name', 'contact_name', 'first_name', 'last_name', 'job_title',
      'email', 'phone', 'country_iso', 'dial_code', 'linkedin_url',
      'twitter_url', 'facebook_url', 'instagram_url', 'city', 'state',
      'country', 'website_url', 'industry_id', 'industry_size_id', 'source_id',
      'referral_name', 'sourced_date', 'sourced_by_name', 'stage_code',
      'assigned_user_id', 'reason_id', 'notes', 'follow_up_date',
      'preferred_lang_id', 'created_by'
    ].filter((column) => prospectColumns.has(column));
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
    const prospectColumns = await getProspectColumns(connection);
    const [existingRows] = await connection.query('SELECT * FROM md_prospects WHERE id = ? FOR UPDATE', [id]);
    if (existingRows.length === 0) {
      throw CreateError(404, 'Prospect not found');
    }
    const oldProspect = existingRows[0];

    for (const column of Object.keys(safeUpdates)) {
      if (!prospectColumns.has(column)) {
        delete safeUpdates[column];
      }
    }

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

    if (safeUpdates.source_id !== undefined || safeUpdates.referral_name !== undefined) {
      safeUpdates.referral_name = await validateReferralName({
        sourceId: safeUpdates.source_id,
        referralName: safeUpdates.referral_name,
        currentProspectId: id
      }, connection);
    }
    await assertProspectReferences(safeUpdates, connection);

    if (Object.keys(safeUpdates).length === 0) {
      throw CreateError(400, 'No supported fields to update');
    }

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
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const transferProspects = async ({ prospectIds, toUserId, fromUserId, adminId }, db) => {
  const ids = (Array.isArray(prospectIds) ? prospectIds : [prospectIds])
    .map((id) => toNullablePositiveInteger(id, 'prospectId'))
    .filter((id) => id !== null);

  if (ids.length === 0) {
    throw CreateError(400, 'prospectIds is required');
  }

  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
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
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
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
