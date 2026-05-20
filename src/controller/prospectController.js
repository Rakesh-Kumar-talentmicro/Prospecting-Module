import * as prospectService from '../service/prospectService.js';
import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { normalizeInputData, normalizeOutputData } from '../utils/normalizeUtils.js';
import { prospectMapping } from '../model/prospectModel/prospectMapping.js';

export const uploadProspects = async (req, res) => {
    try {
        const { prospects } = req.body;
        const normalizedProspects = normalizeInputData(prospects, prospectMapping);

        const userId = req.headers['user-id'] || 1;
        const result = await prospectService.bulkInsertProspects(normalizedProspects, userId, 'EN', db);
        res.json(result);
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: err.message });
    }
};

export const listProspects = async (req, res) => {
    try {
        const { assigned_user_id, stage_code, last_id = 0, limit = 50 } = req.query;
        let query = 'SELECT * FROM md_prospects WHERE 1=1';
        const params = [];

        if (assigned_user_id) {
            query += ' AND assigned_user_id = ?';
            params.push(assigned_user_id);
        }
        if (stage_code) {
            query += ' AND stage_code = ?';
            params.push(stage_code);
        }

        query += ' AND id > ? ORDER BY id ASC LIMIT ?';
        params.push(parseInt(last_id), parseInt(limit));

        const [rows] = await db.query(query, params);
        res.json({ prospects: normalizeOutputData(rows, prospectMapping) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getProspect = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM md_prospects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(normalizeOutputData(rows, prospectMapping)[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateProspect = async (req, res) => {
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
        params.push(userId, id);

        await db.query(query, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const moveStage = async (req, res) => {
    try {
        const { id: prospectId } = req.params;
        const { newStage, reasonId } = req.body;
        const userId = req.headers['user-id'] || 1;
        const result = await prospectService.moveStage({ prospectId, newStage, reasonId, userId }, db);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const transferProspects = async (req, res) => {
    try {
        const { prospectIds, toUserId } = req.body;
        const fromUserId = req.headers['user-id'] || 1;
        const adminId = req.headers['admin-id'] || 1;
        const result = await prospectService.transferProspects({ prospectIds, toUserId, fromUserId, adminId }, db);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getProspectHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const [stageLogs] = await db.query('SELECT * FROM td_stage_logs WHERE prospect_id = ? ORDER BY moved_at DESC', [id]);
        const [transferLogs] = await db.query('SELECT * FROM td_transfer_logs WHERE prospect_id = ? ORDER BY transferred_at DESC', [id]);
        res.json({ stageLogs, transferLogs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};