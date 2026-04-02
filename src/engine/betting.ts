import type { HandState, Action, PlayerId } from '../types';

export interface ValidActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaise: number;
  maxRaise: number; // all-in amount
}

/**
 * Get the valid actions for a player given the current hand state.
 */
export function getValidActions(state: HandState, playerId: PlayerId, playerChips: number): ValidActions {
  const invested = state.streetInvestments[playerId] || 0;
  const toCall = state.currentBet - invested;
  const canAffordCall = playerChips >= toCall;

  const result: ValidActions = {
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0 && canAffordCall,
    callAmount: Math.min(toCall, playerChips),
    canRaise: false,
    minRaise: 0,
    maxRaise: playerChips,
  };

  // Min raise is the last raise size, or the big blind
  const minRaiseSize = state.minRaise;
  const minRaiseTotal = state.currentBet + minRaiseSize - invested;

  if (playerChips > toCall && playerChips >= minRaiseTotal) {
    result.canRaise = true;
    result.minRaise = minRaiseTotal;
    result.maxRaise = playerChips; // all-in
  }

  // If can't afford call, can only fold or go all-in
  if (!canAffordCall && playerChips > 0) {
    result.canCall = true; // all-in call
    result.callAmount = playerChips;
  }

  return result;
}

/**
 * Apply a player's action to the hand state. Returns new state (immutable).
 */
export function applyAction(
  state: HandState,
  action: Action,
  playerChips: number
): { newState: HandState; chipChange: number } {
  const newState = structuredClone(state);
  let chipChange = 0;

  // Record the action
  newState.actions[newState.street].push(action);

  switch (action.type) {
    case 'fold': {
      newState.activePlayers = newState.activePlayers.filter(id => id !== action.playerId);
      break;
    }
    case 'check': {
      // No chip change
      break;
    }
    case 'call': {
      const invested = state.streetInvestments[action.playerId] || 0;
      chipChange = Math.min(state.currentBet - invested, playerChips);
      newState.streetInvestments[action.playerId] = invested + chipChange;
      newState.totalInvestments[action.playerId] = (state.totalInvestments[action.playerId] || 0) + chipChange;
      newState.pot += chipChange;

      // Check if this is an all-in call
      if (chipChange === playerChips && chipChange < state.currentBet - invested) {
        if (!newState.allInPlayers.includes(action.playerId)) {
          newState.allInPlayers.push(action.playerId);
        }
      }
      break;
    }
    case 'raise': {
      const invested = state.streetInvestments[action.playerId] || 0;
      chipChange = action.amount; // amount is total chips player is putting in this action
      newState.streetInvestments[action.playerId] = invested + chipChange;
      newState.totalInvestments[action.playerId] = (state.totalInvestments[action.playerId] || 0) + chipChange;

      const newBet = invested + chipChange;
      const raiseSize = newBet - state.currentBet;
      newState.minRaise = Math.max(raiseSize, state.minRaise);
      newState.currentBet = newBet;
      newState.pot += chipChange;
      break;
    }
    case 'all-in': {
      const invested = state.streetInvestments[action.playerId] || 0;
      chipChange = playerChips; // put all remaining chips in
      newState.streetInvestments[action.playerId] = invested + chipChange;
      newState.totalInvestments[action.playerId] = (state.totalInvestments[action.playerId] || 0) + chipChange;

      const newBet = invested + chipChange;
      if (newBet > state.currentBet) {
        const raiseSize = newBet - state.currentBet;
        if (raiseSize >= state.minRaise) {
          newState.minRaise = raiseSize;
        }
        newState.currentBet = newBet;
      }
      newState.pot += chipChange;

      if (!newState.allInPlayers.includes(action.playerId)) {
        newState.allInPlayers.push(action.playerId);
      }
      break;
    }
  }

  return { newState, chipChange };
}

/**
 * Check if the current betting street is complete.
 * Street is complete when all active (non-all-in) players have acted and investments are equal.
 */
export function isStreetComplete(state: HandState): boolean {
  // Only one player left (everyone else folded)
  if (state.activePlayers.length <= 1) return true;

  // All active players are all-in
  const nonAllIn = state.activePlayers.filter(id => !state.allInPlayers.includes(id));
  if (nonAllIn.length === 0) return true;

  // If only one player is not all-in, and they've matched the bet, street is complete
  if (nonAllIn.length === 1) {
    const playerId = nonAllIn[0];
    const invested = state.streetInvestments[playerId] || 0;
    if (invested >= state.currentBet) {
      // Check they've had a chance to act
      const streetActions = state.actions[state.street];
      const playerActed = streetActions.some(a => a.playerId === playerId);
      if (playerActed) return true;
    }
  }

  // All non-all-in players must have acted and have equal investments
  const streetActions = state.actions[state.street];
  for (const playerId of nonAllIn) {
    const invested = state.streetInvestments[playerId] || 0;
    const playerActions = streetActions.filter(a => a.playerId === playerId);

    if (playerActions.length === 0) return false;
    if (invested < state.currentBet) return false;
  }

  return true;
}
