const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('Checking for expoPushToken in users table...');
    const res = await pool.query(`
      SELECT id, name, email, "expoPushToken" 
      FROM users 
      WHERE "expoPushToken" IS NOT NULL 
      AND "expoPushToken" <> ''
      LIMIT 10
    `);

    if (res.rows.length === 0) {
      console.log('No users found with expoPushToken.');
    } else {
      console.log(`Found ${res.rows.length} users with expoPushToken:`);
      console.table(res.rows);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
