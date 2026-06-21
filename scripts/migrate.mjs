#!/usr/bin/env node
/**
 * Minimal forward-only migration runner for AutoHQ.
 *
 * Applies every db/migrations/*.sql file (lexicographic order) that hasn't been
 * applied yet, tracking them in a `schema_migrations` table. Each file runs in
 * its own transaction, so a failing migration rolls back cleanly.
 *
 * Usage:  npm run db:migrate
 * Needs:  DATABASE_URL (loaded from .env if present, see package.json script).
 */
import postgres from 'postgres'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const url = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL
if (!url) {
  console.error('✗ DATABASE_URL is not set')
  process.exit(1)
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations')
const sql = postgres(url, { prepare: false, onnotice: () => {} })

try {
  await sql`
    create table if not exists schema_migrations (
      version    text primary key,
      applied_at timestamptz not null default now()
    )
  `

  const applied = new Set(
    (await sql`select version from schema_migrations`).map(r => r.version),
  )

  const files = (await readdir(migrationsDir))
    .filter(f => f.endsWith('.sql'))
    .sort()

  let count = 0
  for (const file of files) {
    const version = file.replace(/\.sql$/, '')
    if (applied.has(version)) continue

    const content = await readFile(join(migrationsDir, file), 'utf8')
    process.stdout.write(`→ applying ${file} ... `)
    await sql.begin(async (tx) => {
      await tx.unsafe(content)
      await tx`insert into schema_migrations (version) values (${version})`
    })
    console.log('done')
    count++
  }

  console.log(count ? `✓ applied ${count} migration(s)` : '✓ already up to date')
} catch (err) {
  console.error('\n✗ migration failed')
  console.error('  message:', err?.message || '(empty)')
  if (err?.code) console.error('  code:   ', err.code)
  if (err?.detail) console.error('  detail: ', err.detail)
  if (err?.hint) console.error('  hint:   ', err.hint)
  if (err?.routine) console.error('  routine:', err.routine)
  if (err?.errno) console.error('  errno:  ', err.errno)
  if (err?.cause) console.error('  cause:  ', err.cause)
  console.error('\n  full error:\n', err)
  process.exitCode = 1
} finally {
  await sql.end()
}
