/**
 * prospectImportService.js
 *
 * Handles bulk import of prospects from CSV / XLSX files.
 *
 * Duplicate strategy (merged algo):
 *   - prospect_key = normalizePhone(phone) + '_' + normalizeWebsite(website_url)
 *   - Both phone and website_url are required for a valid import row.
 *   - For each batch of rows we:
 *       1. Build an in-memory batchMap (key → first occurrence + count)
 *       2. One SQL query: SELECT id, prospect_key, duplicate_count
 *                         FROM md_prospects WHERE prospect_key IN (...)
 *       3. Classify every unique key:
 *            a) existingKey  → UPDATE duplicate_count += (1 + count), log td_duplicate (duplicate_existing)
 *            b) newKey, count > 0 → INSERT once with duplicate_count = count, log td_duplicate (duplicate_in_batch)
 *            c) newKey, count = 0 → clean INSERT, no td_duplicate entry
 *       4. Wrap INSERT + UPDATE + td_duplicate + prospect_import_rows in one transaction per batch.
 */

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

// ─── Constants ───────────────────────────────────────────────────────────────

const IMPORT_STATUS = Object.freeze({ PROCESSING: 0, SUCCESS: 1, ERROR: 2 });
const ROW_STATUS    = Object.freeze({ IMPORTED: 1, SKIPPED: 2, DUPLICATE: 3 });

const IMPORT_BATCH_SIZE         = Number(process.env.IMPORT_BATCH_SIZE                  || 2000);
const PROGRESS_TTL_SECONDS      = Number(process.env.IMPORT_PROGRESS_TTL_SECONDS         || 7 * 24 * 60 * 60);
const QUEUE_OPERATION_TIMEOUT_MS= Number(process.env.IMPORT_QUEUE_OPERATION_TIMEOUT_MS   || 10000);
const IMPORT_ROOT               = path.resolve(process.env.IMPORT_STORAGE_DIR            || 'storage/imports');

const UUID_REGEX  = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supportedExtensions = new Set(['.csv', '.xlsx']);

// Build a lookup Map: dbKey → frontendKey from prospectMapping
const frontendKeysByDbKey = new Map(prospectMapping.map(([dbKey, frontendKey]) => [dbKey, frontendKey]));

// Headers allowed in the upload template
const allowedHeaders = new Set([
  ...prospectMapping.flatMap(([dbKey, frontendKey]) => [dbKey, frontendKey]),
  'follow_up_date',
  'sourced_date',
  'preferred_lang_id',
  'contact_name',
  'company_name',
]);

// Columns to INSERT into md_prospects (must match actual table columns)
const importColumns = [
  'company_name',
  'contact_name',
  'first_name',
  'last_name',
  'job_title',
  'email',
  'phone',
  'linkedin_url',
  'facebook_url',
  'instagram_url',
  'twitter_url',
  'city',
  'state',
  'country',
  'website_url',
  'industry_id',
  'industry_size_id',
  'source_id',
  'referral_name',
  'notes',
  'follow_up_date',
  'preferred_lang_id',
  'created_by',       // populated with uploadedBy (userId)
  'stage_code',
  'prospect_key',
  'duplicate_count',
];

let schemaPromise = null;
const tableColumnCache = new Map();

// ─── Redis progress helpers ───────────────────────────────────────────────────

const progressKey = (uuid) => `import:prospects:${uuid}`;

const sanitizeError = (err) =>
  (err?.message || String(err || 'Unknown import error'))
    .replace(/\s+/g, ' ').trim().slice(0, 1000);

// ─── UUID helpers ─────────────────────────────────────────────────────────────

const normalizeUUID = (value) => {
  const uuid = value ? String(value).trim() : randomUUID();
  if (!UUID_REGEX.test(uuid)) throw CreateError(400, 'importUUID must be a valid UUID');
  return uuid.toLowerCase();
};

// ─── Value coercion helpers ───────────────────────────────────────────────────

const toNullableString = (value) => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  const trimmed = String(value).trim();
  return trimmed || null;
};

const toNullablePositiveInteger = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid ${fieldName}`);
  return n;
};

const parseDateValue = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error(`Invalid ${fieldName}`);
    return value;
  }
  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value).trim())) {
    const serial = Number(value);
    // Excel date serial (days since 1900-01-00)
    if (serial > 20000 && serial < 80000) {
      return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    }
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${fieldName}`);
  return parsed;
};

// ─── Cell / header helpers (Excel + CSV unified) ─────────────────────────────

const cellToValue = (value) => {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'result')) return cellToValue(value.result);
    if (Object.prototype.hasOwnProperty.call(value, 'text'))   return value.text;
    if (Array.isArray(value.richText)) return value.richText.map((p) => p.text || '').join('');
  }
  return value;
};

const normalizeHeader = (header) => String(cellToValue(header) || '').trim();

const cleanRawRow = (row) => {
  const cleaned = {};
  for (const [key, rawValue] of Object.entries(row || {})) {
    const normalizedKey = normalizeHeader(key);
    if (!normalizedKey) continue;
    const value = cellToValue(rawValue);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') cleaned[normalizedKey] = trimmed;
    } else if (value !== undefined && value !== null && value !== '') {
      cleaned[normalizedKey] = value;
    }
  }
  return cleaned;
};

