import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { STAGE_KEYS } from '../constants/stages.js';

const VALID_PERIODS = new Set(['week', 'month', 'quarter', 'year']);

const BD_NAME_EXPR = `COALESCE(
  NULLIF(TRIM(p.sourced_by_name), ''),
  CASE WHEN p.assigned_user_id IS NOT NULL THEN CONCAT('Assigned User ', p.assigned_user_id) END,
  CASE WHEN p.created_by IS NOT NULL THEN CONCAT('Created By ', p.created_by) END,
  'Unassigned'
)`;

const zeroActivityMetrics = () => ({
  activityCount: 0,
  activeProspects: 0,
  activitiesPerProspect: 0,
  attemptedProspects: 0,
  convertedProspects: 0,
  conversionPercent: 0
});

const zeroSourcingMetrics = () => ({
  sourcedProspects: 0
});

const normalizePeriod = (period) => {
  const normalized = String(period || 'month').trim().toLowerCase();

  if (!VALID_PERIODS.has(normalized)) {
    throw CreateError(400, 'period must be one of week, month, quarter, year');
  }

  return normalized;
};

const parseDate = (value, fieldName) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw CreateError(400, `${fieldName} must be a valid date`);
  }

  return date;
};

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

const addYears = (date, years) => {
  const copy = new Date(date);
  copy.setUTCFullYear(copy.getUTCFullYear() + years);
  return copy;
};

const toMysqlDateTime = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const normalizeDateRange = ({ fromDate, toDate } = {}) => {
  const now = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const defaultEnd = addDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), 1);
  const parsedFrom = parseDate(fromDate, 'fromDate') || defaultStart;
  let parsedTo = parseDate(toDate, 'toDate') || defaultEnd;

  if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(String(toDate))) {
    parsedTo = addDays(parsedTo, 1);
  }

  if (parsedFrom >= parsedTo) {
    throw CreateError(400, 'fromDate must be before toDate');
  }

  return {
    fromDate: parsedFrom,
    toDate: parsedTo,
    previousFromDate: addYears(parsedFrom, -1),
    previousToDate: addYears(parsedTo, -1)
  };
};

const getPeriodExpressions = (period, dateExpression) => {
  if (period === 'week') {
    const isoYearWeek = `YEARWEEK(${dateExpression}, 3)`;
    const periodYear = `CAST(FLOOR(${isoYearWeek} / 100) AS UNSIGNED)`;
    const periodNumber = `MOD(${isoYearWeek}, 100)`;

    return {
      periodSort: isoYearWeek,
      periodYear,
      periodNumber,
      periodLabel: `CONCAT(${periodYear}, '-W', LPAD(${periodNumber}, 2, '0'))`
    };
  }

  if (period === 'month') {
    return {
      periodSort: `(YEAR(${dateExpression}) * 100) + MONTH(${dateExpression})`,
      periodYear: `YEAR(${dateExpression})`,
      periodNumber: `MONTH(${dateExpression})`,
      periodLabel: `DATE_FORMAT(${dateExpression}, '%Y-%m')`
    };
  }

  if (period === 'quarter') {
    return {
      periodSort: `(YEAR(${dateExpression}) * 10) + QUARTER(${dateExpression})`,
      periodYear: `YEAR(${dateExpression})`,
      periodNumber: `QUARTER(${dateExpression})`,
      periodLabel: `CONCAT(YEAR(${dateExpression}), '-Q', QUARTER(${dateExpression}))`
    };
  }

  return {
    periodSort: `YEAR(${dateExpression})`,
    periodYear: `YEAR(${dateExpression})`,
    periodNumber: '1',
    periodLabel: `CAST(YEAR(${dateExpression}) AS CHAR)`
  };
};

const getBdName = (row) => String(row.bd_name || 'Unassigned');

const rowKey = (row) => {
  return `${getBdName(row)}::${Number(row.period_year)}::${Number(row.period_number)}`;
};

const previousYearKeyFor = (row) => {
  return `${getBdName(row)}::${Number(row.period_year) - 1}::${Number(row.period_number)}`;
};

const ensureActivityRow = (map, row) => {
  const key = rowKey(row);

  if (!map.has(key)) {
    map.set(key, {
      bdName: getBdName(row),
      periodLabel: String(row.period_label),
      periodYear: Number(row.period_year),
      periodNumber: Number(row.period_number),
      periodSort: Number(row.period_sort),
      ...zeroActivityMetrics()
    });
  }

  return map.get(key);
};

const ensureSourcingRow = (map, row) => {
  const key = rowKey(row);

  if (!map.has(key)) {
    map.set(key, {
      bdName: getBdName(row),
      periodLabel: String(row.period_label),
      periodYear: Number(row.period_year),
      periodNumber: Number(row.period_number),
      periodSort: Number(row.period_sort),
      ...zeroSourcingMetrics()
    });
  }

  return map.get(key);
};

