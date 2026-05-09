import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_message_templates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  template_code VARCHAR(100) NOT NULL,
  language_id VARCHAR(10) NOT NULL,
  channel ENUM('EMAIL','SMS','WHATSAPP') NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  variables JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_template (template_code, language_id, channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log('Table created successfully');
  } catch (err) {
    console.error('Error creating table', err);
  }
};
