import pool from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_message_status_enum(
    id SMALLINT PRIMARY KEY,
    status_name VARCHAR(15)
);
CREATE TABLE IF NOT EXISTS md_message_channel_enum(
    id SMALLINT PRIMARY KEY,
    channel_name VARCHAR (10)
);

INSERT INTO md_message_status_enum(id,status_name)
  VALUE(1,"PENDING"),(2,"PROCESSING"),(3,"SENT"),(4,"FAILED");

INSERT INTO md_message_channel_enum(id,channel_name)
  VALUE(1,"EMAIL"),(2,"SMS"),(3,"WHATSAPP"); 
`;

export async function createTable() {
  try {
    await pool.query(createTableQuery);
    console.log('Table created successfully');
  } catch (err) {
    console.error('Error creating table', err);
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