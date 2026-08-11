export function weightedSimulationPercentage(results: Array<{ percentage: number; weight: number }>) {
  const totalWeight = results.reduce((total, result) => total + result.weight, 0);
  if (totalWeight <= 0) return 0;
  return Math.round(results.reduce((total, result) => total + result.percentage * result.weight, 0) / totalWeight);
}
