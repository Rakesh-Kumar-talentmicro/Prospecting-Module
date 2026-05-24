import * as prospectService from '../service/prospectService.js';
import * as activityService from '../service/activityService.js';
import db from '../config/db.js';
import { CreateError } from '../middleware/createError.js';
import { normalizeInputData, normalizeOutputData } from '../utils/normalizeUtils.js';
import { prospectMapping } from '../model/prospectModel/prospectMapping.js';

export const uploadProspects = async (req, res, next) => {
    try {
        const { prospects } = req.body;
        const normalizedProspects = normalizeInputData(prospects, prospectMapping);

        const userId = req.headers['user-id'] || 1;
        const sourcedByName = req.headers['bd-name'] || req.headers['sourced-by-name'] || null;
        const result = await prospectService.bulkInsertProspects(normalizedProspects, userId, 'EN', db, sourcedByName);
        res.json(result);
    } catch (err) {
        console.error("Upload error:", err);
        next(err);
    }
};

export const createProspect = async (req, res, next) => {
    try {
        const normalizedProspect = normalizeInputData([req.body], prospectMapping)[0];
        const userId = req.headers['user-id'] || 1;
        normalizedProspect.sourced_by_name = normalizedProspect.sourced_by_name || req.headers['bd-name'] || req.headers['sourced-by-name'] || null;
        const prospect = await prospectService.createProspect({ prospect: normalizedProspect, userId }, db);

        res.status(201).json({
            success: true,
            data: normalizeOutputData([prospect], prospectMapping)[0]
        });
    } catch (err) {
        next(err);
    }
};

export const listProspects = async (req, res, next) => {
    try {
        const { assigned_user_id, stage_code, source_id, industry_id, industry_size_id, last_id = 0, limit = 50 } = req.query;
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
        if (source_id) {
            query += ' AND source_id = ?';
            params.push(source_id);
        }
        if (industry_id) {
            query += ' AND industry_id = ?';
            params.push(industry_id);
        }
        if (industry_size_id) {
            query += ' AND industry_size_id = ?';
            params.push(industry_size_id);
        }

        query += ' AND id > ? ORDER BY id ASC LIMIT ?';
        params.push(parseInt(last_id), parseInt(limit));

        const [rows] = await db.query(query, params);
        res.json({ prospects: normalizeOutputData(rows, prospectMapping) });
    } catch (err) {
        next(err);
    }
};

export const getProspect = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM md_prospects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(normalizeOutputData(rows, prospectMapping)[0]);
    } catch (err) {
        next(err);
    }
};

export const updateProspect = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = normalizeInputData([req.body], prospectMapping)[0];
        const userId = req.headers['user-id'] || 1;

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No supported fields to update' });

        const result = await prospectService.updateProspect({ id, updates, userId }, db);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const moveStage = async (req, res, next) => {
    try {
        const { id: prospectId } = req.params;
        const newStage = req.body.newStage ?? req.body.stageCode ?? req.body.stage_code;
        const reasonId = req.body.reasonId ?? req.body.reason_id;
        const userId = req.headers['user-id'] || 1;
        const result = await prospectService.moveStage({ prospectId, newStage, reasonId, userId }, db);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const transferProspects = async (req, res, next) => {
    try {
        const { prospectIds, toUserId } = req.body;
        const fromUserId = req.headers['user-id'] || 1;
        const adminId = req.headers['admin-id'] || 1;
        const result = await prospectService.transferProspects({ prospectIds, toUserId, fromUserId, adminId }, db);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const getProspectHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [stageLogs] = await db.query('SELECT * FROM td_stage_logs WHERE prospect_id = ? ORDER BY moved_at DESC', [id]);
        const [transferLogs] = await db.query('SELECT * FROM td_transfer_logs WHERE prospect_id = ? ORDER BY transferred_at DESC', [id]);
        const [updateLogs] = await db.query('SELECT * FROM td_prospect_update_logs WHERE prospect_id = ? ORDER BY changed_at DESC', [id]);
        res.json({ stageLogs, transferLogs, updateLogs });
    } catch (err) {
        next(err);
    }
};

export const createActivity = async (req, res, next) => {
    try {
        const { id: prospectId } = req.params;
        const activityTypeId = req.body.activityTypeId || req.body.activity_type_id;

        const activity = await activityService.createActivity({ prospectId, activityTypeId, payload: req.body }, db);
        res.status(201).json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};

export const createCallActivity = async (req, res, next) => {
    try {
        const { id: prospectId } = req.params;
        const activity = await activityService.createCallActivity({ prospectId, payload: req.body }, db);
        res.status(201).json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};

export const listActivities = async (req, res, next) => {
    try {
        const { id: prospectId } = req.params;

        const activities = await activityService.listActivities({ prospectId }, db);
        res.json({ success: true, data: activities });
    } catch (err) {
        next(err);
    }
};

export const updateActivity = async (req, res, next) => {
    try {
        const { id: prospectId, activityId } = req.params;

        const activity = await activityService.updateActivity({ prospectId, activityId, payload: req.body }, db);
        res.json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};

export const closeActivity = async (req, res, next) => {
    try {
        const { id: prospectId, activityId } = req.params;

        const activity = await activityService.closeActivity({ prospectId, activityId, payload: req.body }, db);
        res.json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};

export const cancelActivity = async (req, res, next) => {
    try {
        const { id: prospectId, activityId } = req.params;

        const activity = await activityService.cancelActivity({ prospectId, activityId, payload: req.body }, db);
        res.json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};

