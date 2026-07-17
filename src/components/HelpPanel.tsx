import { Modal } from '@/ui/Modal';
import { PAYTABLE, SCATTER_PAYS, FEATURE_CONFIG, RTP_CONFIG } from '@/config/gameConfig';
import type { SymbolId } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SYMBOL_ORDER: SymbolId[] = [
  'WILD',
  'SEVEN',
  'BELL',
  'DIAMOND',
  'CHERRY',
  'LEMON',
  'ORANGE',
  'PLUM',
];

export function HelpPanel({ open, onClose }: Props) {
  return (
    <Modal title="Paytable & Rules" open={open} onClose={onClose}>
      <div className="help-content">
        <h3>Paytable (× line bet)</h3>
        <table className="paytable">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>×3</th>
              <th>×4</th>
              <th>×5</th>
            </tr>
          </thead>
          <tbody>
            {SYMBOL_ORDER.map((s) => (
              <tr key={s}>
                <td>{s}</td>
                <td>{PAYTABLE[s]?.[3] ?? '-'}</td>
                <td>{PAYTABLE[s]?.[4] ?? '-'}</td>
                <td>{PAYTABLE[s]?.[5] ?? '-'}</td>
              </tr>
            ))}
            <tr>
              <td>SCATTER (× total bet)</td>
              <td>{SCATTER_PAYS[3]}</td>
              <td>{SCATTER_PAYS[4]}</td>
              <td>{SCATTER_PAYS[5]}</td>
            </tr>
          </tbody>
        </table>

        <h3>Features</h3>
        <ul>
          <li>
            <b>Wild</b> substitutes for all paying symbols.
          </li>
          <li>
            <b>{FEATURE_CONFIG.scatterTrigger}+ Scatters</b> award{' '}
            {FEATURE_CONFIG.freeSpinsAwarded} free spins with a ×
            {FEATURE_CONFIG.freeSpinMultiplier} multiplier. Wilds expand and stick during
            free spins.
          </li>
          <li>
            <b>{FEATURE_CONFIG.bonusTrigger}+ Bonus symbols</b> trigger the pick-a-prize
            bonus game.
          </li>
          <li>
            <b>Mystery symbols</b> transform into a random paying symbol.
          </li>
          <li>
            <b>Random Wild Drop</b> can add up to {FEATURE_CONFIG.randomWildMax} wilds to
            any base game spin.
          </li>
          <li>
            <b>Cascading wins</b>: winning symbols explode and new ones fall in, with
            multipliers up to ×
            {FEATURE_CONFIG.cascadeMultipliers[FEATURE_CONFIG.cascadeMultipliers.length - 1]}.
          </li>
        </ul>

        <h3>Game info</h3>
        <p>
          20 paylines, left to right. Theoretical RTP {RTP_CONFIG.targetRtp}% (
          {RTP_CONFIG.volatility} volatility). Malfunction voids all pays.
        </p>
      </div>
    </Modal>
  );
}
