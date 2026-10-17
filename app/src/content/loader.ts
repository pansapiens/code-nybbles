import type { CompiledSection, ContentManifest } from '@code-nybbles/content-build/schema'

// Bundles are produced by tools/content-build from our own repo and served same-origin, so they
// are trusted as-is (no runtime zod pass). The SW precaches them for offline use (plans/03 §6).
const url = (file: string) => `${import.meta.env.BASE_URL}content/${file}`

async function getJson<T>(file: string): Promise<T> {
  const r = await fetch(url(file))
  if (!r.ok) throw new Error(`content: ${file} -> HTTP ${r.status}`)
  return (await r.json()) as T
}

export const loadManifest = () => getJson<ContentManifest>('manifest.json')

const sections = new Map<string, Promise<CompiledSection>>()
export function loadSection(m: ContentManifest, sectionId: string): Promise<CompiledSection> {
  const entry = m.sections.find((s) => s.id === sectionId)
  if (!entry) return Promise.reject(new Error(`content: unknown section ${sectionId}`))
  let p = sections.get(entry.hash)
  if (!p) sections.set(entry.hash, (p = getJson<CompiledSection>(entry.url)))
  return p
}

/** Level ids start with their section id (enforced by content-build), so one bundle fetch finds them. */
export async function loadLevel(levelId: string) {
  const section = await loadSection(await loadManifest(), levelId.split('.')[0]!)
  for (const unit of section.units) {
    const level = unit.levels[levelId]
    if (!level) continue
    const checkpoint = unit.path.some((p) => p.kind === 'checkpoint' && p.levelId === levelId)
    return { level, unit, checkpoint }
  }
}

/** The manifest and every section bundle (all small for now; lazy per-section loading later, plans/03 §6). */
export async function loadCourse() {
  const manifest = await loadManifest()
  const sections = await Promise.all(manifest.sections.map((s) => loadSection(manifest, s.id)))
  return { manifest, sections }
}
