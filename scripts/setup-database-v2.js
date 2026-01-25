const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://bczwvzzmdlofoaknqcge.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjend2enptZGxvZm9ha25xY2dlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMyMjg2NSwiZXhwIjoyMDg0ODk4ODY1fQ.GEpWAGO0MhlVoWQe9FAUaY_KaTP9I8nOwpC_ObDYvCU';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'bczwvzzmdlofoaknqcge.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function setupDatabase() {
  try {
    console.log('Setting up database tables via Supabase API...');
    
    // Read SQL file
    const sqlFile = path.join(__dirname, '../supabase-setup.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Remove comments and split into individual statements
    sql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .filter(s => s.trim().length > 0);

    // Execute each statement
    for (const statement of sql) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          await executeSQL(statement.trim() + ';');
          console.log('✅ Success');
        } catch (error) {
          // Ignore "already exists" errors
          if (error.message.includes('already exists') || error.message.includes('42P07')) {
            console.log('ℹ️  Already exists (skipping)');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n🎉 Database setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternative: Run the SQL manually in Supabase SQL Editor');
    console.log('   Go to: https://supabase.com/dashboard/project/bczwvzzmdlofoaknqcge/sql');
    process.exit(1);
  }
}

setupDatabase();
