import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { STAGE_CODES } from '../constants/stages.js';

const VALID_PERIODS = new Set(['week', 'month', 'quarter', 'year']);

// ─── Date Helpers ─────────────────────────────────────────────────────────────

const toMysqlDateTime = (date) =>
  date.toISOString().slice(0, 19).replace('T', ' ');

const addDays = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const addYears = (date, years) => {
  const d = new Date(date);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
};

// ─── Input Validation ─────────────────────────────────────────────────────────

const normalizePeriod = (period) => {
  const p = String(period || 'month').trim().toLowerCase();
  if (!VALID_PERIODS.has(p)) throw CreateError(400, 'period must be one of: week, month, quarter, year');
  return p;
};

const normalizeDateRange = ({ fromDate, toDate } = {}) => {
  const now          = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const defaultEnd   = addDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), 1);

  const parsedFrom = fromDate ? new Date(fromDate) : defaultStart;
  let   parsedTo   = toDate   ? new Date(toDate)   : defaultEnd;

  if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(String(toDate))) parsedTo = addDays(parsedTo, 1);
  if (parsedFrom >= parsedTo) throw CreateError(400, 'fromDate must be before toDate');

  return {
    from:     toMysqlDateTime(parsedFrom),
    to:       toMysqlDateTime(parsedTo),
    prevFrom: toMysqlDateTime(addYears(parsedFrom, -1)),
    prevTo:   toMysqlDateTime(addYears(parsedTo,   -1))
  };
};

// ─── Period SQL Expressions ───────────────────────────────────────────────────

const getPeriodSQL = (period, col) => {
  if (period === 'week') {
    return {
      sort:   `YEARWEEK(${col}, 3)`,
      year:   `CAST(FLOOR(YEARWEEK(${col}, 3) / 100) AS UNSIGNED)`,
      number: `MOD(YEARWEEK(${col}, 3), 100)`,
      label:  `CONCAT(CAST(FLOOR(YEARWEEK(${col}, 3) / 100) AS UNSIGNED), '-W', LPAD(MOD(YEARWEEK(${col}, 3), 100), 2, '0'))`
    };
  }
  if (period === 'month') {
    return {
      sort:   `(YEAR(${col}) * 100) + MONTH(${col})`,
      year:   `YEAR(${col})`,
      number: `MONTH(${col})`,
      label:  `DATE_FORMAT(${col}, '%Y-%m')`
    };
  }
  if (period === 'quarter') {
    return {
      sort:   `(YEAR(${col}) * 10) + QUARTER(${col})`,
      year:   `YEAR(${col})`,
      number: `QUARTER(${col})`,
      label:  `CONCAT(YEAR(${col}), '-Q', QUARTER(${col}))`
    };
  }
  // year
  return {
    sort:   `YEAR(${col})`,
    year:   `YEAR(${col})`,
    number: `1`,
    label:  `CAST(YEAR(${col}) AS CHAR)`
  };
};

// ─── BD Filter ────────────────────────────────────────────────────────────────

const bdFilter = (bdId, col) => {
  const id = bdId ? Number(bdId) : null;
  if (!id || Number.isNaN(id)) return { clause: '', params: [] };
  return { clause: `AND ${col} = ?`, params: [id] };
};

// ─── Queries ──────────────────────────────────────────────────────────────────

const queryActivities = async (period, from, to, bdId) => {
  const p      = getPeriodSQL(period, 'a.created_at');
  const filter = bdFilter(bdId, 'a.bd_id');

  const [rows] = await db.execute(
    `SELECT
       a.bd_id                        AS bd_id,
       ${p.sort}                      AS period_sort,
       ${p.year}                      AS period_year,
       ${p.number}                    AS period_number,
       ${p.label}                     AS period_label,
       COUNT(a.t_id)                  AS activity_count,
       COUNT(DISTINCT a.prospect_key) AS active_prospects
     FROM td_activity a
     WHERE a.created_at >= ? AND a.created_at < ?
       ${filter.clause}
     GROUP BY a.bd_id, period_sort, period_year, period_number, period_label`,
    [from, to, ...filter.params]
  );
  return rows;
};

