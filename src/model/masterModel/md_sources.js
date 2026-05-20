import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_sources (
  source_id INT NOT NULL AUTO_INCREMENT,
  source_key VARCHAR(50) NOT NULL,
  icon VARCHAR(100) DEFAULT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (source_id),
  UNIQUE KEY source_key (source_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_sources table created successfully");
  } catch (err) {
    console.error("Error creating md_sources table", err);
  }
}
