import { useConfigStore } from '../stores/configStore';
import { Modal } from './Modal';

export function InfoModal() {
  const cfg = useConfigStore((s) => s.config);
  if (!cfg) return null;
  return (
    <Modal title="GAME RULES" wide testId="info">
      <div className="rules">
        <h3>Ways to win</h3>
        <p>
          NEON BREAK is a {cfg.reels}×{cfg.rows} video slot with up to <b>{(cfg.rows ** cfg.reels).toLocaleString()}</b> ways. Wins are formed by {cfg.minWaysLength}+ matching symbols on adjacent
          reels from the leftmost reel. Multiple matches on a reel multiply the number of ways. Only the win per symbol is paid; all symbol wins are added.
        </p>
        <h3>Cascades &amp; multipliers</h3>
        <p>
          Winning symbols explode and the remaining symbols fall down while new symbols drop in. Cascades continue while new wins form (max {cfg.maxCascades}). Cascade multipliers:{' '}
          {cfg.cascadeMultipliers.map((m) => `x${m}`).join(' → ')}.
        </p>
        <h3>Free spins</h3>
        <p>
          3+ SCATTERS award free spins. During free spins a persistent multiplier starts at x{cfg.freeSpins.startMultiplier} and grows by +{cfg.freeSpins.multiplierStep} after every winning spin (max x
          {cfg.freeSpins.maxMultiplier}). Scatters retrigger extra spins.
        </p>
        <h3>Boss fight</h3>
        <p>
          {cfg.bossFight.triggerCount}+ BONUS symbols start the BOSS FIGHT. Shoot {cfg.bossFight.shots} targets to defeat the mech. Every reward is determined by the server when the round is
          generated; your target choice reveals it and does not change it.
        </p>
        <h3>Lucky Win</h3>
        <p>
          A deterministic presentation shown when a round contains {cfg.lucky.minWinningCascades}+ winning cascades or a win using {cfg.lucky.minWildsInWin}+ wilds. It never changes the payout.
        </p>
        <h3>Win celebrations</h3>
        <p>
          Big Win ≥ {cfg.winTiers.big}× bet, Mega Win ≥ {cfg.winTiers.mega}× bet, Epic Win ≥ {cfg.winTiers.epic}× bet. Maximum win {cfg.maxWinMultiplier.toLocaleString()}× bet per round.
        </p>
        <h3>Fairness</h3>
        <p>
          All outcomes are generated server-side with a cryptographically secure RNG. Theoretical RTP of this demo configuration ≈ 96.4% (simulation). Malfunction voids all pays and plays.
        </p>
        <p className="muted">Demo game with virtual credits only. No real money can be wagered or won.</p>
        <h3>Controls</h3>
        <p>Space / Enter: spin. Tap the reels or the spin button while spinning: quick stop. Tap celebrations to skip.</p>
      </div>
    </Modal>
  );
}
