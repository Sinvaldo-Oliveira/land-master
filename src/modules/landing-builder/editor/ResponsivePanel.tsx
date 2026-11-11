import { useState } from 'react'
import type { BlockResponsive, BlockStyle, Device } from '@/renderer/document-v2'
import { StylePanel } from './StylePanel'

export function ResponsivePanel({ value, onChange }: { value: BlockResponsive; onChange: (value: BlockResponsive) => void }) {
  const [device, setDevice] = useState<'tablet' | 'mobile'>('mobile')
  const style = value[device] ?? {}
  const toggleHidden = (target: Device) => {
    const current = new Set(value.hideOn ?? [])
    if (current.has(target)) current.delete(target)
    else current.add(target)
    onChange({ ...value, hideOn: [...current] })
  }
  return <div className="grid gap-5">
    <fieldset className="grid gap-2"><legend className="text-admin-sm font-medium text-admin-ink">Ocultar em</legend><div className="grid grid-cols-3 gap-2">{(['desktop','tablet','mobile'] as const).map((target) => <label key={target} className="flex min-h-11 items-center gap-2 rounded-admin border border-admin-rule px-2 text-admin-sm text-admin-ink"><input type="checkbox" checked={value.hideOn?.includes(target) ?? false} onChange={() => toggleHidden(target)} />{target === 'desktop' ? 'Desktop' : target === 'tablet' ? 'Tablet' : 'Celular'}</label>)}</div></fieldset>
    <div role="tablist" aria-label="Dispositivo do override" className="grid grid-cols-2 gap-1 rounded-admin bg-admin-sunken p-1">{(['tablet','mobile'] as const).map((target) => <button key={target} type="button" role="tab" aria-selected={device === target} onClick={() => setDevice(target)} className="rounded-admin px-3 py-2 text-admin-sm font-medium text-admin-ink-2 aria-selected:bg-admin-card aria-selected:text-admin-ink">{target === 'tablet' ? 'Tablet' : 'Celular'}</button>)}</div>
    <p className="text-admin-sm text-admin-ink-3">Campos em “Herdar” usam o valor do desktop.</p>
    <StylePanel idPrefix={`responsive-${device}`} value={style as BlockStyle} inherit onChange={(next) => onChange({ ...value, [device]: next })} />
  </div>
}
