import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_countries (
  id INT NOT NULL AUTO_INCREMENT,
  iso_code VARCHAR(2) DEFAULT NULL,       -- Standard 2-letter ISO code
  iso_code3 VARCHAR(3) DEFAULT NULL,      -- Standard 3-letter ISO code
  country_name VARCHAR(100) NOT NULL,     -- Full country name
  dial_code VARCHAR(10) DEFAULT NULL,     -- International dialing code (+91, +1, etc.)
  flag_svg_url VARCHAR(255) DEFAULT NULL, -- URL to flag image in SVG format
  PRIMARY KEY (id),
  UNIQUE KEY (country_name)
)
;`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);
        console.log("md_countries table created successfully");
    } catch (err) {
        console.error("Error creating md_countries table", err);
    }
};
