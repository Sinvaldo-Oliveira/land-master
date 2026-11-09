import {
  Clock,
  Handshake,
  LayoutTemplate,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  Palette,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react'
import type { IconName } from './types'

/** Mapa fechado de ícones disponíveis nas seções. */
export const sectionIcons: Record<IconName, LucideIcon> = {
  layout: LayoutTemplate,
  smartphone: Smartphone,
  search: Search,
  'life-buoy': LifeBuoy,
  palette: Palette,
  megaphone: Megaphone,
  handshake: Handshake,
  clock: Clock,
  shield: ShieldCheck,
  message: MessageCircle,
  target: Target,
  sparkles: Sparkles,
}
