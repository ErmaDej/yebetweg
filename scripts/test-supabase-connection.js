import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ============================================================================
// Supabase connection check — credentials from the environment ONLY.
// Never hardcode keys here: the service_role key previously lived in this
// file (tracked in git) and had to be rotated. Resolution order:
//   1. CLI flags: --url <project-url> --key <api-key>
//   2. Environment: SUPABASE_URL + SUPABASE_ANON_KEY (or VITE_ variants)
//   3. Local files: .env.local / .env / .env.production (not committed)
//
// Uses the ANON key by default — it is public by design, so a passing check
// proves the same "the project is reachable" fact without handling secrets.
// Set SUPABASE_SERVICE_ROLE_KEY explicitly (and only locally) to also verify
// service-role access; the script warns loudly when it is used.
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

let supabaseKey =
  args.key ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  fileVars.SUPABASE_ANON_KEY ||
  fileVars.VITE_SUPABASE_ANON_KEY;

const usingServiceRole =
  !args.key && !supabaseKey &&
  Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY || fileVars.SUPABASE_SERVICE_ROLE_KEY
  );

if (usingServiceRole) {
  supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || fileVars.SUPABASE_SERVICE_ROLE_KEY;
  console.warn(
    '⚠️  Using SUPABASE_SERVICE_ROLE_KEY — this bypasses ALL RLS. Never commit it,' +
      ' never print it, and rotate it if it has ever been shared or committed.'
  );
}

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase URL/key. Pass --url/--key, set SUPABASE_URL + ' +
      'SUPABASE_ANON_KEY, or keep .env in the project root.'
  );
  process.exit(2);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function testConnection() {
  try {
    const { error } = await supabase.from('listings').select('id').limit(1);
    if (error) {
      console.error('Connection failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Connection error:', err.message);
    return false;
  }
}

const ok = await testConnection();
process.exit(ok ? 0 : 1);
