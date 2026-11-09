import { ImageOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, Field } from '@/admin/ui'
import { checkImageFile, IMAGE_ACCEPT, uploadSiteImage } from './media'

/**
 * Upload de imagem para uma seção. No computador abre o explorador de arquivos;
 * no celular, o sistema oferece a galeria e a câmera.
 */
export function ImageField({
  id,
  label,
  value,
  hint,
  onChange,
}: {
  id: string
  label: string
  value: string
  hint?: string | undefined
  onChange: (url: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Libera a prévia local da memória ao trocar ou desmontar.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const pick = async (file: File) => {
    setError(undefined)
    const problem = await checkImageFile(file)
    if (problem) {
      setError(problem)
      return
    }
    const preview = URL.createObjectURL(file)
    setLocalPreview(preview)
    setBusy(true)
    try {
      const { url } = await uploadSiteImage(file)
      onChange(url)
      setLocalPreview(null)
      URL.revokeObjectURL(preview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.')
      setLocalPreview(null)
      URL.revokeObjectURL(preview)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const shown = localPreview ?? (value.trim() !== '' ? value : null)
  const defaultHint = 'WebP, JPEG, PNG ou AVIF, até 5 MB. Vira WebP compactado ao enviar. No celular você escolhe da galeria ou tira uma foto.'

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint ?? defaultHint}>
      <div className="grid gap-3">
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-admin-lg border border-dashed border-admin-rule-strong bg-admin-sunken">
          {shown ? (
            <img src={shown} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-admin-sm text-admin-ink-3">
              <ImageOff aria-hidden="true" className="size-5" />
              Nenhuma imagem: a seção usa a cor do tema
            </span>
          )}
          {busy ? <span className="absolute inset-0 flex items-center justify-center bg-admin-card/70 text-admin-sm font-medium text-admin-ink">Enviando…</span> : null}
        </div>

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={IMAGE_ACCEPT}
          disabled={busy}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void pick(file)
          }}
          className="block w-full text-admin-sm text-admin-ink-2 file:mr-3 file:cursor-pointer file:rounded-admin file:border file:border-admin-rule file:bg-admin-card file:px-3 file:py-2 file:font-medium file:text-admin-ink hover:file:bg-admin-sunken disabled:opacity-60"
        />

        {value && !busy ? (
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => {
              setError(undefined)
              onChange('')
            }}
          >
            Remover imagem
          </Button>
        ) : null}
      </div>
    </Field>
  )
}
