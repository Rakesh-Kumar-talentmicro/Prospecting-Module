import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { REASON_REQUIRED_STAGE_KEYS, TERMINAL_STAGE_KEYS } from '../constants/stages.js';
 
const DEFAULT_LANGUAGE_ID = 'EN';
const MASTER_CACHE_TTL_MS = 5 * 60 * 1000;
 
const normalizeLanguageId = (languageId) => {
  if (!languageId || typeof languageId !== 'string') {
    return DEFAULT_LANGUAGE_ID;
  }
  return languageId.trim().toUpperCase() || DEFAULT_LANGUAGE_ID;
};

const cache = new Map();
 
const masterTables = {
  'activity-status': {
    table: 'md_activity_status',
    primaryKeys: ['activity_id'],
    autoIncrementKeys: ['activity_id'],
    insertColumns: ['activity_id', 'activity_title', 'seq', 'lang_id'],
    selectColumns: ['activity_id', 'activity_title', 'seq', 'lang_id'],
    orderBy: 'COALESCE(seq, activity_id), activity_id'
  },
  'activity-status-translated': {
    table: 'md_activity_status_translated',
    primaryKeys: ['activity_id'],
    autoIncrementKeys: [],
    insertColumns: ['activity_id', 'lang_id', 'translated_title'],
    selectColumns: ['activity_id', 'lang_id', 'translated_title'],
    orderBy: 'activity_id, lang_id'
  },
  'activity-type': {
    table: 'md_activity_type',
    primaryKeys: ['activity_type_id'],
    autoIncrementKeys: ['activity_type_id'],
    insertColumns: ['activity_type_id', 'activity_type_title', 'lang_id'],
    selectColumns: ['activity_type_id', 'activity_type_title', 'lang_id'],
    orderBy: 'activity_type_id'
  },
  'industry-size': {
    table: 'md_industry_size',
    primaryKeys: ['industry_size_id'],
    autoIncrementKeys: ['industry_size_id'],
    insertColumns: ['industry_size_id', 'title', 'lang_id'],
    selectColumns: ['industry_size_id', 'title', 'lang_id'],
    orderBy: 'industry_size_id'
  },
  'industry-size-translated': {
    table: 'md_industry_size_translated',
    primaryKeys: ['industry_size_id'],
    autoIncrementKeys: [],
    insertColumns: ['industry_size_id', 'lang_id', 'translated_title'],
    selectColumns: ['industry_size_id', 'lang_id', 'translated_title'],
    orderBy: 'industry_size_id, lang_id'
  },
  'industry-types': {
    table: 'md_industry_types',
    primaryKeys: ['industry_id'],
    autoIncrementKeys: ['industry_id'],
    insertColumns: ['industry_id', 'title', 'lang_id'],
    selectColumns: ['industry_id', 'title', 'lang_id'],
    orderBy: 'industry_id'
  },
  'industry-types-translated': {
    table: 'md_industry_types_translated',
    primaryKeys: ['industry_id'],
    autoIncrementKeys: [],
    insertColumns: ['industry_id', 'lang_id', 'translated_title'],
    selectColumns: ['industry_id', 'lang_id', 'translated_title'],
    orderBy: 'industry_id, lang_id'
  },
  languages: {
    table: 'md_languages',
    primaryKeys: ['language_id'],
    autoIncrementKeys: [],
    insertColumns: ['language_id', 'language_name', 'native_name'],
    selectColumns: ['language_id', 'language_name', 'native_name'],
    orderBy: 'language_id'
  },
  reasons: {
    table: 'md_reasons',
    primaryKeys: ['reason_id'],
    autoIncrementKeys: [],
    insertColumns: ['reason_id', 'reason_title', 'lang_id'],
    selectColumns: ['reason_id', 'reason_title', 'lang_id'],
    orderBy: 'reason_id'
  },
  'reasons-translated': {
    table: 'md_reasons_translated',
    primaryKeys: ['reason_id', 'lang_id'],
    autoIncrementKeys: [],
    insertColumns: ['reason_id', 'lang_id', 'translated_title'],
    selectColumns: ['reason_id', 'lang_id', 'translated_title'],
    orderBy: 'reason_id, lang_id'
  },
  sources: {
    table: 'md_sources',
    primaryKeys: ['source_id'],
    autoIncrementKeys: ['source_id'],
    insertColumns: ['source_id', 'source_key', 'lang_id'],
    selectColumns: ['source_id', 'source_key', 'lang_id'],
    orderBy: 'source_id'
  },
  'sources-translated': {
    table: 'md_sources_translated',
    primaryKeys: ['source_id'],
    autoIncrementKeys: [],
    insertColumns: ['source_id', 'lang_id', 'translated_title'],
    selectColumns: ['source_id', 'lang_id', 'translated_title'],
    orderBy: 'source_id, lang_id'
  },
  stages: {
    table: 'md_stages',
    primaryKeys: ['stage_code'],
    autoIncrementKeys: [],
    insertColumns: ['stage_code', 'stage_key', 'seq', 'progress'],
    selectColumns: ['stage_code', 'stage_key', 'seq', 'progress'],
    orderBy: 'COALESCE(seq, stage_code), stage_code'
  },
  'stages-translation': {
    table: 'md_stages_translation',
    primaryKeys: ['stage_code', 'lang_id'],
    autoIncrementKeys: [],
    insertColumns: ['stage_code', 'lang_id', 'stage_in_lang'],
    selectColumns: ['stage_code', 'lang_id', 'stage_in_lang'],
    orderBy: 'stage_code, lang_id'
  }
};
 
