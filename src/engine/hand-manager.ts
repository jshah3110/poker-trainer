import type { Card, HandState, HandResult, Player, GameConfig, Action, Street, PlayerId } from '../types';
import { createDeck, shuffleDeck, dealCards } from './deck';
import { evaluateHand, compareHands } from './evaluator';
import { isStreetComplete } from './betting';

const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river'];

/**
 * Initialize a new hand with shuffled deck and dealt hole cards.
 * For heads-up: dealer posts SB, other player posts BB. Dealer acts first preflop.
 */
export function startNewHand(
  players: Player[],
  config: GameConfig,
  dealerIndex: number,
  handId: string,
  riggedDeck?: Card[] // optional for sandbox mode
): { handState: HandState; playerChipChanges: Record<PlayerId, number> } {
  const deck = riggedDeck ? [...riggedDeck] : shuffleDeck(createDeck());

  const playerCount = players.length;
  const sbIndex = playerCount === 2 ? dealerIndex : (dealerIndex + 1) % playerCount;
  const bbIndex = playerCount === 2 ? (dealerIndex + 1) % playerCount : (dealerIndex + 2) % playerCount;

  // Deal hole cards (2 per player), starting left of dealer
  let remaining = deck;
  const chipChanges: Record<PlayerId, number> = {};

  // Deal 2 cards to each player
  for (const player of players) {
    const [holeCards, rest] = dealCards(remaining, 2);
    player.holeCards = holeCards;
    remaining = rest;
  }

  // Post blinds
  const sbPlayer = players[sbIndex];
  const bbPlayer = players[bbIndex];
  const sbAmount = Math.min(config.smallBlind, sbPlayer.chips);
  const bbAmount = Math.min(config.bigBlind, bbPlayer.chips);

  chipChanges[sbPlayer.id] = sbAmount;
  chipChanges[bbPlayer.id] = bbAmount;

  const streetInvestments: Record<PlayerId, number> = {};
  const totalInvestments: Record<PlayerId, number> = {};
  for (const player of players) {
    streetInvestments[player.id] = 0;
    totalInvestments[player.id] = 0;
  }
  streetInvestments[sbPlayer.id] = sbAmount;
  streetInvestments[bbPlayer.id] = bbAmount;
  totalInvestments[sbPlayer.id] = sbAmount;
  totalInvestments[bbPlayer.id] = bbAmount;

  // Pre-flop: action starts with player after BB (in heads-up, that's the dealer/SB)
  const firstToAct = playerCount === 2 ? dealerIndex : (bbIndex + 1) % playerCount;

  const allInPlayers: PlayerId[] = [];
  if (sbAmount === sbPlayer.chips) allInPlayers.push(sbPlayer.id);
  if (bbAmount === bbPlayer.chips) allInPlayers.push(bbPlayer.id);

  const handState: HandState = {
    handId,
    street: 'preflop',
    communityCards: [],
    deck: remaining,
    pot: sbAmount + bbAmount,
    sidePots: [],
    actions: { preflop: [], flop: [], turn: [], river: [] },
    dealerIndex,
    activePlayerIndex: firstToAct,
    currentBet: bbAmount,
    minRaise: config.bigBlind, // min raise size is 1 BB preflop
    activePlayers: players.map(p => p.id),
    allInPlayers,
    streetInvestments,
    totalInvestments,
    isComplete: false,
    results: null,
  };

  return { handState, playerChipChanges: chipChanges };
}

/**
 * Advance to the next street. Deals community cards and resets betting.
 */
