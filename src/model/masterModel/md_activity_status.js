import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_activity_status (
  activity_id INT NOT NULL AUTO_INCREMENT,
  activity_title VARCHAR(50) NOT NULL,
  seq INT,
  lang_id VARCHAR(10) DEFAULT 'EN',
  PRIMARY KEY (activity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_activity_status table created successfully");
  } catch (err) {
    console.error("Error creating md_activity_status table", err);
  }
}
