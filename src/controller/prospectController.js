import * as prospectService from '../service/prospectService.js';
import * as activityService from '../service/activityService.js';
import { normalizeInputData, normalizeOutputData } from '../utils/normalizeUtils.js';
import { prospectMapping } from '../model/prospectModel/prospectMapping.js';
import db from '../config/db.js';

export const uploadProspects = async (req, res,  next) => {
    try {
        const { prospects } = req.body;
        const normalizedProspects = normalizeInputData(prospects, prospectMapping);
        const userId = req.headers['user-id'] || 1;
        const sourcedByName = req.headers['bd-name'] || req.headers['sourced-by-name'] || null;
        const result = await prospectService.bulkInsertProspects(normalizedProspects, userId, 'EN', db, sourcedByName);
        return res.json(result);
    } catch (err) {
        console.error('Upload error:', err);
        next(err);
    }
};

export const createProspect = async (req, res, next) => {
    try {
        const normalizedProspect = normalizeInputData([req.body], prospectMapping)[0];
        const userId = req.headers['user-id'] || 1;
        normalizedProspect.sourced_by_name = normalizedProspect.sourced_by_name || req.headers['bd-name'] || req.headers['sourced-by-name'] || null;
        const prospect = await prospectService.createProspect({ prospect: normalizedProspect, userId }, db);

        return res.status(201).json({
            success: true,
            data: normalizeOutputData([prospect], prospectMapping)[0]
        });
    } catch (err) {
        next(err);
    }
};

export const listProspects = async (req, res,  next) => {
    try {
        const { assigned_user_id, stage_code, page, limit} = req.query;
        let limits = parseInt(limit) || 50;
        let offset = parseInt((page-1)*limits);

        let query = 'SELECT * FROM md_prospects WHERE 1=1';
        const value = [];

        if (assignee) {
            query += ' AND p.a.assigned_to = ?';
            values.push(assignee);
        }
        if (stage_code) {
            query += ' AND p.s.stage_code = ?';
            values.push(stage_code);
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


export const getProspect = async (req, res,  next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT
                p.*,
                c.country_name,
                c.dial_code     AS country_dial_code,
                c.flag_svg_url,
                c.iso_code3
             FROM md_prospects p
             LEFT JOIN md_countries c ON c.iso_code = p.country_iso
             WHERE p.id = ?`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        let prospect = normalizeOutputData(rows, prospectMapping);
        return res.status(200).json(...prospect);
    } catch (err) {
        next(err);
    }
};

export const updateProspect = async (req, res,  next) => {
    try {
        const { id } = req.params;
        const updates = normalizeInputData([req.body], prospectMapping)[0];
        const userId = req.headers['user-id'] || 1;

        if (Object.keys(updates).length === 0)
            return res.status(400).json({ error: 'No supported fields to update' });

        const result = await prospectService.updateProspect({ id, updates, userId }, db);
        return res.json(result);
    } catch (err) {
        next(err);
    }
};

export const moveStage = async (req, res,  next) => {
    try {
        const { id: prospectId } = req.params;
        const newStage = req.body.newStage ?? req.body.stageCode ?? req.body.stage_code;
        const newStageLg = req.body.newStageLg ?? req.body.stageLabel ?? req.body.stage_in_lang;
        const reasonId = req.body.reasonId ?? req.body.reason_id;
        const userId = req.headers['user-id'] || 1;

        const result = await prospectService.moveStage(
            {
            prospectId,
            newStage,
            newStageLg,
            reasonId,
            userId
        }, db
        );

        return res.json(result);
    } catch (err) {
        next(err);
    }
};

export const transferProspects = async (req, res, next) => {
    try {
        const { prospectIds } = req.body;
        const toUserId = req.body.toUserId ?? req.body.assigned_to;
        const fromUserId = req.headers['user-id'] || 1;
        const adminId = req.headers['admin-id'] || fromUserId;

        const result = await prospectService.transferProspects({
            prospectIds,
            toUserId,
            fromUserId,
            adminId
        }, db);

        return res.json(result);
    } catch (err) {
        next(err);
    }
};

export const getProspectHistory = async (req, res,  next) => {
    try {
        const { id } = req.params;
        const pId = parseInt(id, 10);
        const [stageLogs] = await db.query(
            'SELECT * FROM td_prospect_stage_history WHERE prospect_id = ? ORDER BY created_at DESC',
            [pId]
        );
        const [transferLogs] = await db.query(
            'SELECT * FROM td_prospect_assignment WHERE prospect_id = ? ORDER BY created_at DESC',
            [pId]
        );
        const [updateLogs] = await db.query(
            'SELECT * FROM td_prospect_update_logs WHERE prospect_id = ? ORDER BY changed_at DESC',
            [pId]
        );

        return res.json({
            stageLogs,
            transferLogs,
            updateLogs
        });
    } catch (err) {
        next(err);
    }
};

export const createActivity = async (req, res, next) => {
    try {
        const { id: prospectId } = req.params;
        const activityTypeId = req.body.activityTypeId || req.body.activity_type_id;

        const activity = await activityService.createActivity({ prospectId, activityTypeId, payload: req.body }, db);
        return res.status(201).json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};

export const createCallActivity = async (req, res, next) => {
    try {
        const { id: prospectId } = req.params;
        const activity = await activityService.createCallActivity({ prospectId, payload: req.body }, db);
        return res.status(201).json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};

export const listActivities = async (req, res, next) => {
    try {
        const { id: prospectId } = req.params;
        const activities = await activityService.listActivities({ prospectId }, db);
        return res.json({ success: true, data: activities });
    } catch (err) {
        next(err);
    }
};

export const updateActivity = async (req, res, next) => {
    try {
        const { id: prospectId, activityId } = req.params;
        const activity = await activityService.updateActivity({ prospectId, activityId, payload: req.body }, db);
        return res.json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};

export const closeActivity = async (req, res, next) => {
    try {
        const { id: prospectId, activityId } = req.params;
        const activity = await activityService.closeActivity({ prospectId, activityId, payload: req.body }, db);
        return res.json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};

export const cancelActivity = async (req, res, next) => {
    try {
        const { id: prospectId, activityId } = req.params;
        const activity = await activityService.cancelActivity({ prospectId, activityId, payload: req.body }, db);
        return res.json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};export const getCountries = async (req, res, next) => {
    try {
        const data = await prospectService.getCountries();
        return res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (err) {
        next(err);
    }
};