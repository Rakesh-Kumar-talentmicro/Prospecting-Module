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
};
