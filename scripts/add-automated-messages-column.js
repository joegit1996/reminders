const { Client } = require('pg');

const connectionString = process.env.POSTGRES_URL_NON_POOLING;

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

async function addAutomatedMessagesColumn() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase');

    // Check if column exists
    const checkColumn = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'reminders' AND column_name = 'automated_messages'
    `);
    
    if (checkColumn.rows.length === 0) {
      await client.query('ALTER TABLE reminders ADD COLUMN automated_messages JSONB DEFAULT \'[]\'::jsonb');
      console.log('✅ Added automated_messages column');
    } else {
      console.log('ℹ️  automated_messages column already exists');
    }

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addAutomatedMessagesColumn();
