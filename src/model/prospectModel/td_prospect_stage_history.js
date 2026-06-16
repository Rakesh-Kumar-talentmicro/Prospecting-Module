import db from "../../config/db.js";
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS td_prospect_stage_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    prospect_id BIGINT NOT NULL,
    stage_code INT NOT NULL,
    reason_id INT NULL,
    assigned_by BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stage_prospect
        FOREIGN KEY (prospect_id)
        REFERENCES md_prospects(id),

    INDEX idx_duplicate (prospect_id),
    INDEX idx_stage (stage_code),
    INDEX idx_created_at (created_at)
);
`;
export async function createTable() {
    try {
        await db.execute(createTableQuery);
        console.log ( "td_prospect_stage_history table created successfully" );
    } catch (err) {
    console.error("Error creating td_prospect_stage_history table", err);
    } 
}