import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_sources_translated (
  source_id INT NOT NULL,
  lang_id VARCHAR(10) NOT NULL DEFAULT 'EN',
  translated_title VARCHAR(100) NOT NULL,
  PRIMARY KEY (source_id, lang_id),
  CONSTRAINT fk_source
    FOREIGN KEY (source_id) REFERENCES md_sources (source_id)
)
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_sources_translated table created successfully");
  } catch (err) {
    console.error("Error creating md_sources_translated table", err);
  }
}