const normalizeMasterName = (masterName) => {
  return String(masterName || '')
    .trim()
    .replace(/^md_/, '')
    .replace(/_/g, '-');
};
 
const getDefinition = (masterName) => {
  const definition = masterTables[normalizeMasterName(masterName)];
 
  if (!definition) {
    throw CreateError(404, 'Master table not found');
  }
 
  return definition;
};
 
const clearMasterCache = () => {
  cache.clear();
};
 
const getCachedRows = async (cacheKey, queryFn) => {
  const cached = cache.get(cacheKey);
 
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rows;
  }
 
  const rows = await queryFn();
  cache.set(cacheKey, {
    rows,
    expiresAt: Date.now() + MASTER_CACHE_TTL_MS
  });
 
  return rows;
};
const toPayloadRows = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
 
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
 
  return [payload];
};
 
const buildUpsertRows = (definition, payload) => {
  const rows = toPayloadRows(payload);
 
  if (!rows.length) {
    throw CreateError(400, 'Request body is required');
  }
 
  return rows.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw CreateError(400, 'Each row must be an object');
    }
 
    definition.primaryKeys
      .filter((column) => !(definition.autoIncrementKeys || []).includes(column))
      .forEach((column) => {
        if (row[column] === undefined || row[column] === null || row[column] === '') {
          throw CreateError(400, `${column} is required`);
        }
      });
 
    const values = definition.insertColumns.map((column) => {
      if (row[column] !== undefined) {
        return row[column];
      }
 
      if (column === 'lang_id') {
        return DEFAULT_LANGUAGE_ID;
      }
 
      return null;
    });
    const hasWritableValue = definition.insertColumns.some((column) => {
      return !definition.primaryKeys.includes(column) && row[column] !== undefined;
    });
 
    if (!hasWritableValue) {
      throw CreateError(400, 'At least one writable value is required');
    }
 
    return values;
  });
};
 
export const listMasterTables = () => {
  return Object.keys(masterTables);
};
 
export const getMasterData = async (masterName) => {
  const normalizedMasterName = normalizeMasterName(masterName);
  const definition = getDefinition(masterName);
 
  return getCachedRows(normalizedMasterName, async () => {
    const columns = definition.selectColumns.join(', ');
    const [rows] = await db.execute(
      `SELECT ${columns}
       FROM ${definition.table}
       ORDER BY ${definition.orderBy}`
    );
 
    return rows;
  });
};
 
export const upsertMasterData = async (masterName, payload) => {
  const normalizedMasterName = normalizeMasterName(masterName);
  const definition = getDefinition(masterName);
  const rows = buildUpsertRows(definition, payload);
  const columns = definition.insertColumns;
  const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
  const updateColumns = columns.filter((column) => !definition.primaryKeys.includes(column));
  const updateClause = updateColumns
    .map((column) => `${column} = new_values.${column}`)
    .join(', ');
  const values = rows.flat();
 
  await db.execute(
    `INSERT INTO ${definition.table} (${columns.join(', ')})
     VALUES ${placeholders}
     AS new_values
     ON DUPLICATE KEY UPDATE ${updateClause}`,
    values
  );
 
  clearMasterCache();
  return getMasterData(normalizedMasterName);
};
 
