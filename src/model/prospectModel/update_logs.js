import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_prospect_update_logs (
id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prospect_id BIGINT NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL;
    changed_by BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prospect_id (prospect_id),
    INDEX idx_changed_by (changed_by),
    INDEX idx_created_at (created_at),
);`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);
        console.log("td_prospect_update_logs table created successfully");
    } catch (err) {
        console.error("Error creating td_prospect_update_logs table", err);
    }
}
