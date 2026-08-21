export type RetentionResult = { scanned: number; deleted: number; failed: number };

export async function purgeExpiredSpeakingRecordings(env: { DB: D1Database; SPEAKING_RECORDINGS: R2Bucket }, now = new Date(), limit = 100): Promise<RetentionResult> {
  const query = await env.DB.prepare('SELECT id, object_key FROM speaking_submissions WHERE delete_after <= ? ORDER BY delete_after LIMIT ?').bind(Math.floor(now.getTime() / 1000), limit).all<{ id: string; object_key: string }>();
  const rows = query.results ?? []; const deletedIds: string[] = []; let failed = 0;
  for (const row of rows) {
    try { await env.SPEAKING_RECORDINGS.delete(row.object_key); deletedIds.push(row.id); }
    catch { failed += 1; }
  }
  if (deletedIds.length) await env.DB.batch(deletedIds.map((id) => env.DB.prepare('DELETE FROM speaking_submissions WHERE id = ? AND delete_after <= ?').bind(id, Math.floor(now.getTime() / 1000))));
  return { scanned: rows.length, deleted: deletedIds.length, failed };
}
