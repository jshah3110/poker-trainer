import type { BotProfile } from '../types';

export const TAG_PROFILE: BotProfile = {
  id: 'tag',
  name: 'Alex (TAG)',
  description: 'Tight-Aggressive: plays few hands but plays them hard.',
  vpip: 22,
  pfr: 18,
  aggression: 60,
  bluffFrequency: 15,
  cBetFrequency: 65,
  foldTo3Bet: 55,
  usesGto: false,
};

export const ALL_PROFILES: BotProfile[] = [TAG_PROFILE];

export function getProfile(id: string): BotProfile {
  const profile = ALL_PROFILES.find(p => p.id === id);
  if (!profile) throw new Error(`Unknown bot profile: ${id}`);
  return profile;
}
