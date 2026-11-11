import { Button, Input } from '@/admin/ui'
import type { BlockStyle } from '@/renderer/document-v2'

const spacing = [0, 8, 16, 24, 32, 48, 64, 96, 128, 160] as const
const selectClass = 'h-9 w-full rounded-admin border border-admin-rule bg-admin-card px-2 text-admin-sm text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent'

function SelectToken({ id, label, value, options, onChange, inherit = false }: {
  id: string; label: string; value: string | number | undefined; options: readonly { value: string | number; label: string }[]; onChange: (value: string | number | undefined) => void; inherit?: boolean
}) {
  return <label className="grid gap-1 text-admin-sm text-admin-ink"><span className="font-medium">{label}</span><select id={id} className={selectClass} value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? undefined : options.find((option) => String(option.value) === event.target.value)?.value)}>{inherit ? <option value="">Herdar</option> : null}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

export function StylePanel({ idPrefix, value, onChange, inherit = false }: { idPrefix: string; value: BlockStyle; onChange: (value: BlockStyle) => void; inherit?: boolean }) {
  const set = <K extends keyof BlockStyle>(key: K, next: BlockStyle[K]) => onChange({ ...value, [key]: next })
  const spaces = spacing.map((n) => ({ value: n, label: n === 0 ? 'Nenhum' : `${n} px` }))
  return <div className="grid gap-4">
    <div className="grid grid-cols-2 gap-3">
      <SelectToken id={`${idPrefix}-size`} label="Tamanho do texto" value={value.textSize} inherit={inherit} options={['xs','sm','md','lg','xl','2xl','3xl'].map((v) => ({ value: v, label: v.toUpperCase() }))} onChange={(v) => set('textSize', v as BlockStyle['textSize'])} />
      <SelectToken id={`${idPrefix}-weight`} label="Peso" value={value.fontWeight} inherit={inherit} options={[{value:'normal',label:'Normal'},{value:'medium',label:'Médio'},{value:'semibold',label:'Seminegrito'},{value:'bold',label:'Negrito'}]} onChange={(v) => set('fontWeight', v as BlockStyle['fontWeight'])} />
      <SelectToken id={`${idPrefix}-align`} label="Alinhamento" value={value.textAlign} inherit={inherit} options={[{value:'left',label:'Esquerda'},{value:'center',label:'Centro'},{value:'right',label:'Direita'}]} onChange={(v) => set('textAlign', v as BlockStyle['textAlign'])} />
      <SelectToken id={`${idPrefix}-width`} label="Largura máxima" value={value.maxWidth} inherit={inherit} options={['full','sm','md','lg','xl'].map((v) => ({ value: v, label: v === 'full' ? 'Total' : v.toUpperCase() }))} onChange={(v) => set('maxWidth', v as BlockStyle['maxWidth'])} />
      <SelectToken id={`${idPrefix}-px`} label="Padding lateral" value={value.paddingX} inherit={inherit} options={spaces} onChange={(v) => set('paddingX', v as BlockStyle['paddingX'])} />
      <SelectToken id={`${idPrefix}-py`} label="Padding vertical" value={value.paddingY} inherit={inherit} options={spaces} onChange={(v) => set('paddingY', v as BlockStyle['paddingY'])} />
      <SelectToken id={`${idPrefix}-mt`} label="Margem acima" value={value.marginTop} inherit={inherit} options={spaces} onChange={(v) => set('marginTop', v as BlockStyle['marginTop'])} />
      <SelectToken id={`${idPrefix}-mb`} label="Margem abaixo" value={value.marginBottom} inherit={inherit} options={spaces} onChange={(v) => set('marginBottom', v as BlockStyle['marginBottom'])} />
      <SelectToken id={`${idPrefix}-gap`} label="Espaço interno" value={value.gap} inherit={inherit} options={spaces} onChange={(v) => set('gap', v as BlockStyle['gap'])} />
      <SelectToken id={`${idPrefix}-radius`} label="Cantos" value={value.radius} inherit={inherit} options={['none','sm','md','lg','xl','full'].map((v) => ({value:v,label:v === 'none' ? 'Retos' : v === 'full' ? 'Pílula' : v.toUpperCase()}))} onChange={(v) => set('radius', v as BlockStyle['radius'])} />
      <SelectToken id={`${idPrefix}-shadow`} label="Sombra" value={value.shadow} inherit={inherit} options={['none','sm','md','lg'].map((v) => ({value:v,label:v === 'none' ? 'Nenhuma' : v.toUpperCase()}))} onChange={(v) => set('shadow', v as BlockStyle['shadow'])} />
      <SelectToken id={`${idPrefix}-border`} label="Borda" value={value.borderWidth} inherit={inherit} options={[0,1,2,4].map((v) => ({value:v,label:`${v} px`}))} onChange={(v) => set('borderWidth', v as BlockStyle['borderWidth'])} />
    </div>
    <OptionalColor id={`${idPrefix}-color`} label="Cor do texto" value={value.color} onChange={(v) => set('color', v)} />
    <OptionalColor id={`${idPrefix}-background`} label="Cor de fundo" value={value.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
    <OptionalColor id={`${idPrefix}-border-color`} label="Cor da borda" value={value.borderColor} onChange={(v) => set('borderColor', v)} />
  </div>
}

function OptionalColor({ id, label, value, onChange }: { id: string; label: string; value: string | undefined; onChange: (value: string | undefined) => void }) {
  return <label className="grid gap-1 text-admin-sm text-admin-ink"><span className="font-medium">{label}</span><div className="flex gap-2"><input type="color" aria-label={`${label} (seletor)`} value={value ?? '#000000'} onChange={(event) => onChange(event.target.value)} className="h-9 w-12 rounded-admin border border-admin-rule bg-admin-card p-1" /><Input id={id} value={value ?? ''} placeholder="Herdar…" onChange={(event) => /^#[0-9a-fA-F]{6}$/.test(event.target.value) ? onChange(event.target.value.toLowerCase()) : event.target.value === '' && onChange(undefined)} />{value ? <Button type="button" size="sm" variant="secondary" onClick={() => onChange(undefined)}>Herdar</Button> : null}</div></label>
}
