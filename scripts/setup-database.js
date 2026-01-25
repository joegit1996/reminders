const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use the non-pooling connection for DDL operations
const connectionString = process.env.POSTGRES_URL_NON_POOLING || 
  'postgres://postgres.bczwvzzmdlofoaknqcge:MCoXQ4qR9KegcFY8@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false, // Supabase uses self-signed certificates
    require: true
  }
});

async function setupDatabase() {
  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read SQL file
    const sqlFile = path.join(__dirname, '../supabase-setup.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Creating database tables...');
    await client.query(sql);
    console.log('✅ Database tables created successfully!');

    // Verify tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('reminders', 'due_date_update_logs');
    `);

    console.log('\n📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n🎉 Database setup complete!');
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Tables may already exist. This is okay!');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

setupDatabase();
