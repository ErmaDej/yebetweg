import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Migration runner — credentials from the environment ONLY.
// The service_role key previously lived in this file (tracked in git) and had
// to be rotated. Resolution order:
//   1. CLI flags: --url <project-url> --key <service-role-key>
//   2. Environment: SUPABASE_SERVICE_ROLE_KEY (+ SUPABASE_URL / VITE_ variants)
//   3. Local files: .env.local / .env / .env.production (not committed)
//
// Requires the SERVICE_ROLE key (RLS bypass is needed to run DDL via
// exec_sql). The script refuses to run with an anon key and never logs it.
// NOTE: prefer `supabase db push` (proper migration history) — this runner is
// a fallback for environments without the Supabase CLI.
// ============================================================================

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = argv[++i];
    else if (argv[i] === '--key') args.key = argv[++i];
  }
  return args;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    vars[m[1]] = v;
  }
  return vars;
}

const args = parseArgs(process.argv);
const fileVars = {};
for (const f of ['.env.local', '.env', '.env.production']) {
  Object.assign(fileVars, loadEnvFile(resolve(process.cwd(), f)));
}

const supabaseUrl =
  args.url ||
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  fileVars.SUPABASE_URL ||
  fileVars.VITE_SUPABASE_URL;

const supabaseKey =
  args.key ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  fileVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase URL/service_role key. Pass --url/--key, set ' +
      'SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or keep .env in the project root.'
  );
  process.exit(2);
}

// Refuse to run with a non-service-role key: DDL via exec_sql needs RLS bypass.
const looksLikeAnon =
  !args.key && supabaseKey && supabaseKey.split('.').length === 3 &&
  (() => {
    try {
      return JSON.parse(Buffer.from(supabaseKey.split('.')[1], 'base64').toString()).role === 'anon';
    } catch {
      return false;
    }
  })();
if (looksLikeAnon) {
  console.error('Refusing to run migrations with an anon key — SUPABASE_SERVICE_ROLE_KEY required.');
  process.exit(2);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

/**
 * Split a SQL script into statements on `;` while respecting:
 *  - dollar-quoted bodies ($$ ... $$, $tag$ ... $tag$) — function bodies and
 *    DO blocks contain semicolons and must not be split
 *  - single/double-quoted strings (incl. '' escapes)
 *  - line (-- ) and block (/* *\/) comments
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];

    // Line comment
    if (ch === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
    // Block comment
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
    // Dollar-quoted string: $tag$ ... $tag$
    if (ch === '$') {
      const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end === -1 ? n : end + tag.length;
        current += sql.slice(i, stop);
        i = stop;
        continue;
      }
    }
    // Quoted strings ('' escaped)
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) j += 2;
          else break;
        } else j++;
      }
      const stop = Math.min(j + 1, n);
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
    // Statement separator
    if (ch === ';') {
      statements.push(current);
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }
  statements.push(current);

  return statements
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^--/.test(s.replace(/\s/g, '')));
}

async function runMigrations() {
  try {
    console.log('🔍 Finding migration files...');

    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`📋 Found ${migrationFiles.length} migration files:`);
    migrationFiles.forEach((file) => console.log(`  - ${file}`));

    for (const file of migrationFiles) {
      const filePath = join(migrationsDir, file);
      console.log(`\n🚀 Executing migration: ${file}`);

      const sql = readFileSync(filePath, 'utf8');
      const statements = splitSqlStatements(sql);

      for (const statement of statements) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`❌ Error in ${file}:`, error.message);
          console.error(`   Statement: ${statement.slice(0, 120)}...`);
          process.exit(1);
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