const getRawValue = (cleanedRow, dbKey) => {
  const frontendKey = frontendKeysByDbKey.get(dbKey);
  if (cleanedRow[dbKey]       !== undefined) return cleanedRow[dbKey];
  if (frontendKey && cleanedRow[frontendKey] !== undefined) return cleanedRow[frontendKey];
  return undefined;
};

// ─── prospect_key helpers ─────────────────────────────────────────────────────

/**
 * Normalize a website URL down to its bare hostname (strip scheme, www., trailing slash).
 * "https://www.Acme.com/about" → "acme.com"
 * Falls back to simple string cleanup when URL cannot be parsed.
 */
export const normalizeWebsiteForKey = (url) => {
  if (!url) return '';
  const raw = String(url).trim();
  try {
    const withScheme = raw.startsWith('http') ? raw : `https://${raw}`;
    const u = new URL(withScheme);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  }
};

/**
 * Build the unique prospect_key from phone + website domain.
 * Both fields are mandatory for import rows.
 */
const buildProspectKey = (phone, websiteUrl) => {
  const normPhone   = String(phone || '').replace(/\s+/g, '').trim();
  const normWebsite = normalizeWebsiteForKey(websiteUrl);
  return `${normPhone}_${normWebsite}`.toLowerCase();
};

// ─── Header validation ────────────────────────────────────────────────────────

const validateHeaders = (headers) => {
  const normalizedHeaders = headers.map(normalizeHeader).filter(Boolean);
  if (normalizedHeaders.length === 0) throw new Error('Import file must contain a header row');

  const dupes = normalizedHeaders.filter((h, i) => normalizedHeaders.indexOf(h) !== i);
  if (dupes.length > 0) throw new Error(`Duplicate import headers: ${[...new Set(dupes)].join(', ')}`);

  const unsupported = normalizedHeaders.filter((h) => !allowedHeaders.has(h));
  if (unsupported.length > 0) throw new Error(`Unsupported import headers: ${unsupported.join(', ')}`);

  // phone is required — it is the primary uniqueness field
  if (!normalizedHeaders.some((h) => h === 'phone' || h === 'phoneNumber')) {
    throw new Error('Import file must include a phone / phoneNumber column');
  }
  // website_url is optional — when absent the prospect_key uses phone alone

  return normalizedHeaders;
};

// ─── File utilities ───────────────────────────────────────────────────────────

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
  try { await fsp.unlink(filePath); } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`Unable to delete import file ${filePath}:`, err.message);
  }
};

const withTimeout = (promise, timeoutMs, message) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(message)), timeoutMs);
  promise.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
});

// ─── Redis readiness ──────────────────────────────────────────────────────────

const ensureProgressRedisReady = async () => {
  if (importProgressRedis.status === 'ready') return;
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
      const cleanup = () => { importProgressRedis.off('ready', onReady); importProgressRedis.off('error', onError); };
      const onReady = () => { cleanup(); resolve(); };
      const onError = (err) => { cleanup(); reject(err); };
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

// ─── Schema management ────────────────────────────────────────────────────────

const columnExists = async (tableName, columnName) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return Number(rows[0]?.count || 0) > 0;
};

const indexExists = async (tableName, indexName) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return Number(rows[0]?.count || 0) > 0;
};

const addColumnIfMissing = async (tableName, columnName, definition) => {
  if (await columnExists(tableName, columnName)) return;
  try {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
    tableColumnCache.delete(tableName);
  } catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') throw err; }
};

const addIndexIfMissing = async (tableName, indexName, ddl) => {
  if (await indexExists(tableName, indexName)) return;
  try { await db.query(ddl); } catch (err) { if (err.code !== 'ER_DUP_KEYNAME') throw err; }
};

const dropIndexIfExists = async (tableName, indexName) => {
  if (!(await indexExists(tableName, indexName))) return;
  try {
    await db.query(`ALTER TABLE ${tableName} DROP INDEX ${indexName}`);
  } catch (err) { if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw err; }
};

/**
 * Idempotent schema bootstrap.
 * - Creates import_jobs and prospect_import_rows if not present.
 * - Creates td_duplicate if not present.
 * - Adds new columns to md_prospects (duplicate_count, prospect_key).
 * - Drops old unused import columns from md_prospects if they exist.
 */