export function advanceStreet(state: HandState): HandState {
  const newState = structuredClone(state);
  const currentStreetIdx = STREET_ORDER.indexOf(state.street);

  if (currentStreetIdx >= 3) {
    // Already on river, shouldn't advance
    return newState;
  }

  const nextStreet = STREET_ORDER[currentStreetIdx + 1];
  let remaining = [...newState.deck];

  // Deal community cards
  if (nextStreet === 'flop') {
    // Burn 1, deal 3
    remaining = remaining.slice(1); // burn
    const [flop, rest] = dealCards(remaining, 3);
    newState.communityCards = flop;
    remaining = rest;
  } else if (nextStreet === 'turn' || nextStreet === 'river') {
    // Burn 1, deal 1
    remaining = remaining.slice(1); // burn
    const [card, rest] = dealCards(remaining, 1);
    newState.communityCards = [...newState.communityCards, ...card];
    remaining = rest;
  }

  newState.deck = remaining;
  newState.street = nextStreet;
  newState.currentBet = 0;
  newState.minRaise = 0; // will be set by config.bigBlind in the store

  // Reset street investments
  for (const playerId of newState.activePlayers) {
    newState.streetInvestments[playerId] = 0;
  }

  // Post-flop: first to act is first active player after dealer
  // In heads-up: BB (non-dealer) acts first post-flop
  const nonAllIn = newState.activePlayers.filter(id => !newState.allInPlayers.includes(id));
  if (nonAllIn.length > 0) {
    // Find the first active non-all-in player after the dealer
    // For heads-up, BB (non-dealer) acts first post-flop
    const dealerIdx = newState.dealerIndex;
    const numPlayers = newState.activePlayers.length; // total active
    // Start looking from position after dealer
    for (let offset = 1; offset <= numPlayers; offset++) {
      const checkIdx = (dealerIdx + offset) % 2; // heads-up: 0 or 1
      const playerId = newState.activePlayers.find((_, idx) => idx === checkIdx);
      if (playerId && !newState.allInPlayers.includes(playerId)) {
        newState.activePlayerIndex = checkIdx;
        break;
      }
    }
  } else {
    newState.activePlayerIndex = null; // all players are all-in
  }

  return newState;
}

/**
 * Determine the winners of a completed hand.
 */
export function determineWinners(
  state: HandState,
  players: Player[]
): HandResult[] {
  const activePlayers = players.filter(p => state.activePlayers.includes(p.id));

  // If only one player left (everyone else folded)
  if (activePlayers.length === 1) {
    return [{
      playerId: activePlayers[0].id,
      amountWon: state.pot,
      hand: null,
      holeCards: activePlayers[0].holeCards,
    }];
  }

  // Evaluate hands
  const evaluations = activePlayers.map(player => {
    const allCards = [...player.holeCards, ...state.communityCards];
    const evalResult = evaluateHand(allCards);
    return { player, evalResult };
  });

  // Sort by hand strength (best first)
  evaluations.sort((a, b) => compareHands(b.evalResult, a.evalResult));

  // Find winners (could be a tie)
  const bestScore = evaluations[0].evalResult.score;
  const winners = evaluations.filter(e => e.evalResult.score === bestScore);

  const winAmount = Math.floor(state.pot / winners.length);
  const remainder = state.pot - (winAmount * winners.length);

  const results: HandResult[] = evaluations.map((e, idx) => ({
    playerId: e.player.id,
    amountWon: winners.some(w => w.player.id === e.player.id)
      ? winAmount + (idx === 0 ? remainder : 0)
      : 0,
    hand: e.evalResult,
    holeCards: e.player.holeCards,
  }));

  return results;
}

/**
 * Check if the hand is completely over (all betting done or only one player left).
 */
export function isHandComplete(state: HandState): boolean {
  // Everyone folded but one
  if (state.activePlayers.length <= 1) return true;

  // On the river and street is complete
  if (state.street === 'river' && isStreetComplete(state)) return true;

  // All players are all-in
  const nonAllIn = state.activePlayers.filter(id => !state.allInPlayers.includes(id));
  if (nonAllIn.length <= 1 && isStreetComplete(state)) {
    // Need to run out remaining community cards, but betting is done
    // This will be handled by the store advancing streets without betting
    return state.street === 'river' || state.communityCards.length === 5;
  }

  return false;
}

/**
 * Get the next active player index (circular).
 */
export function getNextActivePlayer(
  state: HandState,
  currentIndex: number,
  players: Player[]
): number | null {
  const numPlayers = players.length;
  // Only check up to numPlayers-1 offsets so we never return the current player
  for (let offset = 1; offset < numPlayers; offset++) {
    const nextIdx = (currentIndex + offset) % numPlayers;
    const playerId = players[nextIdx]?.id;
    if (
      playerId &&
      state.activePlayers.includes(playerId) &&
      !state.allInPlayers.includes(playerId)
    ) {
      return nextIdx;
    }
  }
  return null; // no other active non-all-in players
}
