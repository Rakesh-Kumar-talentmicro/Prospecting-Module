import db from "../../config/db.js";

const createTableQuery = `CREATE TABLE IF NOT EXISTS td_duplicate (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prospect_key varchar (255),
  stage_status VARCHAR(255),
  bd_id INT,
  source_id INT,
  count INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);
console.log ( "td_duplicate table created successfully" );

} catch (err) {
        console.error("Error creating td_duplicate table", err);

} };