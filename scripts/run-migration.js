const { Client } = require('pg');
const fs = require('fs');

const connectionString = process.env.POSTGRES_URL_NON_POOLING;

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase');

    // Check and add columns
    const checkDelayMessage = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'reminders' AND column_name = 'delay_message'
    `);
    
    if (checkDelayMessage.rows.length === 0) {
      await client.query('ALTER TABLE reminders ADD COLUMN delay_message TEXT');
      console.log('✅ Added delay_message column');
    } else {
      console.log('ℹ️  delay_message column already exists');
    }

    const checkDelayWebhooks = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'reminders' AND column_name = 'delay_webhooks'
    `);
    
    if (checkDelayWebhooks.rows.length === 0) {
      await client.query(`ALTER TABLE reminders ADD COLUMN delay_webhooks JSONB DEFAULT '[]'::jsonb`);
      console.log('✅ Added delay_webhooks column');
    } else {
      console.log('ℹ️  delay_webhooks column already exists');
    }

    // Check and create saved_webhooks table
    const checkTable = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'saved_webhooks'
    `);

    if (checkTable.rows.length === 0) {
      await client.query(`
        CREATE TABLE saved_webhooks (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          webhook_url TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created saved_webhooks table');

      await client.query('ALTER TABLE saved_webhooks ENABLE ROW LEVEL SECURITY');
      console.log('✅ Enabled RLS on saved_webhooks');

      await client.query(`
        CREATE POLICY "Allow all operations on saved_webhooks" ON saved_webhooks
          FOR ALL USING (true) WITH CHECK (true)
      `);
      console.log('✅ Created policy on saved_webhooks');
    } else {
      console.log('ℹ️  saved_webhooks table already exists');
    }

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
