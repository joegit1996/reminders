const { Client } = require('pg');

const connectionString = process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  console.error('❌ Error: POSTGRES_URL_NON_POOLING environment variable is required');
  console.log('\n📝 To get your connection string:');
  console.log('   1. Go to your Supabase project: https://supabase.com/dashboard');
  console.log('   2. Navigate to Settings → Database');
  console.log('   3. Find "Connection string" → "URI"');
  console.log('   4. Copy the connection string');
  console.log('   5. Add it to your .env.local file:');
  console.log('      POSTGRES_URL_NON_POOLING="postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres"');
  console.log('\n   Or run the SQL directly in Supabase SQL Editor (see scripts/add-completion-columns.sql)');
  process.exit(1);
}

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

async function addCompletionColumns() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase');

    // Check if completion_message column exists
    const checkCompletionMessage = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'reminders' AND column_name = 'completion_message'
    `);
    
    if (checkCompletionMessage.rows.length === 0) {
      await client.query('ALTER TABLE reminders ADD COLUMN completion_message TEXT');
      console.log('✅ Added completion_message column');
    } else {
      console.log('ℹ️  completion_message column already exists');
    }

    // Check if completion_webhook column exists
    const checkCompletionWebhook = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'reminders' AND column_name = 'completion_webhook'
    `);
    
    if (checkCompletionWebhook.rows.length === 0) {
      await client.query('ALTER TABLE reminders ADD COLUMN completion_webhook TEXT');
      console.log('✅ Added completion_webhook column');
    } else {
      console.log('ℹ️  completion_webhook column already exists');
    }

    // Verify columns were added
    const verifyColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reminders' 
        AND column_name IN ('completion_message', 'completion_webhook')
    `);
    
    console.log('\n📋 Verification:');
    verifyColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addCompletionColumns();
