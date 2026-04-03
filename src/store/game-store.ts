import { create } from 'zustand';
import type { GameSession, GameConfig, Player, ActionType } from '../types';
import { startNewHand, advanceStreet, determineWinners, isHandComplete, getNextActivePlayer } from '../engine/hand-manager';
import { applyAction, isStreetComplete, getValidActions } from '../engine/betting';
import type { ValidActions } from '../engine/betting';
import { botDecide } from '../ai/heuristic-bot';
import { getProfile } from '../ai/bot-profiles';

const DEFAULT_CONFIG: GameConfig = {
  smallBlind: 1,
  bigBlind: 2,
  startingStack: 200,
  maxPlayers: 2,
  autoAdvance: true,
  autoAdvanceDelay: 1800,
};

const HERO_ID = 'hero';
const BOT_ID  = 'bot';

function makePlayers(config: GameConfig): Player[] {
  return [
    {
      id: HERO_ID,
      name: 'You',
      type: 'human',
      chips: config.startingStack,
      holeCards: [],
      seatIndex: 0,
      isSittingOut: false,
      botProfileId: null,
    },
    {
      id: BOT_ID,
      name: 'Alex (TAG)',
      type: 'bot',
      chips: config.startingStack,
      holeCards: [],
      seatIndex: 1,
      isSittingOut: false,
      botProfileId: 'tag',
    },
  ];
}

interface GameStore {
  session: GameSession | null;
  validActions: ValidActions | null;
  isAnimating: boolean;
  showResult: boolean;
  resultDismissed: boolean;
  isBotThinking: boolean;

  // Public actions
  startSession: (config?: Partial<GameConfig>) => void;
  startHand: () => void;
  playerAction: (type: ActionType, amount?: number) => void;
  dismissResult: () => void;
  resetSession: () => void;

  // Internal helpers (prefixed _ to signal private-by-convention)
  _advanceGame: () => void;
  _updateActiveAndValidActions: () => void;
  _triggerBotTurn: () => Promise<void>;
  _finaliseHand: () => void;
}

let handCounter = 0;
function newHandId() { return `hand-${++handCounter}-${Date.now()}`; }

