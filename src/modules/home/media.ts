import { requireSupabase } from '@/lib/supabase'
import { supabaseErrorMessage } from '@/lib/supabase-errors'

/** Bucket público das imagens do site (migração 20261111130000_site_media.sql). */
export const SITE_MEDIA_BUCKET = 'site-media'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
/** Maior lado da imagem final, em pixels. Acima disso é reduzida (mantém a proporção). */
export const MAX_SIDE = 2000
/** Qualidade do WebP (0 a 1). 0,82 costuma manter a foto sem perda visível e pesar pouco. */
export const WEBP_QUALITY = 0.82

/** Formatos aceitos do arquivo original. Todos viram WebP ao enviar. */
export const INPUT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export const IMAGE_ACCEPT = INPUT_TYPES.join(',')

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
  if (!(INPUT_TYPES as readonly string[]).includes(file.type)) return 'Use uma imagem JPEG, PNG, WebP ou AVIF.'
  if (file.size === 0) return 'O arquivo está vazio. Escolha outra imagem.'
  if (file.size > MAX_IMAGE_BYTES) return 'A imagem tem mais de 5 MB. Escolha um arquivo menor.'
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (sniffImageType(head) !== file.type) return 'O conteúdo do arquivo não é uma imagem desse tipo.'
  return undefined
}

