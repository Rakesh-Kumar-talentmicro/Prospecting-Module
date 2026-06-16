import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_languages (
  language_id VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  language_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  native_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (language_id)
)
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_languages table created successfully");
  } catch (err) {
    console.error("Error creating md_languages table", err);
  }
}
