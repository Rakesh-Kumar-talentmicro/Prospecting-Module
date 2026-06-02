import db from "../../config/db.js";
const createTableQuery = `CREATE TABLE IF NOT EXISTS td_prospect_stage_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    duplicate_key VARCHAR(255) NOT NULL,
    stage_code INT NOT NULL,
    reason_id INT NULL,
    bd_id BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stage_prospect
        FOREIGN KEY (duplicate_key)
        REFERENCES md_prospects(duplicate_key),

    INDEX idx_duplicate (duplicate_key),
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

} }