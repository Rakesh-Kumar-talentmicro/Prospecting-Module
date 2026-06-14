// Add Note
export const addNote = async ( prospect_id, note_text, created_by, attachment_paths = null,) => {
  const query = `
        INSERT INTO notes (
            prospect_id,
            note_text,
            created_by,
            attachment_paths
        )
        VALUES (?, ?, ?, ?)
    `;

  const [result] = await db.execute(query, [ prospect_id, note_text,created_by, attachment_paths,]);
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