const queryStageMovements = async (period, from, to, bdId) => {
  const p      = getPeriodSQL(period, 'h.created_at');
  const filter = bdFilter(bdId, 'h.bd_id');

  const [rows] = await db.execute(
    `SELECT
       h.bd_id                              AS bd_id,
       ${p.sort}                            AS period_sort,
       ${p.year}                            AS period_year,
       ${p.number}                          AS period_number,
       ${p.label}                           AS period_label,
       COUNT(DISTINCT CASE WHEN h.stage_code IN (?,?,?,?) THEN h.prospect_key END) AS attempted_prospects,
       COUNT(DISTINCT CASE WHEN h.stage_code = ?          THEN h.prospect_key END) AS converted_prospects
     FROM td_prospect_stage_history h
     WHERE h.created_at >= ? AND h.created_at < ?
       ${filter.clause}
     GROUP BY h.bd_id, period_sort, period_year, period_number, period_label`,
    [
      STAGE_CODES.ATTEMPTED, STAGE_CODES.ENGAGED, STAGE_CODES.CONVERTED, STAGE_CODES.PARKED,
      STAGE_CODES.CONVERTED,
      from, to,
      ...filter.params
    ]
  );
  return rows;
};

const querySourcing = async (period, from, to, bdId) => {
  const dateCol = 'COALESCE(p.sourced_date, p.created_at)';
  const p       = getPeriodSQL(period, dateCol);
  const filter  = bdFilter(bdId, 'p.source_bd_id');

  const [rows] = await db.execute(
    `SELECT
       p.source_bd_id     AS bd_id,
       ${p.sort}          AS period_sort,
       ${p.year}          AS period_year,
       ${p.number}        AS period_number,
       ${p.label}         AS period_label,
       COUNT(p.id)        AS sourced_prospects
     FROM md_prospects p
     WHERE ${dateCol} >= ? AND ${dateCol} < ?
       AND p.source_bd_id IS NOT NULL
       ${filter.clause}
     GROUP BY p.source_bd_id, period_sort, period_year, period_number, period_label`,
    [from, to, ...filter.params]
  );
  return rows;
};

// ─── Merge Rows into Map ──────────────────────────────────────────────────────

const rowKey = (bdId, year, number) => `${bdId}::${year}::${number}`;

const mergeActivityRows = (activityRows, stageRows) => {
  const map = new Map();

  const ensure = (row) => {
    const k = rowKey(row.bd_id, row.period_year, row.period_number);
    if (!map.has(k)) {
      map.set(k, {
        bdId:               Number(row.bd_id),
        periodLabel:        String(row.period_label),
        periodYear:         Number(row.period_year),
        periodNumber:       Number(row.period_number),
        periodSort:         Number(row.period_sort),
        activities:         0,
        attemptedProspects: 0,
        convertedProspects: 0
      });
    }
    return map.get(k);
  };

  activityRows.forEach((row) => {
    ensure(row).activities += Number(row.activity_count || 0);
  });

  stageRows.forEach((row) => {
    const entry = ensure(row);
    entry.attemptedProspects += Number(row.attempted_prospects || 0);
    entry.convertedProspects += Number(row.converted_prospects || 0);
  });

  return map;
};

const mergeSourcingRows = (rows) => {
  const map = new Map();

  rows.forEach((row) => {
    const k = rowKey(row.bd_id, row.period_year, row.period_number);
    if (!map.has(k)) {
      map.set(k, {
        bdId:             Number(row.bd_id),
        periodLabel:      String(row.period_label),
        periodYear:       Number(row.period_year),
        periodNumber:     Number(row.period_number),
        periodSort:       Number(row.period_sort),
        sourcedProspects: 0
      });
    }
    map.get(k).sourcedProspects += Number(row.sourced_prospects || 0);
  });

  return map;
};

// ─── Conversion % ─────────────────────────────────────────────────────────────

const conversionPct = (converted, attempted) =>
  attempted === 0 ? 0 : Number(((converted / attempted) * 100).toFixed(2));

