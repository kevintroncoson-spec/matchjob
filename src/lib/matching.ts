import Anthropic from '@anthropic-ai/sdk'
import type { Job, Profile, MatchAnalysis } from '@/types'

function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  return new Anthropic({ apiKey: key })
}

// ─── Cálculo de match local (sin IA) ─────────────────────────────────────────
// Se usa para el porcentaje visual en el feed sin costo de API

export function computeMatchScore(jobTags: string[], profileSkills: string[]): number {
  if (!jobTags.length || !profileSkills.length) return 10
  const j = jobTags.map(t => t.toLowerCase())
  const s = profileSkills.map(t => t.toLowerCase())
  const hits = j.filter(tag => s.some(skill => skill.includes(tag) || tag.includes(skill)))
  const baseScore = Math.round((hits.length / j.length) * 100)

  // Bonus por modality si está en tags
  const remoteBonus = j.some(t => ['remoto', 'remote', 'teletrabajo'].includes(t)) ? 5 : 0

  return Math.min(99, Math.max(10, baseScore + remoteBonus))
}

// ─── Análisis IA con Claude ───────────────────────────────────────────────────
// Se llama bajo demanda (botón 🤖) para análisis detallado

export async function analyzeMatchWithAI(
  job: Job,
  profile: Profile
): Promise<MatchAnalysis> {
  const score = computeMatchScore(job.tags, profile.skills)

  const prompt = `Analiza el match entre este candidato y oferta laboral. Responde en JSON válido con esta estructura exacta:
{
  "summary": "2 oraciones directas sobre el match",
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "gaps": ["brecha 1 o vacío si no hay"]
}

CANDIDATO:
- Nombre: ${profile.name}
- Rol: ${profile.role || 'No especificado'}
- Skills: ${profile.skills.join(', ')}
- Modalidad preferida: ${profile.modality || 'flexible'}
- Renta esperada: ${profile.salary_min ? `$${profile.salary_min} - $${profile.salary_max}` : 'A convenir'}
- Beneficios esperados: ${profile.expected_benefits?.join(', ') || 'No especificados'}

OFERTA:
- Empresa: ${job.company?.name || 'Empresa'}
- Cargo: ${job.title}
- Tags requeridos: ${job.tags.join(', ')}
- Beneficios ofrecidos: ${job.benefits.join(', ')}
- Ubicación: ${job.location}
- Match calculado: ${score}%

Responde SOLO con el JSON, sin texto adicional.`

  const anthropic = getAnthropic()
  if (!anthropic) throw new Error('IA no configurada')
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content.find(b => b.type === 'text')?.text || '{}'

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return { score, ...parsed }
  } catch {
    return {
      score,
      summary: 'No se pudo generar el análisis. Intenta nuevamente.',
      strengths: [],
      gaps: [],
    }
  }
}

// ─── Análisis de candidato para empresa ──────────────────────────────────────

export async function analyzeCandidateForJob(
  candidate: Profile,
  job: Job
): Promise<string> {
  const score = computeMatchScore(job.tags, candidate.skills)

  const anthropic = getAnthropic()
  if (!anthropic) throw new Error('IA no configurada')
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 250,
    messages: [{
      role: 'user',
      content: `Evalúa brevemente (2-3 oraciones) a este candidato para la oferta. Sé directo y útil para el reclutador.

Candidato: ${candidate.name} — ${candidate.role} — Skills: ${candidate.skills.join(', ')}
Oferta: ${job.title} — Requiere: ${job.tags.join(', ')}
Match: ${score}%

Responde en español sin markdown.`,
    }],
  })

  return response.content.find(b => b.type === 'text')?.text || 'Sin análisis disponible.'
}
