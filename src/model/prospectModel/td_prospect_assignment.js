import db from "../../config/db.js";
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS td_prospect_assignment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    prospect_id VARCHAR(255) NOT NULL,
    new_bd_id BIGINT NULL,
    old_bd_id BIGINT NULL,
    assigned_by BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (prospect_id)
        REFERENCES md_prospects(id),

    INDEX idx_prospect_key (prospect_id),
    INDEX idx_new_bd_id (new_bd_id),
    INDEX idx_old_bd_id (old_bd_id)
);`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);
        console.log ( "td_prospect_assignment table created successfully" );
    } catch (err) {
        console.error("Error creating td_prospect_assignment table", err);
    } 
}