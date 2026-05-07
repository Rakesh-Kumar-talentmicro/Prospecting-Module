import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,

    prospect_id INT NOT NULL,

    note_text TEXT NOT NULL,

    created_by VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    attachment_paths TEXT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function createTable() {
    try {

        await db.execute(createTableQuery);

        console.log("notes table created successfully");

    } catch (err) {

        console.error("Error creating notes table", err);

    }
}

// Add Note
export const addNote = async (
    prospect_id,
    note_text,
    created_by,
    attachment_paths = null
) => {

    const query = `
        INSERT INTO notes (
            prospect_id,
            note_text,
            created_by,
            attachment_paths
        )
        VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
        prospect_id,
        note_text,
        created_by,
        attachment_paths
    ]);

    return result;
};

// Get Notes By Prospect ID
export const getNotesByProspectId = async (prospectId) => {

    const query = `
        SELECT *
        FROM notes
        WHERE prospect_id = ?
        ORDER BY created_at DESC
    `;

    const [rows] = await db.execute(query, [prospectId]);

    return rows;
};