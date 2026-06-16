import * as prospectService from '../service/prospectService.js';
import * as activityService from '../service/activityService.js';
import { normalizeInputData, normalizeOutputData } from '../utils/normalizeUtils.js';
import { prospectMapping } from '../model/prospectModel/prospectMapping.js';
import db from '../config/db.js';

export const uploadProspects = async (req, res, next) => {
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
        const { prospects } = req.body;
        const normalizedProspect = normalizeInputData(prospects, prospectMapping)[0];
        const userId = req.headers['user-id'] || 1;
        normalizedProspect.source_bd_id = normalizedProspect.source_bd_id || userId;
        const prospect = await prospectService.createSingleProspect({ prospect: normalizedProspect }, db);
        return res.status(201).json({ success: true, data: normalizeOutputData([prospect], prospectMapping)[0] });
    } catch (err) {
        next(err);
    }
};

export const listProspects = async (req, res, next) => {
    try {
        const normalizedQuery = normalizeInputData([req.query], prospectMapping)[0];
        const { bd_id, stage_code, page = 1, limit = 50 } = normalizedQuery;
        const limits = parseInt(limit, 10);
        const offset = (parseInt(page, 10) - 1) * limits;
        let query = `SELECT
            p.*,
            c.flag_svg_url,
            c.iso_code3
        FROM md_prospects p
                LEFT JOIN md_countries c
            ON c.country_name = p.country
        WHERE p.country = 'India'`;

        const values = [];

        if (bd_id) {
            query += ` AND p.source_bd_id = ?`;
            values.push(bd_id);
        }

        if (stage_code) {
            query += ` AND sh.stage_code = ?`;
            values.push(stage_code);
        }

        query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        values.push(limits, offset);
        const [rows] = await db.query(query, values);
        const prospects = normalizeOutputData(rows, prospectMapping);
        return res.status(200).json(prospects);
    } catch (err) {
        next(err);
    }
};

export const getProspect = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT
                p.*,
                c.dial_code AS country_dial_code,
                c.flag_svg_url,
                c.iso_code3
            FROM md_prospects p
            LEFT JOIN md_countries c
                ON c.iso_code = p.country_iso
            WHERE p.id = ?`,
            [id]
        );
        if (!rows.length) {
            return res.status(404).json({ error: 'Not found' });
        }
        const prospect = normalizeOutputData(rows, prospectMapping)[0];
        return res.status(200).json(prospect);
    } catch (err) {
        next(err);
    }
};

export const updateProspect = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = normalizeInputData([req.body], prospectMapping)[0];
        const userId = req.headers['user-id'] || 1;
        if (!Object.keys(updates).length) {
            return res.status(400).json({ error: 'No supported fields to update' });
        }
        const result = await prospectService.updateProspect({ id, updates, userId }, db);
        return res.json(result);
    } catch (err) {
        next(err);
    }
};

export const moveStage = async (req, res, next) => {
    try {
        const normalizedBody = normalizeInputData([req.body],prospectMapping)[0];
        const normalizedParams = normalizeInputData([{ prospectId: req.params.id }],prospectMapping)[0];
        const { id } = normalizedParams;
        const {stage_code,reason_id} = normalizedBody;
        const bd_id = req.headers['user-id'] || 1;
        const result = await prospectService.moveStage({id,stage_code,reason_id,bd_id},db);
        return res.status(200).json({success: true,data: result});
    } catch (err) {
        next(err);
    }
};

export const transferProspects = async (req, res, next) => {
    try {
        const userId = Number(req.headers['user-id']) || 2;
        const normalizedData = normalizeInputData([req.body], prospectMapping)[0];
        const { id, new_bd_id } = normalizedData;
        if (!id || !new_bd_id) {
            return res.status(400).json({ success: false, message: 'prospectIds and newBdId are required' });
        }
        const result = await prospectService.transferProspects({ id, newBdId: new_bd_id,userId }, db);
        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

export const getProspectHistory = async (req,res,next) => {
    try {
        const normalizedParams = normalizeInputData([{ prospectId: req.params.id }],prospectMapping)[0];
        const { id } = normalizedParams;
        const result = await prospectService.getProspectHistory({ id },db);
        return res.status(200).json({
            success: true,
            data: result
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

};

export const getCountries = async (req, res, next) => {
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