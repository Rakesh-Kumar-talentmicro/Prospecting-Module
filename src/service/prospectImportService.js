import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import { parse as parseCsv } from '@fast-csv/parse';
import ExcelJS from 'exceljs';
import db from '../config/db.js';
import { importProgressRedis } from '../config/importRedis.js';
import { prospectImportQueue } from '../queue/prospectImportQueue.js';
import { CreateError } from '../middleware/createError.js';
import { normalizeInputData } from '../utils/normalizeUtils.js';
import { prospectMapping } from '../model/prospectModel/prospectMapping.js';
import { STAGE_KEYS } from '../constants/stages.js';

const IMPORT_STATUS = {
  PROCESSING: 0,
  SUCCESS: 1,
  ERROR: 2
};

const ROW_STATUS = {
  IMPORTED: 1,
  SKIPPED: 2,
  DUPLICATE: 3
};

const IMPORT_BATCH_SIZE = Number(process.env.IMPORT_BATCH_SIZE || 2000);
const PROGRESS_TTL_SECONDS = Number(process.env.IMPORT_PROGRESS_TTL_SECONDS || 7 * 24 * 60 * 60);
const QUEUE_OPERATION_TIMEOUT_MS = Number(process.env.IMPORT_QUEUE_OPERATION_TIMEOUT_MS || 10000);
const IMPORT_ROOT = path.resolve(process.env.IMPORT_STORAGE_DIR || 'storage/imports');
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supportedExtensions = new Set(['.csv', '.xlsx']);
const frontendKeysByDbKey = new Map(prospectMapping.map(([dbKey, frontendKey]) => [dbKey, frontendKey]));
const allowedHeaders = new Set([
  ...prospectMapping.flatMap(([dbKey, frontendKey]) => [dbKey, frontendKey]),
  // Accept common template/header aliases explicitly.
  'follow_up_date',
  'sourced_date',
  'preferred_lang_id',
  'contact_name',
  'company_name'
]);
const importColumns = [
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
  'preferred_lang_id',
  'created_by',
  'import_uuid',
  'source_row_number',
  'is_duplicate',
  'duplicate_of_prospect_id'
];

let schemaPromise = null;
const tableColumnCache = new Map();

const progressKey = (uuid) => `import:prospects:${uuid}`;

const sanitizeError = (err) => {
  const message = err?.message || String(err || 'Unknown import error');
  return message.replace(/\s+/g, ' ').trim().slice(0, 1000);
};

const normalizeUUID = (value) => {
  const uuid = value ? String(value).trim() : randomUUID();
  if (!UUID_REGEX.test(uuid)) {
    throw CreateError(400, 'importUUID must be a valid UUID');
  }

  return uuid.toLowerCase();
};

const toNullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
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
    throw new Error(`Invalid ${fieldName}`);
  }

  return normalized;
};

const parseDateValue = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Invalid ${fieldName}`);
    }
    return value;
  }

  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value).trim())) {
    const serial = Number(value);
    if (serial > 20000 && serial < 80000) {
      return new Date(Date.UTC(1899, 11, 30) + serial * 24 * 60 * 60 * 1000);
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return parsed;
};

const cellToValue = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'result')) {
      return cellToValue(value.result);
    }

    if (Object.prototype.hasOwnProperty.call(value, 'text')) {
      return value.text;
    }

    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('');
    }
  }

  return value;
};

const normalizeHeader = (header) => String(cellToValue(header) || '').trim();

const cleanRawRow = (row) => {
  const cleaned = {};

  for (const [key, rawValue] of Object.entries(row || {})) {
    const normalizedKey = normalizeHeader(key);
    if (!normalizedKey) {
      continue;
    }

    const value = cellToValue(rawValue);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') {
        cleaned[normalizedKey] = trimmed;
      }
      continue;
    }

    if (value !== undefined && value !== null && value !== '') {
      cleaned[normalizedKey] = value;
    }
  }

  return cleaned;
};

const getRawValue = (cleanedRow, dbKey) => {
  const frontendKey = frontendKeysByDbKey.get(dbKey);
  if (cleanedRow[dbKey] !== undefined) {
    return cleanedRow[dbKey];
  }
  if (frontendKey && cleanedRow[frontendKey] !== undefined) {
    return cleanedRow[frontendKey];
  }
  return undefined;
};

const validateHeaders = (headers) => {
  const normalizedHeaders = headers.map(normalizeHeader).filter(Boolean);

  if (normalizedHeaders.length === 0) {
    throw new Error('Import file must contain a header row');
  }

  const duplicateHeaders = normalizedHeaders.filter((header, index) => normalizedHeaders.indexOf(header) !== index);
  if (duplicateHeaders.length > 0) {
    throw new Error(`Duplicate import headers: ${[...new Set(duplicateHeaders)].join(', ')}`);
  }

  const unsupportedHeaders = normalizedHeaders.filter((header) => !allowedHeaders.has(header));
  if (unsupportedHeaders.length > 0) {
    throw new Error(`Unsupported import headers: ${unsupportedHeaders.join(', ')}`);
  }

  const hasContactHeader = normalizedHeaders.some((header) => (
    header === 'email'
    || header === 'emailAddress'
    || header === 'phone'
    || header === 'phoneNumber'
  ));

  if (!hasContactHeader) {
    throw new Error('Import file must include email/emailAddress or phone/phoneNumber');
  }

  return normalizedHeaders;
};

const hashFile = async (filePath) => {
  const hash = createHash('sha256');

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });

  return hash.digest('hex');
};

const safeDeleteFile = async (filePath) => {
  try {
    await fsp.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Unable to delete import file ${filePath}:`, err.message);
    }
  }
};

