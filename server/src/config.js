import dotenv from 'dotenv';

dotenv.config();

function parseCsvList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  corsOrigins: parseCsvList(process.env.CORS_ORIGIN),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bounty_list',
    charset: process.env.DB_CHARSET || 'utf8mb4_unicode_ci',
  }
};