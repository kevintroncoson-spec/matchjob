import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return 'A convenir'
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`
  if (min) return `Desde $${min.toLocaleString()}`
  return `Hasta $${max!.toLocaleString()}`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

// Benefit definitions shared across app
export const BENEFIT_DATA: Record<string, { icon: string; label: string; color: string }> = {
  remote:  { icon: '🌐', label: 'Teletrabajo',   color: 'bg-blue-50 text-blue-800' },
  hybrid:  { icon: '🏢', label: 'Híbrido',        color: 'bg-green-50 text-green-800' },
  bus:     { icon: '🚌', label: 'Bus acercam.',   color: 'bg-amber-50 text-amber-800' },
  casino:  { icon: '🍽️', label: 'Casino',         color: 'bg-red-50 text-red-800' },
  health:  { icon: '🏥', label: 'Seg. salud',     color: 'bg-teal-50 text-teal-800' },
  bonus:   { icon: '💰', label: 'Bonos',          color: 'bg-purple-50 text-purple-800' },
  home:    { icon: '🏠', label: 'Home office',    color: 'bg-gray-50 text-gray-700' },
  stock:   { icon: '📈', label: 'Stock options',  color: 'bg-yellow-50 text-yellow-800' },
  training:{ icon: '📚', label: 'Capacitación',   color: 'bg-indigo-50 text-indigo-800' },
  flex:    { icon: '🕐', label: 'Flex horario',   color: 'bg-pink-50 text-pink-800' },
}

export const ONBOARDING_STEPS = [
  {
    field: 'salary' as const,
    title: '¿Cuál es tu pretensión de renta?',
    sub: 'Filtramos ofertas compatibles con tu expectativa',
    options: ['Hasta $800K', '$800K–$1.2M', '$1.2M–$1.8M', '$1.8M–$2.5M', '$2.5M–$3.5M', 'Sobre $3.5M'],
  },
  {
    field: 'modality' as const,
    title: '¿Qué modalidad de trabajo prefieres?',
    sub: 'Puedes actualizarlo en tu perfil en cualquier momento',
    options: ['100% Remoto', 'Híbrido (2–3 días)', 'Presencial', 'Flexible / Indistinto'],
  },
  {
    field: 'distance' as const,
    title: '¿Cuánto tiempo de traslado aceptas?',
    sub: 'Aplica para trabajo presencial o híbrido',
    options: ['No aplica (remoto)', 'Hasta 20 min', 'Hasta 30 min', 'Hasta 45 min', 'Hasta 1 hora', 'Más de 1 hora'],
  },
  {
    field: 'available' as const,
    title: '¿Cuándo puedes comenzar?',
    sub: 'Ayuda a las empresas a planificar el proceso',
    options: ['Inmediato', 'En 15 días', 'En 1 mes', 'En 2 meses', 'Conversable'],
  },
  {
    field: 'benefits' as const,
    title: '¿Qué beneficios son importantes para ti?',
    sub: 'Selecciona todos los que apliquen',
    multi: true,
    options: ['Seguro de salud', 'Casino / Alimentación', 'Bus de acercamiento', 'Home office', 'Bonos de desempeño', 'Stock options', 'Capacitación', 'Flex horario', 'Seguro de vida'],
  },
]

export const ALL_SKILL_TAGS = [
  'React', 'TypeScript', 'Python', 'Figma', 'Node.js', 'UX', 'Design Systems',
  'Data Science', 'Go', 'Product Manager', 'Frontend', 'Backend', 'Full Stack',
  'Remoto', 'Startup', 'Fintech', 'ML', 'SQL', 'AWS', 'Kubernetes', 'iOS', 'Swift',
  'Mobile', 'DevOps', 'Docker', 'Next.js', 'Vue', 'Java', 'C#', '.NET', 'PHP',
]
