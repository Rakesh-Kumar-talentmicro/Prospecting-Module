import db from "../../config/db.js";

const createStatusTableQuery = `
CREATE TABLE IF NOT EXISTS md_message_status_enum(
    id SMALLINT PRIMARY KEY,
    status_name VARCHAR(15)
);`;

const createChannelTableQuery = `
CREATE TABLE IF NOT EXISTS md_message_channel_enum(
    id SMALLINT PRIMARY KEY,
    channel_name VARCHAR (10)
);`;

const insertStatusQuery = `
INSERT IGNORE INTO md_message_status_enum(id,status_name)
  VALUES(1,"PENDING"),(2,"PROCESSING"),(3,"SENT"),(4,"FAILED");
`;

const insertChannelQuery = `
INSERT IGNORE INTO md_message_channel_enum(id,channel_name)
  VALUES(1,"EMAIL"),(2,"SMS"),(3,"WHATSAPP"); 
`;

export async function createTable() {
  try {
    await db.execute(createStatusTableQuery);
    await db.execute(createChannelTableQuery);
    await db.execute(insertStatusQuery);
    await db.execute(insertChannelQuery);
    console.log('md_message_enum tables created/seeded successfully');
  } catch (err) {
    console.error('Error creating md_message_enum tables', err);
  }
}

/*
1 -> "PENDING"
2 -> "PROCESSING"
3 -> "SENT"
4 -> "FAILED"

1 -> "EMAIL"
2 -> "SMS"
3 -> "WHATSAPP"
*/