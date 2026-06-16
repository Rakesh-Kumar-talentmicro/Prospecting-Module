import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { STAGE_KEYS, isReasonRequiredStage } from '../constants/stages.js';

const REFERRAL_SOURCE_KEY = 'REFERRAL';
const DIRECT_SOURCE_KEY = 'DIRECT';
const PROCESS_BATCH_SIZE = Number(process.env.PROCESS_BATCH_SIZE || 50);

const allowedProspectColumns = new Set([
  'company_name',
  'first_name',
  'last_name',
  'contact_name',
  'job_title',
  'email',
  'phone',
  'city',
  'state',
  'country',
  'country_iso',
  'website_url',
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
  'preferred_lang_id',
  'prospect_key',
  'duplicate_count',
  'source_bd_id'
]);

const buildProspectKey = (phone, websiteUrl) => {
  const normPhone = String(phone || '').replace(/\s+/g, '').trim();
  let normWebsite = '';
  if (websiteUrl) {
    const raw = String(websiteUrl).trim();
    try {
      const withScheme = raw.startsWith('http') ? raw : `https://${raw}`;
      const u = new URL(withScheme);
      normWebsite = u.hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
      normWebsite = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
    }
  }
  return `${normPhone}_${normWebsite}`.toLowerCase();
};

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

const tableColumnCache = new Map();

const getTableColumns = async (tableName, connection) => {
  if (tableColumnCache.has(tableName)) return tableColumnCache.get(tableName);
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  const columns = new Set(rows.map((r) => r.COLUMN_NAME));
  tableColumnCache.set(tableName, columns);
  return columns;
};

