import * as prospectService from '../service/prospectService.js';
import { normalizeInputData, normalizeOutputData } from '../utils/normalizeUtils.js';
import { prospectMapping } from '../model/prospectModel/prospectMapping.js';
import db from '../config/db.js';

export const uploadProspects = async (req, res, next) => {
    try {
        const { prospects } = req.body;
        const normalizedProspects = normalizeInputData(prospects, prospectMapping);
        const userId = req.headers['user-id'] || 1;
        const result = await prospectService.bulkInsertProspects(normalizedProspects, userId);
        return res.json(result);
    } catch (err) {
        console.error("Upload error:", err);
        next(err);
    }
};

export const listProspects = async (req, res, next) => {
    try {
        const { assigned_to, stage_code, page = 1, limit = 50 } = req.query;
        const limits = parseInt(limit) || 50;
        const offset = (parseInt(page) - 1) * limits;
        let query = `
            SELECT *
            FROM md_prospects p
            LEFT JOIN ( SELECT prospect_id, stage_code FROM (
                SELECT
                    prospect_id,
                    stage_code,
                    ROW_NUMBER() OVER (
                        PARTITION BY prospect_id
                        ORDER BY created_at DESC
                    ) AS rn
                FROM td_prospect_stage_history
            ) s
            WHERE rn = 1) s ON s.prospect_id = p.id
            LEFT JOIN (
                SELECT prospect_id, assigned_to, assigned_by, source_by
                FROM (
                    SELECT
                        prospect_id,
                        assigned_to,
                        assigned_by,
                        source_by,
                        ROW_NUMBER() OVER (
                            PARTITION BY prospect_id
                            ORDER BY created_at DESC
                        ) AS rn
                    FROM td_prospect_assignment
                ) a WHERE rn = 1
            ) a ON a.prospect_id = p.id
            WHERE 1=1
        `;

        const values = [];

        if (assigned_to) {
            query += ` AND a.assigned_to = ?`;
            values.push(assigned_to);
        }

        if (stage_code) {
            query += ` AND s.stage_code = ?`;
            values.push(stage_code);
        }

        query += ` ORDER BY p.id DESC LIMIT ? OFFSET ?`;
        values.push(limits, offset);

        const [rows] = await db.query(query, values);

        let prospects = normalizeOutputData(rows, prospectMapping);

        return res.status(200).json(prospects);
    } catch (err) {
        next(err);
    }
}; //Done

export const getProspect = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM md_prospects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        let prospect = normalizeOutputData(rows, prospectMapping);
        return res.status(200).json(prospect[0]);
    } catch (err) {
        next(err);
    }
}; //Done

export const updateProspect = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.headers['user-id'] || 1;

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });

        let query = 'UPDATE md_prospects SET ';
        const params = [];
        for (const [key, value] of Object.entries(updates)) {
            query += `${key} = ?, `;
            params.push(value);
        }
        query += 'updated_at = NOW(), updated_by = ? WHERE id = ?';
        params.push(userId, parseInt(id));

        await db.query(query, params);
        return res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

export const moveStage = async (req, res, next) => {
    try {
        const prospectId = req.params.id;
        const { newStage, reasonId } = req.body;
        let reason = reasonId ? parseInt(reasonId) : null;
        const userId = req.headers['user-id'] || 1;
        const result = await prospectService.moveStage({
            prospectId: parseInt(prospectId),
            newStage: parseInt(newStage), reason, userId
        }, db);
        return res.json(result);
    } catch (err) {
        next(err);
    }
}; //Done

export const getProspectHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        let p_id = parseInt(id);
        const [stageLogs] = await db.query('SELECT * FROM td_prospect_stage_history WHERE prospect_id = ? ORDER BY created_at DESC', [p_id]);
        const [transferLogs] = await db.query('SELECT * FROM td_prospect_assignment WHERE prospect_id = ? ORDER BY created_at DESC', [p_id]);
        return res.json({ stageLogs: stageLogs, transferLogs: transferLogs });
    } catch (err) {
        next(err);
    }
}; //Done

export const transferProspects = async (req, res, next) => {
    try {
        const { prospectIds, assigned_to } = req.body;
        const assigned_by = req.headers['user-id'] || 1;
        const result = await prospectService.transferProspects({ prospectIds, assigned_to: parseInt(assigned_to), assigned_by }, db);
        return res.json(result);
    } catch (err) {
        next(err);
    }
}; // Done
