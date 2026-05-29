import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_messages_queue (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  prospect_id BIGINT,
  channel ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,
  template_id BIGINT NOT NULL,
  to_address VARCHAR(500) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING','PROCESSING','SENT','FAILED','CANCELLED') DEFAULT 'PENDING',
  last_attempt_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  isActive BOOLEAN DEFAULT TRUE,
  attempt_number INT DEFAULT 0,
  max_attempt_number INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT NOT NULL,
  CONSTRAINT fk_template
    FOREIGN KEY (template_id)
    REFERENCES md_message_templates(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_queue_prospect
    FOREIGN KEY (prospect_id)
    REFERENCES td_prospects(id)
    ON DELETE SET NULL
);
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("Table created successfully");
  } catch (err) {
    console.error("Error creating table", err);
  }
}