import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_stages (
  stage_code INT NOT NULL,
  stage_key VARCHAR(50) NOT NULL,
  seq INT,
  progress INT NOT NULL,
  PRIMARY KEY (stage_code),
  UNIQUE KEY stage_key (stage_key)
)
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("md_stages table created successfully");
  } catch (err) {
    console.error("Error creating md_stages table", err);
  }
}

// pending
// attempted
// engaged
// converted
// parked