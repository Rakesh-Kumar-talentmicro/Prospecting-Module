import * as notesService from '../service/notesService.js';
import {CreateError} from '../middleware/createError.js';
import {normalizeInputData,normalizeOutputData} from '../utils/normalizeUtils.js';
import { prospectMapping } from '../model/prospectModel/prospectMapping.js';

export const createNote = async (req, res, next) => {
    try {
        const noteData = normalizeInputData([req.body], noteMapping)[0];
        const {prospect_id,note_text,attachment_paths} = noteData;
        const created_by =Number(req.headers['user-id']) || 1;
        if (!prospect_id) {
            return next(CreateError(400, 'prospectId is required'));
        }

        if (!note_text) {
            return next(CreateError(400, 'noteText is required'));
        }

        const result = await notesService.createNote({prospect_id,note_text,attachment_paths});

        return res.status(201).json({
            success: true,
            data: normalizeOutputData([result],prospectMapping)[0]});

    } catch (err) {
        next(err);
    }
};

export const listNotes = async (req, res, next) => {
    try {
        const prospect_id = Number(req.params.prospectId);

        if (!prospect_id) {
            return next(CreateError(400, 'prospectId is required'));
        }

        const notes = await notesService.listNotes({prospect_id});

        return res.status(200).json({
            success: true,
            data: normalizeOutputData(notes,prospectMapping)});

    } catch (err) {
        next(err);
    }
};