import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'prospects_module',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Check Database Connection
(async () => {
  try {
    const connection = await db.getConnection();
    console.log(" MySQL Database Connected Successfully");
    connection.release();
  } catch (error) {
    console.error(" Database Connection Failed");
    console.error(error.message);
  }
})();

export default db;