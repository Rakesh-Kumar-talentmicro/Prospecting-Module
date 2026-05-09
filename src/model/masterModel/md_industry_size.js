import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_industry_size (
  industry_size_id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(50) NOT NULL,
  lang_id VARCHAR(10) NOT NULL DEFAULT 'EN',
  PRIMARY KEY (industry_size_id),
  UNIQUE KEY uk_md_indusrty_size_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_industry_size table created successfully");
  } catch (err) {
    console.error("Error creating md_industry_size table", err);
  }
}
