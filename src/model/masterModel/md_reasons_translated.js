import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_reasons_translated (
  reason_id INT NOT NULL,
  lang_id VARCHAR(10) NOT NULL DEFAULT 'EN',
  translated_title VARCHAR(255) NOT NULL,
  PRIMARY KEY (reason_id, lang_id),
  CONSTRAINT fk_reason_translated
    FOREIGN KEY (reason_id) REFERENCES md_reasons (reason_id)
);
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_reasons_translated table created successfully");
  } catch (err) {
    console.error("Error creating md_reasons_translated table", err);
  }
}
