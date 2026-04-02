export interface BotProfile {
  id: string;
  name: string;
  description: string;
  vpip: number;
  pfr: number;
  aggression: number;
  bluffFrequency: number;
  cBetFrequency: number;
  foldTo3Bet: number;
  usesGto: boolean;
}
