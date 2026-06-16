import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_sources (
  source_id INT NOT NULL AUTO_INCREMENT,
  source_key VARCHAR(50) NOT NULL,
  lang_id VARCHAR(10) NOT NULL DEFAULT 'EN',
  PRIMARY KEY (source_id),
  UNIQUE KEY source_key (source_key)
)
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_sources table created successfully");
  } catch (err) {
    console.error("Error creating md_sources table", err);
  }
}
