import db from "../../config/db.js";
const createTableQuery = `CREATE TABLE IF NOT EXISTS td_prospect_assignment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    duplicate_key VARCHAR(255) NOT NULL,
    assigned_to BIGINT NULL,
    bd_id BIGINT NULL,
    source_by BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (duplicate_key)
        REFERENCES md_prospects(duplicate_key),

    INDEX idx_duplicate_key (duplicate_key),
    INDEX idx_assigned_to (assigned_to)
);`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);

console.log ( "td_prospect_assignment table created successfully" );

} catch (err) {
        console.error("Error creating td_prospect_assignment table", err);

} }