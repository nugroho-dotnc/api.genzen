'use strict';

require('dotenv').config();

const required = [
  'DATABASE_URL', 
  'JWT_SECRET', 
  'JWT_REFRESH_SECRET', 
  'GEMINI_API_KEY'
];

for (const key of required) {
  if (!process.env[key]) {
    // throw new Error(`Missing required environment variable: ${key}`);
    console.warn(`⚠️ Warning: Missing environment variable: ${key}`);
  }
}

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
