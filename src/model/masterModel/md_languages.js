import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_languages (
  language_id VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  language_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  native_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  direction ENUM('LTR', 'RTL') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'LTR',
  is_active TINYINT DEFAULT 1,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (language_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_languages table created successfully");
  } catch (err) {
    console.error("Error creating md_languages table", err);
  }
}
