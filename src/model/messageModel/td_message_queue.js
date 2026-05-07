import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_message_queue (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  channel SMALLINT,
  prospect_id INT,
  to_address VARCHAR(500) NOT NULL,
  subject VARCHAR(500),
  body TEXT NOT NULL,
  status SMALLINT DEFAULT 1,
  retry_count INT DEFAULT 0,
  locked_at TIMESTAMP NULL,
  error_message TEXT NULL,
  worker_id VARCHAR(100) NULL;
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (status) REFERENCES md_message_status_enum(id),
  FOREIGN KEY (channel) REFERENCES md_message_channel_enum(id),

  INDEX idx_status (status),
  INDEX idx_locked_at (locked_at),
  INDEX idx_retry (retry_count)
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
