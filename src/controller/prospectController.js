import * as prospectService from '../service/prospectService.js';
import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { normalizeInputData, normalizeOutputData } from '../utils/normalizeUtils.js';
import { prospectMapping } from '../model/prospectModel/prospectMapping.js';

export const uploadProspects = async (req, res,next) => {
    try {
        const { prospects } = req.body;
        const normalizedProspects = normalizeInputData(prospects, prospectMapping);

        const userId = req.headers['user-id'] || 1;
        const result = await prospectService.bulkInsertProspects(normalizedProspects, userId, 'EN', db);
        return res.json(result);
    } catch (err) {
        console.error("Upload error:", err);
        next(err);
    }
};

export const listProspects = async (req, res,next) => {
    try {
        const { assigned_user_id, stage_code, page, limit} = req.query;
        let limits = parseInt(limit) || 50;
        let offset = parseInt((page-1)*limits);

        let query = 'SELECT * FROM md_prospects WHERE 1=1';
        const value = [];

        if (assigned_user_id) {
            query += ' AND assigned_user_id = ?';
            value.push(assigned_user_id);
        }
        if (stage_code) {
            query += ' AND stage_code = ?';
            value.push(stage_code);
        }

        // query += ' AND id > ? ORDER BY id ASC LIMIT ?';
        query += ' LIMIT ? OFFSET ?'
        value.push(limits,offset);

        const [rows] = await db.query(query, value);
        let prospects = normalizeOutputData(rows, prospectMapping);
        return res.status(200).json(prospects);
    } catch (err) {
        next(err);
    }
};
export const getProspect = async (req, res,next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM md_prospects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        let prospect = normalizeOutputData(rows, prospectMapping);
        return res.status(200).json(...prospect);
    } catch (err) {
        next(err);
    }
};

export const updateProspect = async (req, res,next) => {
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

export const moveStage = async (req, res,next) => {
    try {
        const prospectId = req.params.id;
        const { newStageLg, reasonId } = req.body;
        const userId = req.headers['user-id'] || 1;
        const result = await prospectService.moveStage({ prospectId: parseInt(prospectId), newStageLg, reasonId, userId }, db);
        return res.json(result);
    } catch (err) {
        next(err);
    }
};

export const transferProspects = async (req, res,next) => {
    try {
        const { prospectIds, toUserId } = req.body;
        const fromUserId = req.headers['user-id'] || 1;
        const adminId = req.headers['admin-id'] || 1;
        const result = await prospectService.transferProspects({ prospectIds, toUserId:parseInt(toUserId), fromUserId, adminId }, db);
        return res.json(result);
    } catch (err) {
        next(err);
    }
};

export const getProspectHistory = async (req, res,next) => {
    try {
        const { id } = req.params;
        const [stageLogs] = await db.query('SELECT * FROM td_stage_logs WHERE prospect_id = ? ORDER BY moved_at DESC', [id]);
        const [transferLogs] = await db.query('SELECT * FROM td_transfer_logs WHERE prospect_id = ? ORDER BY transferred_at DESC', [id]);
        res.json({ stageLogs: stageLogs[0], transferLogs: transferLogs[0] });
    } catch (err) {
        next(err);
    }
};

