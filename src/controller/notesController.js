import * as notesService from "../service/notesService.js";
import { CreateError } from "../middleware/createError.js";

// Create a new note
export const createNote = async (req, res, next) => {
    try {

        const { prospect_id, note_text, created_by, attachment_paths } = req.body;

        if (!note_text) {
            return next(CreateError(400, "note text required"));
        }

        const result = await notesService.addNote(
            prospect_id,
            note_text,
            created_by,
            attachment_paths
        );

        res.status(201).json({
            success: true,
            data: result,
        });

    } catch (err) {
        next(err);
    }
};

// List notes based on prospectId
export const listNotes = async (req, res, next) => {
    try {

        const { prospectId } = req.params;

        const notes = await notesService.getNotes(prospectId);

        res.status(200).json({
            success: true,
            data: notes,
        });

    } catch (err) {
        next(err);
    }
};