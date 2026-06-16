import db from '../config/db.js';

export const getDashboardTiles = async () => {
    const [rows] = await db.query(`
        SELECT
            COUNT(*) AS total_prospects,
            SUM(stage_code = 1) AS pending,
            SUM(stage_code = 2) AS attempted,
            SUM(stage_code = 3) AS engaged,
            SUM(stage_code = 4) AS converted,
            SUM(stage_code = 5) AS parked
        FROM md_prospects
    `);

    return rows[0] || {
        total_prospects: 0,
        pending: 0,
        attempted: 0,
        engaged: 0,
        converted: 0,
        parked: 0
    };
};
export const getBD = async () => {
    const [rows] = await db.query(`
        SELECT
            la.new_bd_id AS bd_user_id,
            COUNT(*) AS total_prospects,

            SUM(ls.stage_code = 1) AS pending,
            SUM(ls.stage_code = 2) AS attempted,
            SUM(ls.stage_code = 3) AS engaged,
            SUM(ls.stage_code = 4) AS converted,
            SUM(ls.stage_code = 5) AS parked

        FROM (
            SELECT a1.prospect_key, a1.new_bd_id
            FROM td_prospect_assignment a1
            INNER JOIN (
                SELECT prospect_key, MAX(id) AS max_id
                FROM td_prospect_assignment
                GROUP BY prospect_key
            ) a2
                ON a1.id = a2.max_id
        ) la

        LEFT JOIN (
            SELECT s1.prospect_key, s1.stage_code
            FROM td_prospect_stage_history s1
            INNER JOIN (
                SELECT prospect_key, MAX(id) AS max_id
                FROM td_prospect_stage_history
                GROUP BY prospect_key
            ) s2
                ON s1.id = s2.max_id
        ) ls
            ON la.prospect_key = ls.prospect_key

        GROUP BY la.new_bd_id
        ORDER BY la.new_bd_id
    `);

    return rows.length
        ? rows
        : [{
            bd_user_id: 0,
            total_prospects: 0,
            pending: 0,
            attempted: 0,
            engaged: 0,
            converted: 0,
            parked: 0
        }];
};

export const monthlyCT = async () => {
    const [rows] = await db.query(`
        SELECT
            DATE_FORMAT(created_at, '%Y-%m') AS month,
            COUNT(DISTINCT prospect_key) AS converted_count
        FROM td_prospect_stage_history
        WHERE stage_code = 4
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month
    `);

    return rows.length
        ? rows
        : [{
            month: '',
            converted_count: 0
        }];
};

export const bdmonthlyCT = async () => {
    const [rows] = await db.query(`
        SELECT
            a.new_bd_id AS bd_user_id,
            DATE_FORMAT(s.created_at, '%Y-%m') AS month,
            COUNT(DISTINCT s.prospect_key) AS converted_count

        FROM td_prospect_stage_history s

        INNER JOIN td_prospect_assignment a
            ON a.prospect_key = s.prospect_key
           AND a.created_at = (
                SELECT MAX(a2.created_at)
                FROM td_prospect_assignment a2
                WHERE a2.prospect_key = s.prospect_key
                  AND a2.created_at <= s.created_at
           )

        WHERE s.stage_code = 4
          AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)

        GROUP BY
            a.new_bd_id,
            month

        ORDER BY
            month,
            a.new_bd_id
    `);

    return rows.length
        ? rows
        : [{
            bd_user_id: 0,
            month: '',
            converted_count: 0
        }];
};