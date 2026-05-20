import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_stages_translation (
  stage_code INT NOT NULL,
  lang_id VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  stage_in_lang VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (stage_code, lang_id),
  KEY lang_id (lang_id),
  CONSTRAINT md_stages_translation_ibfk_1
    FOREIGN KEY (stage_code) REFERENCES md_stages (stage_code),
  CONSTRAINT md_stages_translation_ibfk_2
    FOREIGN KEY (lang_id) REFERENCES md_languages (language_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_stages_translation table created successfully");
  } catch (err) {
    console.error("Error creating md_stages_translation table", err);
  }
}
