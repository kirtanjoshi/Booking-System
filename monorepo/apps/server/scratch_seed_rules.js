const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const adminRes = await client.query('SELECT id FROM admins LIMIT 1');
  const adminId = adminRes.rows[0]?.id;
  console.log('Admin ID:', adminId);

  if (!adminId) {
    console.log('No admin found');
    await client.end();
    return;
  }

  const days = [0, 1, 2, 3, 4, 5, 6];
  for (const day of days) {
    const existing = await client.query('SELECT id FROM availability_rules WHERE admin_id = $1 AND day_of_week = $2', [adminId, day]);
    if (existing.rows.length === 0) {
      await client.query('INSERT INTO availability_rules (id, admin_id, day_of_week, start_time, end_time, is_active) VALUES (gen_random_uuid(), $1, $2, $3, $4, true)', [adminId, day, '08:00:00', '13:00:00']);
      await client.query('INSERT INTO availability_rules (id, admin_id, day_of_week, start_time, end_time, is_active) VALUES (gen_random_uuid(), $1, $2, $3, $4, true)', [adminId, day, '14:00:00', '23:30:00']);
      console.log('Added availability rules for day:', day);
    }
  }

  console.log('✅ Daily availability slots are ready for all 7 days!');
  await client.end();
}

seed().catch(console.error);
