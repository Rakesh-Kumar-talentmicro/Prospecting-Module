import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_messages_logs (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  queue_id        BIGINT NOT NULL,
  channel         ENUM('EMAIL', 'SMS', 'WHATSAPP') NOT NULL,
  to_address      VARCHAR(500) NOT NULL,
  provider        VARCHAR(100) NULL,
  provider_msg_id VARCHAR(255) NULL,
  status          ENUM('SUCCESS', 'FAILED') NOT NULL,
  error_message   TEXT NULL,
  response_body   TEXT NULL,
  attempt_number  INT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (queue_id) REFERENCES td_messages_queue(id),

  INDEX idx_queue_id (queue_id),
  INDEX idx_status (status)
);
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log("td_messages_logs table created successfully");
  } catch (err) {
    console.error("Error creating td_messages_logs table", err);
  }
}