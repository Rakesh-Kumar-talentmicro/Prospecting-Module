import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_message_templates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  template_code INT NOT NULL,
  language_id VARCHAR(3) NOT NULL,
  channel SMALLINT,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  variables JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_template (template_code, language_id, channel),
  FOREIGN KEY (channel) REFERENCES md_message_channel_enum(id)
);
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log('Table created successfully');
  } catch (err) {
    console.error('Error creating table', err);
  }
};
