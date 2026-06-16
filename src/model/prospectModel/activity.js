import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prospect_id BIGINT NOT NULL,
    activity_type SMALLINT NOT NULL,
    activity_status SMALLINT NULL,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prospect_id (prospect_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_status (activity_status),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_td_activity_prospect
        FOREIGN KEY (prospect_id)
        REFERENCES md_prospects(id),

    CONSTRAINT fk_td_activity_type
        FOREIGN KEY (activity_type)
        REFERENCES md_activity_types(id),

    CONSTRAINT fk_td_activity_status
        FOREIGN KEY (activity_status)
        REFERENCES md_activity_status(id)
);`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);
        console.log("td_activity table created successfully");
    } catch (err) {
        console.error("Error creating td_activity table", err);
    }
};
