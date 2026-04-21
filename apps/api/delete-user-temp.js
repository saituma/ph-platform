const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });
console.log("Configured dotenv");
console.log("URL:", process.env.DATABASE_URL ? "Exists" : "Missing");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM users WHERE email = 'dawit.dev.gg@gmail.com'");
    if (res.rows.length === 0) {
      console.log('User not found in users table.');
      process.exit(0);
    }
    const user = res.rows[0];
    console.log('User found:', user.email, user.id);

    // Delete associated teams
    const delTeams = await client.query('DELETE FROM teams WHERE "adminId" = $1 RETURNING *', [user.id]);
    console.log(`Deleted ${delTeams.rowCount} associated teams.`);

    // Delete associated athlete
    const delAthletes = await client.query('DELETE FROM athletes WHERE "userId" = $1 RETURNING *', [user.id]);
    console.log(`Deleted ${delAthletes.rowCount} associated athletes.`);

    const delUser = await client.query('DELETE FROM users WHERE id = $1 RETURNING *', [user.id]);
    console.log(`Deleted user ${delUser.rowCount} successfully.`);
    
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
