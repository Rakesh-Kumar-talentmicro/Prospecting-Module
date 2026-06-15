import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_message_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  queue_id BIGINT NOT NULL,
  channel SMALLINT,
  status SMALLINT,
  provider VARCHAR(100),
  provider_messageid VARCHAR(255),
  to_address VARCHAR(500) NOT NULL,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (queue_id) REFERENCES td_messages_queue(id),
  FOREIGN KEY (status) REFERENCES md_message_status_enum(id),
  FOREIGN KEY (channel) REFERENCES md_message_channel_enum(id),

  INDEX idx_queue_id (queue_id),
  INDEX idx_status (status)
);
`;

export async function createTable() {
  try {
    await db.query(createTableQuery);
    console.log('Table created successfully');
  } catch (err) {
    console.error('Error creating table', err);
  }
}