export const ensureImportSchema = async () => {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    // ── import_jobs ──────────────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS import_jobs (
        uuid              CHAR(36)      PRIMARY KEY,
        status            TINYINT       NOT NULL DEFAULT 0,
        file_path         VARCHAR(1024) NOT NULL,
        file_hash         CHAR(64)      NULL,
        total_batch_size  INT           NOT NULL DEFAULT 2000,
        total_rows        BIGINT        NOT NULL DEFAULT 0,
        total_import      BIGINT        NOT NULL DEFAULT 0,
        processed_rows    BIGINT        NOT NULL DEFAULT 0,
        duplicate_rows    BIGINT        NOT NULL DEFAULT 0,
        skipped_rows      BIGINT        NOT NULL DEFAULT 0,
        error_message     TEXT          NULL,
        uploaded_by       BIGINT        NULL,
        created_at        DATETIME      DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at      DATETIME      NULL,
        INDEX idx_import_jobs_status     (status),
        INDEX idx_import_jobs_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ── prospect_import_rows ─────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS prospect_import_rows (
        id                BIGINT AUTO_INCREMENT PRIMARY KEY,
        import_uuid       CHAR(36)  NOT NULL DEFAULT '',
        source_row_number BIGINT    NOT NULL DEFAULT 0,
        status            TINYINT   NOT NULL DEFAULT 0,
        prospect_id       BIGINT    NULL,
        error_message     TEXT      NULL,
        created_at        DATETIME  DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Guard against stale prospect_import_rows created with an old schema
    // (missing import_uuid / source_row_number). Migrate them in place.
    await addColumnIfMissing(
      'prospect_import_rows', 'import_uuid',
      "import_uuid CHAR(36) NOT NULL DEFAULT ''"
    );
    await addColumnIfMissing(
      'prospect_import_rows', 'source_row_number',
      'source_row_number BIGINT NOT NULL DEFAULT 0'
    );
    await addColumnIfMissing(
      'prospect_import_rows', 'prospect_id',
      'prospect_id BIGINT NULL'
    );
    await addColumnIfMissing(
      'prospect_import_rows', 'error_message',
      'error_message TEXT NULL'
    );
    // Add composite unique index if missing
    await addIndexIfMissing(
      'prospect_import_rows',
      'uq_import_source_row',
      'ALTER TABLE prospect_import_rows ADD UNIQUE KEY uq_import_source_row (import_uuid, source_row_number)'
    );
    await addIndexIfMissing(
      'prospect_import_rows',
      'idx_import_rows_uuid_status',
      'ALTER TABLE prospect_import_rows ADD INDEX idx_import_rows_uuid_status (import_uuid, status)'
    );
    await addIndexIfMissing(
      'prospect_import_rows',
      'idx_import_rows_prospect',
      'ALTER TABLE prospect_import_rows ADD INDEX idx_import_rows_prospect (prospect_id)'
    );

    // ── td_duplicate ─────────────────────────────────────────────────────────
    // If td_duplicate exists but with the OLD schema (has email/phone columns,
    // missing import_uuid/prospect_key), drop and recreate it cleanly.
    const tdDupHasImportUuid = await columnExists('td_duplicate', 'import_uuid');
    const tdDupHasOldEmail   = await columnExists('td_duplicate', 'email');
    if (!tdDupHasImportUuid || tdDupHasOldEmail) {
      // Old schema — safe to drop (no FK constraints reference td_duplicate)
      console.log('[ensureImportSchema] Recreating td_duplicate with new schema...');
      await db.query('DROP TABLE IF EXISTS td_duplicate');
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS td_duplicate (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        import_uuid   CHAR(36)     NOT NULL,
        prospect_key  VARCHAR(500) NOT NULL,
        stage_status  VARCHAR(50)  NOT NULL,
        prospect_id   BIGINT       NULL,
        count         INT          NOT NULL DEFAULT 1,
        created_by    BIGINT       NULL,
        created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_td_dup_import_uuid  (import_uuid),
        INDEX idx_td_dup_prospect_key (prospect_key),
        INDEX idx_td_dup_prospect_id  (prospect_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ── md_prospects — add new columns ───────────────────────────────────────
    await addColumnIfMissing('md_prospects', 'duplicate_count',
      'duplicate_count INT NOT NULL DEFAULT 0');
    await addColumnIfMissing('md_prospects', 'prospect_key',
      'prospect_key VARCHAR(500) NULL');
    await addColumnIfMissing('md_prospects', 'created_by',
      'created_by BIGINT NULL');

    // Add UNIQUE index on prospect_key for O(1) single-query duplicate lookup
    await addIndexIfMissing(
      'md_prospects',
      'uq_md_prospects_prospect_key',
      'ALTER TABLE md_prospects ADD UNIQUE KEY uq_md_prospects_prospect_key (prospect_key)'
    );

    // Drop old import-tracking columns added by the previous approach (if they exist)
    // These are removed because duplicates are now tracked via td_duplicate + duplicate_count.
    for (const oldCol of ['is_duplicate', 'duplicate_of_prospect_id', 'import_uuid', 'source_row_number']) {
      if (await columnExists('md_prospects', oldCol)) {
        // Drop any index that references this column first (best-effort)
        try {
          await db.query(`ALTER TABLE md_prospects DROP COLUMN ${oldCol}`);
          tableColumnCache.delete('md_prospects');
        } catch (err) {
          // Log but don't fail — column may be referenced by an existing constraint
          console.warn(`Could not drop md_prospects.${oldCol}:`, err.message);
        }
      }
    }

    // Drop old composite unique index if it was preventing duplicate inserts before
    await dropIndexIfExists('md_prospects', 'uq_prospect');
    await dropIndexIfExists('md_prospects', 'uq_md_prospects_import_row');
  })();

  try {
    await schemaPromise;
  } catch (err) {
    schemaPromise = null;
    throw err;
  }
};

// ─── Table column cache ───────────────────────────────────────────────────────

const getTableColumns = async (tableName) => {
  if (tableColumnCache.has(tableName)) return tableColumnCache.get(tableName);
  const [rows] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  const columns = new Set(rows.map((r) => r.COLUMN_NAME));
  tableColumnCache.set(tableName, columns);
  return columns;
};

// ─── Lookup tables (stages / sources / industries) ───────────────────────────

const getInitialStageCode = async (conn) => {
  const [rows] = await conn.query(
    'SELECT stage_code FROM md_stages WHERE stage_key = ? LIMIT 1',
    [STAGE_KEYS.PENDING]
  );
  if (rows.length > 0) return rows[0].stage_code;
  const [any] = await conn.query(
    'SELECT stage_code FROM md_stages ORDER BY COALESCE(seq, stage_code), stage_code LIMIT 1'
  );
  return any[0]?.stage_code || 1;
};

const getDirectSourceId = async (conn) => {
  // Try DIRECT first, then MARKET RESEARCH, then first available source
  const [rows] = await conn.query(
    `SELECT source_id FROM md_sources
     ORDER BY CASE WHEN UPPER(source_key) = 'DIRECT' THEN 0
                   WHEN UPPER(source_key) LIKE '%MARKET%' THEN 1
                   ELSE 2 END, source_id LIMIT 1`
  );
  return rows.length > 0 ? rows[0].source_id : 1;
};

const loadImportLookups = async () => {
  const [sourceRows]       = await db.query('SELECT source_id, source_key FROM md_sources');
  const [industryRows]     = await db.query('SELECT industry_id FROM md_industry_types');
  const [industrySizeRows] = await db.query('SELECT industry_size_id FROM md_industry_size');
  return {
    directSourceId:  await getDirectSourceId(db),
    initialStageCode: await getInitialStageCode(db),
    sourceIds:       new Set(sourceRows.map((r) => Number(r.source_id))),
    sourceKeys:      new Map(sourceRows.map((r) => [Number(r.source_id), String(r.source_key || '').trim().toUpperCase()])),
    industryIds:     new Set(industryRows.map((r) => Number(r.industry_id))),
    industrySizeIds: new Set(industrySizeRows.map((r) => Number(r.industry_size_id))),
  };
};

// ─── Row builder ──────────────────────────────────────────────────────────────

/**
 * Parse and validate one raw CSV/XLSX row into a structured prospect object.
 * Throws if required fields are missing or invalid.
 * Returns { sourceRowNumber, prospectKey, data: { ...all columns } }
 */
const buildImportProspect = ({ rawRow, sourceRowNumber, uploadedBy, lookups }) => {
  const cleanedRow = cleanRawRow(rawRow);
  const normalized = normalizeInputData([cleanedRow], prospectMapping)[0];

  const phone      = toNullableString(normalized.phone);
  const websiteUrl = toNullableString(normalized.website_url) || null;

  if (!phone) throw new Error('phone is required');

  const email = toNullableString(normalized.email)?.toLowerCase() || null;
  if (email && !EMAIL_REGEX.test(email)) throw new Error('Invalid email format');

  const industryId = toNullablePositiveInteger(normalized.industry_id, 'industry_id');
  if (industryId !== null && !lookups.industryIds.has(industryId)) throw new Error('Invalid industry_id');

  const industrySizeId = toNullablePositiveInteger(normalized.industry_size_id, 'industry_size_id');
  if (industrySizeId !== null && !lookups.industrySizeIds.has(industrySizeId)) throw new Error('Invalid industry_size_id');

  const sourceId = toNullablePositiveInteger(normalized.source_id, 'source_id') || lookups.directSourceId;
  if (!lookups.sourceIds.has(sourceId)) throw new Error('Invalid source_id');

  const sourceKey    = lookups.sourceKeys.get(sourceId);
  const referralName = toNullableString(normalized.referral_name);
  if (sourceKey === 'REFERRAL' && !referralName) throw new Error('referral_name required when source is Referral');
  if (sourceKey !== 'REFERRAL' && referralName)  throw new Error('referral_name only allowed when source is Referral');

  const prospectKey = buildProspectKey(phone, websiteUrl);

  // parse date fields from raw row (dates come through as Excel serial numbers or strings)
  const followUpDate = parseDateValue(getRawValue(cleanRawRow(rawRow), 'follow_up_date'), 'follow_up_date');

  return {
    sourceRowNumber,
    prospectKey,
    data: {
      company_name:     toNullableString(normalized.company_name),
      contact_name:     toNullableString(normalized.contact_name),
      first_name:       toNullableString(normalized.first_name),
      last_name:        toNullableString(normalized.last_name),
      job_title:        toNullableString(normalized.job_title),
      email,
      phone,
      linkedin_url:     toNullableString(normalized.linkedin_url),
      facebook_url:     toNullableString(normalized.facebook_url),
      instagram_url:    toNullableString(normalized.instagram_url),
      twitter_url:      toNullableString(normalized.twitter_url),
      city:             toNullableString(normalized.city),
      state:            toNullableString(normalized.state),
      country:          toNullableString(normalized.country),
      website_url:      websiteUrl,
      industry_id:      industryId,
      industry_size_id: industrySizeId,
      source_id:        sourceId,
      referral_name:    referralName,
      notes:            toNullableString(normalized.notes),
      follow_up_date:   followUpDate,
      preferred_lang_id: toNullableString(normalized.preferred_lang_id) || 'EN',
      created_by:       uploadedBy || null,
      stage_code:       lookups.initialStageCode,
      prospect_key:     prospectKey,
      duplicate_count:  0,             // set later during classification
    }
  };
};

// ─── Redis progress serialization ─────────────────────────────────────────────

const serializeProgress = (p) => ({
  uuid:           p.uuid,
  totalBatchSize: Number(p.totalBatchSize  || 0),
  totalRows:      Number(p.totalRows       || 0),
  totalImport:    Number(p.totalImport     || 0),
  processedRows:  Number(p.processedRows   || 0),
  duplicateRows:  Number(p.duplicateRows   || 0),
  skippedRows:    Number(p.skippedRows     || 0),
  status:         Number(p.status          || 0),
  error:          p.error || null,
});

const writeRedisProgress = async (progress) => {
  await ensureProgressRedisReady();
  const key = progressKey(progress.uuid);
  await importProgressRedis.hset(key, {
    uuid:           progress.uuid,
    totalBatchSize: String(progress.totalBatchSize || 0),
    totalRows:      String(progress.totalRows      || 0),
    totalImport:    String(progress.totalImport    || 0),
    processedRows:  String(progress.processedRows  || 0),
    duplicateRows:  String(progress.duplicateRows  || 0),
    skippedRows:    String(progress.skippedRows    || 0),
    status:         String(progress.status ?? IMPORT_STATUS.PROCESSING),
    error:          progress.error || '',
  });
  await importProgressRedis.expire(key, PROGRESS_TTL_SECONDS);
};

const progressFromJobRow = (row) => serializeProgress({
  uuid:           row.uuid,
  totalBatchSize: row.total_batch_size,
  totalRows:      row.total_rows,
  totalImport:    row.total_import,
  processedRows:  row.processed_rows,
  duplicateRows:  row.duplicate_rows,
  skippedRows:    row.skipped_rows,
  status:         row.status,
  error:          row.error_message,
});

const refreshProgressFromDb = async (uuid, totalRows = null) => {
  const [rows] = await db.query(
    `SELECT
       COUNT(*)                                                       AS processed_rows,
       COALESCE(SUM(CASE WHEN status IN (?,?) THEN 1 ELSE 0 END), 0) AS total_import,
       COALESCE(SUM(CASE WHEN status = ?     THEN 1 ELSE 0 END), 0) AS duplicate_rows,
       COALESCE(SUM(CASE WHEN status = ?     THEN 1 ELSE 0 END), 0) AS skipped_rows
     FROM prospect_import_rows WHERE import_uuid = ?`,
    [ROW_STATUS.IMPORTED, ROW_STATUS.DUPLICATE, ROW_STATUS.DUPLICATE, ROW_STATUS.SKIPPED, uuid]
  );
  const stats = rows[0] || {};

  await db.query(
    `UPDATE import_jobs
     SET total_rows     = COALESCE(?, total_rows),
         total_import   = ?,
         processed_rows = ?,
         duplicate_rows = ?,
         skipped_rows   = ?
     WHERE uuid = ?`,
    [totalRows,
     Number(stats.total_import   || 0),
     Number(stats.processed_rows || 0),
     Number(stats.duplicate_rows || 0),
     Number(stats.skipped_rows   || 0),
     uuid]
  );

  const [jobRows] = await db.query('SELECT * FROM import_jobs WHERE uuid = ? LIMIT 1', [uuid]);
  if (jobRows.length === 0) throw new Error('Import job not found');

  const progress = progressFromJobRow(jobRows[0]);
  if (progress.status === IMPORT_STATUS.PROCESSING) await writeRedisProgress(progress);
  return progress;
};

// ─── Public: startProspectImport ──────────────────────────────────────────────

export const startProspectImport = async ({ file, importUUID, uploadedBy }) => {
  await ensureImportSchema();

  if (!file) throw CreateError(400, 'file is required');

  const ext = path.extname(file.originalname || file.path || '').toLowerCase();
  if (!supportedExtensions.has(ext)) {
    await safeDeleteFile(file.path);
    throw CreateError(400, 'Only CSV and XLSX prospect import files are supported');
  }

  const uuid = normalizeUUID(importUUID);
  const [existingRows] = await db.query('SELECT * FROM import_jobs WHERE uuid = ? LIMIT 1', [uuid]);
  if (existingRows.length > 0) {
    await safeDeleteFile(file.path);
    return { uuid, status: existingRows[0].status, existing: true };
  }

  const targetDir = path.join(IMPORT_ROOT, uuid);
  const filePath  = path.join(targetDir, `original${ext}`);

  await fsp.mkdir(targetDir, { recursive: true });
  await fsp.rename(file.path, filePath);

  try {
    await db.query(
      `INSERT INTO import_jobs (uuid, status, file_path, total_batch_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [uuid, IMPORT_STATUS.PROCESSING, filePath, IMPORT_BATCH_SIZE, uploadedBy || null]
    );

    await writeRedisProgress({
      uuid,
      totalBatchSize: IMPORT_BATCH_SIZE,
      totalRows: 0, totalImport: 0, processedRows: 0,
      duplicateRows: 0, skippedRows: 0,
      status: IMPORT_STATUS.PROCESSING, error: null,
    });

    await withTimeout(
      prospectImportQueue.add(
        'prospect-import',
        { uuid, filePath, uploadedBy: uploadedBy || null },
        { jobId: uuid }
      ),
      QUEUE_OPERATION_TIMEOUT_MS,
      'Timed out while enqueueing prospect import job'
    );
  } catch (err) {
    await db.query(
      `UPDATE import_jobs SET status = ?, error_message = ?, completed_at = NOW() WHERE uuid = ?`,
      [IMPORT_STATUS.ERROR, sanitizeError(err), uuid]
    ).catch(() => {});
    await deleteRedisProgress(uuid).catch(() => {});
    throw err;
  }

  return { uuid, status: IMPORT_STATUS.PROCESSING, existing: false };
};

// ─── Public: getImportStatus ──────────────────────────────────────────────────

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
  if (rows.length === 0) throw CreateError(404, 'Import job not found');
  return progressFromJobRow(rows[0]);
};

// ─── File inspection (count rows + validate headers) ─────────────────────────

const inspectCsvFile = async (filePath) => {
  let headers = [];
  let totalRows = 0;
  const stream = fs.createReadStream(filePath);
  const parser = stream.pipe(parseCsv({ headers: (h) => h.map(normalizeHeader), ignoreEmpty: true, trim: true }));
  stream.on('error', (err) => parser.destroy(err));
  parser.on('headers', (h) => { headers = h; });
  for await (const row of parser) {
    if (Object.keys(cleanRawRow(row)).length > 0) totalRows++;
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
    entries: 'emit', sharedStrings: 'cache', hyperlinks: 'ignore', worksheets: 'emit'
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
      const vals = rowValues(row);
      const rowData = {};
      headers.forEach((h, i) => { rowData[h] = vals[i]; });
      if (Object.keys(cleanRawRow(rowData)).length > 0) totalRows++;
    }
    break; // first sheet only
  }
  if (headers.length === 0) validateHeaders(headers);
  return { headers, totalRows };
};

const inspectImportFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv')  return inspectCsvFile(filePath);
  if (ext === '.xlsx') return inspectXlsxFile(filePath);
  throw new Error('Unsupported import file type');
};

// ─── Streaming row generators ─────────────────────────────────────────────────

async function* readCsvRows(filePath) {
  let rowIndex = 1;
  const stream = fs.createReadStream(filePath);
  const parser = stream.pipe(parseCsv({ headers: (h) => h.map(normalizeHeader), ignoreEmpty: true, trim: true }));
  stream.on('error', (err) => parser.destroy(err));
  for await (const row of parser) {
    if (Object.keys(cleanRawRow(row)).length === 0) continue;
    rowIndex++;
    yield { sourceRowNumber: rowIndex, rawRow: row };
  }
}

async function* readXlsxRows(filePath) {
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    entries: 'emit', sharedStrings: 'cache', hyperlinks: 'ignore', worksheets: 'emit'
  });
  for await (const worksheetReader of workbookReader) {
    let headers = [];
    for await (const row of worksheetReader) {
      if (row.number === 1) {
        headers = rowValues(row).map(normalizeHeader);
        continue;
      }
      const vals = rowValues(row);
      const rawRow = {};
      headers.forEach((h, i) => { rawRow[h] = vals[i]; });
      if (Object.keys(cleanRawRow(rawRow)).length === 0) continue;
      yield { sourceRowNumber: row.number, rawRow };
    }
    break;
  }
}

const readImportRows = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv')  return readCsvRows(filePath);
  if (ext === '.xlsx') return readXlsxRows(filePath);
  throw new Error('Unsupported import file type');
};

// ─── Already-processed row guard ─────────────────────────────────────────────

const getAlreadyProcessedRowNumbers = async (connection, uuid, sourceRowNumbers) => {
  if (sourceRowNumbers.length === 0) return new Set();
  const [rows] = await connection.query(
    `SELECT source_row_number FROM prospect_import_rows
     WHERE import_uuid = ? AND source_row_number IN (?)`,
    [uuid, sourceRowNumbers]
  );
  return new Set(rows.map((r) => Number(r.source_row_number)));
};

// ─── Core batch processor ─────────────────────────────────────────────────────

/**
 * processImportBatch
 *
 * For a batch of raw file rows:
 *   1. Build batchMap: key → { firstRow, count } — deduplicates within the batch
 *   2. One DB query to find existing prospect_keys in md_prospects
 *   3. Classify:
 *      - existingKey         → UPDATE duplicate_count, td_duplicate(duplicate_existing)
 *      - newKey + count > 0  → INSERT with duplicate_count=count, td_duplicate(duplicate_in_batch)
 *      - newKey + count = 0  → clean INSERT
 *   4. All writes in one transaction
 */
const processImportBatch = async ({ uuid, batch, uploadedBy, lookups }) => {
  if (batch.length === 0) return;

  const connection = await db.getConnection();

  try {
    // Guard: skip rows already written in a previous attempt (crash recovery)
    const sourceRowNumbers   = batch.map((r) => r.sourceRowNumber);
    const alreadyProcessed   = await getAlreadyProcessedRowNumbers(connection, uuid, sourceRowNumbers);
    const rowsToProcess      = batch.filter((r) => !alreadyProcessed.has(r.sourceRowNumber));
    if (rowsToProcess.length === 0) return;

    // ── STEP 1: Build batchMap ────────────────────────────────────────────────
    // key → { firstRow (parsed prospect), count (extra occurrences beyond first), skipped:false }
    const batchMap   = new Map(); // Map<prospectKey, { firstRow, count }>
    const skippedRows = [];       // rows that failed validation → prospect_import_rows SKIPPED

    for (const row of rowsToProcess) {
      let parsed;
      try {
        parsed = buildImportProspect({ rawRow: row.rawRow, sourceRowNumber: row.sourceRowNumber, uploadedBy, lookups });
      } catch (err) {
        skippedRows.push([uuid, row.sourceRowNumber, ROW_STATUS.SKIPPED, null, sanitizeError(err)]);
        continue;
      }

      const key = parsed.prospectKey;
      if (batchMap.has(key)) {
        // Already seen in this batch — this is an intra-batch duplicate
        batchMap.get(key).count += 1;
      } else {
        batchMap.set(key, { firstRow: parsed, count: 0 });
      }
    }

    // ── STEP 2: Single DB query for existing prospect_keys ───────────────────
    const batchKeys = [...batchMap.keys()];
    let existingByKey = new Map(); // Map<prospectKey, { id, duplicate_count }>

    if (batchKeys.length > 0) {
      const [existingRows] = await connection.query(
        `SELECT id, prospect_key, duplicate_count FROM md_prospects WHERE prospect_key IN (?)`,
        [batchKeys]
      );
      for (const r of existingRows) {
        existingByKey.set(r.prospect_key, { id: r.id, duplicateCount: Number(r.duplicate_count || 0) });
      }
    }

    // ── STEP 3: Classify ─────────────────────────────────────────────────────
    const toInsert     = []; // new prospects
    const toUpdateIds  = []; // { id, addCount } for existing prospects
    const toDuplicate  = []; // td_duplicate rows
    // prospect_import_rows entries built after INSERT to get IDs
    const importRowMap = new Map(); // prospectKey → { sourceRowNumber, isNew }

    for (const [key, { firstRow, count }] of batchMap.entries()) {
      const existing = existingByKey.get(key);

      if (existing) {
        // ── Case A: Key already in DB ──────────────────────────────────────
        const totalHits = 1 + count; // 1 (this batch's first occurrence) + any extra in batch
        toUpdateIds.push({ id: existing.id, addCount: totalHits });
        toDuplicate.push([uuid, key, 'duplicate_existing', existing.id, totalHits, uploadedBy || null]);
        // Log first row's sourceRowNumber as DUPLICATE with the existing prospect_id
        importRowMap.set(key, { sourceRowNumber: firstRow.sourceRowNumber, status: ROW_STATUS.DUPLICATE, prospectId: existing.id });

      } else if (count > 0) {
        // ── Case B: New to DB but appears N+1 times in this batch ──────────
        firstRow.data.duplicate_count = count; // store extra occurrences as initial count
        toInsert.push(firstRow);
        toDuplicate.push([uuid, key, 'duplicate_in_batch', null, count, uploadedBy || null]);
        // prospect_import_rows: the first row → IMPORTED; extra occurrences are implicit via count in td_duplicate
        importRowMap.set(key, { sourceRowNumber: firstRow.sourceRowNumber, status: ROW_STATUS.IMPORTED, prospectId: null });

      } else {
        // ── Case C: Completely new, seen exactly once ──────────────────────
        firstRow.data.duplicate_count = 0;
        toInsert.push(firstRow);
        importRowMap.set(key, { sourceRowNumber: firstRow.sourceRowNumber, status: ROW_STATUS.IMPORTED, prospectId: null });
      }
    }

    // ── STEP 4: Transaction ──────────────────────────────────────────────────
    await connection.beginTransaction();

    // 4a. INSERT new prospects
    let insertedKeyToId = new Map();
    if (toInsert.length > 0) {
      const mdProspectColumns = await getTableColumns('md_prospects');
      const columns = importColumns.filter((col) => mdProspectColumns.has(col));

      const prospectValues = toInsert.map((row) => columns.map((col) => row.data[col] ?? null));
      await connection.query(
        `INSERT INTO md_prospects (${columns.join(', ')}) VALUES ?`,
        [prospectValues]
      );

      // Fetch the IDs we just inserted using prospect_key
      const insertedKeys = toInsert.map((r) => r.prospectKey);
      const [insertedRows] = await connection.query(
        `SELECT id, prospect_key FROM md_prospects WHERE prospect_key IN (?)`,
        [insertedKeys]
      );
      insertedKeyToId = new Map(insertedRows.map((r) => [r.prospect_key, r.id]));

      // Update td_duplicate entries for Case B (duplicate_in_batch) with newly obtained prospect_id
      for (const dupEntry of toDuplicate) {
        if (dupEntry[2] === 'duplicate_in_batch') {
          const pid = insertedKeyToId.get(dupEntry[1]);
          if (pid) dupEntry[3] = pid; // patch prospect_id
        }
      }
    }

    // 4b. UPDATE duplicate_count on existing prospects (Case A)
    for (const { id, addCount } of toUpdateIds) {
      await connection.query(
        `UPDATE md_prospects SET duplicate_count = duplicate_count + ? WHERE id = ?`,
        [addCount, id]
      );
    }

    // 4c. INSERT td_duplicate rows (Cases A & B)
    if (toDuplicate.length > 0) {
      await connection.query(
        `INSERT INTO td_duplicate (import_uuid, prospect_key, stage_status, prospect_id, count, created_by)
         VALUES ?`,
        [toDuplicate]
      );
    }

    // 4d. Build prospect_import_rows entries
    const importStatusRows = [];
    for (const [key, { sourceRowNumber, status, prospectId }] of importRowMap.entries()) {
      const pid = prospectId ?? insertedKeyToId.get(key) ?? null;
      importStatusRows.push([uuid, sourceRowNumber, status, pid, null]);
    }
    // Also add skipped rows
    for (const skRow of skippedRows) {
      importStatusRows.push(skRow);
    }

    if (importStatusRows.length > 0) {
      await connection.query(
        `INSERT INTO prospect_import_rows (import_uuid, source_row_number, status, prospect_id, error_message)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           status        = VALUES(status),
           prospect_id   = VALUES(prospect_id),
           error_message = VALUES(error_message),
           updated_at    = NOW()`,
        [importStatusRows]
      );
    }

    await connection.commit();

  } catch (err) {
    try { await connection.rollback(); } catch { /* no-op */ }
    throw err;
  } finally {
    connection.release();
  }
};

// ─── Finalization helpers ─────────────────────────────────────────────────────

const markImportFailed = async (uuid, err) => {
  await db.query(
    `UPDATE import_jobs SET status = ?, error_message = ?, completed_at = NOW() WHERE uuid = ?`,
    [IMPORT_STATUS.ERROR, sanitizeError(err), uuid]
  );
  await deleteRedisProgress(uuid).catch(() => {});
};

const markImportSucceeded = async (uuid, filePath) => {
  await refreshProgressFromDb(uuid);
  await db.query(
    `UPDATE import_jobs SET status = ?, error_message = NULL, completed_at = NOW() WHERE uuid = ?`,
    [IMPORT_STATUS.SUCCESS, uuid]
  );
  await deleteRedisProgress(uuid).catch(() => {});
  await safeDeleteFile(filePath);
};

// ─── Public: processProspectImportJob (called by BullMQ worker) ──────────────

export const processProspectImportJob = async ({ uuid, filePath, uploadedBy }) => {
  await ensureImportSchema();

  try {
    const [jobRows] = await db.query('SELECT * FROM import_jobs WHERE uuid = ? LIMIT 1', [uuid]);
    if (jobRows.length === 0) throw new Error('Import job not found');
    if (jobRows[0].status === IMPORT_STATUS.SUCCESS) return; // idempotent

    await db.query(
      `UPDATE import_jobs SET status = ?, error_message = NULL WHERE uuid = ?`,
      [IMPORT_STATUS.PROCESSING, uuid]
    );

    await fsp.access(filePath, fs.constants.R_OK);

    const [{ totalRows }, fileHash] = await Promise.all([
      inspectImportFile(filePath),
      hashFile(filePath),
    ]);

    await db.query(
      `UPDATE import_jobs SET file_hash = ?, total_rows = ?, total_batch_size = ? WHERE uuid = ?`,
      [fileHash, totalRows, IMPORT_BATCH_SIZE, uuid]
    );
    await refreshProgressFromDb(uuid, totalRows);

    const lookups = await loadImportLookups();
    let batch = [];

    for await (const row of readImportRows(filePath)) {
      batch.push(row);

      if (batch.length >= IMPORT_BATCH_SIZE) {
        await processImportBatch({ uuid, batch, uploadedBy, lookups });
        await refreshProgressFromDb(uuid, totalRows);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await processImportBatch({ uuid, batch, uploadedBy, lookups });
      await refreshProgressFromDb(uuid, totalRows);
    }

    await markImportSucceeded(uuid, filePath);

  } catch (err) {
    await markImportFailed(uuid, err);
    throw err;
  }
};
