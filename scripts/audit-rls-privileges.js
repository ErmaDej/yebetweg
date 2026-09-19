#!/usr/bin/env node
// ============================================================================
// Static RLS privilege audit — flags the 2026-09-19 bug class across ALL tables
// ============================================================================
// The live probe caught: an RLS policy `TO anon, authenticated` calling
// user_has_premium_entitlement() whose EXECUTE was revoked from anon → every
// anon read on the table failed with 42501 (policy expressions are
// privilege-checked as the QUERYING role). This tool statically replays the
// migrations IN STATEMENT ORDER and reports any policy that could reproduce
// that failure:
//
//   POLICY-FUNCTION-PRIVILEGE: policy P on T is visible to role R, but its
//   expression calls function F whose EXECUTE R does not hold.
//
// How it works:
//   - Splits every migration into statements (dollar-quote aware, so `$$`
//     function bodies and DO blocks stay intact) and replays them in order.
//   - Tracks CREATE FUNCTION headers and GRANT/REVOKE EXECUTE per function
//     (default ACL: executable by PUBLIC unless revoked).
//   - Tracks CREATE/DROP POLICY (incl. DO-block "drop all policies on table").
//     FINAL policy state = last write per (table, policy name).
//
// Exit 0 = clean, exit 1 = findings, 2 = usage error.
// Limitations: heuristic parser (not a SQL grammar); security-definer RPCs
// invoked by clients are NOT flagged (they execute as the owner, by design);
// per-role qualifier short-circuits inside a policy are not modeled — findings
// say "COULD fail", verify each manually.
//
// Usage: node scripts/audit-rls-privileges.js [--dir supabase/migrations]
// ============================================================================

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
let dir = 'supabase/migrations';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir') dir = args[++i];
}
const migrationsDir = resolve(process.cwd(), dir);
if (!existsSync(migrationsDir)) {
  console.error(`Migrations directory not found: ${migrationsDir}`);
  process.exit(2);
}

const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
if (files.length === 0) {
  console.error(`No .sql migrations found in ${migrationsDir}`);
  process.exit(2);
}

// --- SQL helpers -------------------------------------------------------------

