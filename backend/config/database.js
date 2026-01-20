const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false, // true nếu dùng Azure
    trustServerCertificate: true // cho local development
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

async function getConnection() {
  try {
    if (pool) {
      return pool;
    }
    pool = await sql.connect(config);
    console.log('Kết nối SQL Server thành công!');
    return pool;
  } catch (err) {
    console.error('Lỗi kết nối SQL Server:', err);
    throw err;
  }
}

module.exports = {
  sql,
  getConnection
};
