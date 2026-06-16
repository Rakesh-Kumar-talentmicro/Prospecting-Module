import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_activity_status_translated (
  activity_id INT NOT NULL AUTO_INCREMENT,
  lang_id VARCHAR(10) NOT NULL DEFAULT 'EN',
  translated_title VARCHAR(100) NOT NULL,
  PRIMARY KEY (activity_id),
  UNIQUE KEY uk_activity_status_lang (activity_id, lang_id),
  CONSTRAINT fk_activity_status
  FOREIGN KEY (activity_id) REFERENCES md_activity_status(id)

)
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_activity_status_translated table created successfully");
  } catch (err) {
    console.error("Error creating md_activity_status_translated table", err);
  }
}
