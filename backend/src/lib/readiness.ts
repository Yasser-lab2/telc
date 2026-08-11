export type ReadinessInput = {
  skill: string;
  completedAttempts: number;
  averagePercentage: number | null;
};

export function calculateReadiness(rows: ReadinessInput[]) {
  const bySkill = new Map(rows.map((row) => [row.skill, row]));
  const coreSkills = ['reading', 'listening', 'writing'] as const;
  const measuredCore = coreSkills.filter((skill) => (bySkill.get(skill)?.completedAttempts ?? 0) > 0 && bySkill.get(skill)?.averagePercentage != null);
  const simulation = bySkill.get('simulation');
  const hasSimulation = Boolean(simulation?.completedAttempts && simulation.averagePercentage != null);
  const evidenceAttempts = rows.reduce((total, row) => total + row.completedAttempts, 0);

  if (!measuredCore.length && !hasSimulation) {
    return { score: null, confidence: 'insufficient' as const, evidenceAttempts, hasSimulation: false, measuredSkills: [], explanation: 'Terminez un exercice pour obtenir une première estimation.' };
  }

  const coreAverage = measuredCore.reduce((total, skill) => total + Number(bySkill.get(skill)?.averagePercentage ?? 0), 0) / Math.max(1, measuredCore.length);
  const rawScore = hasSimulation ? (Number(simulation?.averagePercentage) * 0.5) + (coreAverage * 0.5) : coreAverage;
  const reliable = hasSimulation && measuredCore.length === coreSkills.length;

  return {
    score: Math.round(rawScore * 10) / 10,
    confidence: reliable ? 'reliable' as const : 'preliminary' as const,
    evidenceAttempts,
    hasSimulation,
    measuredSkills: measuredCore,
    explanation: reliable
      ? '50 % simulation complète et 50 % moyenne Lesen, Hören et Schreiben.'
      : 'Estimation provisoire basée sur les compétences déjà pratiquées. Une simulation et les trois compétences sont nécessaires pour la fiabiliser.',
  };
}