export const useGameStore = create<GameStore>((set, get) => ({
  session: null,
  validActions: null,
  isAnimating: false,
  showResult: false,
  resultDismissed: false,
  isBotThinking: false,

  startSession(configOverrides = {}) {
    const config = { ...DEFAULT_CONFIG, ...configOverrides };
    const players = makePlayers(config);
    const session: GameSession = {
      sessionId: `session-${Date.now()}`,
      startedAt: Date.now(),
      config,
      players,
      handsPlayed: 0,
      currentHand: null,
    };
    set({ session, showResult: false, resultDismissed: false });
    // Auto-start first hand
    setTimeout(() => get().startHand(), 100);
  },

  startHand() {
    const { session } = get();
    if (!session) return;

    // Check if either player is bust — rebuy if needed
    const players = session.players.map(p => ({
      ...p,
      chips: p.chips <= 0 ? session.config.startingStack : p.chips,
      holeCards: [],
    }));

    const dealerIndex = session.handsPlayed % 2; // alternate dealer
    const { handState, playerChipChanges } = startNewHand(
      players,
      session.config,
      dealerIndex,
      newHandId(),
    );

    // Deduct blinds from player chip counts
    const updatedPlayers = players.map(p => ({
      ...p,
      holeCards: handState.deck.length > 0
        ? players.find(pp => pp.id === p.id)?.holeCards ?? []
        : p.holeCards,
      chips: p.chips - (playerChipChanges[p.id] ?? 0),
    }));

    // Sync hole cards from handState back to players
    // (startNewHand mutates player.holeCards in-place, so grab them)
    const playersWithCards = updatedPlayers.map((p, idx) => ({
      ...p,
      holeCards: players[idx]?.holeCards ?? [],
    }));

    const newSession: GameSession = {
      ...session,
      players: playersWithCards,
      handsPlayed: session.handsPlayed + 1,
      currentHand: handState,
    };

    // Compute valid actions for the active player
    const activeIdx = handState.activePlayerIndex;
    const activePlayer = activeIdx !== null ? playersWithCards[activeIdx] : null;
    const validActions = activePlayer?.type === 'human'
      ? getValidActions(handState, activePlayer.id, activePlayer.chips)
      : null;

    set({
      session: newSession,
      validActions,
      showResult: false,
      resultDismissed: false,
      isBotThinking: false,
    });

    // If bot acts first (it's the SB/dealer preflop in heads-up), trigger bot turn
    if (activePlayer?.type === 'bot') {
      get()._triggerBotTurn();
    }
  },

  playerAction(type, amount = 0) {
    const { session } = get();
    if (!session?.currentHand) return;

    const hand = session.currentHand;
    const activeIdx = hand.activePlayerIndex;
    if (activeIdx === null) return;

    const player = session.players[activeIdx];
    if (!player || player.type !== 'human') return;

    // Haptic feedback: medium vibration on action
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    const action = { playerId: player.id, type, amount, timestamp: Date.now() };
    const { newState, chipChange } = applyAction(hand, action, player.chips);

    const updatedPlayers = session.players.map(p =>
      p.id === player.id ? { ...p, chips: p.chips - chipChange } : p
    );

    set({ session: { ...session, players: updatedPlayers, currentHand: newState } });
    get()._advanceGame();
  },

  dismissResult() {
    set({ showResult: false, resultDismissed: true });
    setTimeout(() => get().startHand(), 400);
  },

  resetSession() {
    set({ session: null, validActions: null, showResult: false, resultDismissed: false });
  },

  // ─── Internal helpers (not exposed in type but accessible via get()) ────

  _advanceGame() {
    const { session } = get();
    if (!session?.currentHand) return;

    let hand = session.currentHand;
    let players = session.players;

    // ── Hand complete (fold or all cards dealt) ───────────────────────────
    if (isHandComplete(hand)) {
      get()._finaliseHand();
      return;
    }

    // ── Street complete → advance to next street ──────────────────────────
    if (isStreetComplete(hand)) {
      // All-in runout: advance streets without waiting for actions
      const nonAllIn = hand.activePlayers.filter(id => !hand.allInPlayers.includes(id));
      const isAllInRunout = nonAllIn.length <= 1;

      hand = advanceStreet(hand);
      // Reset minRaise to bigBlind on new streets
      hand = { ...hand, minRaise: session.config.bigBlind };

      set({ session: { ...session, currentHand: hand } });

      if (isHandComplete(hand)) {
        get()._finaliseHand();
        return;
      }

      if (isAllInRunout) {
        // Keep advancing streets automatically until river
        setTimeout(() => get()._advanceGame(), 600);
        return;
      }

      // Find who acts first on new street and update valid actions
      get()._updateActiveAndValidActions();
      return;
    }

    // ── Same street — move to next player ─────────────────────────────────
    const currentIdx = hand.activePlayerIndex ?? 0;
    const nextIdx = getNextActivePlayer(hand, currentIdx, players);

    if (nextIdx === null) {
      // No more players to act — street should be complete, but guard here
      if (isStreetComplete(hand)) {
        get()._advanceGame();
      }
      return;
    }

    const updatedHand = { ...hand, activePlayerIndex: nextIdx };
    const nextPlayer = players[nextIdx]!;
    const validActions = nextPlayer.type === 'human'
      ? getValidActions(updatedHand, nextPlayer.id, nextPlayer.chips)
      : null;

    set({ session: { ...session, currentHand: updatedHand }, validActions });

    if (nextPlayer.type === 'bot') {
      get()._triggerBotTurn();
    }
  },

  _updateActiveAndValidActions() {
    const { session } = get();
    if (!session?.currentHand) return;

    const hand = session.currentHand;
    const activeIdx = hand.activePlayerIndex;
    if (activeIdx === null) return;

    const activePlayer = session.players[activeIdx];
    if (!activePlayer) return;

    const validActions = activePlayer.type === 'human'
      ? getValidActions(hand, activePlayer.id, activePlayer.chips)
      : null;

    // Haptic feedback: small vibration when it's player's turn
    if (activePlayer.type === 'human' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }

    set({ validActions });

    if (activePlayer.type === 'bot') {
      get()._triggerBotTurn();
    }
  },

  async _triggerBotTurn() {
    const { session } = get();
    if (!session?.currentHand) return;

    const hand = session.currentHand;
    const activeIdx = hand.activePlayerIndex;
    if (activeIdx === null) return;

    const botPlayer = session.players[activeIdx];
    if (!botPlayer || botPlayer.type !== 'bot' || !botPlayer.botProfileId) return;

    set({ isBotThinking: true });

    const profile = getProfile(botPlayer.botProfileId);
    const delay = 600 + Math.random() * 900; // 600–1500ms thinking time

    await new Promise(r => setTimeout(r, delay));

    // Re-read fresh state after delay (player may have acted in the meantime)
    const { session: freshSession } = get();
    if (!freshSession?.currentHand) return;
    const freshHand = freshSession.currentHand;
    if (freshHand.activePlayerIndex !== activeIdx) return; // stale

    const action = await botDecide(freshHand, botPlayer, profile);
    const { newState, chipChange } = applyAction(freshHand, action, botPlayer.chips);

    const updatedPlayers = freshSession.players.map(p =>
      p.id === botPlayer.id ? { ...p, chips: p.chips - chipChange } : p
    );

    set({
      session: { ...freshSession, players: updatedPlayers, currentHand: newState },
      isBotThinking: false,
    });

    get()._advanceGame();
  },

  _finaliseHand() {
    const { session } = get();
    if (!session?.currentHand) return;

    // Run out any remaining community cards for all-in situations
    let hand = session.currentHand;
    while (hand.communityCards.length < 5 && hand.activePlayers.length > 1) {
      hand = advanceStreet(hand);
    }

    const results = determineWinners(hand, session.players);
    const completedHand = { ...hand, isComplete: true, results };

    // Apply chip winnings
    const updatedPlayers = session.players.map(p => {
      const result = results.find(r => r.playerId === p.id);
      return result ? { ...p, chips: p.chips + result.amountWon } : p;
    });

    // Haptic feedback: stronger vibration on win, weaker on loss
    const heroResult = results.find(r => r.playerId === HERO_ID);
    const heroWon = (heroResult?.amountWon ?? 0) > 0;
    if ('vibrate' in navigator) {
      if (heroWon) {
        // Win pattern: triple tap
        navigator.vibrate([100, 50, 100]);
      } else {
        // Loss pattern: single tap
        navigator.vibrate(75);
      }
    }

    set({
      session: { ...session, players: updatedPlayers, currentHand: completedHand },
      showResult: true,
      validActions: null,
    });
  },
}));

export { HERO_ID, BOT_ID };
