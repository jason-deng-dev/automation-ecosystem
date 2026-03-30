const { Pool } = require("pg");

import Pool from 'pg';

require('dotenv').config()

module.exports = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
// 
