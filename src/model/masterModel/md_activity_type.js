import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_activity_type (
  activity_type_id INT NOT NULL AUTO_INCREMENT,
  activity_type_title VARCHAR(100) NOT NULL,
  lang_id VARCHAR(10) NOT NULL DEFAULT 'EN',
  PRIMARY KEY (activity_type_id),
  UNIQUE KEY uk_activity_type_title_lang (activity_type_title, lang_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_activity_type table created successfully");
  } catch (err) {
    console.error("Error creating md_activity_type table", err);
  }
}
