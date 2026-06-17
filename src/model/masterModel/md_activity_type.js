import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_activity_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    activity_name VARCHAR(100) NOT NULL,
    lang_id VARCHAR(10) NOT NULL DEFAULT 'EN',
    UNIQUE KEY uk_activity_type_title_lang (activity_name, lang_id)
);
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_activity_type table created successfully");
  } catch (err) {
    console.error("Error creating md_activity_type table", err);
  }
}
