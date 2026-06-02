import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_countries (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  iso_code     VARCHAR(2)   NOT NULL UNIQUE,
  iso_code3    VARCHAR(3)   NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  dial_code    VARCHAR(10)  NOT NULL,
  flag_svg_url VARCHAR(255) NULL,
  is_active    TINYINT(1)   DEFAULT 1
);
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_countries table created successfully");
  } catch (err) {
    console.error("Error creating md_countries table", err);
  }
}