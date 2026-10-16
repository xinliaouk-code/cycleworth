import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const activeMigrationsDir = path.join(repoRoot, 'supabase', 'migrations')
const archivedMigrationsDir = path.join(repoRoot, 'supabase', 'legacy-migrations')
const linkedProjectRefPath = path.join(repoRoot, 'supabase', '.temp', 'project-ref')
const legacyProjectRef = 'rmckneoiqdxgarwitepo'
const dedicatedProjectRef = 'qmegopdnnkfrnhtohvhe'
const requiredBaseline = '202608270001_cycleworth_isolated_baseline.sql'
const requiredArchivedMigrations = [
  '202608230001_personal_cycleworth.sql',
  '202608240001_drop_legacy_public_cycleworth.sql',
]
const legacyCycleWorthTables = [
  'settings',
  'strava_connections',
  'rides',
  'bike_maintenance_tasks',
  'bike_maintenance_history',
]
const requireDedicatedTarget = process.argv.includes('--require-dedicated-target')

const errors = []
const warnings = []

async function listSqlFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
      .map((entry) => entry.name)
      .sort()
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}

async function readText(filePath) {
  return readFile(filePath, 'utf8')
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
}

function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function reportMatch(file, pattern, message, text) {
  pattern.lastIndex = 0
  if (pattern.test(text)) errors.push(`${file}: ${message}`)
}

async function main() {
  const activeMigrations = await listSqlFiles(activeMigrationsDir)
  if (!activeMigrations.includes(requiredBaseline)) {
    errors.push(`supabase/migrations must contain ${requiredBaseline}`)
  }

  const migrationSafetyChecks = [
    [/\bdrop\s+(?:table|schema|function|trigger|view|index)\b/gi, 'destructive DROP statement is not allowed in an active migration'],
    [/\btruncate\b/gi, 'destructive TRUNCATE statement is not allowed in an active migration'],
    [/\bdelete\s+from\b/gi, 'destructive DELETE statement is not allowed in an active migration'],
    [/\balter\s+(?:table|schema)\b[\s\S]{0,200}\b(?:drop|rename)\b/gi, 'destructive ALTER DROP/RENAME statement is not allowed in an active migration'],
    [/\bpublic\s*\./gi, 'active migrations must not reference the public schema'],
  ]

  for (const filename of activeMigrations) {
    const relativeFile = path.join('supabase', 'migrations', filename)
    const sql = stripSqlComments(await readText(path.join(activeMigrationsDir, filename)))
    for (const [pattern, message] of migrationSafetyChecks) {
      reportMatch(relativeFile, pattern, message, sql)
    }
  }

  for (const filename of requiredArchivedMigrations) {
    const archivePath = path.join(archivedMigrationsDir, filename)
    try {
      await readText(archivePath)
    } catch (error) {
      if (error?.code === 'ENOENT') {
        errors.push(`historical migration is missing from supabase/legacy-migrations: ${filename}`)
      } else {
        throw error
      }
    }
  }

  const envExamplePath = path.join(repoRoot, '.env.example')
  const envExample = await readText(envExamplePath)
  for (const forbiddenName of [
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
  ]) {
    if (envExample.includes(forbiddenName)) {
      errors.push(`.env.example still contains removed or privileged Supabase variable ${forbiddenName}`)
    }
  }
  for (const requiredName of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_STRAVA_CLIENT_ID',
    'STRAVA_CLIENT_SECRET',
  ]) {
    if (!envExample.includes(requiredName)) {
      errors.push(`.env.example is missing ${requiredName}`)
    }
  }

  const sourceFiles = []
  async function collectSourceFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await collectSourceFiles(filePath)
      } else if (/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
        sourceFiles.push(filePath)
      }
    }
  }
  await collectSourceFiles(path.join(repoRoot, 'src'))

  for (const filePath of sourceFiles) {
    const relativeFile = path.relative(repoRoot, filePath)
    const source = await readText(filePath)
    for (const forbiddenName of [
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SECRET_KEY',
    ]) {
      if (source.includes(forbiddenName)) {
        errors.push(`${relativeFile} still references removed or privileged Supabase variable ${forbiddenName}`)
      }
    }

    const executableSource = stripJsComments(source)
    reportMatch(relativeFile, /\bservice[-_]role\b/gi, 'runtime source must not reference a service-role client', executableSource)
    reportMatch(relativeFile, new RegExp(`\\bpublic\\s*\\.\\s*(?:${legacyCycleWorthTables.join('|')})\\b`, 'gi'), 'runtime source must not query legacy public CycleWorth tables', executableSource)
  }

  for (const relativeFile of ['src/lib/supabase.ts', 'src/lib/auth.ts']) {
    const filePath = path.join(repoRoot, relativeFile)
    const source = await readText(filePath)
    if (!source.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')) {
      errors.push(`${relativeFile} must use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
    }
    if (!/schema\s*:\s*['"]personal_cycleworth['"]/.test(source)) {
      errors.push(`${relativeFile} must scope the Supabase client to personal_cycleworth`)
    }
  }

  let linkedProjectRef = ''
  try {
    linkedProjectRef = (await readText(linkedProjectRefPath)).trim()
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  if (requireDedicatedTarget && linkedProjectRef !== dedicatedProjectRef) {
    errors.push(`remote operations require the exact dedicated ref ${dedicatedProjectRef}; the current link is missing or different`)
  }
  if (linkedProjectRef === legacyProjectRef) {
    const message = `local Supabase CLI link still points to legacy shared project ${legacyProjectRef}`
    if (requireDedicatedTarget) {
      errors.push(`${message}; link the exact dedicated CycleWorth project before any remote operation`)
    } else {
      warnings.push(`${message}; no remote command is permitted until this link is replaced`)
    }
  } else if (!linkedProjectRef) {
    warnings.push('no local Supabase CLI project link is present; exact dedicated target is still pending')
  } else if (requireDedicatedTarget) {
    warnings.push(`local Supabase CLI link is ${linkedProjectRef}; verify it against the user-provided dedicated target before pushing`)
  }

  const config = await readText(path.join(repoRoot, 'supabase', 'config.toml'))
  if (requireDedicatedTarget && !config.includes(`project_id = "${dedicatedProjectRef}"`)) {
    errors.push('supabase/config.toml does not match the exact dedicated project ref')
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== `https://${dedicatedProjectRef}.supabase.co`) {
    errors.push('runtime Supabase URL does not match the exact dedicated project')
  }
  if (config.includes('project_id = "personal-projects-cycleworth"')) {
    warnings.push('supabase/config.toml still has the pre-separation placeholder project_id; set the exact dedicated ref only after it is verified')
  }

  console.log(`CycleWorth Supabase isolation scan: ${sourceFiles.length} source files, ${activeMigrations.length} active migration(s)`)
  for (const warning of warnings) console.warn(`WARN: ${warning}`)

  if (errors.length > 0) {
    for (const error of errors) console.error(`FAIL: ${error}`)
    process.exitCode = 1
    return
  }

  console.log('PASS: runtime key model, schema scope, migration safety, and historical archive checks passed')
  if (requireDedicatedTarget && linkedProjectRef === dedicatedProjectRef) {
    console.log('PASS: local link matches the exact dedicated CycleWorth ref; independently verify remote project identity before migration')
  } else {
    console.log('PENDING: dedicated Supabase project identity is required before remote migration or production cutover')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
