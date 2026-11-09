import { requireSupabase } from '@/lib/supabase'

/** Bucket público das imagens do site (migração 20261111130000_site_media.sql). */
export const SITE_MEDIA_BUCKET = 'site-media'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export const IMAGE_ACCEPT = Object.keys(EXTENSIONS).join(',')

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end))
}

/**
 * Descobre o tipo real do arquivo pelos primeiros bytes (assinatura).
 * O nome e o tipo informados pelo navegador podem ser falsos; o conteúdo não.
 */
export function sniffImageType(head: Uint8Array): string | null {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg'
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image/png'
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP') return 'image/webp'
  if (ascii(head, 4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(head, 8, 12))) return 'image/avif'
  return null
}

/** Mensagem para o usuário se o arquivo não puder ser enviado; undefined se estiver tudo certo. */
export async function checkImageFile(file: File): Promise<string | undefined> {
  if (!EXTENSIONS[file.type]) return 'Use uma imagem JPEG, PNG, WebP ou AVIF.'
  if (file.size === 0) return 'O arquivo está vazio. Escolha outra imagem.'
  if (file.size > MAX_IMAGE_BYTES) return 'A imagem tem mais de 5 MB. Escolha um arquivo menor.'
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (sniffImageType(head) !== file.type) return 'O conteúdo do arquivo não é uma imagem desse tipo.'
  return undefined
}

/** Caminho no bucket: aaaa/mm/<uuid>.<extensão>. */
export function buildSitePath(date: Date, extension: string, id: string): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}/${month}/${id}.${extension}`
}

/** Envia a imagem ao Storage e devolve a URL pública definitiva. */
export async function uploadSiteImage(file: File): Promise<string> {
  const problem = await checkImageFile(file)
  if (problem) throw new Error(problem)

  const extension = EXTENSIONS[file.type] ?? 'bin'
  const path = buildSitePath(new Date(), extension, crypto.randomUUID())
  const storage = requireSupabase().storage.from(SITE_MEDIA_BUCKET)

  const { error } = await storage.upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error('Não foi possível enviar a imagem. Verifique a conexão e tente de novo.')
  return storage.getPublicUrl(path).data.publicUrl
}