export const getStages = async (languageId = DEFAULT_LANGUAGE_ID) => {
  const lang = normalizeLanguageId(languageId);
  const terminalPlaceholders = TERMINAL_STAGE_KEYS.map(() => '?').join(', ');
  const reasonRequiredPlaceholders = REASON_REQUIRED_STAGE_KEYS.map(() => '?').join(', ');
 
  return getCachedRows(`stages:${lang}`, async () => {
    const [rows] = await db.execute(
      `SELECT
         sm.stage_code,
         sm.stage_key,
         COALESCE(t.stage_in_lang, en.stage_in_lang, sm.stage_key) AS label,
         COALESCE(sm.seq, sm.stage_code) AS sequence,
         sm.seq,
         sm.progress,
         CASE
           WHEN sm.stage_key IN (${terminalPlaceholders}) THEN 1
           ELSE 0
         END AS is_terminal,
         CASE
           WHEN sm.stage_key IN (${reasonRequiredPlaceholders}) THEN 1
           ELSE 0
         END AS requires_reason
       FROM md_stages sm
       LEFT JOIN md_stages_translation en
         ON en.stage_code = sm.stage_code
        AND en.lang_id = ?
       LEFT JOIN md_stages_translation t
         ON t.stage_code = sm.stage_code
        AND t.lang_id = ?
       ORDER BY COALESCE(sm.seq, sm.stage_code), sm.stage_code`,
      [
        ...TERMINAL_STAGE_KEYS,
        ...REASON_REQUIRED_STAGE_KEYS,
        DEFAULT_LANGUAGE_ID,
        lang
      ]
    );
 
    return rows;
  });
};
 
export const getSources = async (languageId = DEFAULT_LANGUAGE_ID) => {
  const lang = normalizeLanguageId(languageId);
 
  return getCachedRows(`sources:${lang}`, async () => {
    const [rows] = await db.execute(
      `SELECT
         s.source_id,
         s.source_key,
         COALESCE(t.translated_title, s.source_key) AS label,
         s.lang_id
       FROM md_sources s
       LEFT JOIN md_sources_translated t
         ON t.source_id = s.source_id
        AND t.lang_id = ?
       ORDER BY s.source_id`,
      [lang]
    );
    return rows;
  });
};
 
export const getLanguages = async () => {
  return getMasterData('languages');
};
 
export const getActivityStatus = async (languageId = DEFAULT_LANGUAGE_ID) => {
  const lang = normalizeLanguageId(languageId);
 
  return getCachedRows(`activity-status:${lang}`, async () => {
    const [rows] = await db.execute(
      `SELECT
         a.activity_id,
         a.activity_title,
         COALESCE(t.translated_title, a.activity_title) AS label,
         a.seq,
         a.lang_id
       FROM md_activity_status a
       LEFT JOIN md_activity_status_translated t
         ON t.activity_id = a.activity_id
        AND t.lang_id = ?
       ORDER BY COALESCE(a.seq, a.activity_id), a.activity_id`,
      [lang]
    );
 
    return rows;
  });
};
 
export const getActivityTypes = async () => {
  return getMasterData('activity-type');
};
 
export const getIndustrySizes = async (languageId = DEFAULT_LANGUAGE_ID) => {
  const lang = normalizeLanguageId(languageId);
 
  return getCachedRows(`industry-size:${lang}`, async () => {
    const [rows] = await db.execute(
      `SELECT
         s.industry_size_id,
         s.title,
         COALESCE(t.translated_title, s.title) AS label,
         s.lang_id
       FROM md_industry_size s
       LEFT JOIN md_industry_size_translated t
         ON t.industry_size_id = s.industry_size_id
        AND t.lang_id = ?
       ORDER BY s.industry_size_id`,
      [lang]
    );
 
    return rows;
  });
};
 
export const getIndustryTypes = async (languageId = DEFAULT_LANGUAGE_ID) => {
  const lang = normalizeLanguageId(languageId);
 
  return getCachedRows(`industry-types:${lang}`, async () => {
    const [rows] = await db.execute(
      `SELECT
         i.industry_id,
         i.title,
         COALESCE(t.translated_title, i.title) AS label,
         i.lang_id
       FROM md_industry_types i
       LEFT JOIN md_industry_types_translated t
         ON t.industry_id = i.industry_id
        AND t.lang_id = ?
       ORDER BY i.industry_id`,
      [lang]
    );
 
    return rows;
  });
};
 
export const getReasons = async (languageId = DEFAULT_LANGUAGE_ID) => {
  const lang = normalizeLanguageId(languageId);
 
  return getCachedRows(`reasons:${lang}`, async () => {
    const [rows] = await db.execute(
      `SELECT
         r.reason_id,
         r.reason_title,
         COALESCE(t.translated_title, r.reason_title) AS label,
         r.lang_id
       FROM md_reasons r
       LEFT JOIN md_reasons_translated t
         ON t.reason_id = r.reason_id
        AND t.lang_id = ?
       ORDER BY r.reason_id`,
      [lang]
    );
 
    return rows;
  });
};