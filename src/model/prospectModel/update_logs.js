import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_prospect_update_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prospect_id BIGINT NOT NULL,
    change_type VARCHAR(20) NOT NULL DEFAULT 'UPDATE',
    old_values JSON NULL,
    new_values JSON NULL,
    changed_by BIGINT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prospect_update_log_prospect (prospect_id),
    INDEX idx_prospect_update_log_changed_at (changed_at),
    CONSTRAINT fk_td_prospect_update_logs_prospect
      FOREIGN KEY (prospect_id) REFERENCES md_prospects (id)
      ON DELETE CASCADE
);
`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);
        console.log("td_prospect_update_logs table created successfully");
    } catch (err) {
        console.error("Error creating td_prospect_update_logs table", err);
    }
}
