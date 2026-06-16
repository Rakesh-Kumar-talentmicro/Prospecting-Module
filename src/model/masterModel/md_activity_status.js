import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_activity_status (
    id SMALLINT PRIMARY KEY AUTO_INCREMENT,
    activity_status VARCHAR(50) NOT NULL,
    seq SMALLINT,
    lang_id VARCHAR(10) DEFAULT 'EN'
);
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_activity_status table created successfully");
  } catch (err) {
    console.error("Error creating md_activity_status table", err);
  }
}