export const createSingleProspect = async ({ prospect, userId }, db) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

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

    // Concatenate first name and last name into contact name if contact name isn't provided
    if (!newProspect.contact_name && (prospect.first_name || prospect.last_name)) {
      newProspect.contact_name = `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim() || null;
    }

    const prospectKey = buildProspectKey(newProspect.phone, newProspect.website_url);
    newProspect.prospect_key = prospectKey;

    if (prospectKey) {
      const [existing] = await connection.query(
        'SELECT id FROM md_prospects WHERE prospect_key = ? LIMIT 1',
        [prospectKey]
      );
      if (existing.length > 0) {
        throw CreateError(400, 'A prospect with this phone and website already exists');
      }
    }

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

    const columnsToInsert = [
      'company_name', 'contact_name', 'job_title', 'email', 'phone',
      'linkedin_url', 'twitter_url', 'facebook_url', 'instagram_url',
      'industry_id', 'industry_size_id', 'source_id', 'referral_name',
      'sourced_date', 'sourced_by_name', 'stage_code', 'assigned_user_id',
      'reason_id', 'notes', 'follow_up_date', 'preferred_lang_id', 'prospect_key', 'created_by', 'source_bd_id'
    ];

    const mdProspectsColumns = await getTableColumns('md_prospects', connection);

    const insertColumns = [];
    const insertValues = [];
    
    for (const col of columnsToInsert) {
      if (mdProspectsColumns.has(col)) {
        if (newProspect[col] !== undefined) {
          insertColumns.push(col);
          insertValues.push(newProspect[col]);
        } else if (col === 'created_by') {
          insertColumns.push(col);
          insertValues.push(userId || null);
        }
      }
    }

    const [result] = await connection.query(
      `INSERT INTO md_prospects (${insertColumns.join(', ')})
       VALUES (${insertColumns.map(() => '?').join(', ')})`,
      insertValues
    );

    const [rows] = await connection.query('SELECT * FROM md_prospects WHERE id = ?', [result.insertId]);
    await connection.query(
      `INSERT INTO td_prospect_update_logs (prospect_id, change_type, new_values, changed_by)
       VALUES (?, ?, ?, ?)`,
      [result.insertId, 'CREATE', JSON.stringify(rows[0]), userId || null]
    );

    await connection.commit();
    return rows[0];
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const bulkInsertProspects = async (prospects, userId, langId = 'EN', db, sourcedByName) => {
  const values = [];
  const InvalidProspect = [];

  const connection = await db.getConnection();
  try {
    const mdProspectsColumns = await getTableColumns('md_prospects', connection);

    // Columns that we support inserting
    const columnsToInsert = [
      'company_name', 'contact_name', 'job_title', 'email', 'phone',
      'linkedin_url', 'twitter_url', 'facebook_url', 'instagram_url',
      'industry_id', 'industry_size_id', 'source_id', 'referral_name',
      'stage_code', 'created_by', 'prospect_key'
    ];

    const activeColumns = columnsToInsert.filter(col => mdProspectsColumns.has(col));

    for (const p of prospects) {
      if (!p.email && !p.phone) {
        InvalidProspect.push(p);
        continue;
      }

      const prospectKey = buildProspectKey(p.phone, p.website_url);

      // Check for duplicate by prospect_key
      const [existing] = await connection.query(
        `SELECT id FROM md_prospects WHERE prospect_key = ? LIMIT 1`,
        [prospectKey]
      );
      if (existing.length > 0) continue;

      // Concatenate contact name if not provided
      if (!p.contact_name && (p.first_name || p.last_name)) {
        p.contact_name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || null;
      }

      // If country_iso is provided, fetch the dial_code automatically from md_countries (if Dial Code column exists in md_prospects)
      let dial_code = p.dial_code || null;
      if (p.country_iso && !dial_code && mdProspectsColumns.has('dial_code')) {
        const [countryRows] = await connection.query(
          `SELECT dial_code FROM md_countries WHERE iso_code = ? LIMIT 1`,
          [p.country_iso]
        );
        if (countryRows.length > 0) {
          dial_code = countryRows[0].dial_code;
        }
      }

      p.prospect_key = prospectKey;
      p.stage_code = p.stage_code || 1;
      p.created_by = userId || null;
      if (dial_code) p.dial_code = dial_code;

      const rowValues = activeColumns.map(col => p[col] ?? null);
      values.push(rowValues);
    }

    if (values.length === 0) {
      return { inserted: 0, skipped: prospects.length };
    }

    const [result] = await connection.query(
      `INSERT INTO md_prospects (${activeColumns.join(', ')}) VALUES ?`,
      [values]
    );

    return {
      inserted: result.affectedRows,
      skipped: prospects.length - result.affectedRows,
    };
  } finally {
    connection.release();
  }
};


export const updateProspect = async ({ id, updates, userId }, db) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const allowedFields = [
      'company_name',
      'first_name',
      'last_name',
      'job_title',
      'email',
      'phone',
      'city',
      'state',
      'country',
      'country_iso',
      'industry_id',
      'industry_size_id',
      'website_url',
      'preferred_lang_id',
      'referral_name'
    ];
    const [rows] = await connection.query(`SELECT * FROM md_prospects WHERE id = ? `,[id]);
    if (!rows.length) {
      await connection.rollback();
      return { success: false, message: 'Prospect not found'};
    }

    const oldRecord = rows[0];
    const updateFields = [];
    const params = [];
    const oldValues = {};
    const newValues = {};
    for (const [key, value] of Object.entries(updates)) {
      if (
        allowedFields.includes(key) &&
        oldRecord[key] !== value
      ) {
        updateFields.push(`${key} = ?`);
        params.push(value);
        oldValues[key] = oldRecord[key];
        newValues[key] = value;
      }
    }
    if (!updateFields.length) {
      await connection.rollback();
      return { success: false,message: 'No changes detected'};
    }

    updateFields.push('updated_at = NOW()');
    params.push(Number(id));
    await connection.query(`UPDATE md_prospects SET ${updateFields.join(', ')} WHERE id = ? `,params);
    await connection.query(
      `
        INSERT INTO td_prospect_update_logs
        (
          prospect_id,
          old_values,
          new_values,
          changed_by
        )
        VALUES (?, ?, ?, ?)
        `,
      [id,JSON.stringify(oldValues),JSON.stringify(newValues),userId]
    );

    await connection.commit();

    return {
      success: true,
      message: 'Prospect updated successfully'
    };

  } catch (err) {

    await connection.rollback();
    throw err;

  } finally {

    connection.release();
  }
};

export const moveStage = async ({ prospectId, newStage, reasonId, bd_id }, db) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [prospectRows] = await connection.query(
      `SELECT prospect_key,stage_code FROM md_prospects WHERE id = ? FOR UPDATE`, [prospectId]);
    if (!prospectRows.length) {
      throw CreateError(404, 'Prospect not found');
    }
    const prospectKey = prospectRows[0].prospect_key;
    const currentStage = prospectRows[0].stage_code;
    await connection.query(`UPDATE md_prospects SET stage_code = ? WHERE id = ?`, [newStage, prospectId]);
    await connection.query(`INSERT INTO td_prospect_stage_history (prospect_key,stage_code,reason_id,assigned_by) VALUES (?, ?, ?, ?)`, [prospectKey, newStage, reasonId, bd_id]);
    await connection.commit();
    return { success: true, from: currentStage, to: newStage, reasonId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const getProspectHistory = async (
    { prospectId },
    db
) => {

    const [prospectRows] =
        await db.query(
            `
            SELECT
                prospect_key
            FROM md_prospects
            WHERE id = ?
            `,
            [prospectId]
        );

    if (!prospectRows.length) {
        throw CreateError(
            404,
            'Prospect not found'
        );
    }

    const prospectKey =
        prospectRows[0].prospect_key;

    const [stageLogs] =
        await db.query(
            `
            SELECT *
            FROM td_prospect_stage_history
            WHERE prospect_key = ?
            ORDER BY created_at DESC
            `,
            [prospectKey]
        );

    const [transferLogs] =
        await db.query(
            `
            SELECT *
            FROM td_prospect_assignment
            WHERE prospect_key = ?
            ORDER BY created_at DESC
            `,
            [prospectKey]
        );

    const [updateLogs] =
        await db.query(
            `
            SELECT *
            FROM td_prospect_update_logs
            WHERE prospect_id = ?
            ORDER BY created_at DESC
            `,
            [prospectId]
        );

    return {
        stageLogs,
        transferLogs,
        updateLogs
    };
};

export const transferProspects = async (
    {
        prospectIds,
        newBdId,
        userId
    },
    db
) => {

    const connection =
        await db.getConnection();

    try {

        await connection.beginTransaction();

        const ids = Array.isArray(prospectIds)
            ? prospectIds.map(Number)
            : [Number(prospectIds)];

        const [prospects] =
            await connection.query(
                `
                SELECT
                    p.id,
                    p.prospect_key,
                    p.source_bd_id
                FROM md_prospects p
                WHERE p.id IN (?)
                FOR UPDATE
                `,
                [ids]
            );

        if (!prospects.length) {
            throw CreateError(
                404,
                'No prospects found'
            );
        }

        const assignmentRows = [];

        for (const prospect of prospects) {

            const [latestAssignment] =
                await connection.query(
                    `
                    SELECT
                        new_bd_id
                    FROM td_prospect_assignment
                    WHERE prospect_key = ?
                    ORDER BY id DESC
                    LIMIT 1
                    `,
                    [prospect.prospect_key]
                );

            const oldBdId =
                latestAssignment.length
                    ? latestAssignment[0].new_bd_id
                    : prospect.source_bd_id;

            assignmentRows.push([
                prospect.prospect_key,
                newBdId,
                oldBdId,
                userId
            ]);
        }

        await connection.query(
            `
            INSERT INTO td_prospect_assignment
            (
                prospect_key,
                new_bd_id,
                old_bd_id,
                assigned_by
            )
            VALUES ?
            `,
            [assignmentRows]
        );

        await connection.commit();

        return {
            success: true,
            message: 'Prospects transferred successfully',
            transferredCount:
                prospects.length
        };

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

export const processProspect = async () => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    /* ---------------------------------------------
       STEP 1: PICK BATCH
    --------------------------------------------- */

    const [tdProspectsRows] =
      await connection.query(
        `
        SELECT
          id,
          company_name,
          first_name,
          last_name,
          job_title,
          email,
          phone,
          city,
          state,
          country,
          industry_id,
          industry_size_id,
          website_url,
          source_id,
          referral_name,
          preferred_lang_id,
          source_bd_id AS bd_id,
          duplicate_count,
          prospect_key
        FROM td_prospects
        WHERE status = 1
        ORDER BY id
        LIMIT ?
        FOR UPDATE SKIP LOCKED
        `,
        [PROCESS_BATCH_SIZE]
      );

    if (!tdProspectsRows.length) {
      await connection.commit();
      return {
        processed: 0
      };
    }

    const ids = tdProspectsRows.map(r => r.id);

    await connection.query(
      `
      UPDATE td_prospects
      SET status = 2
      WHERE id IN (?)
      `,
      [ids]
    );

    const prospectKey = tdProspectsRows.map(r => r.prospect_key);
    const [existingRows] =
      await connection.query(
        `
        SELECT id, prospect_key
        FROM md_prospects
        WHERE prospect_key IN (?)
        `,
        [prospectKey]
      );

    const existingMap = new Map();
    for (const row of existingRows) {
      existingMap.set(row.prospect_key, row.id);
    }

    /* ---------------------------------------------
       STEP 4: PREPARE BULK ARRAYS
    --------------------------------------------- */
    const mdProspectsValues = [];
    const assignmentValues = [];
    const stageValues = [];
    const duplicateValues = [];
    for (const row of tdProspectsRows) {
      const alreadyExists = existingMap.has(row.prospect_key);

      /* -----------------------------------------
         DUPLICATE
      ----------------------------------------- */

      if (alreadyExists) {
        const prospectId = existingMap.get(row.prospect_key);
        duplicateValues.push([
          '00000000-0000-0000-0000-000000000000', // import_uuid
          row.prospect_key,
          'duplicate_existing',                   // stage_status
          prospectId || null,                     // prospect_id
          row.duplicate_count || 1,               // count
          row.bd_id || null                       // created_by
        ]);

        continue;
      }

      existingMap.set(row.prospect_key, true);

      /* -----------------------------------------
         md_prospects
      ----------------------------------------- */

      mdProspectsValues.push([
        row.company_name,
        row.first_name,
        row.last_name,
        row.job_title,
        row.email,
        row.phone,
        row.city,
        row.state,
        row.country,
        row.industry_id,
        row.industry_size_id,
        row.website_url,
        row.source_id,
        row.referral_name,
        row.preferred_lang_id,
        row.bd_id,
        row.prospect_key
      ]);

      /* -----------------------------------------
         assignment
      ----------------------------------------- */

      assignmentValues.push([
        row.prospect_key,
        row.bd_id,
        null,
        row.bd_id || null
      ]);

      /* -----------------------------------------
         stage
      ----------------------------------------- */

      stageValues.push([
        row.prospect_key,
        1,
        null,
        row.bd_id
      ]);
    }

    /* ---------------------------------------------
       STEP 5: INSERT md_prospects
    --------------------------------------------- */

    if (mdProspectsValues.length) {

      await connection.query(
        `
        INSERT IGNORE INTO md_prospects (
          company_name,
          first_name,
          last_name,
          job_title,
          email,
          phone,
          city,
          state,
          country,
          industry_id,
          industry_size_id,
          website_url,
          source_id,
          referral_name,
          preferred_lang_id,
          created_by,
          prospect_key
        )
        VALUES ?
        `,
        [mdProspectsValues]
      );
    }

    /* ---------------------------------------------
       STEP 6: INSERT ASSIGNMENT
    --------------------------------------------- */

    if (assignmentValues.length) {

      await connection.query(
        `
        INSERT INTO td_prospect_assignment (
          prospect_key,
          new_bd_id,
          old_bd_id,
          assigned_by
        )
        VALUES ?
        `,
        [assignmentValues]
      );
    }

    /* ---------------------------------------------
       STEP 7: INSERT STAGE HISTORY
    --------------------------------------------- */

    if (stageValues.length) {

      await connection.query(
        `
        INSERT INTO td_prospect_stage_history (
          prospect_key,
          stage_code,
          reason_id,
          assigned_by
        )
        VALUES ?
        `,
        [stageValues]
      );
    }

    /* ---------------------------------------------
       STEP 8: INSERT DUPLICATES
    --------------------------------------------- */

    if (duplicateValues.length) {

      await connection.query(
        `
        INSERT INTO td_duplicate (
          import_uuid,
          prospect_key,
          stage_status,
          prospect_id,
          count,
          created_by
        )
        VALUES ?
        `,
        [duplicateValues]
      );
    }

    /* ---------------------------------------------
       STEP 9: MARK COMPLETED
    --------------------------------------------- */

    await connection.query(
      `
      UPDATE td_prospects
      SET status = 3
      WHERE id IN (?)
      `,
      [ids]
    );

    await connection.commit();

    return {
      processed: tdProspectsRows.length,
      inserted: mdProspectsValues.length,
      duplicates: duplicateValues.length
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