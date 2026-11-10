import { expect, test } from '@playwright/test';
import { startGame, waitIdle } from './helpers';

test('mobile portrait layout has no overflow and is playable by touch', async ({ page }) => {
  await startGame(page);
  const { sw, iw, sh, ih } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
  expect(sw).toBeLessThanOrEqual(iw);
  expect(sh).toBeLessThanOrEqual(ih);
  await expect(page.locator('.ui-stage')).toHaveAttribute('data-orientation', 'portrait');
  const spin = page.getByTestId('spin-button');
  const box = (await spin.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44); // touch target
  expect(box.x + box.width).toBeLessThanOrEqual(iw);
  expect(box.y + box.height).toBeLessThanOrEqual(ih);
  await page.getByTestId('turbo-button').tap();
  await spin.tap();
  await waitIdle(page);
});
