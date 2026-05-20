import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_stages (
  stage_code INT NOT NULL,
  stage_key VARCHAR(50) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (stage_code),
  UNIQUE KEY stage_key (stage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_stages table created successfully");
  } catch (err) {
    console.error("Error creating md_stages table", err);
  }
}