/** Calcula o tamanho final mantendo a proporção, sem ampliar a imagem. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Caminho no bucket: aaaa/mm/<uuid>.<extensão>. */
export function buildSitePath(date: Date, extension: string, id: string): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}/${month}/${id}.${extension}`
}

export const CONVERSION_UNSUPPORTED = 'Este navegador não consegue converter a imagem para WebP. Tente outro navegador.'

/** Converte qualquer formato aceito para WebP compactado, reduzindo o lado maior a MAX_SIDE. */
export async function convertToWebp(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Não foi possível ler a imagem. Escolha outro arquivo.')
  }
  try {
    const size = fitWithin(bitmap.width, bitmap.height, MAX_SIDE)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error(CONVERSION_UNSUPPORTED)
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY))
    if (!blob || blob.type !== 'image/webp') throw new Error(CONVERSION_UNSUPPORTED)
    return { blob, ...size }
  } finally {
    bitmap.close()
  }
}

/** Traduz erros do Storage para o que o usuário precisa fazer. */
export function storageErrorMessage(error: unknown): string {
  const message = typeof (error as { message?: unknown })?.message === 'string' ? (error as { message: string }).message : ''
  if (/bucket not found/i.test(message)) {
    return 'O armazenamento de imagens ainda não está configurado neste projeto. Aplique a migração do bucket site-media.'
  }
  if (/mime type|not supported|invalid_mime/i.test(message)) {
    return 'O armazenamento ainda não aceita este tipo de arquivo. Rode o script supabase/RODAR_SO_VIDEO_site_media.sql no SQL Editor.'
  }
  if (/exceeded|too large|payload/i.test(message)) return 'A imagem convertida ficou grande demais. Tente outra imagem.'
  if (/row-level security|permission|not allowed|unauthorized|403/i.test(message)) {
    return 'Seu perfil não tem permissão para enviar imagens ao site.'
  }
  return 'Não foi possível enviar a imagem. Verifique a conexão e tente de novo.'
}

export type UploadedImage = { url: string; mediaId: string }

/**
 * Converte para WebP, envia ao Storage e registra a imagem em media_assets.
 * Se o registro falhar, o arquivo enviado é removido para não ficar órfão.
 */
export async function uploadSiteImage(file: File): Promise<UploadedImage> {
  const problem = await checkImageFile(file)
  if (problem) throw new Error(problem)

  const { blob, width, height } = await convertToWebp(file)
  const sb = requireSupabase()
  const path = buildSitePath(new Date(), 'webp', crypto.randomUUID())
  const storage = sb.storage.from(SITE_MEDIA_BUCKET)

  const { error: uploadError } = await storage.upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  })
  if (uploadError) {
    console.warn('Upload da imagem recusado pelo Storage:', uploadError.message)
    throw new Error(storageErrorMessage(uploadError))
  }

  const { data, error: insertError } = await sb
    .from('media_assets')
    .insert({ bucket: SITE_MEDIA_BUCKET, path, mime: 'image/webp', size_bytes: blob.size, width, height })
    .select('id')
    .single()
  if (insertError) {
    await storage.remove([path]).catch(() => undefined)
    throw new Error(supabaseErrorMessage(insertError, 'Não foi possível registrar a imagem.'))
  }

  return { url: storage.getPublicUrl(path).data.publicUrl, mediaId: data.id }
}

/* ---------------------------------------------------------------------------
 * Vídeos curtos (clipe do hero interativo). Enviados como estão (sem conversão),
 * até 5 MB, e registrados em media_assets. Exige a migração 20261111150000.
 * ------------------------------------------------------------------------- */

export const VIDEO_TYPES = ['video/mp4', 'video/webm'] as const
export const VIDEO_ACCEPT = VIDEO_TYPES.join(',')

/** Tipo real do vídeo pela assinatura: WebM (EBML) ou MP4 (caixa "ftyp" que não seja AVIF). */
export function sniffVideoType(head: Uint8Array): string | null {
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return 'video/webm'
  if (ascii(head, 4, 8) === 'ftyp' && !['avif', 'avis'].includes(ascii(head, 8, 12))) return 'video/mp4'
  return null
}

export async function checkVideoFile(file: File): Promise<string | undefined> {
  if (!(VIDEO_TYPES as readonly string[]).includes(file.type)) return 'Use um vídeo MP4 ou WebM.'
  if (file.size === 0) return 'O arquivo está vazio. Escolha outro vídeo.'
  if (file.size > MAX_IMAGE_BYTES) return 'O vídeo tem mais de 5 MB. Use um clipe mais curto ou mais comprimido.'
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (sniffVideoType(head) !== file.type) return 'O conteúdo do arquivo não é um vídeo desse tipo.'
  return undefined
}

/** Lê largura e altura do vídeo; devolve null se o navegador não conseguir ler a tempo. */
function readVideoSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const done = (value: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const timer = setTimeout(() => done(null), 5000)
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () => {
      clearTimeout(timer)
      done(video.videoWidth > 0 ? { width: video.videoWidth, height: video.videoHeight } : null)
    }
    video.onerror = () => {
      clearTimeout(timer)
      done(null)
    }
    video.src = url
  })
}

export async function uploadSiteVideo(file: File): Promise<UploadedImage> {
  const problem = await checkVideoFile(file)
  if (problem) throw new Error(problem)

  const size = await readVideoSize(file)
  const sb = requireSupabase()
  const extension = file.type === 'video/webm' ? 'webm' : 'mp4'
  const path = buildSitePath(new Date(), extension, crypto.randomUUID())
  const storage = sb.storage.from(SITE_MEDIA_BUCKET)

  const { error: uploadError } = await storage.upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (uploadError) {
    console.warn('Upload do vídeo recusado pelo Storage:', uploadError.message)
    throw new Error(storageErrorMessage(uploadError))
  }

  const { data, error: insertError } = await sb
    .from('media_assets')
    .insert({
      bucket: SITE_MEDIA_BUCKET,
      path,
      mime: file.type,
      size_bytes: file.size,
      width: size?.width ?? null,
      height: size?.height ?? null,
    })
    .select('id')
    .single()
  if (insertError) {
    await storage.remove([path]).catch(() => undefined)
    throw new Error(supabaseErrorMessage(insertError, 'Não foi possível registrar o vídeo.'))
  }

  return { url: storage.getPublicUrl(path).data.publicUrl, mediaId: data.id }
}
