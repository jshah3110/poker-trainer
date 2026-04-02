import { describe, it, expect } from 'vitest';
import type { HandState, Action, Street } from '../../types';
import { getValidActions, applyAction, isStreetComplete } from '../betting';

function makeHandState(overrides: Partial<HandState> = {}): HandState {
  return {
    handId: 'test-hand-1',
    street: 'preflop' as Street,
    communityCards: [],
    deck: [],
    pot: 15,
    sidePots: [],
    actions: { preflop: [], flop: [], turn: [], river: [] },
    dealerIndex: 0,
    activePlayerIndex: 0,
    currentBet: 10,
    minRaise: 10,
    activePlayers: ['player1', 'player2'],
    allInPlayers: [],
    streetInvestments: { player1: 5, player2: 10 },
    totalInvestments: { player1: 5, player2: 10 },
    isComplete: false,
    results: null,
    ...overrides,
  };
}

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    playerId: 'player1',
    type: 'check',
    amount: 0,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('getValidActions', () => {
  it('returns correct options when facing a bet', () => {
    const state = makeHandState({
      currentBet: 10,
      streetInvestments: { player1: 5, player2: 10 },
      minRaise: 10,
    });
    const actions = getValidActions(state, 'player1', 100);

    expect(actions.canFold).toBe(true);
    expect(actions.canCheck).toBe(false);
    expect(actions.canCall).toBe(true);
    expect(actions.callAmount).toBe(5); // 10 - 5 = 5 to call
    expect(actions.canRaise).toBe(true);
    expect(actions.minRaise).toBe(15); // currentBet(10) + minRaise(10) - invested(5) = 15
    expect(actions.maxRaise).toBe(100);
  });

  it('check is valid when no bet is pending', () => {
    const state = makeHandState({
      currentBet: 0,
      streetInvestments: { player1: 0, player2: 0 },
      minRaise: 10,
    });
    const actions = getValidActions(state, 'player1', 100);

    expect(actions.canCheck).toBe(true);
    expect(actions.canCall).toBe(false);
    expect(actions.callAmount).toBe(0);
  });

  it('fold is always valid', () => {
    // With a bet pending
    const state1 = makeHandState({ currentBet: 20 });
    expect(getValidActions(state1, 'player1', 100).canFold).toBe(true);

    // With no bet pending
    const state2 = makeHandState({ currentBet: 0, streetInvestments: { player1: 0, player2: 0 } });
    expect(getValidActions(state2, 'player1', 100).canFold).toBe(true);

    // When short stacked
    const state3 = makeHandState({ currentBet: 50 });
    expect(getValidActions(state3, 'player1', 3).canFold).toBe(true);
  });

  it('all-in when short stacked', () => {
    const state = makeHandState({
      currentBet: 100,
      streetInvestments: { player1: 0, player2: 100 },
      minRaise: 100,
    });
    // Player only has 30 chips, can't afford the 100 call
    const actions = getValidActions(state, 'player1', 30);

    expect(actions.canFold).toBe(true);
    expect(actions.canCheck).toBe(false);
    // Can call as all-in
    expect(actions.canCall).toBe(true);
    expect(actions.callAmount).toBe(30); // all chips
    expect(actions.canRaise).toBe(false);
  });
});

describe('applyAction', () => {
  it('fold removes player from active', () => {
    const state = makeHandState();
    const action = makeAction({ playerId: 'player1', type: 'fold', amount: 0 });
    const { newState } = applyAction(state, action, 100);

    expect(newState.activePlayers).not.toContain('player1');
    expect(newState.activePlayers).toContain('player2');
    expect(newState.actions.preflop).toHaveLength(1);
    expect(newState.actions.preflop[0].type).toBe('fold');
  });

  it('call adds correct chips to pot', () => {
    const state = makeHandState({
      pot: 15,
      currentBet: 10,
      streetInvestments: { player1: 5, player2: 10 },
      totalInvestments: { player1: 5, player2: 10 },
    });
    const action = makeAction({ playerId: 'player1', type: 'call', amount: 5 });
    const { newState, chipChange } = applyAction(state, action, 100);

    expect(chipChange).toBe(5);
    expect(newState.pot).toBe(20);
    expect(newState.streetInvestments.player1).toBe(10);
    expect(newState.totalInvestments.player1).toBe(10);
  });

  it('raise updates currentBet and pot', () => {
    const state = makeHandState({
      pot: 15,
      currentBet: 10,
      minRaise: 10,
      streetInvestments: { player1: 5, player2: 10 },
      totalInvestments: { player1: 5, player2: 10 },
    });
    // Player1 raises: puts in 25 chips total (invested 5, now raising to 30 total street)
    const action = makeAction({ playerId: 'player1', type: 'raise', amount: 25 });
    const { newState, chipChange } = applyAction(state, action, 100);

    expect(chipChange).toBe(25);
    expect(newState.pot).toBe(40); // 15 + 25
    expect(newState.currentBet).toBe(30); // invested(5) + chipChange(25)
    expect(newState.streetInvestments.player1).toBe(30);
  });

  it('all-in tracks player in allInPlayers', () => {
    const state = makeHandState({
      pot: 15,
      currentBet: 10,
      streetInvestments: { player1: 5, player2: 10 },
      totalInvestments: { player1: 5, player2: 10 },
    });
    const action = makeAction({ playerId: 'player1', type: 'all-in', amount: 50 });
    const { newState, chipChange } = applyAction(state, action, 50);

    expect(chipChange).toBe(50);
    expect(newState.allInPlayers).toContain('player1');
    expect(newState.pot).toBe(65); // 15 + 50
    expect(newState.streetInvestments.player1).toBe(55); // 5 + 50
  });
});

describe('isStreetComplete', () => {
  it('returns false when player has not acted', () => {
    const state = makeHandState({
      currentBet: 10,
      streetInvestments: { player1: 5, player2: 10 },
      actions: { preflop: [], flop: [], turn: [], river: [] },
    });

    expect(isStreetComplete(state)).toBe(false);
  });

  it('returns true when all players have acted and matched', () => {
    const state = makeHandState({
      currentBet: 10,
      streetInvestments: { player1: 10, player2: 10 },
      actions: {
        preflop: [
          makeAction({ playerId: 'player1', type: 'call', amount: 5 }),
          makeAction({ playerId: 'player2', type: 'check', amount: 0 }),
        ],
        flop: [],
        turn: [],
        river: [],
      },
    });

    expect(isStreetComplete(state)).toBe(true);
  });

  it('returns true when only one active player remains', () => {
    const state = makeHandState({
      activePlayers: ['player2'],
    });

    expect(isStreetComplete(state)).toBe(true);
  });

  it('returns true when all active players are all-in', () => {
    const state = makeHandState({
      activePlayers: ['player1', 'player2'],
      allInPlayers: ['player1', 'player2'],
    });

    expect(isStreetComplete(state)).toBe(true);
  });

  it('returns false when investments are not equal', () => {
    const state = makeHandState({
      currentBet: 20,
      streetInvestments: { player1: 10, player2: 20 },
      actions: {
        preflop: [
          makeAction({ playerId: 'player1', type: 'call', amount: 5 }),
          makeAction({ playerId: 'player2', type: 'raise', amount: 10 }),
        ],
        flop: [],
        turn: [],
        river: [],
      },
    });

    expect(isStreetComplete(state)).toBe(false);
  });
});
