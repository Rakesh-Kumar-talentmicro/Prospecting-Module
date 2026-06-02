import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_transfer_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    prospect_id     BIGINT   NOT NULL,
    from_user       BIGINT   NOT NULL,
    to_user         BIGINT   NOT NULL,
    transferred_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    transferred_by  BIGINT,
    INDEX idx_prospect (prospect_id)
);
`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);
        console.log("td_transfer_logs table created successfully");
    } catch (err) {
        console.error("Error creating td_transfer_logs table", err);
    }
}
