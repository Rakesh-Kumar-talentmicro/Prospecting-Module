import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_industry_size_translated (
  industry_size_id INT NOT NULL AUTO_INCREMENT,
  lang_id VARCHAR(10) NOT NULL DEFAULT 'EN',
  translated_title VARCHAR(50) NOT NULL,
  PRIMARY KEY (industry_size_id),
  UNIQUE KEY uk_industry_size_lang (industry_size_id, lang_id),
  CONSTRAINT fk_industry_size
    FOREIGN KEY (industry_size_id) REFERENCES md_industry_size (industry_size_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_industry_size_translated table created successfully");
  } catch (err) {
    console.error("Error creating md_industry_size_translated table", err);
  }
}
