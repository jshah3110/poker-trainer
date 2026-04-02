import type { Action, HandState, Card, Rank } from '../types';
import type { BotProfile } from '../types';
import type { Player } from '../types';
import { HandRank } from '../types';
import { evaluateHand } from '../engine/evaluator';
import { getValidActions } from '../engine/betting';
import { RANK_VALUES } from '../engine/constants';

// ─── Pre-flop hand tier classification ────────────────────────────────────

type HandTier = 1 | 2 | 3 | 4 | 5;

function rankVal(r: Rank): number {
  return RANK_VALUES[r];
}

export function getHandTier(cards: Card[]): HandTier {
  const [a, b] = [cards[0]!, cards[1]!];
  const hi = rankVal(a.rank) >= rankVal(b.rank) ? a : b;
  const lo = rankVal(a.rank) < rankVal(b.rank) ? a : b;
  const hiV = rankVal(hi.rank);
  const loV = rankVal(lo.rank);
  const isPair  = a.rank === b.rank;
  const isSuited = a.suit === b.suit;
  const gap = hiV - loV;

  // Tier 1 — Premium: always enter the pot with a raise
  if (isPair && hiV >= 12) return 1;      // QQ, KK, AA
  if (hiV === 14 && loV === 13) return 1; // AK (suited or not)

  // Tier 2 — Strong: raise most of the time
  if (isPair && hiV >= 10) return 2;                    // TT, JJ
  if (hiV === 14 && loV >= 11 && isSuited) return 2;   // AJs, AQs
  if (hiV === 14 && loV >= 11) return 2;                // AJo, AQo
  if (hiV === 13 && loV === 12 && isSuited) return 2;  // KQs

  // Tier 3 — Playable: call or raise depending on position/profile
  if (isPair && hiV >= 7) return 3;                        // 77–99
  if (hiV === 14 && isSuited) return 3;                    // A2s–ATs
  if (hiV === 13 && loV >= 10 && isSuited) return 3;      // KTs, KJs
  if (hiV === 13 && loV >= 10) return 3;                   // KTo, KJo
  if (hiV === 12 && loV >= 10 && isSuited) return 3;      // QTs, QJs
  if (hiV >= 10 && loV >= 9 && isSuited && gap <= 2) return 3; // JTs, T9s

  // Tier 4 — Speculative: sometimes call, never raise
  if (isPair) return 4;                                    // 22–66
  if (isSuited && gap <= 2 && loV >= 5) return 4;         // suited connectors / 1-gappers
  if (hiV >= 10 && loV >= 8 && isSuited) return 4;        // other broadways suited

  // Tier 5 — Trash
  return 5;
}

// ─── Helper: weighted random decision ─────────────────────────────────────

function roll(threshold: number): boolean {
  return Math.random() * 100 < threshold;
}

// ─── Post-flop hand strength assessment ───────────────────────────────────

type PostFlopStrength = 'strong' | 'medium' | 'weak';

function assessPostFlop(holeCards: Card[], communityCards: Card[]): PostFlopStrength {
  if (communityCards.length === 0) return 'medium'; // shouldn't happen post-flop
  const allCards = [...holeCards, ...communityCards];
  const result = evaluateHand(allCards);

  if (result.rank >= HandRank.TwoPair) return 'strong';
  if (result.rank === HandRank.Pair) {
    // Top pair or overpair = medium+
    return 'medium';
  }
  return 'weak';
}

// ─── Pot odds calculation ──────────────────────────────────────────────────

function getPotOdds(callAmount: number, pot: number): number {
  if (callAmount === 0) return 0;
  return callAmount / (pot + callAmount);
}

// ─── Main bot decision function ───────────────────────────────────────────