const withTimeout = (promise, timeoutMs, message) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error(message));
  }, timeoutMs);

  promise
    .then((value) => {
      clearTimeout(timeout);
      resolve(value);
    })
    .catch((err) => {
      clearTimeout(timeout);
      reject(err);
    });
});

const ensureProgressRedisReady = async () => {
  if (importProgressRedis.status === 'ready') {
    return;
  }

  if (importProgressRedis.status === 'wait' || importProgressRedis.status === 'end') {
    await withTimeout(
      importProgressRedis.connect(),
      Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
      'Timed out while connecting to Redis progress cache'
    );
    return;
  }

  await withTimeout(
    new Promise((resolve, reject) => {
      const cleanup = () => {
        importProgressRedis.off('ready', onReady);
        importProgressRedis.off('error', onError);
      };
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = (err) => {
        cleanup();
        reject(err);
      };

      importProgressRedis.once('ready', onReady);
      importProgressRedis.once('error', onError);
    }),
    Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
    'Timed out while connecting to Redis progress cache'
  );
};

const deleteRedisProgress = async (uuid) => {
  await ensureProgressRedisReady();
  await importProgressRedis.del(progressKey(uuid));
};

const columnExists = async (tableName, columnName) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return Number(rows[0]?.count || 0) > 0;
};

const indexExists = async (tableName, indexName) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );

  return Number(rows[0]?.count || 0) > 0;
};

const addColumnIfMissing = async (tableName, columnName, definition) => {
  if (await columnExists(tableName, columnName)) {
    return;
  }

  try {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
    tableColumnCache.delete(tableName);
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      throw err;
    }
  }
};

const addIndexIfMissing = async (tableName, indexName, ddl) => {
  if (await indexExists(tableName, indexName)) {
    return;
  }

  try {
    await db.query(ddl);
  } catch (err) {
    if (err.code !== 'ER_DUP_KEYNAME') {
      throw err;
    }
  }
};

const dropIndexIfExists = async (tableName, indexName) => {
  if (!(await indexExists(tableName, indexName))) {
    return;
  }

  try {
    await db.query(`ALTER TABLE ${tableName} DROP INDEX ${indexName}`);
  } catch (err) {
    if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
      throw err;
    }
  }
};

