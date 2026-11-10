import { useEffect, useState } from 'react';
import type { HistoryEntry } from '@neon/shared';
import { formatCredits } from '../services/format';
import { runtime } from '../game/runtime';
import { Modal } from './Modal';

export function HistoryModal() {
  const [rows, setRows] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    runtime.controller?.client
      .history()
      .then((r) => setRows(r.rounds))
      .catch((e: Error) => setError(e.message));
  }, []);
  return (
    <Modal title="GAME HISTORY" wide testId="history">
      {error && <p className="error">{error}</p>}
      {!rows && !error && <p className="muted">Loading…</p>}
      {rows && rows.length === 0 && <p className="muted">No rounds played yet.</p>}
      {rows && rows.length > 0 && (
        <table className="history-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Mode</th>
              <th>Bet</th>
              <th>Win</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.roundId} className={r.win + r.bonusWin > 0 ? 'win' : ''}>
                <td>{r.sequence}</td>
                <td>{new Date(r.createdAt).toLocaleTimeString()}</td>
                <td>{r.mode === 'FREE_SPIN' ? 'FREE' : r.bonusWin > 0 ? 'BOSS' : 'BASE'}</td>
                <td>{r.mode === 'FREE_SPIN' ? '—' : formatCredits(r.bet)}</td>
                <td>{formatCredits(r.win + r.bonusWin)}</td>
                <td>{formatCredits(r.balanceAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
