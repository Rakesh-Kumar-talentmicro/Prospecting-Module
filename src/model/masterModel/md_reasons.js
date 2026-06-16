import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_reasons (
  reason_id INT NOT NULL,
  reason_title VARCHAR(100) NOT NULL,
  lang_id VARCHAR(10) NOT NULL DEFAULT 'EN',
  PRIMARY KEY (reason_id)
) 
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_reasons table created successfully");
  } catch (err) {
    console.error("Error creating md_reasons table", err);
  }
}
