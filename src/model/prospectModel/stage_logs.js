import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_stage_logs (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    prospect_id  BIGINT       NOT NULL,
    from_stage   INT,
    to_stage     INT          NOT NULL,
    moved_by     BIGINT       NOT NULL,
    moved_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    reason_id    INT          NULL,
    INDEX idx_prospect (prospect_id)
);
`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);
        console.log("td_stage_logs table created successfully");
    } catch (err) {
        console.error("Error creating td_stage_logs table", err);
    }
}
