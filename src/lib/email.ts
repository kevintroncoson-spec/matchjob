import { Resend } from 'resend'
import type { Profile, Job } from '@/types'

const FROM = process.env.RESEND_FROM_EMAIL || 'notificaciones@MatchJob.cl'

// Inicialización perezosa: solo crea el cliente cuando hay clave y se usa
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

// ─── Notificación a empresa: nueva postulación ────────────────────────────────

export async function sendApplicationEmail(params: {
  companyEmail: string
  companyName: string
  candidate: Profile
  job: Job
  matchScore: number
}) {
  const { companyEmail, companyName, candidate, job, matchScore } = params

  const resend = getResend()
  if (!resend) return // sin clave, no envía (no bloquea la app)
  await resend.emails.send({
    from: `MatchJob <${FROM}>`,
    to: companyEmail,
    subject: `❤️ Nueva postulación: ${candidate.name} para ${job.title}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>
  body{font-family:'DM Sans',Arial,sans-serif;background:#f7fafd;margin:0;padding:0}
  .wrap{max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;border:1px solid rgba(55,138,221,0.2)}
  .header{background:#0C447C;padding:24px 32px;display:flex;align-items:center;gap:12px}
  .header h1{color:white;font-size:20px;margin:0;font-weight:800}
  .body{padding:28px 32px}
  .match-badge{background:#E6F1FB;color:#0C447C;border-radius:24px;padding:6px 16px;font-size:14px;font-weight:700;display:inline-block;margin-bottom:20px}
  .candidate-card{background:#f7fafd;border-radius:12px;padding:18px;border:1px solid rgba(55,138,221,0.15);margin-bottom:20px}
  .candidate-name{font-size:18px;font-weight:700;color:#0A1628;margin-bottom:4px}
  .candidate-role{font-size:14px;color:#3a5272;margin-bottom:12px}
  .tag{background:#E6F1FB;color:#0C447C;border-radius:8px;padding:3px 10px;font-size:12px;margin-right:6px;margin-bottom:6px;display:inline-block}
  .info-row{font-size:13px;color:#3a5272;margin-bottom:6px}
  .btn{background:#185FA5;color:white;border-radius:12px;padding:12px 24px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;margin-top:8px}
  .footer{padding:20px 32px;background:#f0f4f8;font-size:12px;color:#7a9bbf;text-align:center}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div>
      <h1>🔔 Nueva postulación en MatchJob</h1>
      <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px">Hola ${companyName} — alguien aplicó a tu oferta con un ❤️</p>
    </div>
  </div>
  <div class="body">
    <div class="match-badge">⚡ Match ${matchScore}%</div>
    <div class="candidate-card">
      <div class="candidate-name">${candidate.name}</div>
      <div class="candidate-role">${candidate.role || 'Profesional'} · ${candidate.location || 'Chile'}</div>
      <div style="margin-bottom:12px">
        ${(candidate.skills || []).slice(0, 6).map(s => `<span class="tag">${s}</span>`).join('')}
      </div>
      ${candidate.modality ? `<div class="info-row">🏢 Modalidad: <strong>${candidate.modality}</strong></div>` : ''}
      ${candidate.salary_min ? `<div class="info-row">💰 Renta esperada: <strong>$${candidate.salary_min.toLocaleString()} - $${(candidate.salary_max || candidate.salary_min).toLocaleString()}</strong></div>` : ''}
      ${candidate.availability_days !== null ? `<div class="info-row">📅 Disponible en: <strong>${candidate.availability_days === 0 ? 'Inmediato' : candidate.availability_days + ' días'}</strong></div>` : ''}
    </div>
    <p style="font-size:14px;color:#3a5272">Aplicó a: <strong>${job.title}</strong></p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn">
      Ver candidato en dashboard →
    </a>
  </div>
  <div class="footer">
    MatchJob — Encuentra el talento con un ❤️<br/>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" style="color:#7a9bbf">Gestionar notificaciones</a>
  </div>
</div>
</body>
</html>
    `,
  })
}

// ─── Recordatorio a empresa: candidatos sin respuesta ────────────────────────

export async function sendReminderEmail(params: {
  companyEmail: string
  companyName: string
  pendingCount: number
  jobTitle: string
}) {
  const { companyEmail, companyName, pendingCount, jobTitle } = params

  const resend = getResend()
  if (!resend) return // sin clave, no envía (no bloquea la app)
  await resend.emails.send({
    from: `MatchJob <${FROM}>`,
    to: companyEmail,
    subject: `⏰ Tienes ${pendingCount} candidato${pendingCount > 1 ? 's' : ''} esperando respuesta`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:32px auto;padding:28px;background:white;border-radius:14px;border:1px solid #e8f0f8">
  <h2 style="color:#0A1628;margin-bottom:8px">⏰ Recordatorio pendiente</h2>
  <p style="color:#3a5272;font-size:14px">Hola ${companyName},</p>
  <p style="color:#3a5272;font-size:14px">Tienes <strong>${pendingCount} candidato${pendingCount > 1 ? 's' : ''}</strong> que postularon a <strong>${jobTitle}</strong> y aún no han recibido respuesta.</p>
  <p style="color:#3a5272;font-size:14px">Dar feedback a los postulantes — aunque sea un rechazo — mejora tu marca empleadora y la experiencia de los candidatos.</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#185FA5;color:white;border-radius:12px;padding:12px 24px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;margin-top:8px">
    Responder candidatos →
  </a>
</div>
    `,
  })
}