const finalizeActivityMetrics = (row) => {
  const activityCount = Number(row.activityCount || 0);
  const activeProspects = Number(row.activeProspects || 0);
  const attemptedProspects = Number(row.attemptedProspects || 0);
  const convertedProspects = Number(row.convertedProspects || 0);

  return {
    activityCount,
    activeProspects,
    activitiesPerProspect: activeProspects === 0 ? 0 : Number((activityCount / activeProspects).toFixed(2)),
    attemptedProspects,
    convertedProspects,
    conversionPercent: attemptedProspects === 0 ? 0 : Number(((convertedProspects / attemptedProspects) * 100).toFixed(2))
  };
};

const formatActivityRow = (row, previousRows) => {
  const previous = previousRows.get(previousYearKeyFor(row));

  return {
    bdName: row.bdName,
    periodLabel: row.periodLabel,
    periodYear: row.periodYear,
    periodNumber: row.periodNumber,
    ...finalizeActivityMetrics(row),
    previousYear: previous
      ? {
          periodLabel: previous.periodLabel,
          periodYear: previous.periodYear,
          periodNumber: previous.periodNumber,
          ...finalizeActivityMetrics(previous)
        }
      : {
          periodLabel: null,
          periodYear: row.periodYear - 1,
          periodNumber: row.periodNumber,
          ...zeroActivityMetrics()
        }
  };
};

const formatSourcingRow = (row, previousRows) => {
  const previous = previousRows.get(previousYearKeyFor(row));

  return {
    bdName: row.bdName,
    periodLabel: row.periodLabel,
    periodYear: row.periodYear,
    periodNumber: row.periodNumber,
    sourcedProspects: Number(row.sourcedProspects || 0),
    previousYear: previous
      ? {
          periodLabel: previous.periodLabel,
          periodYear: previous.periodYear,
          periodNumber: previous.periodNumber,
          sourcedProspects: Number(previous.sourcedProspects || 0)
        }
      : {
          periodLabel: null,
          periodYear: row.periodYear - 1,
          periodNumber: row.periodNumber,
          sourcedProspects: 0
        }
  };
};

const activityTotals = (rows) => {
  const totals = rows.reduce((acc, row) => {
    acc.activityCount += row.activityCount;
    acc.activeProspects += row.activeProspects;
    acc.attemptedProspects += row.attemptedProspects;
    acc.convertedProspects += row.convertedProspects;
    return acc;
  }, zeroActivityMetrics());

  return finalizeActivityMetrics(totals);
};

const sourcingTotals = (rows) => {
  return {
    sourcedProspects: rows.reduce((sum, row) => sum + row.sourcedProspects, 0)
  };
};

const normalizeRows = (rows) => {
  return rows.map((row) => ({
    ...row,
    period_year: Number(row.period_year),
    period_number: Number(row.period_number),
    period_sort: Number(row.period_sort)
  }));
};

const getBdFilter = (bdName) => {
  const normalizedBdName = bdName ? String(bdName).trim() : '';

  if (!normalizedBdName) {
    return { clause: '', params: [] };
  }

  return {
    clause: ` AND UPPER(${BD_NAME_EXPR}) = ?`,
    params: [normalizedBdName.toUpperCase()]
  };
};

const queryActivityCounts = async ({ period, range, bdName }) => {
  const dateExpression = 'a.created_at';
  const periodExpressions = getPeriodExpressions(period, dateExpression);
  const bdFilter = getBdFilter(bdName);

  const [rows] = await db.execute(
    `SELECT
       ${BD_NAME_EXPR} AS bd_name,
       ${periodExpressions.periodSort} AS period_sort,
       ${periodExpressions.periodYear} AS period_year,
       ${periodExpressions.periodNumber} AS period_number,
       ${periodExpressions.periodLabel} AS period_label,
       COUNT(a.t_id) AS activity_count,
       COUNT(DISTINCT a.prospect_id) AS active_prospects
     FROM td_activity a
     INNER JOIN md_prospects p
       ON p.id = a.prospect_id
     WHERE a.created_at >= ?
       AND a.created_at < ?
       ${bdFilter.clause}
     GROUP BY bd_name, period_sort, period_year, period_number, period_label
     ORDER BY period_sort, bd_name`,
    [
      toMysqlDateTime(range.fromDate),
      toMysqlDateTime(range.toDate),
      ...bdFilter.params
    ]
  );

  return normalizeRows(rows);
};

const queryStageMovementCounts = async ({ period, range, bdName }) => {
  const dateExpression = 'l.moved_at';
  const periodExpressions = getPeriodExpressions(period, dateExpression);
  const bdFilter = getBdFilter(bdName);

  const [rows] = await db.execute(
    `SELECT
       ${BD_NAME_EXPR} AS bd_name,
       ${periodExpressions.periodSort} AS period_sort,
       ${periodExpressions.periodYear} AS period_year,
       ${periodExpressions.periodNumber} AS period_number,
       ${periodExpressions.periodLabel} AS period_label,
       COUNT(DISTINCT CASE
         WHEN s.stage_key IN (?, ?, ?, ?) THEN l.prospect_id
       END) AS attempted_prospects,
       COUNT(DISTINCT CASE
         WHEN s.stage_key = ? THEN l.prospect_id
       END) AS converted_prospects
     FROM td_stage_logs l
     INNER JOIN md_prospects p
       ON p.id = l.prospect_id
     INNER JOIN md_stages s
       ON s.stage_code = l.to_stage
     WHERE l.moved_at >= ?
       AND l.moved_at < ?
       ${bdFilter.clause}
     GROUP BY bd_name, period_sort, period_year, period_number, period_label
     ORDER BY period_sort, bd_name`,
    [
      STAGE_KEYS.ATTEMPTED,
      STAGE_KEYS.ENGAGED,
      STAGE_KEYS.CONVERTED,
      STAGE_KEYS.PARKED,
      STAGE_KEYS.CONVERTED,
      toMysqlDateTime(range.fromDate),
      toMysqlDateTime(range.toDate),
      ...bdFilter.params
    ]
  );

  return normalizeRows(rows);
};