export async function botDecide(
  state: HandState,
  player: Player,
  profile: BotProfile,
): Promise<Action> {
  const valid = getValidActions(state, player.id, player.chips);
  const now = Date.now();

  // Helper: build an action, always validated
  function makeAction(type: Action['type'], amount = 0): Action {
    return { playerId: player.id, type, amount, timestamp: now };
  }

  // Safety fallback — always fold if nothing else is valid
  function safeFold(): Action {
    return makeAction('fold');
  }

  // ─── Pre-flop decision ───────────────────────────────────────────────────
  if (state.street === 'preflop') {
    const tier = getHandTier(player.holeCards);

    switch (tier) {
      case 1: {
        // Always raise — size 3x BB (minRaise is the min amount to put in)
        if (valid.canRaise) {
          // Raise to ~3-4x the current bet total
          const raiseAmount = Math.min(
            Math.max(valid.minRaise, state.currentBet * 2),
            valid.maxRaise,
          );
          return makeAction('raise', raiseAmount);
        }
        if (valid.canCall) return makeAction('call', valid.callAmount);
        return makeAction('check');
      }
      case 2: {
        // Raise most of the time; occasionally just call
        if (valid.canRaise && roll(profile.pfr * 3.5)) {
          const raiseAmount = Math.min(
            Math.max(valid.minRaise, state.currentBet * 2),
            valid.maxRaise,
          );
          return makeAction('raise', raiseAmount);
        }
        if (valid.canCall) return makeAction('call', valid.callAmount);
        if (valid.canCheck) return makeAction('check');
        return safeFold();
      }
      case 3: {
        // Call within VPIP threshold; occasionally raise
        if (!roll(profile.vpip * 2.5)) return safeFold();
        if (valid.canRaise && roll(profile.pfr)) {
          return makeAction('raise', Math.min(valid.minRaise, valid.maxRaise));
        }
        if (valid.canCall) return makeAction('call', valid.callAmount);
        if (valid.canCheck) return makeAction('check');
        return safeFold();
      }
      case 4: {
        // Speculative: call if pot odds are acceptable
        const potOdds = getPotOdds(valid.callAmount, state.pot);
        const willPlay = roll(profile.vpip * 1.2);
        if (willPlay && potOdds < 0.25) {
          if (valid.canCall) return makeAction('call', valid.callAmount);
          if (valid.canCheck) return makeAction('check');
        }
        if (valid.canCheck) return makeAction('check');
        return safeFold();
      }
      case 5:
      default:
        // Trash — fold unless we can check for free
        if (valid.canCheck) return makeAction('check');
        return safeFold();
    }
  }

  // ─── Post-flop decision ──────────────────────────────────────────────────
  const strength = assessPostFlop(player.holeCards, state.communityCards);
  const potOdds  = getPotOdds(valid.callAmount, state.pot);

  switch (strength) {
    case 'strong': {
      // Bet or raise aggressively
      if (valid.canRaise && roll(profile.aggression)) {
        const raiseAmount = Math.min(
          Math.max(valid.minRaise, Math.floor(state.pot * 0.67)),
          valid.maxRaise,
        );
        return makeAction('raise', raiseAmount);
      }
      if (valid.canCall) return makeAction('call', valid.callAmount);
      if (valid.canCheck) {
        // Bet ~2/3 pot (represented as a raise from 0)
        if (valid.canRaise && roll(profile.cBetFrequency)) {
          const betAmount = Math.min(
            Math.max(valid.minRaise, Math.floor(state.pot * 0.67)),
            valid.maxRaise,
          );
          return makeAction('raise', betAmount);
        }
        return makeAction('check');
      }
      return makeAction('call', valid.callAmount);
    }

    case 'medium': {
      // Call if pot odds are acceptable; occasional bluff raise
      if (valid.canCheck) {
        if (valid.canRaise && roll(profile.cBetFrequency * 0.5)) {
          const betAmount = Math.min(
            Math.max(valid.minRaise, Math.floor(state.pot * 0.5)),
            valid.maxRaise,
          );
          return makeAction('raise', betAmount);
        }
        return makeAction('check');
      }
      // Pot odds: call if getting >25% equity (calling 1 to win 3+)
      if (potOdds < 0.3 && valid.canCall) return makeAction('call', valid.callAmount);
      if (valid.canRaise && roll(profile.bluffFrequency * 0.3)) {
        return makeAction('raise', Math.min(valid.minRaise, valid.maxRaise));
      }
      return safeFold();
    }

    case 'weak':
    default: {
      // Check if free, fold if bet, occasionally bluff
      if (valid.canCheck) {
        if (valid.canRaise && roll(profile.bluffFrequency)) {
          const betAmount = Math.min(
            Math.max(valid.minRaise, Math.floor(state.pot * 0.5)),
            valid.maxRaise,
          );
          return makeAction('raise', betAmount);
        }
        return makeAction('check');
      }
      // Fold most of the time; occasionally float
      if (potOdds < 0.15 && valid.canCall && roll(20)) {
        return makeAction('call', valid.callAmount);
      }
      return safeFold();
    }
  }
}
