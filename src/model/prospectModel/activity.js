import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_activity (
  t_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  prospect_id BIGINT NOT NULL,
  activity_type_id INT NOT NULL,
  activity_status_id INT NOT NULL DEFAULT 1,
  message_queue_id BIGINT NULL,
  outcome VARCHAR(255) NULL,
  activity_notes TEXT NULL,
  attachment_paths JSON NULL,
  next_action_type_id INT NULL,
  next_action_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pm_td_activity_prospect
    FOREIGN KEY (prospect_id) REFERENCES md_prospects (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pm_td_activity_type
    FOREIGN KEY (activity_type_id) REFERENCES md_activity_type (activity_type_id),
  CONSTRAINT fk_pm_td_activity_status
    FOREIGN KEY (activity_status_id) REFERENCES md_activity_status (activity_id),
  CONSTRAINT fk_pm_td_activity_next_action_type
    FOREIGN KEY (next_action_type_id) REFERENCES md_activity_type (activity_type_id),
  INDEX idx_td_activity_prospect (prospect_id),
  INDEX idx_td_activity_type (activity_type_id),
  INDEX idx_td_activity_status (activity_status_id),
  INDEX idx_td_activity_message_queue (message_queue_id),
  INDEX idx_td_activity_next_action (next_action_at)
);
`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);
        console.log("td_activity table created successfully");
    } catch (err) {
        console.error("Error creating td_activity table", err);
    }
}
