import { expect, type Page } from '@playwright/test';

export async function startGame(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click({ timeout: 90_000 });
  await expect(page.getByTestId('loading-screen')).toBeHidden();
  await expect(page.getByTestId('spin-button')).toHaveAttribute('data-state', 'idle');
}

export async function waitIdle(page: Page) {
  await expect(page.getByTestId('spin-button')).toHaveAttribute('data-state', 'idle', { timeout: 150_000 });
}

/** Authoritative data straight from the API with the page's demo token. */
export async function api<T>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (p) => {
    const token = localStorage.getItem('neon-break-token');
    const res = await fetch(`/api${p}`, { headers: { Authorization: `Bearer ${token}` } });
    return res.json();
  }, path) as Promise<T>;
}

export const credits = (minor: number) => (minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
