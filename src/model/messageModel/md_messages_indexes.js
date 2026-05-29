import db from "../../config/db.js";

const createTableQuery = `
  CREATE INDEX idx_message_logs_queue ON td_messages_logs(queue_id)
  CREATE UNIQUE INDEX idx_logs_provider_msg_id ON td_messages_logs(provider_msg_id);
  CREATE INDEX idx_logs_status ON td_messages_logs(status);
    
  CREATE INDEX idx_message_queue_status ON td_messages_queue(status, isActive, attempt_number)
  CREATE INDEX idx_message_queue_scheduled ON td_messages_queue(channel)
  CREATE INDEX idx_message_queue_prospect ON td_messages_queue(prospect_id)
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log('Table created successfully');
  } catch (err) {
    console.error('Error creating table', err);
  }
};


