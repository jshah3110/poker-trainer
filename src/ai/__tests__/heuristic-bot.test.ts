import { describe, it, expect } from 'vitest';
import { getHandTier } from '../heuristic-bot';
import { botDecide } from '../heuristic-bot';
import { TAG_PROFILE } from '../bot-profiles';
import type { Card, HandState, Player } from '../../types';

function c(str: string): Card {
  return { rank: str[0] as Card['rank'], suit: str[1] as Card['suit'] };
}

// ─── getHandTier ───────────────────────────────────────────────────────────

describe('getHandTier', () => {
  it('classifies AA as tier 1', () => {
    expect(getHandTier([c('Ah'), c('Ad')])).toBe(1);
  });
  it('classifies KK as tier 1', () => {
    expect(getHandTier([c('Kh'), c('Kd')])).toBe(1);
  });
  it('classifies QQ as tier 1', () => {
    expect(getHandTier([c('Qh'), c('Qd')])).toBe(1);
  });
  it('classifies AKs as tier 1', () => {
    expect(getHandTier([c('Ah'), c('Kh')])).toBe(1);
  });
  it('classifies AKo as tier 1', () => {
    expect(getHandTier([c('Ah'), c('Kd')])).toBe(1);
  });
  it('classifies JJ as tier 2', () => {
    expect(getHandTier([c('Jh'), c('Jd')])).toBe(2);
  });
  it('classifies TT as tier 2', () => {
    expect(getHandTier([c('Th'), c('Td')])).toBe(2);
  });
  it('classifies AQo as tier 2', () => {
    expect(getHandTier([c('Ah'), c('Qd')])).toBe(2);
  });
  it('classifies 99 as tier 3', () => {
    expect(getHandTier([c('9h'), c('9d')])).toBe(3);
  });
  it('classifies 77 as tier 3', () => {
    expect(getHandTier([c('7h'), c('7d')])).toBe(3);
  });
  it('classifies A2s as tier 3', () => {
    expect(getHandTier([c('Ah'), c('2h')])).toBe(3);
  });
  it('classifies 55 as tier 4', () => {
    expect(getHandTier([c('5h'), c('5d')])).toBe(4);
  });
  it('classifies 76s as tier 4', () => {
    expect(getHandTier([c('7h'), c('6h')])).toBe(4);
  });
  it('classifies 72o as tier 5', () => {
    expect(getHandTier([c('7h'), c('2d')])).toBe(5);
  });
  it('classifies 83o as tier 5', () => {
    expect(getHandTier([c('8h'), c('3d')])).toBe(5);
  });
});

// ─── botDecide: action legality ────────────────────────────────────────────

function makeHandState(overrides: Partial<HandState> = {}): HandState {
  return {
    handId: 'test-hand',
    street: 'preflop',
    communityCards: [],
    deck: [],
    pot: 3,
    sidePots: [],
    actions: { preflop: [], flop: [], turn: [], river: [] },
    dealerIndex: 0,
    activePlayerIndex: 0,
    currentBet: 2,
    minRaise: 2,
    activePlayers: ['bot', 'hero'],
    allInPlayers: [],
    streetInvestments: { bot: 1, hero: 2 },
    totalInvestments: { bot: 1, hero: 2 },
    isComplete: false,
    results: null,
    ...overrides,
  };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'bot',
    name: 'Bot',
    type: 'bot',
    chips: 100,
    holeCards: [c('Ah'), c('Ad')],
    seatIndex: 0,
    isSittingOut: false,
    botProfileId: 'tag',
    ...overrides,
  };
}

describe('botDecide action validity', () => {
  it('returns a valid action type', async () => {
    const validTypes = ['fold', 'check', 'call', 'raise', 'all-in'];
    const player = makePlayer();
    const state = makeHandState();
    const action = await botDecide(state, player, TAG_PROFILE);
    expect(validTypes).toContain(action.type);
  });

  it('always sets playerId correctly', async () => {
    const player = makePlayer({ id: 'the-bot' });
    const state  = makeHandState({ streetInvestments: { 'the-bot': 1, hero: 2 }, totalInvestments: { 'the-bot': 1, hero: 2 }, activePlayers: ['the-bot', 'hero'] });
    const action = await botDecide(state, player, TAG_PROFILE);
    expect(action.playerId).toBe('the-bot');
  });

  it('never returns an action with a negative amount', async () => {
    const player = makePlayer();
    const state  = makeHandState();
    const action = await botDecide(state, player, TAG_PROFILE);
    expect(action.amount).toBeGreaterThanOrEqual(0);
  });

  it('folds trash hands preflop when facing a bet (72o)', async () => {
    const player = makePlayer({ holeCards: [c('7h'), c('2d')], chips: 100 });
    const state  = makeHandState({ currentBet: 20 });
    // Run many times — trash should fold the majority
    let folds = 0;
    for (let i = 0; i < 50; i++) {
      const action = await botDecide(state, player, TAG_PROFILE);
      if (action.type === 'fold') folds++;
    }
    expect(folds).toBeGreaterThan(35); // >70% fold rate with trash vs big bet
  });

  it('raises premium hands preflop the majority of the time (AA)', async () => {
    const player = makePlayer({ holeCards: [c('Ah'), c('Ad')], chips: 100 });
    const state  = makeHandState({ currentBet: 2, streetInvestments: { bot: 1, hero: 2 } });
    let raises = 0;
    for (let i = 0; i < 20; i++) {
      const action = await botDecide(state, player, TAG_PROFILE);
      if (action.type === 'raise' || action.type === 'all-in') raises++;
    }
    expect(raises).toBeGreaterThan(14); // >70% raise rate with AA
  });

  it('can check when no bet is pending', async () => {
    const player = makePlayer({ holeCards: [c('Ah'), c('Ad')] });
    const state  = makeHandState({
      street: 'flop',
      communityCards: [c('Kh'), c('Qd'), c('Jc')],
      currentBet: 0,
      streetInvestments: { bot: 0, hero: 0 },
    });
    // Bot should sometimes check (or raise, but never fold when check is free)
    let folds = 0;
    for (let i = 0; i < 20; i++) {
      const action = await botDecide(state, player, TAG_PROFILE);
      if (action.type === 'fold') folds++;
    }
    expect(folds).toBe(0); // never fold when check is free
  });

  it('does not call with a raise amount exceeding chips', async () => {
    const player = makePlayer({ chips: 10, holeCards: [c('Ah'), c('Ad')] });
    const state  = makeHandState({ currentBet: 5, streetInvestments: { bot: 0, hero: 5 } });
    const action = await botDecide(state, player, TAG_PROFILE);
    if (action.type === 'raise') {
      expect(action.amount).toBeLessThanOrEqual(player.chips);
    }
  });
});