export const ensureImportSchema = async () => {
  if (schemaPromise) {
    return schemaPromise;
  }

  schemaPromise = (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS import_jobs (
        uuid CHAR(36) PRIMARY KEY,
        status TINYINT NOT NULL DEFAULT 0,
        file_path VARCHAR(1024) NOT NULL,
        file_hash CHAR(64) NULL,
        total_batch_size INT NOT NULL DEFAULT 2000,
        total_rows BIGINT NOT NULL DEFAULT 0,
        total_import BIGINT NOT NULL DEFAULT 0,
        processed_rows BIGINT NOT NULL DEFAULT 0,
        duplicate_rows BIGINT NOT NULL DEFAULT 0,
        skipped_rows BIGINT NOT NULL DEFAULT 0,
        error_message TEXT NULL,
        uploaded_by BIGINT NULL,
        sourced_by_name VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        INDEX idx_import_jobs_status (status),
        INDEX idx_import_jobs_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS prospect_import_rows (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        import_uuid CHAR(36) NOT NULL,
        source_row_number BIGINT NOT NULL,
        status TINYINT NOT NULL,
        prospect_id BIGINT NULL,
        error_message TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_import_source_row (import_uuid, source_row_number),
        INDEX idx_import_rows_uuid_status (import_uuid, status),
        INDEX idx_import_rows_prospect (prospect_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await addColumnIfMissing('md_prospects', 'import_uuid', 'import_uuid CHAR(36) NULL');
    await addColumnIfMissing('md_prospects', 'source_row_number', 'source_row_number BIGINT NULL');
    await addColumnIfMissing('md_prospects', 'is_duplicate', 'is_duplicate TINYINT NOT NULL DEFAULT 0');
    await addColumnIfMissing(
      'md_prospects',
      'duplicate_of_prospect_id',
      'duplicate_of_prospect_id BIGINT NULL'
    );
    await addIndexIfMissing(
      'md_prospects',
      'uq_md_prospects_import_row',
      'ALTER TABLE md_prospects ADD UNIQUE KEY uq_md_prospects_import_row (import_uuid, source_row_number)'
    );
    await addIndexIfMissing(
      'md_prospects',
      'idx_md_prospects_import_uuid',
      'ALTER TABLE md_prospects ADD INDEX idx_md_prospects_import_uuid (import_uuid)'
    );
    await addIndexIfMissing(
      'md_prospects',
      'idx_md_prospects_duplicate_of',
      'ALTER TABLE md_prospects ADD INDEX idx_md_prospects_duplicate_of (duplicate_of_prospect_id)'
    );

    // This repo's older table model has a composite prospect uniqueness key.
    // Bulk imports intentionally allow duplicate prospects when they are flagged.
    await dropIndexIfExists('md_prospects', 'uq_prospect');
  })();

  try {
    await schemaPromise;
  } catch (err) {
    schemaPromise = null;
    throw err;
  }
};

const getTableColumns = async (tableName) => {
  if (tableColumnCache.has(tableName)) {
    return tableColumnCache.get(tableName);
  }

  const [rows] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );
  const columns = new Set(rows.map((row) => row.COLUMN_NAME));
  tableColumnCache.set(tableName, columns);
  return columns;
};

const getInitialStageCode = async (dbOrConnection) => {
  const [firstStageRows] = await dbOrConnection.query(
    'SELECT stage_code FROM md_stages WHERE stage_key = ? LIMIT 1',
    [STAGE_KEYS.PENDING]
  );

  if (firstStageRows.length > 0) {
    return firstStageRows[0].stage_code;
  }

  const [anyFirst] = await dbOrConnection.query(
    'SELECT stage_code FROM md_stages ORDER BY COALESCE(seq, stage_code), stage_code LIMIT 1'
  );
  return anyFirst[0]?.stage_code || 1;
};

const getDirectSourceId = async (dbOrConnection) => {
  const [rows] = await dbOrConnection.query(
    'SELECT source_id FROM md_sources WHERE UPPER(source_key) = ? ORDER BY source_id LIMIT 1',
    ['DIRECT']
  );

  if (rows.length > 0) {
    return rows[0].source_id;
  }

  return 1;
};

const loadImportLookups = async () => {
  const [sourceRows] = await db.query('SELECT source_id, source_key FROM md_sources');
  const [industryRows] = await db.query('SELECT industry_id FROM md_industry_types');
  const [industrySizeRows] = await db.query('SELECT industry_size_id FROM md_industry_size');

  return {
    directSourceId: await getDirectSourceId(db),
    initialStageCode: await getInitialStageCode(db),
    sourceIds: new Set(sourceRows.map((row) => Number(row.source_id))),
    sourceKeys: new Map(sourceRows.map((row) => [
      Number(row.source_id),
      String(row.source_key || '').trim().toUpperCase()
    ])),
    industryIds: new Set(industryRows.map((row) => Number(row.industry_id))),
    industrySizeIds: new Set(industrySizeRows.map((row) => Number(row.industry_size_id)))
  };
};

const buildImportProspect = ({ rawRow, sourceRowNumber, uuid, uploadedBy, sourcedByName, lookups }) => {
  const cleanedRow = cleanRawRow(rawRow);
  const normalized = normalizeInputData([cleanedRow], prospectMapping)[0];

  const email = toNullableString(normalized.email)?.toLowerCase() || null;
  const phone = toNullableString(normalized.phone);

  if (!email && !phone) {
    throw new Error('email or phone is required');
  }

  if (email && !EMAIL_REGEX.test(email)) {
    throw new Error('Invalid email');
  }

  const industryId = toNullablePositiveInteger(normalized.industry_id, 'industry_id');
  if (industryId !== null && !lookups.industryIds.has(industryId)) {
    throw new Error('Invalid industry_id');
  }

  const industrySizeId = toNullablePositiveInteger(normalized.industry_size_id, 'industry_size_id');
  if (industrySizeId !== null && !lookups.industrySizeIds.has(industrySizeId)) {
    throw new Error('Invalid industry_size_id');
  }

  const sourceId = toNullablePositiveInteger(normalized.source_id, 'source_id') || lookups.directSourceId;
  if (!lookups.sourceIds.has(sourceId)) {
    throw new Error('Invalid source_id');
  }

  const sourceKey = lookups.sourceKeys.get(sourceId);
  const referralName = toNullableString(normalized.referral_name);
  if (sourceKey === 'REFERRAL' && !referralName) {
    throw new Error('referral_name is required when source is Referral');
  }
  if (sourceKey !== 'REFERRAL' && referralName) {
    throw new Error('referral_name is allowed only when source is Referral');
  }

  const sourcedDate = parseDateValue(getRawValue(cleanedRow, 'sourced_date'), 'sourced_date') || new Date();
  const followUpDate = parseDateValue(getRawValue(cleanedRow, 'follow_up_date'), 'follow_up_date');

  return {
    sourceRowNumber,
    email,
    phone,
    data: {
      company_name: toNullableString(normalized.company_name),
      contact_name: toNullableString(normalized.contact_name),
      first_name: toNullableString(normalized.first_name),
      last_name: toNullableString(normalized.last_name),
      job_title: toNullableString(normalized.job_title),
      email,
      phone,
      linkedin_url: toNullableString(normalized.linkedin_url),
      twitter_url: toNullableString(normalized.twitter_url),
      facebook_url: toNullableString(normalized.facebook_url),
      instagram_url: toNullableString(normalized.instagram_url),
      city: toNullableString(normalized.city),
      state: toNullableString(normalized.state),
      country: toNullableString(normalized.country),
      website_url: toNullableString(normalized.website_url),
      industry_id: industryId,
      industry_size_id: industrySizeId,
      source_id: sourceId,
      referral_name: referralName,
      sourced_date: sourcedDate,
      sourced_by_name: toNullableString(normalized.sourced_by_name) || sourcedByName || null,
      stage_code: lookups.initialStageCode,
      assigned_user_id: toNullablePositiveInteger(normalized.assigned_user_id, 'assigned_user_id'),
      reason_id: toNullablePositiveInteger(normalized.reason_id, 'reason_id'),
      notes: toNullableString(normalized.notes),
      follow_up_date: followUpDate,
      preferred_lang_id: toNullableString(normalized.preferred_lang_id) || 'EN',
      created_by: uploadedBy || null,
      import_uuid: uuid,
      source_row_number: sourceRowNumber,
      is_duplicate: 0,
      duplicate_of_prospect_id: null
    }
  };
};

const serializeProgress = (progress) => ({
  uuid: progress.uuid,
  totalBatchSize: Number(progress.totalBatchSize || 0),
  totalRows: Number(progress.totalRows || 0),
  totalImport: Number(progress.totalImport || 0),
  processedRows: Number(progress.processedRows || 0),
  duplicateRows: Number(progress.duplicateRows || 0),
  skippedRows: Number(progress.skippedRows || 0),
  status: Number(progress.status || 0),
  error: progress.error || null
});

const writeRedisProgress = async (progress) => {
  await ensureProgressRedisReady();
  const key = progressKey(progress.uuid);
  await importProgressRedis.hset(key, {
    uuid: progress.uuid,
    totalBatchSize: String(progress.totalBatchSize || 0),
    totalRows: String(progress.totalRows || 0),
    totalImport: String(progress.totalImport || 0),
    processedRows: String(progress.processedRows || 0),
    duplicateRows: String(progress.duplicateRows || 0),
    skippedRows: String(progress.skippedRows || 0),
    status: String(progress.status ?? IMPORT_STATUS.PROCESSING),
    error: progress.error || ''
  });
  await importProgressRedis.expire(key, PROGRESS_TTL_SECONDS);
};

const progressFromJobRow = (row) => serializeProgress({
  uuid: row.uuid,
  totalBatchSize: row.total_batch_size,
  totalRows: row.total_rows,
  totalImport: row.total_import,
  processedRows: row.processed_rows,
  duplicateRows: row.duplicate_rows,
  skippedRows: row.skipped_rows,
  status: row.status,
  error: row.error_message
});

const refreshProgressFromDb = async (uuid, totalRows = null) => {
  const [rows] = await db.query(
    `SELECT
       COUNT(*) AS processed_rows,
       COALESCE(SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END), 0) AS total_import,
       COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS duplicate_rows,
       COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS skipped_rows
     FROM prospect_import_rows
     WHERE import_uuid = ?`,
    [ROW_STATUS.IMPORTED, ROW_STATUS.DUPLICATE, ROW_STATUS.DUPLICATE, ROW_STATUS.SKIPPED, uuid]
  );
  const stats = rows[0] || {};

  await db.query(
    `UPDATE import_jobs
     SET total_rows = COALESCE(?, total_rows),
         total_import = ?,
         processed_rows = ?,
         duplicate_rows = ?,
         skipped_rows = ?
     WHERE uuid = ?`,
    [
      totalRows,
      Number(stats.total_import || 0),
      Number(stats.processed_rows || 0),
      Number(stats.duplicate_rows || 0),
      Number(stats.skipped_rows || 0),
      uuid
    ]
  );

  const [jobRows] = await db.query('SELECT * FROM import_jobs WHERE uuid = ? LIMIT 1', [uuid]);
  if (jobRows.length === 0) {
    throw new Error('Import job not found');
  }

  const progress = progressFromJobRow(jobRows[0]);
  if (progress.status === IMPORT_STATUS.PROCESSING) {
    await writeRedisProgress(progress);
  }

  return progress;
};

export const startProspectImport = async ({ file, importUUID, uploadedBy, sourcedByName }) => {
  await ensureImportSchema();

  if (!file) {
    throw CreateError(400, 'file is required');
  }

  const ext = path.extname(file.originalname || file.path || '').toLowerCase();
  if (!supportedExtensions.has(ext)) {
    await safeDeleteFile(file.path);
    throw CreateError(400, 'Only CSV and XLSX prospect import files are supported');
  }

  const uuid = normalizeUUID(importUUID);
  const [existingRows] = await db.query('SELECT * FROM import_jobs WHERE uuid = ? LIMIT 1', [uuid]);
  if (existingRows.length > 0) {
    await safeDeleteFile(file.path);
    return {
      uuid,
      status: existingRows[0].status,
      existing: true
    };
  }

  const targetDir = path.join(IMPORT_ROOT, uuid);
  const filePath = path.join(targetDir, `original${ext}`);

  await fsp.mkdir(targetDir, { recursive: true });
  await fsp.rename(file.path, filePath);

  try {
    await db.query(
      `INSERT INTO import_jobs
         (uuid, status, file_path, total_batch_size, uploaded_by, sourced_by_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid, IMPORT_STATUS.PROCESSING, filePath, IMPORT_BATCH_SIZE, uploadedBy || null, sourcedByName || null]
    );

    await writeRedisProgress({
      uuid,
      totalBatchSize: IMPORT_BATCH_SIZE,
      totalRows: 0,
      totalImport: 0,
      processedRows: 0,
      duplicateRows: 0,
      skippedRows: 0,
      status: IMPORT_STATUS.PROCESSING,
      error: null
    });

    await withTimeout(
      prospectImportQueue.add(
        'prospect-import',
        {
          uuid,
          filePath,
          uploadedBy: uploadedBy || null,
          sourcedByName: sourcedByName || null
        },
        {
          jobId: uuid
        }
      ),
      QUEUE_OPERATION_TIMEOUT_MS,
      'Timed out while enqueueing prospect import job'
    );
  } catch (err) {
    await db.query(
      `UPDATE import_jobs
       SET status = ?, error_message = ?, completed_at = NOW()
       WHERE uuid = ?`,
      [IMPORT_STATUS.ERROR, sanitizeError(err), uuid]
    ).catch(() => {});
    await deleteRedisProgress(uuid).catch(() => {});
    throw err;
  }

  return {
    uuid,
    status: IMPORT_STATUS.PROCESSING,
    existing: false
  };
};

export const getImportStatus = async (uuidValue) => {
  await ensureImportSchema();
  const uuid = normalizeUUID(uuidValue);

  const redisProgress = await (async () => {
    await ensureProgressRedisReady();
    return importProgressRedis.hgetall(progressKey(uuid));
  })().catch(() => ({}));
  if (redisProgress && Object.keys(redisProgress).length > 0) {
    return serializeProgress(redisProgress);
  }

  const [rows] = await db.query('SELECT * FROM import_jobs WHERE uuid = ? LIMIT 1', [uuid]);
  if (rows.length === 0) {
    throw CreateError(404, 'Import job not found');
  }

  return progressFromJobRow(rows[0]);
};

const inspectCsvFile = async (filePath) => {
  let headers = [];
  let totalRows = 0;

  const stream = fs.createReadStream(filePath);
  const parser = stream.pipe(parseCsv({
    headers: (headerRow) => headerRow.map(normalizeHeader),
    ignoreEmpty: true,
    trim: true
  }));

  stream.on('error', (err) => parser.destroy(err));
  parser.on('headers', (headerRow) => {
    headers = headerRow;
  });

  for await (const row of parser) {
    if (Object.keys(cleanRawRow(row)).length > 0) {
      totalRows += 1;
    }
  }

  validateHeaders(headers);
  return { headers, totalRows };
};

const rowValues = (row) => {
  const values = [];
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    values[colNumber - 1] = cellToValue(cell.value);
  });
  return values;
};

const inspectXlsxFile = async (filePath) => {
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    entries: 'emit',
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    worksheets: 'emit'
  });

  let headers = [];
  let totalRows = 0;

  for await (const worksheetReader of workbookReader) {
    for await (const row of worksheetReader) {
      if (row.number === 1) {
        headers = rowValues(row).map(normalizeHeader);
        validateHeaders(headers);
        continue;
      }

      const values = rowValues(row);
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });

      if (Object.keys(cleanRawRow(rowData)).length > 0) {
        totalRows += 1;
      }
    }
    break;
  }

  if (headers.length === 0) {
    validateHeaders(headers);
  }

  return { headers, totalRows };
};

async function* readCsvRows(filePath) {
  let rowIndex = 1;
  const stream = fs.createReadStream(filePath);
  const parser = stream.pipe(parseCsv({
    headers: (headerRow) => headerRow.map(normalizeHeader),
    ignoreEmpty: true,
    trim: true
  }));

  stream.on('error', (err) => parser.destroy(err));

  for await (const row of parser) {
    const cleanedRow = cleanRawRow(row);
    if (Object.keys(cleanedRow).length === 0) {
      continue;
    }

    rowIndex += 1;
    yield {
      sourceRowNumber: rowIndex,
      rawRow: row
    };
  }
}

async function* readXlsxRows(filePath) {
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    entries: 'emit',
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    worksheets: 'emit'
  });

  for await (const worksheetReader of workbookReader) {
    let headers = [];

    for await (const row of worksheetReader) {
      if (row.number === 1) {
        headers = rowValues(row).map(normalizeHeader);
        continue;
      }

      const values = rowValues(row);
      const rawRow = {};
      headers.forEach((header, index) => {
        rawRow[header] = values[index];
      });

      if (Object.keys(cleanRawRow(rawRow)).length === 0) {
        continue;
      }

      yield {
        sourceRowNumber: row.number,
        rawRow
      };
    }
    break;
  }
}

const inspectImportFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') {
    return inspectCsvFile(filePath);
  }
  if (ext === '.xlsx') {
    return inspectXlsxFile(filePath);
  }
  throw new Error('Unsupported import file type');
};

const readImportRows = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') {
    return readCsvRows(filePath);
  }
  if (ext === '.xlsx') {
    return readXlsxRows(filePath);
  }
  throw new Error('Unsupported import file type');
};

const getExistingImportRows = async (connection, uuid, sourceRowNumbers) => {
  if (sourceRowNumbers.length === 0) {
    return new Set();
  }

  const [rows] = await connection.query(
    `SELECT source_row_number
     FROM prospect_import_rows
     WHERE import_uuid = ?
       AND source_row_number IN (?)`,
    [uuid, sourceRowNumbers]
  );

  return new Set(rows.map((row) => Number(row.source_row_number)));
};

const getExistingProspectMatches = async (connection, validRows) => {
  const emails = [...new Set(validRows.map((row) => row.email).filter(Boolean))];
  const phones = [...new Set(validRows.map((row) => row.phone).filter(Boolean))];

  if (emails.length === 0 && phones.length === 0) {
    return {
      byEmail: new Map(),
      byPhone: new Map()
    };
  }

  const clauses = [];
  const values = [];
  if (emails.length > 0) {
    clauses.push('email IN (?)');
    values.push(emails);
  }
  if (phones.length > 0) {
    clauses.push('phone IN (?)');
    values.push(phones);
  }

  const [rows] = await connection.query(
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

const markRowDuplicate = ({ row, duplicateOfProspectId = null, duplicateOfSourceRowNumber = null }) => {
  row.data.is_duplicate = 1;
  row.data.duplicate_of_prospect_id = duplicateOfProspectId;
  row.duplicateOfSourceRowNumber = duplicateOfSourceRowNumber;
  return row;
};

const applyDuplicateFlags = ({ validRows, existingMatches, seenKeys }) => {
  const firstSourceRowByKey = new Map();

  for (const row of validRows) {
    const keys = [
      row.email ? `email:${row.email}` : null,
      row.phone ? `phone:${row.phone}` : null
    ].filter(Boolean);

    const existingDuplicateId = row.email && existingMatches.byEmail.has(row.email)
      ? existingMatches.byEmail.get(row.email)
      : row.phone && existingMatches.byPhone.has(row.phone)
        ? existingMatches.byPhone.get(row.phone)
        : null;

    const duplicateKey = keys.find((key) => seenKeys.has(key) || firstSourceRowByKey.has(key));
    if (existingDuplicateId) {
      markRowDuplicate({ row, duplicateOfProspectId: existingDuplicateId });
    } else if (duplicateKey) {
      markRowDuplicate({
        row,
        duplicateOfSourceRowNumber: firstSourceRowByKey.get(duplicateKey) || null
      });
    }

    for (const key of keys) {
      if (!firstSourceRowByKey.has(key)) {
        firstSourceRowByKey.set(key, row.sourceRowNumber);
      }
      seenKeys.add(key);
    }
  }
};

const insertImportRowStatuses = async (connection, rows) => {
  if (rows.length === 0) {
    return;
  }

  await connection.query(
    `INSERT INTO prospect_import_rows
       (import_uuid, source_row_number, status, prospect_id, error_message)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       prospect_id = VALUES(prospect_id),
       error_message = VALUES(error_message),
       updated_at = NOW()`,
    [rows]
  );
};

const processImportBatch = async ({ uuid, batch, uploadedBy, sourcedByName, lookups, seenKeys }) => {
  if (batch.length === 0) {
    return;
  }

  const connection = await db.getConnection();
  const sourceRowNumbers = batch.map((row) => row.sourceRowNumber);

  try {
    const existingImportRows = await getExistingImportRows(connection, uuid, sourceRowNumbers);
    const rowsToProcess = batch.filter((row) => !existingImportRows.has(row.sourceRowNumber));
    if (rowsToProcess.length === 0) {
      return;
    }

    const skippedRows = [];
    const validRows = [];

    for (const row of rowsToProcess) {
      try {
        validRows.push(buildImportProspect({
          rawRow: row.rawRow,
          sourceRowNumber: row.sourceRowNumber,
          uuid,
          uploadedBy,
          sourcedByName,
          lookups
        }));
      } catch (err) {
        skippedRows.push([
          uuid,
          row.sourceRowNumber,
          ROW_STATUS.SKIPPED,
          null,
          sanitizeError(err)
        ]);
      }
    }

    const existingMatches = await getExistingProspectMatches(connection, validRows);
    applyDuplicateFlags({ validRows, existingMatches, seenKeys });

    const mdProspectColumns = await getTableColumns('md_prospects');
    const columns = importColumns.filter((column) => mdProspectColumns.has(column));
    const prospectValues = validRows.map((row) => columns.map((column) => row.data[column] ?? null));

    await connection.beginTransaction();

    if (prospectValues.length > 0) {
      await connection.query(
        `INSERT IGNORE INTO md_prospects (${columns.join(', ')})
         VALUES ?`,
        [prospectValues]
      );
    }

    const rowNumberValues = validRows.map((row) => row.sourceRowNumber);
    let importedBySourceRow = new Map();
    if (rowNumberValues.length > 0) {
      const [importedRows] = await connection.query(
        `SELECT id, source_row_number
         FROM md_prospects
         WHERE import_uuid = ?
           AND source_row_number IN (?)`,
        [uuid, rowNumberValues]
      );

      importedBySourceRow = new Map(importedRows.map((row) => [
        Number(row.source_row_number),
        row.id
      ]));
    }

    const duplicateUpdates = [];
    const importedStatusRows = [];
    for (const row of validRows) {
      const prospectId = importedBySourceRow.get(row.sourceRowNumber);
      if (!prospectId) {
        skippedRows.push([
          uuid,
          row.sourceRowNumber,
          ROW_STATUS.SKIPPED,
          null,
          'Prospect insert was skipped by database constraints'
        ]);
        continue;
      }

      if (row.duplicateOfSourceRowNumber && !row.data.duplicate_of_prospect_id) {
        const duplicateOfProspectId = importedBySourceRow.get(row.duplicateOfSourceRowNumber);
        if (duplicateOfProspectId) {
          duplicateUpdates.push([duplicateOfProspectId, prospectId]);
        }
      }

      importedStatusRows.push([
        uuid,
        row.sourceRowNumber,
        row.data.is_duplicate ? ROW_STATUS.DUPLICATE : ROW_STATUS.IMPORTED,
        prospectId,
        null
      ]);
    }

    for (const [duplicateOfProspectId, prospectId] of duplicateUpdates) {
      await connection.query(
        `UPDATE md_prospects
         SET duplicate_of_prospect_id = ?
         WHERE id = ?`,
        [duplicateOfProspectId, prospectId]
      );
    }

    await insertImportRowStatuses(connection, importedStatusRows);
    await insertImportRowStatuses(connection, skippedRows);
    await connection.commit();
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      // no-op
    }
    throw err;
  } finally {
    connection.release();
  }
};

const markImportFailed = async (uuid, err) => {
  await db.query(
    `UPDATE import_jobs
     SET status = ?,
         error_message = ?,
         completed_at = NOW()
     WHERE uuid = ?`,
    [IMPORT_STATUS.ERROR, sanitizeError(err), uuid]
  );
  await deleteRedisProgress(uuid).catch(() => {});
};

const markImportSucceeded = async (uuid, filePath) => {
  await refreshProgressFromDb(uuid);
  await db.query(
    `UPDATE import_jobs
     SET status = ?,
         error_message = NULL,
         completed_at = NOW()
     WHERE uuid = ?`,
    [IMPORT_STATUS.SUCCESS, uuid]
  );
  await deleteRedisProgress(uuid).catch(() => {});
  await safeDeleteFile(filePath);
};

export const processProspectImportJob = async ({ uuid, filePath, uploadedBy, sourcedByName }) => {
  await ensureImportSchema();

  try {
    const [jobRows] = await db.query('SELECT * FROM import_jobs WHERE uuid = ? LIMIT 1', [uuid]);
    if (jobRows.length === 0) {
      throw new Error('Import job not found');
    }

    if (jobRows[0].status === IMPORT_STATUS.SUCCESS) {
      return;
    }

    await db.query(
      `UPDATE import_jobs
       SET status = ?,
           error_message = NULL
       WHERE uuid = ?`,
      [IMPORT_STATUS.PROCESSING, uuid]
    );

    await fsp.access(filePath, fs.constants.R_OK);

    const [{ totalRows }, fileHash] = await Promise.all([
      inspectImportFile(filePath),
      hashFile(filePath)
    ]);

    await db.query(
      `UPDATE import_jobs
       SET file_hash = ?,
           total_rows = ?,
           total_batch_size = ?
       WHERE uuid = ?`,
      [fileHash, totalRows, IMPORT_BATCH_SIZE, uuid]
    );
    await refreshProgressFromDb(uuid, totalRows);

    const lookups = await loadImportLookups();
    const seenKeys = new Set();
    let batch = [];

    for await (const row of readImportRows(filePath)) {
      batch.push(row);

      if (batch.length >= IMPORT_BATCH_SIZE) {
        await processImportBatch({
          uuid,
          batch,
          uploadedBy,
          sourcedByName,
          lookups,
          seenKeys
        });
        await refreshProgressFromDb(uuid, totalRows);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await processImportBatch({
        uuid,
        batch,
        uploadedBy,
        sourcedByName,
        lookups,
        seenKeys
      });
      await refreshProgressFromDb(uuid, totalRows);
    }

    await markImportSucceeded(uuid, filePath);
  } catch (err) {
    await markImportFailed(uuid, err);
    throw err;
  }
};
