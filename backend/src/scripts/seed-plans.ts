const plans = [
  {
    id: 'trial',
    name: 'Essai gratuit',
    durationDays: 1,
    priceMad: 0,
    aiCreditsPerDay: 1,
  },
  {
    id: '15d',
    name: 'Pack 15 jours',
    durationDays: 15,
    priceMad: 49,
    aiCreditsPerDay: 5,
  },
  {
    id: 'monthly',
    name: 'Pro mensuel',
    durationDays: 30,
    priceMad: 99,
    aiCreditsPerDay: 10,
  },
  {
    id: 'bimonthly',
    name: 'Pack Premium',
    durationDays: 60,
    priceMad: 149,
    aiCreditsPerDay: 15,
  },
];

const values = plans
  .map(
    (plan) =>
      `('${plan.id}', '${plan.name.replaceAll("'", "''")}', ${plan.durationDays}, ${plan.priceMad}, ${plan.aiCreditsPerDay}, 1)`,
  )
  .join(',\n');

console.log(`INSERT INTO plans (id, name, duration_days, price_mad, ai_credits_per_day, is_active)
VALUES
${values}
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  duration_days = excluded.duration_days,
  price_mad = excluded.price_mad,
  ai_credits_per_day = excluded.ai_credits_per_day,
  is_active = excluded.is_active;`);

console.log('\nRun with: wrangler d1 execute telc-prep --local --command "<SQL above>"');