const querySourcingCounts = async ({ period, range, bdName }) => {
  const dateExpression = 'COALESCE(p.sourced_date, p.created_at)';
  const periodExpressions = getPeriodExpressions(period, dateExpression);
  const bdFilter = getBdFilter(bdName);

  const [rows] = await db.execute(
    `SELECT
       ${BD_NAME_EXPR} AS bd_name,
       ${periodExpressions.periodSort} AS period_sort,
       ${periodExpressions.periodYear} AS period_year,
       ${periodExpressions.periodNumber} AS period_number,
       ${periodExpressions.periodLabel} AS period_label,
       COUNT(p.id) AS sourced_prospects
     FROM md_prospects p
     WHERE ${dateExpression} >= ?
       AND ${dateExpression} < ?
       ${bdFilter.clause}
     GROUP BY bd_name, period_sort, period_year, period_number, period_label
     ORDER BY period_sort, bd_name`,
    [
      toMysqlDateTime(range.fromDate),
      toMysqlDateTime(range.toDate),
      ...bdFilter.params
    ]
  );

  return normalizeRows(rows);
};

const buildActivityMap = async ({ period, range, bdName }) => {
  const map = new Map();
  const activityRows = await queryActivityCounts({ period, range, bdName });
  const stageRows = await queryStageMovementCounts({ period, range, bdName });

  activityRows.forEach((row) => {
    const target = ensureActivityRow(map, row);
    target.activityCount += Number(row.activity_count || 0);
    target.activeProspects += Number(row.active_prospects || 0);
  });

  stageRows.forEach((row) => {
    const target = ensureActivityRow(map, row);
    target.attemptedProspects += Number(row.attempted_prospects || 0);
    target.convertedProspects += Number(row.converted_prospects || 0);
  });

  return map;
};

const buildSourcingMap = async ({ period, range, bdName }) => {
  const map = new Map();
  const rows = await querySourcingCounts({ period, range, bdName });

  rows.forEach((row) => {
    const target = ensureSourcingRow(map, row);
    target.sourcedProspects += Number(row.sourced_prospects || 0);
  });

  return map;
};

const formatRange = (range) => {
  return {
    fromDate: toMysqlDateTime(range.fromDate),
    toDateExclusive: toMysqlDateTime(range.toDate),
    previousFromDate: toMysqlDateTime(range.previousFromDate),
    previousToDateExclusive: toMysqlDateTime(range.previousToDate)
  };
};

export const getBdActivityReport = async ({ period, fromDate, toDate, bdName } = {}) => {
  const normalizedPeriod = normalizePeriod(period);
  const range = normalizeDateRange({ fromDate, toDate });
  const previousRange = {
    fromDate: range.previousFromDate,
    toDate: range.previousToDate
  };
  const currentRows = await buildActivityMap({ period: normalizedPeriod, range, bdName });
  const previousRows = await buildActivityMap({ period: normalizedPeriod, range: previousRange, bdName });
  const rows = [...currentRows.values()]
    .sort((a, b) => a.periodSort - b.periodSort || a.bdName.localeCompare(b.bdName))
    .map((row) => formatActivityRow(row, previousRows));

  return {
    report: 'bd-activity',
    period: normalizedPeriod,
    bdName: bdName || null,
    range: formatRange(range),
    totals: activityTotals(rows),
    rows
  };
};

export const getProspectSourcingReport = async ({ period, fromDate, toDate, bdName } = {}) => {
  const normalizedPeriod = normalizePeriod(period);
  const range = normalizeDateRange({ fromDate, toDate });
  const previousRange = {
    fromDate: range.previousFromDate,
    toDate: range.previousToDate
  };
  const currentRows = await buildSourcingMap({ period: normalizedPeriod, range, bdName });
  const previousRows = await buildSourcingMap({ period: normalizedPeriod, range: previousRange, bdName });
  const rows = [...currentRows.values()]
    .sort((a, b) => a.periodSort - b.periodSort || a.bdName.localeCompare(b.bdName))
    .map((row) => formatSourcingRow(row, previousRows));

  return {
    report: 'prospect-sourcing',
    period: normalizedPeriod,
    bdName: bdName || null,
    range: formatRange(range),
    totals: sourcingTotals(rows),
    rows
  };
};
