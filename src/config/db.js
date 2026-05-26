import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'YourPasswordHere',  // ← reads from .env now
  database: process.env.DB_NAME     || 'YourDatabaseNameHere',  // ← reads from .env now
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default db;