// ─── Public API ───────────────────────────────────────────────────────────────

export const getBdActivityReport = async ({ period, fromDate, toDate, bdId } = {}) => {
  const p     = normalizePeriod(period);
  const range = normalizeDateRange({ fromDate, toDate });

  // Run all 4 queries in parallel (current + previous year)
  const [actCurr, stageCurr, actPrev, stagePrev] = await Promise.all([
    queryActivities(p,     range.from,     range.to,     bdId),
    queryStageMovements(p, range.from,     range.to,     bdId),
    queryActivities(p,     range.prevFrom, range.prevTo, bdId),
    queryStageMovements(p, range.prevFrom, range.prevTo, bdId)
  ]);

  const current  = mergeActivityRows(actCurr,  stageCurr);
  const previous = mergeActivityRows(actPrev,  stagePrev);

  const rows = [...current.values()]
    .sort((a, b) => a.periodSort - b.periodSort || a.bdId - b.bdId)
    .map((row) => {
      const prev = previous.get(rowKey(row.bdId, row.periodYear - 1, row.periodNumber));
      return {
        bdId:                 row.bdId,
        periodLabel:          row.periodLabel,
        activities:           row.activities,
        attemptedProspects:   row.attemptedProspects,
        convertedProspects:   row.convertedProspects,
        conversionPercentage: conversionPct(row.convertedProspects, row.attemptedProspects),
        previousYear: prev
          ? {
              periodLabel:          prev.periodLabel,
              activities:           prev.activities,
              attemptedProspects:   prev.attemptedProspects,
              convertedProspects:   prev.convertedProspects,
              conversionPercentage: conversionPct(prev.convertedProspects, prev.attemptedProspects)
            }
          : { periodLabel: null, activities: 0, attemptedProspects: 0, convertedProspects: 0, conversionPercentage: 0 }
      };
    });

  const totals = rows.reduce(
    (acc, r) => {
      acc.activities         += r.activities;
      acc.attemptedProspects += r.attemptedProspects;
      acc.convertedProspects += r.convertedProspects;
      return acc;
    },
    { activities: 0, attemptedProspects: 0, convertedProspects: 0 }
  );

  return {
    report: 'bd-activity',
    period: p,
    bdId:   bdId ? Number(bdId) : null,
    range:  { from: range.from, to: range.to, prevFrom: range.prevFrom, prevTo: range.prevTo },
    totals: { ...totals, conversionPercentage: conversionPct(totals.convertedProspects, totals.attemptedProspects) },
    rows
  };
};

export const getProspectSourcingReport = async ({ period, fromDate, toDate, bdId } = {}) => {
  const p     = normalizePeriod(period);
  const range = normalizeDateRange({ fromDate, toDate });

  // Run both queries in parallel (current + previous year)
  const [currRows, prevRows] = await Promise.all([
    querySourcing(p, range.from,     range.to,     bdId),
    querySourcing(p, range.prevFrom, range.prevTo, bdId)
  ]);

  const current  = mergeSourcingRows(currRows);
  const previous = mergeSourcingRows(prevRows);

  const rows = [...current.values()]
    .sort((a, b) => a.periodSort - b.periodSort || a.bdId - b.bdId)
    .map((row) => {
      const prev = previous.get(rowKey(row.bdId, row.periodYear - 1, row.periodNumber));
      return {
        bdId:             row.bdId,
        periodLabel:      row.periodLabel,
        sourcedProspects: row.sourcedProspects,
        previousYear: prev
          ? { periodLabel: prev.periodLabel, sourcedProspects: prev.sourcedProspects }
          : { periodLabel: null, sourcedProspects: 0 }
      };
    });

  return {
    report: 'prospect-sourcing',
    period: p,
    bdId:   bdId ? Number(bdId) : null,
    range:  { from: range.from, to: range.to, prevFrom: range.prevFrom, prevTo: range.prevTo },
    totals: { sourcedProspects: rows.reduce((sum, r) => sum + r.sourcedProspects, 0) },
    rows
  };
};