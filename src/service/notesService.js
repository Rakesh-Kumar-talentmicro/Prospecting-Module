import * as notesModel from "../model/notesModel/index.js";

export const addNote = async (
    prospectId,
    noteText,
    createdBy,
    attachment_paths
) => {

    try {

        const result = await notesModel.addNote(
            prospectId,
            noteText,
            createdBy,
            attachment_paths
        );

        return {
            id: result.insertId
        };

    } catch (err) {

        throw err;

    }
};

export const getNotes = async (prospectId) => {

    try {

        const rows = await notesModel.getNotesByProspectId(
            prospectId
        );

        return rows;

    } catch (err) {

        throw err;

    }
};