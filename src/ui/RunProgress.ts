/** Height is measured in score metres, shared by scenery, HUD and results. */
export const RUN_BIOMES = [
  { startsAt: 0, label: 'Lower Jungle' },
  { startsAt: 120, label: 'Bright Canopy' },
  { startsAt: 320, label: 'Misty Heights' },
  { startsAt: 600, label: 'Sunset Canopy' },
  { startsAt: 900, label: 'Night Storm' },
] as const;
export const MILESTONE_STEP = 100;
export function getRunProgress(height: number) {
  const biome = [...RUN_BIOMES].reverse().find(band => height >= band.startsAt) ?? RUN_BIOMES[0];
  const milestones = Math.floor(Math.max(0, height) / MILESTONE_STEP);
  return { biome, milestones, latestMilestone: milestones * MILESTONE_STEP };
}
