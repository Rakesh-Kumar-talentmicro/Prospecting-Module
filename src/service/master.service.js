import db from '../config/db.js';

const DEFAULT_LANGUAGE_ID = 'EN';
const MASTER_CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map();

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

export const getStages = async (languageId) => {
  return getCachedRows(`stages:${languageId}`, async () => {
    if (languageId === DEFAULT_LANGUAGE_ID) {
      const [rows] = await db.execute(
        `SELECT
           sm.stage_code,
           sm.stage_key,
           en.stage_in_lang AS label,
           sm.sort_order AS sequence,
           CASE
             WHEN sm.stage_key = 'PENDING' THEN 0
             WHEN sm.stage_key = 'CONTACTED' THEN 20
             WHEN sm.stage_key = 'INTERESTED' THEN 40
             WHEN sm.stage_key = 'QUALIFIED' THEN 60
             WHEN sm.stage_key = 'CONVERTED' THEN 100
             WHEN sm.stage_key = 'DROPPED' THEN -100
             WHEN sm.stage_key = 'HOLD' THEN -101
             WHEN sm.stage_key = 'DEFERRED' THEN -102
             ELSE 0
           END AS progress,
           CASE
             WHEN sm.stage_key IN ('CONVERTED', 'DROPPED') THEN 1
             ELSE 0
           END AS is_terminal
         FROM md_stages sm
         INNER JOIN md_stages_translation en
           ON en.stage_code = sm.stage_code
          AND en.lang_id = ?
         WHERE sm.is_active = 1
         ORDER BY sm.sort_order, sm.stage_code`,
        [DEFAULT_LANGUAGE_ID]
      );

      return rows;
    }

    const [rows] = await db.execute(
      `SELECT
         sm.stage_code,
         sm.stage_key,
         COALESCE(t.stage_in_lang, en.stage_in_lang) AS label,
         sm.sort_order AS sequence,
         CASE
           WHEN sm.stage_key = 'PENDING' THEN 0
           WHEN sm.stage_key = 'CONTACTED' THEN 20
           WHEN sm.stage_key = 'INTERESTED' THEN 40
           WHEN sm.stage_key = 'QUALIFIED' THEN 60
           WHEN sm.stage_key = 'CONVERTED' THEN 100
           WHEN sm.stage_key = 'DROPPED' THEN -100
           WHEN sm.stage_key = 'HOLD' THEN -101
           WHEN sm.stage_key = 'DEFERRED' THEN -102
           ELSE 0
         END AS progress,
         CASE
           WHEN sm.stage_key IN ('CONVERTED', 'DROPPED') THEN 1
           ELSE 0
         END AS is_terminal
       FROM md_stages sm
       INNER JOIN md_stages_translation en
         ON en.stage_code = sm.stage_code
        AND en.lang_id = ?
       LEFT JOIN md_stages_translation t
         ON t.stage_code = sm.stage_code
        AND t.lang_id = ?
       WHERE sm.is_active = 1
       ORDER BY sm.sort_order, sm.stage_code`,
      [DEFAULT_LANGUAGE_ID, languageId]
    );

    return rows;
  });
};

export const getSources = async () => {
  return getCachedRows('sources', async () => {
    const [rows] = await db.execute(
      `SELECT
         source_id,
         source_key,
         icon,
         sort_order
       FROM md_sources
       WHERE is_active = 1
       ORDER BY sort_order, source_id`
    );

    return rows;
  });
};

export const getLanguages = async () => {
  return getCachedRows('languages', async () => {
    const [rows] = await db.execute(
      `SELECT
         language_id,
         language_name,
         native_name,
         direction
       FROM md_languages
       WHERE is_active = 1
       ORDER BY sort_order`
    );

    return rows;
  });
};
