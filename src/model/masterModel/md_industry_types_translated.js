import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_industry_types_translated (
  industry_id INT NOT NULL,
  lang_id VARCHAR(10) NOT NULL DEFAULT 'EN',
  translated_title VARCHAR(150) NOT NULL,
  PRIMARY KEY (industry_id, lang_id),
  CONSTRAINT fk_industry_type
    FOREIGN KEY (industry_id) REFERENCES md_industry_types (industry_id)
)
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_industry_types_translated table created successfully");
  } catch (err) {
    console.error("Error creating md_industry_types_translated table", err);
  }
}
