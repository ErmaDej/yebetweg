import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://jxyavtdmcloxnhuavokc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWF2dGRtY2xveG5odWF2b2tjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI1ODkzMSwiZXhwIjoyMDkzODM0OTMxfQ.t2FitrquQlFXdJk6vZwsdbzDKcv_gY9CeZwWjU-adLk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  try {
    console.log('🔍 Finding migration files...');

    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📋 Found ${migrationFiles.length} migration files:`);
    migrationFiles.forEach(file => console.log(`  - ${file}`));

    for (const file of migrationFiles) {
      const filePath = join(migrationsDir, file);
      console.log(`\n🚀 Executing migration: ${file}`);

      const sql = readFileSync(filePath, 'utf8');

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error } = await supabase.rpc('exec_sql', { sql: statement });
            if (error) {
              console.error(`❌ Error in ${file}:`, error.message);
              // Continue with other statements instead of failing completely
            }
          } catch (err) {
            console.error(`❌ Failed to execute statement in ${file}:`, err.message);
          }
        }
      }

      console.log(`✅ Completed migration: ${file}`);
    }

    console.log('\n🎉 All migrations completed!');

  } catch (error) {
    console.error('❌ Migration runner failed:', error.message);
    process.exit(1);
  }
}

runMigrations();