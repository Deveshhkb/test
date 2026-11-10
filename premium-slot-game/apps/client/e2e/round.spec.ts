import { expect, test } from '@playwright/test';
import { api, credits, startGame, waitIdle } from './helpers';

interface HistoryRow { roundId: string; bet: number; win: number; bonusWin: number; balanceAfter: number; finalGrid: string[][]; mode: string; sequence: number }

test.describe('NEON BREAK demo round', () => {
  test('plays a complete server-authoritative round', async ({ page }) => {
    await startGame(page);
    await expect(page.getByTestId('balance')).toHaveText('125,600.00');
    await expect(page.getByTestId('bet-value')).toHaveText('100.00');
    await page.getByTestId('turbo-button').click();

    await page.getByTestId('spin-button').click();
    await expect(page.getByTestId('spin-button')).not.toHaveAttribute('data-state', 'idle');
    await waitIdle(page);

    const { rounds } = await api<{ rounds: HistoryRow[] }>(page, '/game/history');
    expect(rounds.length).toBeGreaterThanOrEqual(1);
    const last = rounds[0];
    // the reels show exactly the server's final grid
    const shown = await page.evaluate(() => window.__NEON__!.getGrid());
    if (!last.bonusWin) expect(shown).toEqual(last.finalGrid);
    // balance shown equals the authoritative balance
    const { balance } = await api<{ balance: number }>(page, '/game/balance');
    await expect(page.getByTestId('balance')).toHaveText(credits(balance));
    expect(balance).toBe(12_560_000 - rounds.filter((r) => r.mode === 'BASE').reduce((a, r) => a + r.bet, 0) + rounds.reduce((a, r) => a + r.win + r.bonusWin, 0));
  });

  test('changing the bet changes the amount debited', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('turbo-button').click();
    await page.getByTestId('bet-minus').click();
    await page.getByTestId('bet-minus').click();
    await expect(page.getByTestId('bet-value')).toHaveText('20.00');
    await page.getByTestId('spin-button').click();
    await waitIdle(page);
    const { rounds } = await api<{ rounds: HistoryRow[] }>(page, '/game/history');
    expect(rounds.find((r) => r.mode === 'BASE')!.bet).toBe(2000);
    await page.getByTestId('max-bet').click();
    await expect(page.getByTestId('bet-value')).toHaveText('1,000.00');
  });

  test('rapid double clicks never create duplicate rounds', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('turbo-button').click();
    const btn = page.getByTestId('spin-button');
    await btn.click();
    await btn.click({ force: true });
    await page.keyboard.press('Space');
    await waitIdle(page);
    const { rounds } = await api<{ rounds: HistoryRow[] }>(page, '/game/history');
    const base = rounds.filter((r) => r.mode === 'BASE');
    expect(base.length).toBe(1);
  });

  test('menus: paytable, history, settings and rules work', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('menu-button').click();
    await page.getByTestId('menu-paytable').click();
    await expect(page.getByTestId('paytable')).toBeVisible();
    await expect(page.getByTestId('pay-HERO')).toContainText('1,200.00'); // 6 x HERO = 12x bet @100
    await page.keyboard.press('Escape');
    await page.getByTestId('menu-button').click();
    await page.getByTestId('menu-settings').click();
    await page.getByTestId('mute-toggle').check();
    await expect(page.getByTestId('mute-toggle')).toBeChecked();
    await page.keyboard.press('Escape');
    await page.getByTestId('menu-button').click();
    await page.getByTestId('menu-history').click();
    await expect(page.getByTestId('history')).toContainText('No rounds played yet');
    await page.keyboard.press('Escape');
    await page.getByTestId('menu-button').click();
    await page.getByTestId('menu-info').click();
    await expect(page.getByTestId('info')).toContainText('15,625');
  });

  test('auto spin plays the selected number of rounds', async ({ page }) => {
    await startGame(page);
    await page.getByTestId('turbo-button').click();
    await page.getByTestId('auto-button').click();
    await page.getByTestId('auto-10').click();
    await expect(page.getByTestId('spin-button')).toHaveAttribute('data-state', /auto|spinning|lucky|disabled/);
    // let two rounds play, then stop auto
    await expect.poll(async () => (await api<{ rounds: HistoryRow[] }>(page, '/game/history')).rounds.filter((r) => r.mode === 'BASE').length, { timeout: 150_000 }).toBeGreaterThanOrEqual(2);
    await page.getByTestId('auto-button').click();
    await waitIdle(page);
    const n = (await api<{ rounds: HistoryRow[] }>(page, '/game/history')).rounds.filter((r) => r.mode === 'BASE').length;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(10);
  });
});
