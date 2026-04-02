import { describe, it, expect } from 'vitest';
import type { Card, HandState, Player, GameConfig, Street } from '../../types';
import {
  startNewHand,
  advanceStreet,
  determineWinners,
  isHandComplete,
  getNextActivePlayer,
} from '../hand-manager';

// --- Helpers ---

function makeCard(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player1',
    name: 'Player 1',
    type: 'human',
    chips: 1000,
    holeCards: [],
    seatIndex: 0,
    isSittingOut: false,
    botProfileId: null,
    ...overrides,
  };
}

function makePlayers(): Player[] {
  return [
    makePlayer({ id: 'player1', name: 'Player 1', seatIndex: 0 }),
    makePlayer({ id: 'player2', name: 'Player 2', seatIndex: 1 }),
  ];
}

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    smallBlind: 5,
    bigBlind: 10,
    startingStack: 1000,
    maxPlayers: 2,
    autoAdvance: false,
    autoAdvanceDelay: 0,
    ...overrides,
  };
}

function makeRiggedDeck(): Card[] {
  // Build a known 52-card deck for deterministic tests
  const suits: Card['suit'][] = ['h', 'd', 'c', 's'];
  const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(makeCard(rank, suit));
    }
  }
  return deck;
}

function makeHandState(overrides: Partial<HandState> = {}): HandState {
  return {
    handId: 'test-hand-1',
    street: 'preflop' as Street,
    communityCards: [],
    deck: makeRiggedDeck().slice(4), // remove 4 dealt cards
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

// --- Tests ---

describe('startNewHand', () => {
  it('deals 2 cards per player', () => {
    const players = makePlayers();
    const config = makeConfig();
    const deck = makeRiggedDeck();

    const { handState } = startNewHand(players, config, 0, 'hand-1', deck);

    // Each player should have 2 hole cards
    expect(players[0].holeCards).toHaveLength(2);
    expect(players[1].holeCards).toHaveLength(2);
    // Deck should be reduced by 4 cards
    expect(handState.deck).toHaveLength(48);
  });

  it('posts correct blinds', () => {
    const players = makePlayers();
    const config = makeConfig({ smallBlind: 5, bigBlind: 10 });
    const deck = makeRiggedDeck();

    // Dealer is index 0, so in heads-up: player1 (dealer) posts SB, player2 posts BB
    const { handState, playerChipChanges } = startNewHand(players, config, 0, 'hand-1', deck);

    expect(playerChipChanges['player1']).toBe(5);  // SB
    expect(playerChipChanges['player2']).toBe(10); // BB
    expect(handState.pot).toBe(15);
    expect(handState.currentBet).toBe(10);
    expect(handState.streetInvestments['player1']).toBe(5);
    expect(handState.streetInvestments['player2']).toBe(10);
  });

  it('dealer acts first in heads-up preflop', () => {
    const players = makePlayers();
    const config = makeConfig();
    const deck = makeRiggedDeck();

    // Dealer index 0 should act first preflop in heads-up
    const { handState } = startNewHand(players, config, 0, 'hand-1', deck);
    expect(handState.activePlayerIndex).toBe(0);

    // With dealer index 1
    const players2 = makePlayers();
    const { handState: hs2 } = startNewHand(players2, config, 1, 'hand-2', deck);
    expect(hs2.activePlayerIndex).toBe(1);
  });

  it('tracks all-in when blind exceeds chip count', () => {
    const players = [
      makePlayer({ id: 'player1', chips: 3 }), // can't cover SB of 5
      makePlayer({ id: 'player2', chips: 1000 }),
    ];
    const config = makeConfig({ smallBlind: 5, bigBlind: 10 });
    const deck = makeRiggedDeck();

    const { handState } = startNewHand(players, config, 0, 'hand-1', deck);

    expect(handState.allInPlayers).toContain('player1');
    expect(handState.streetInvestments['player1']).toBe(3);
  });
});

describe('advanceStreet', () => {
  it('deals 3 cards on flop', () => {
    const state = makeHandState({ street: 'preflop', communityCards: [] });
    const newState = advanceStreet(state);

    expect(newState.street).toBe('flop');
    expect(newState.communityCards).toHaveLength(3);
  });

  it('deals 1 card on turn', () => {
    const flopCards = [makeCard('A', 'h'), makeCard('K', 'h'), makeCard('Q', 'h')];
    const state = makeHandState({ street: 'flop', communityCards: flopCards });
    const newState = advanceStreet(state);

    expect(newState.street).toBe('turn');
    expect(newState.communityCards).toHaveLength(4);
    // First 3 should be the flop cards
    expect(newState.communityCards.slice(0, 3)).toEqual(flopCards);
  });

  it('deals 1 card on river', () => {
    const turnCards = [
      makeCard('A', 'h'), makeCard('K', 'h'),
      makeCard('Q', 'h'), makeCard('J', 'h'),
    ];
    const state = makeHandState({ street: 'turn', communityCards: turnCards });
    const newState = advanceStreet(state);

    expect(newState.street).toBe('river');
    expect(newState.communityCards).toHaveLength(5);
    expect(newState.communityCards.slice(0, 4)).toEqual(turnCards);
  });

  it('resets street investments to 0', () => {
    const state = makeHandState({
      street: 'preflop',
      streetInvestments: { player1: 50, player2: 50 },
    });
    const newState = advanceStreet(state);

    expect(newState.streetInvestments['player1']).toBe(0);
    expect(newState.streetInvestments['player2']).toBe(0);
  });

  it('resets currentBet and minRaise to 0', () => {
    const state = makeHandState({
      street: 'preflop',
      currentBet: 40,
      minRaise: 20,
    });
    const newState = advanceStreet(state);

    expect(newState.currentBet).toBe(0);
    expect(newState.minRaise).toBe(0);
  });

  it('does not advance past river', () => {
    const state = makeHandState({ street: 'river' });
    const newState = advanceStreet(state);

    expect(newState.street).toBe('river');
  });
});

describe('determineWinners', () => {
  it('single winner gets full pot', () => {
    // We need to mock evaluateHand/compareHands, but since we import real ones,
    // we give players actual cards and community cards for a real evaluation
    const players = [
      makePlayer({
        id: 'player1',
        holeCards: [makeCard('A', 'h'), makeCard('K', 'h')],
      }),
      makePlayer({
        id: 'player2',
        holeCards: [makeCard('2', 'c'), makeCard('7', 'd')],
      }),
    ];
    const state = makeHandState({
      pot: 100,
      activePlayers: ['player1', 'player2'],
      communityCards: [
        makeCard('A', 'd'), makeCard('K', 'd'),
        makeCard('A', 'c'), makeCard('3', 's'),
        makeCard('9', 'h'),
      ],
    });

    const results = determineWinners(state, players);

    // player1 has full house (AAA KK), player2 has pair of aces
    const winner = results.find(r => r.amountWon > 0);
    expect(winner).toBeDefined();
    expect(winner!.playerId).toBe('player1');
    expect(winner!.amountWon).toBe(100);
  });

  it('fold gives pot to remaining player', () => {
    const players = [
      makePlayer({ id: 'player1', holeCards: [makeCard('2', 'c'), makeCard('3', 'd')] }),
      makePlayer({ id: 'player2', holeCards: [makeCard('A', 'h'), makeCard('K', 'h')] }),
    ];
    // Only player2 remains (player1 folded)
    const state = makeHandState({
      pot: 50,
      activePlayers: ['player2'],
    });

    const results = determineWinners(state, players);

    expect(results).toHaveLength(1);
    expect(results[0].playerId).toBe('player2');
    expect(results[0].amountWon).toBe(50);
    expect(results[0].hand).toBeNull(); // no showdown
  });

  it('split pot on tie', () => {
    // Both players have the same hand via community cards
    const players = [
      makePlayer({
        id: 'player1',
        holeCards: [makeCard('2', 'c'), makeCard('3', 'd')],
      }),
      makePlayer({
        id: 'player2',
        holeCards: [makeCard('2', 'd'), makeCard('3', 'c')],
      }),
    ];
    // Board is AAKQJ - both play the board
    const state = makeHandState({
      pot: 100,
      activePlayers: ['player1', 'player2'],
      communityCards: [
        makeCard('A', 'h'), makeCard('A', 'd'),
        makeCard('K', 'h'), makeCard('Q', 'h'),
        makeCard('J', 'h'),
      ],
    });

    const results = determineWinners(state, players);

    const p1Result = results.find(r => r.playerId === 'player1');
    const p2Result = results.find(r => r.playerId === 'player2');
    expect(p1Result).toBeDefined();
    expect(p2Result).toBeDefined();
    // Each should get 50
    expect(p1Result!.amountWon + p2Result!.amountWon).toBe(100);
    expect(p1Result!.amountWon).toBeGreaterThan(0);
    expect(p2Result!.amountWon).toBeGreaterThan(0);
  });
});

describe('isHandComplete', () => {
  it('true when only 1 active player', () => {
    const state = makeHandState({
      activePlayers: ['player2'],
    });

    expect(isHandComplete(state)).toBe(true);
  });

  it('true when river betting is done', () => {
    const state = makeHandState({
      street: 'river',
      currentBet: 20,
      streetInvestments: { player1: 20, player2: 20 },
      actions: {
        preflop: [],
        flop: [],
        turn: [],
        river: [
          { playerId: 'player1', type: 'raise', amount: 20, timestamp: 1 },
          { playerId: 'player2', type: 'call', amount: 20, timestamp: 2 },
        ],
      },
    });

    expect(isHandComplete(state)).toBe(true);
  });

  it('false during preflop with pending action', () => {
    const state = makeHandState({
      street: 'preflop',
      activePlayers: ['player1', 'player2'],
      actions: { preflop: [], flop: [], turn: [], river: [] },
    });

    expect(isHandComplete(state)).toBe(false);
  });

  it('true when all players are all-in and community cards are dealt', () => {
    const state = makeHandState({
      street: 'river',
      activePlayers: ['player1', 'player2'],
      allInPlayers: ['player1', 'player2'],
      communityCards: [
        makeCard('A', 'h'), makeCard('K', 'h'),
        makeCard('Q', 'h'), makeCard('J', 'h'),
        makeCard('T', 'h'),
      ],
    });

    expect(isHandComplete(state)).toBe(true);
  });
});

describe('getNextActivePlayer', () => {
  it('wraps around correctly', () => {
    const players = makePlayers();
    const state = makeHandState({
      activePlayers: ['player1', 'player2'],
      allInPlayers: [],
    });

    // From player1 (index 0), next should be player2 (index 1)
    expect(getNextActivePlayer(state, 0, players)).toBe(1);

    // From player2 (index 1), next should be player1 (index 0) - wraps
    expect(getNextActivePlayer(state, 1, players)).toBe(0);
  });

  it('skips all-in players', () => {
    const players = [
      makePlayer({ id: 'player1', seatIndex: 0 }),
      makePlayer({ id: 'player2', seatIndex: 1 }),
    ];
    const state = makeHandState({
      activePlayers: ['player1', 'player2'],
      allInPlayers: ['player2'],
    });

    // From player1, player2 is all-in, so wraps back to... null (no other active non-all-in)
    // Actually player1 is the only non-all-in, so from player1 there's nobody else
    expect(getNextActivePlayer(state, 0, players)).toBeNull();
  });

  it('skips folded players', () => {
    const players = [
      makePlayer({ id: 'player1', seatIndex: 0 }),
      makePlayer({ id: 'player2', seatIndex: 1 }),
    ];
    const state = makeHandState({
      activePlayers: ['player2'], // player1 folded
      allInPlayers: [],
    });

    // From index 0 (player1, folded), next active is player2 at index 1
    expect(getNextActivePlayer(state, 0, players)).toBe(1);
  });

  it('returns null when no active non-all-in players exist', () => {
    const players = makePlayers();
    const state = makeHandState({
      activePlayers: ['player1', 'player2'],
      allInPlayers: ['player1', 'player2'],
    });

    expect(getNextActivePlayer(state, 0, players)).toBeNull();
  });
});
