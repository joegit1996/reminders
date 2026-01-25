const { Client } = require('pg');

const connectionString = process.env.POSTGRES_URL_NON_POOLING;

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

async function addDescriptionColumn() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase');

    // Check if column exists
    const checkColumn = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'reminders' AND column_name = 'description'
    `);
    
    if (checkColumn.rows.length === 0) {
      await client.query('ALTER TABLE reminders ADD COLUMN description TEXT');
      console.log('✅ Added description column');
    } else {
      console.log('ℹ️  description column already exists');
    }

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addDescriptionColumn();
