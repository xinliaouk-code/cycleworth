import { parseWorkouts, type DEFAULT_COMMUTE_SETTINGS } from './parse.ts'
import { summarize, type ImportItem } from './types.ts'

type Settings = typeof DEFAULT_COMMUTE_SETTINGS
export type ImportStore = (rides: ReturnType<typeof parseWorkouts>['rides'], dryRun: boolean, validation: ImportItem[]) => Promise<ImportItem[]>

// Both history preview and automatic sync use the same parser and atomic DB import.
export async function importWorkouts(payload: unknown, settings: Settings, dryRun: boolean, store: ImportStore) {
  const parsed = parseWorkouts(payload, settings)
  const results = await store(parsed.rides, dryRun, parsed.items.filter(item => item.status !== 'new'))
  const byIndex = new Map(results.map(item => [item.index, item]))
  const items = parsed.items.map(item => item.status === 'new' ? { ...item, ...byIndex.get(item.index) } : item)
  // Missing DB results must not look like successful writes.
  for (const item of items) if (item.status === 'new' && !byIndex.has(item.index)) {
    item.status = 'failed'; item.message = 'Import result missing; retry the batch'
  }
  const summary = summarize(items)
  return { dry_run: dryRun, imported: dryRun ? 0 : summary.new, summary, items, status: summary.failed ? (summary.failed === items.length ? 'failed' : 'partial_failure') : summary.suspected_duplicate ? 'review_required' : summary.exists && !summary.new ? 'duplicate' : 'success' }
}
