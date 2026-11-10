import type { SymbolDefinition } from '@neon/game-math';
import { formatCredits } from '../services/format';
import { useBetStore } from '../stores/betStore';
import { useConfigStore } from '../stores/configStore';
import { Modal } from './Modal';

/** Displays configured pays for the current bet (display only – the server pays). */
export function PaytableModal() {
  const config = useConfigStore((s) => s.config);
  const images = useConfigStore((s) => s.symbolImages);
  const bet = useBetStore((s) => s.bet);
  if (!config) return null;
  const paying = config.symbols.filter((s) => s.pays);
  const row = (s: SymbolDefinition) => (
    <div className="pay-item" key={s.id} data-testid={`pay-${s.id}`}>
      {images[s.id] && <img src={images[s.id]} alt={s.name} width={84} height={84} />}
      <ul>
        {[6, 5, 4, 3].map((n) => (
          <li key={n}>
            <b>{n}</b> = {formatCredits(Math.floor((s.pays![n] ?? 0) * bet))}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <Modal title="PAYTABLE" wide testId="paytable">
      <p className="muted">Pays per way at the current bet of {formatCredits(bet)}. Ways pay left to right on adjacent reels starting from reel 1.</p>
      <div className="pay-grid">{paying.map(row)}</div>
      <div className="pay-specials">
        <div className="pay-item special">
          {images.WILD && <img src={images.WILD} alt="Wild" width={84} height={84} />}
          <div>
            <h3>WILD</h3>
            <p>Appears on reels 2–6 and substitutes for all symbols except SCATTER and BONUS.</p>
          </div>
        </div>
        <div className="pay-item special">
          {images.SCATTER && <img src={images.SCATTER} alt="Scatter" width={84} height={84} />}
          <div>
            <h3>SCATTER</h3>
            <p>
              {Object.entries(config.freeSpins.awards).map(([k, v]) => `${k}× = ${v} spins`).join(' • ')}. Pays{' '}
              {Object.entries(config.scatterPays).map(([k, v]) => `${k}× ${formatCredits(Math.floor((v ?? 0) * bet))}`).join(', ')}.
            </p>
          </div>
        </div>
        <div className="pay-item special">
          {images.BONUS && <img src={images.BONUS} alt="Bonus" width={84} height={84} />}
          <div>
            <h3>BONUS</h3>
            <p>{config.bossFight.triggerCount}+ BONUS symbols trigger the BOSS FIGHT: {config.bossFight.shots} shots, rewards {config.bossFight.rewards.map((r) => `${r.multiplier}x`).join(' / ')} bet.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
