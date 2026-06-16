import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_activity_types (
    id SMALLINT PRIMARY KEY AUTO_INCREMENT,
    activity_name VARCHAR(100) NOT NULL,
    lang_id VARCHAR(10)
);
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_activity_types table created successfully");
  } catch (err) {
    console.error("Error creating md_activity_types table", err);
  }
}