/** Remove comments; keep dollar-quoted bodies intact. */
function stripCommentsKeepDollarBodies(sql) {
  let out = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
    if (m) {
      const tag = m[0];
      const end = sql.indexOf(tag, i + tag.length);
      const stop = end === -1 ? n : end + tag.length;
      out += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (sql.startsWith('--', i)) {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? n : end;
      continue;
    }
    if (sql.startsWith('/*', i)) {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    out += sql[i];
    i++;
  }
  return out;
}

/** Split on `;` respecting dollar-quoted bodies and quoted strings. */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    if (ch === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
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
  return statements.map((s) => s.trim()).filter(Boolean);
}

// --- Function EXECUTE state ---------------------------------------------------

const KNOWN_ROLES = new Set(['anon', 'authenticated', 'service_role', 'public']);
const functionDefs = new Set(); // fn name (lower) seen in CREATE FUNCTION
const grantState = new Map();   // fn name (lower) -> Map(roleLower -> bool)

const fnKey = (name) => name.toLowerCase();

function registerFunction(name) {
  const k = fnKey(name);
  functionDefs.add(k);
  if (!grantState.has(k)) grantState.set(k, new Map());
}

function setGrant(fnName, roles, granted) {
  const st = grantState.get(fnKey(fnName));
  if (!st) return; // auth.*/builtin — not tracked
  for (const role of roles) {
    if (role === 'public') {
      st.clear(); // PUBLIC grant/revoke resets all per-role entries
      st.set('public', granted);
    } else {
      st.set(role, granted);
    }
  }
}

function holdsExecute(fnName, role) {
  const st = grantState.get(fnKey(fnName));
  if (!st) return true;   // unknown/builtin — assume executable
  if (st.size === 0) return true; // untouched default ACL (PUBLIC)
  if (st.has(role)) return st.get(role);
  if (st.has('public')) return st.get('public');
  return true;
}

// --- Policy state --------------------------------------------------------------

const policies = new Map(); // `${table}|${name}` (lower) -> { table, name, roles, expr, file, kind }

function parseRoles(str) {
  return String(str || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseExpr(body) {
  let s = String(body || '').trim();
  if (s.startsWith('(') && s.endsWith(')')) s = s.slice(1, -1).trim();
  return s;
}

function upsertPolicy({ table, name, roles, expr, file, kind }) {
  policies.set(`${table}|${name}`.toLowerCase(), { table, name, roles, expr, file, kind });
}

// --- Replay: pass over all migrations, statements in order ----------------------

for (const file of files) {
  const sql = stripCommentsKeepDollarBodies(readFileSync(join(migrationsDir, file), 'utf8'));

  for (const stmt of splitStatements(sql)) {
    let m;

    // CREATE [OR REPLACE] FUNCTION [schema.]name (...)
    if ((m = /^create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([A-Za-z_][\w]*)/i.exec(stmt))) {
      registerFunction(m[1]);
      continue;
    }

    // GRANT EXECUTE ON FUNCTION [schema.]name[(args)] TO role[, role...]
    if ((m = /^grant\s+execute\s+on\s+function\s+(?:public\.)?([A-Za-z_][\w]*)\s*(?:\([^)]*\))?\s+to\s+([^;]+)$/i.exec(stmt))) {
      setGrant(m[1], parseRoles(m[2]), true);
      continue;
    }

    // REVOKE [ALL [PRIVILEGES]] ON FUNCTION [schema.]name[(args)] FROM role[, role...]
    if ((m = /^revoke\s+(?:all(?:\s+privileges)?\s+)?on\s+function\s+(?:public\.)?([A-Za-z_][\w]*)\s*(?:\([^)]*\))?\s+(?:from\s+)?([^;]+)$/i.exec(stmt))) {
      setGrant(m[1], parseRoles(m[2]), false);
      continue;
    }

    // DO-block / ad-hoc "drop ALL policies on table T" (matches tablename = 't' inside the block)
    const dropAllRe = /tablename\s*=\s*'([A-Za-z_][\w]*)'/gi;
    let touchedDropAll = false;
    while ((m = dropAllRe.exec(stmt)) !== null) {
      touchedDropAll = true;
      const t = m[1].toLowerCase();
      for (const key of [...policies.keys()]) {
        if (key.startsWith(`${t}|`)) policies.delete(key);
      }
    }
    if (touchedDropAll) continue;

    // DROP POLICY [IF EXISTS] name ON [schema.]table
    if ((m = /^drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|[A-Za-z_][\w]*)\s+on\s+(?:public\.)?([A-Za-z_][\w]*)$/i.exec(stmt))) {
      const name = m[1].startsWith('"') ? m[1].slice(1, -1) : m[1];
      policies.delete(`${m[2]}|${name}`.toLowerCase());
      continue;
    }

    // CREATE POLICY name ON [schema.]table [AS ...] [FOR cmd] [TO roles] [USING (...)] [WITH CHECK (...)]
    if ((m = /^create\s+policy\s+("[^"]+"|[A-Za-z_][\w]*)\s+on\s+(?:public\.)?([A-Za-z_][\w]*)([^]*)$/i.exec(stmt))) {
      const rawName = m[1];
      const name = rawName.startsWith('"') ? rawName.slice(1, -1) : rawName;
      const table = m[2];
      const rest = m[3];
      const toM = /\bto\s+([^]*?)(?=\busing\b|\bwith\s+check\b|$)/i.exec(rest);
      const usingM = /\busing\s*\(([^]*?)\)\s*(?=\bwith\s+check\b|$)/i.exec(rest);
      const checkM = /\bwith\s+check\s*\(([^]*?)\)\s*$/i.exec(rest);
      const roles = toM ? parseRoles(toM[1]) : ['public'];
      const usingExpr = usingM ? parseExpr(usingM[1]) : '';
      const checkExpr = checkM ? parseExpr(checkM[1]) : '';
      if (usingExpr) upsertPolicy({ table, name, roles, expr: usingExpr, file, kind: 'USING' });
      if (checkExpr) upsertPolicy({ table, name, roles, expr: checkExpr, file, kind: 'WITH CHECK' });
      continue;
    }
  }
}

// --- Audit final policy state ---------------------------------------------------

const findings = [];
const SAFE_BUILTINS = new Set([
  'coalesce', 'exists', 'now', 'not', 'auth_uid', 'auth', 'uid', 'current_setting',
]);

for (const pol of policies.values()) {
  const callRe = /\b([A-Za-z_][\w]*)\s*\(/g;
  let cm;
  const seen = new Set();
  while ((cm = callRe.exec(pol.expr)) !== null) {
    const fn = cm[1].toLowerCase();
    if (seen.has(fn)) continue;
    seen.add(fn);
    if (SAFE_BUILTINS.has(fn)) continue;
    if (!functionDefs.has(fn)) continue; // builtin/unknown — EXECUTE not modelable

    for (const role of pol.roles) {
      if (!KNOWN_ROLES.has(role)) continue;
      if (!holdsExecute(fn, role)) {
        findings.push({ table: pol.table, policy: pol.name, role, fn, kind: pol.kind, file: pol.file });
      }
    }
  }
}

// --- Report -----------------------------------------------------------------------

console.log(`Audited ${files.length} migrations from ${dir} (statement-ordered replay)\n`);

const byTable = new Map();
for (const f of findings) {
  if (!byTable.has(f.table)) byTable.set(f.table, []);
  byTable.get(f.table).push(f);
}

if (byTable.size === 0) {
  console.log('✅ No POLICY-FUNCTION-PRIVILEGE findings — every final policy is executable by all of its roles.');
  process.exit(0);
}

for (const [table, list] of byTable) {
  console.log(`❌ ${table}`);
  for (const f of list) {
    console.log(
      `   - policy "${f.policy}" (${f.kind}) TO ${f.role}: EXECUTE on ${f.fn}() missing — COULD fail with 42501 (last defined in ${f.file})`
    );
  }
}

console.log(
  `\n${findings.length} finding(s). Verify each: if the policy role can never reach the call (qualifier short-circuits), document it; otherwise split the policy per role like 20260919000000 did.`
);
process.exit(1);
