import db from '../config/db.js';

const getPeriodExpression = (period, column = 'a.created_at') => {

    switch (period) {

        case 'week':
            return `YEAR(${column}), WEEK(${column},1)`;

        case 'quarter':
            return `YEAR(${column}), QUARTER(${column})`;

        case 'year':
            return `YEAR(${column})`;

        case 'month':
        default:
            return `DATE_FORMAT(${column},'%Y-%m')`;
    }
};

export const getBdActivityReport = async ({
    period = 'month',
    bd_id,
    fromDate,
    toDate
}) => {

    let where = ` WHERE 1=1 `;
    const params = [];

    if (bd_id) {
        where += ` AND a.created_by = ? `;
        params.push(Number(bd_id));
    }

    if (fromDate) {
        where += ` AND a.created_at >= ? `;
        params.push(fromDate);
    }

    if (toDate) {
        where += ` AND a.created_at <= ? `;
        params.push(toDate);
    }

    const currentPeriodQuery = `
        SELECT
            a.created_by AS bd_id,

            COUNT(a.id) AS activities,

            COUNT(DISTINCT a.prospect_id)
                AS attempted_prospects,

            ROUND(
                COUNT(a.id) /
                NULLIF(
                    COUNT(DISTINCT a.prospect_id),
                    0
                ),
                2
            ) AS activities_per_prospect,

            COUNT(
                DISTINCT CASE
                    WHEN p.stage_code = 4
                    THEN p.id
                END
            ) AS converted,

            ROUND(
                (
                    COUNT(
                        DISTINCT CASE
                            WHEN p.stage_code = 4
                            THEN p.id
                        END
                    ) /
                    NULLIF(
                        COUNT(
                            DISTINCT a.prospect_id
                        ),
                        0
                    )
                ) * 100,
                2
            ) AS conversion_percentage

        FROM td_activity a

        INNER JOIN md_prospects p
            ON p.id = a.prospect_id

        ${where}

        GROUP BY a.created_by
        ORDER BY a.created_by
    `;

    const [currentPeriodData] =
        await db.query(
            currentPeriodQuery,
            params
        );

    let previousWhere = where;
    const previousParams = [...params];

    if (fromDate && toDate) {

        previousParams.length = 0;

        if (bd_id) {
            previousWhere +=
                ` AND a.created_by = ? `;
            previousParams.push(
                Number(bd_id)
            );
        }

        previousWhere += `
            AND a.created_at BETWEEN
            DATE_SUB(?, INTERVAL 1 YEAR)
            AND
            DATE_SUB(?, INTERVAL 1 YEAR)
        `;

        previousParams.push(
            fromDate,
            toDate
        );
    }

    const previousPeriodQuery = `
        SELECT
            a.created_by AS bd_id,

            COUNT(a.id) AS activities,

            COUNT(DISTINCT a.prospect_id)
                AS attempted_prospects,

            ROUND(
                COUNT(a.id) /
                NULLIF(
                    COUNT(
                        DISTINCT a.prospect_id
                    ),
                    0
                ),
                2
            ) AS activities_per_prospect,

            COUNT(
                DISTINCT CASE
                    WHEN p.stage_code = 4
                    THEN p.id
                END
            ) AS converted,

            ROUND(
                (
                    COUNT(
                        DISTINCT CASE
                            WHEN p.stage_code = 4
                            THEN p.id
                        END
                    ) /
                    NULLIF(
                        COUNT(
                            DISTINCT a.prospect_id
                        ),
                        0
                    )
                ) * 100,
                2
            ) AS conversion_percentage

        FROM td_activity a

        INNER JOIN md_prospects p
            ON p.id = a.prospect_id

        ${previousWhere}

        GROUP BY a.created_by
        ORDER BY a.created_by
    `;

    const [previousPeriodData] =
        await db.query(
            previousPeriodQuery,
            previousParams
        );

    return {
        period,
        currentPeriod: currentPeriodData,
        previousYearSamePeriod:
            previousPeriodData
    };
};

export const getProspectSourcingReport = async ({
    period = 'month',
    bd_id,
    fromDate,
    toDate
}) => {

    let where = ` WHERE 1=1 `;
    const params = [];

    if (bd_id) {
        where += ` AND p.source_id = ? `;
        params.push(Number(bd_id));
    }

    if (fromDate) {
        where += ` AND p.created_at >= ? `;
        params.push(fromDate);
    }

    if (toDate) {
        where += ` AND p.created_at <= ? `;
        params.push(toDate);
    }

    let periodSelect = '';
    let groupBy = '';

    switch (period) {
        case 'week':
            periodSelect = `
                YEAR(p.created_at) AS year,
                WEEK(p.created_at,1) AS period
            `;
            groupBy = `
                p.source_id,
                YEAR(p.created_at),
                WEEK(p.created_at,1)
            `;
            break;

        case 'quarter':
            periodSelect = `
                YEAR(p.created_at) AS year,
                QUARTER(p.created_at) AS period
            `;
            groupBy = `
                p.source_id,
                YEAR(p.created_at),
                QUARTER(p.created_at)
            `;
            break;

        case 'year':
            periodSelect = `
                YEAR(p.created_at) AS period
            `;
            groupBy = `
                p.source_id,
                YEAR(p.created_at)
            `;
            break;

        default:
            periodSelect = `
                DATE_FORMAT(
                    p.created_at,
                    '%Y-%m'
                ) AS period
            `;
            groupBy = `
                p.source_id,
                DATE_FORMAT(
                    p.created_at,
                    '%Y-%m'
                )
            `;
    }

    const [rows] = await db.query(
        `
        SELECT

            p.source_id AS bd_id,

            ${periodSelect},

            COUNT(*) AS sourced_prospects

        FROM md_prospects p

        ${where}

        GROUP BY ${groupBy}

        ORDER BY
            bd_id,
            period
        `,
        params
    );

    return rows;
};