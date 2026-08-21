import { sendAccountEmail } from './account-security';

export async function sendDueSimulationReminders(env: { DB: D1Database; APP_URL: string; RESEND_API_KEY?: string; EMAIL_FROM?: string }, now = new Date()) {
  const until = Math.floor((now.getTime() + 24 * 60 * 60_000) / 1000); const current = Math.floor(now.getTime() / 1000);
  const rows = (await env.DB.prepare(`SELECT schedule.id, users.email, simulation_blueprints.title FROM simulation_schedules schedule JOIN users ON users.id=schedule.user_id JOIN user_preferences pref ON pref.user_id=schedule.user_id JOIN simulation_blueprints ON simulation_blueprints.id=schedule.simulation_id WHERE schedule.status='scheduled' AND schedule.reminder_sent_at IS NULL AND schedule.scheduled_at BETWEEN ? AND ? AND pref.email_study_reminders=1 LIMIT 100`).bind(current, until).all<{ id: string; email: string; title: string }>()).results ?? [];
  let sent = 0; let failed = 0; for (const row of rows) { try { await sendAccountEmail(env, { to: row.email, subject: `Rappel : ${row.title}`, path: '/dashboard/simulation', action: `Votre simulation « ${row.title} » est prévue dans moins de 24 heures.` }); await env.DB.prepare('UPDATE simulation_schedules SET reminder_sent_at=? WHERE id=? AND reminder_sent_at IS NULL').bind(current, row.id).run(); sent += 1; } catch { failed += 1; } } return { scanned: rows.length, sent, failed };
}
