import { STATE_LABEL } from '../../game/GameState';
import type { GameState } from '../../game/types';

interface HudProps {
  state: GameState;
  result: number | null;
  history: readonly number[];
}

/** Red pockets on a European wheel, used to colour the history chips. */
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export default function Hud({ state, result, history }: HudProps) {
  return (
    <div className="hud">
      <div className="hud__status">
        <span className={`hud__dot hud__dot--${state}`} />
        <span className="hud__status-label">{STATE_LABEL[state]}</span>
      </div>

      <div className="hud__history" aria-label="Previous results">
        {history.length === 0 ? (
          <span className="hud__history-empty">Belum ada hasil</span>
        ) : (
          history.map((value, index) => (
            <span
              key={`${value}-${index}`}
              className={`hud__chip ${
                value === 0 ? 'hud__chip--green' : RED.has(value) ? 'hud__chip--red' : 'hud__chip--black'
              } ${index === 0 ? 'hud__chip--latest' : ''}`}
            >
              {value}
            </span>
          ))
        )}
      </div>

      <div className="hud__result">
        <span className="hud__result-label">Hasil terakhir</span>
        <span className="hud__result-value">{result === null ? '—' : result}</span>
      </div>
    </div>
  );
}
