import { useGameStore, HERO_ID, BOT_ID } from '../store/game-store';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { ActionBar } from './ActionBar';
import { HandResult } from './HandResult';
import { ActionLog } from './ActionLog';

export function Table() {
  const { session, showResult, isBotThinking } = useGameStore(s => ({
    session: s.session,
    showResult: s.showResult,
    isBotThinking: s.isBotThinking,
  }));

  if (!session) return null;

  const hand   = session.currentHand;
  const hero   = session.players.find(p => p.id === HERO_ID)!;
  const bot    = session.players.find(p => p.id === BOT_ID)!;

  const heroIdx   = session.players.indexOf(hero);
  const botIdx    = session.players.indexOf(bot);
  const dealerIdx = hand?.dealerIndex ?? 0;

  const heroIsActive = hand?.activePlayerIndex === heroIdx && !hand?.isComplete;
  const botIsActive  = hand?.activePlayerIndex === botIdx  && !hand?.isComplete;

  const streetLabel = hand
    ? hand.street.charAt(0).toUpperCase() + hand.street.slice(1)
    : '';

  return (
    <div className="relative h-full flex flex-col bg-[var(--felt-dark)] overflow-hidden">

      {/* ── Top: opponent ──────────────────────────────────────────────── */}
      <div className="flex-none pt-safe pt-4 pb-2 flex flex-col items-center">
        <PlayerSeat
          player={bot}
          hand={hand}
          isDealer={dealerIdx === botIdx}
          isActive={botIsActive}
          isBot
          isBotThinking={isBotThinking}
        />
      </div>

      {/* ── Middle: felt area ──────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-2 mx-4 rounded-[40px] border-4"
        style={{
          background: 'radial-gradient(ellipse at center, #1a5c2e 0%, #0f3d1e 100%)',
          borderColor: '#0a2a14',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Street label */}
        {hand && !hand.isComplete && (
          <div className="text-green-500/60 text-xs font-semibold uppercase tracking-widest">
            {streetLabel}
          </div>
        )}

        {/* Pot */}
        {hand && <PotDisplay pot={hand.pot} />}

        {/* Community cards */}
        <CommunityCards cards={hand?.communityCards ?? []} />

        {/* Action log */}
        <ActionLog />
      </div>

      {/* ── Bottom: hero ───────────────────────────────────────────────── */}
      <div className="flex-none pt-2 pb-2 flex flex-col items-center">
        <PlayerSeat
          player={hero}
          hand={hand}
          isDealer={dealerIdx === heroIdx}
          isActive={heroIsActive}
          isBot={false}
        />
      </div>

      {/* ── Action buttons ─────────────────────────────────────────────── */}
      <div className="flex-none pb-safe">
        <ActionBar />
      </div>

      {/* ── Hand result overlay ────────────────────────────────────────── */}
      {showResult && <HandResult />}
    </div>
  );
}
