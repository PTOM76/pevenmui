import { fileStore } from './fileAccess'

/**
 * 決めたフォルダーへの保存（File System Access API。Chrome・Edge のみ）。初回にフォルダーを選んで覚え（IndexedDB）、
 * 以後は選ばずに連番の名前で保存する。素材を何十個も書き出して、ほかのアプリ（DAW など）でそのフォルダーを開いて使うため
 */

interface DirHandle {
  name: string
  getFileHandle(name: string, o?: { create?: boolean }): Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }>
  queryPermission(d: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(d: { mode: 'readwrite' }): Promise<PermissionState>
}
type DirWindow = Window & { showDirectoryPicker?: (o?: { id?: string; mode?: 'readwrite' }) => Promise<DirHandle> }

const key = (kind: string) => `saveFolder:${kind}`

/** フォルダーへの保存を使えるか */
export const canSaveToFolder = () => typeof window !== 'undefined' && !!(window as DirWindow).showDirectoryPicker

/** 覚えているフォルダーの名前（なければ null） */
export async function savedFolderName(kind: string): Promise<string | null> {
  const h = (await fileStore()?.get(key(kind)).catch(() => null)) as DirHandle | null | undefined
  return h?.name ?? null
}

/** 保存先のフォルダーを選び直して覚える。やめたら null */
export async function chooseSaveFolder(kind: string): Promise<string | null> {
  const pick = (window as DirWindow).showDirectoryPicker
  if (!pick) return null
  try {
    const h = await pick({ id: `folder-${kind}`, mode: 'readwrite' })
    await fileStore()?.put(key(kind), h)
    return h.name
  } catch {
    return null
  }
}

/** 覚えているフォルダー（なければ選ばせる）。書き込みの許可も求める。使えなければ null */
async function folder(kind: string): Promise<DirHandle | null> {
  let h = (await fileStore()?.get(key(kind)).catch(() => null)) as DirHandle | null | undefined
  if (!h) {
    if (!(await chooseSaveFolder(kind))) return null
    h = (await fileStore()?.get(key(kind))) as DirHandle
  }
  if ((await h.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return null
  return h
}

/**
 * `kind` のフォルダーへ、`base_01.ext`、`base_02.ext`… のうちまだ無い名前で保存する。保存した名前を返す（やめたら null）。
 * ユーザー操作の中で呼ぶ（初回のフォルダーの選択と、書き込みの許可の確認が出ることがある）
 */
export async function saveToFolder(kind: string, base: string, ext: string, blob: Blob): Promise<{ folder: string; name: string } | null> {
  const dir = await folder(kind)
  if (!dir) return null
  const safe = base.replace(/[\\/:*?"<>|]/g, '_')
  for (let i = 1; i < 10000; i++) {
    const name = `${safe}_${String(i).padStart(2, '0')}${ext}`
    // まだ無い名前を探す（getFileHandle は無ければ失敗する）
    const exists = await dir.getFileHandle(name).then(() => true, () => false)
    if (exists) continue
    const w = await (await dir.getFileHandle(name, { create: true })).createWritable()
    await w.write(blob)
    await w.close()
    return { folder: dir.name, name }
  }
  return null
}
