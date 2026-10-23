import { expect, test } from '@playwright/test';

async function hasConfetti(page: import('@playwright/test').Page) {
  return page.locator('.confetti-canvas').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d');
    return !!context && context.getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0);
  });
}

test('sorteia em tela cheia nativa, celebra somente no resultado e preserva o estado ao sair', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tela cheia', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Sorteador' });
  await expect(panel).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains('wheel-card'))).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Girar a roleta', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Sair da tela cheia' })).toBeFocused();
  await page.getByRole('button', { name: 'Girar a roleta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Girando…' })).toBeDisabled();
  expect(await hasConfetti(page)).toBe(false);
  await expect(page.locator('.winner-label')).toBeVisible({ timeout: 8000 });
  await expect.poll(() => hasConfetti(page)).toBe(true);
  const winner = await page.locator('.winner-label').textContent();
  await page.getByRole('button', { name: 'Sair da tela cheia' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.history-list li')).toHaveCount(1);
  await expect(page.locator('.winner-label')).toHaveText(winner!);
  await expect(page.getByRole('button', { name: 'Tela cheia', exact: true })).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await page.reload();
  expect(await hasConfetti(page)).toBe(false);
  await expect(page.locator('.history-list li')).toHaveCount(1);
});

test('acompanha a saída da tela cheia pelo navegador', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tela cheia', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tela cheia', exact: true })).toBeFocused();
});

test('confetes também aparecem no modo normal e são limpos no próximo giro', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Girar a roleta', exact: true }).click();
  await expect(page.locator('.winner-label')).toBeVisible({ timeout: 8000 });
  await expect.poll(() => hasConfetti(page)).toBe(true);
  await page.getByRole('button', { name: 'Girar novamente', exact: true }).click();
  await expect.poll(() => hasConfetti(page)).toBe(false);
  await expect(page.locator('.winner-label')).toHaveCount(0);
});

test('modo alternativo funciona no celular, sai com Escape e respeita movimento reduzido', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.reject(new Error('Fullscreen indisponível'));
  });
  await page.goto('/');
  await page.getByRole('checkbox', { name: /Remover quem ganhar/ }).check();
  await page.getByRole('button', { name: 'Tela cheia', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const panel = await page.getByRole('dialog').boundingBox();
  expect(panel).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
  await page.getByRole('button', { name: 'Girar a roleta', exact: true }).click();
  await expect(page.locator('.winner-label')).toBeVisible();
  expect(await hasConfetti(page)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.entry-list li')).toHaveCount(5);
  await expect(page.locator('.history-list li')).toHaveCount(1);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await page.getByRole('button', { name: 'Tela cheia', exact: true }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  for (const selector of ['.wheel-stage', '.spin-button', '.fullscreen-button', '.winner-label']) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(844);
    expect(box!.y + box!.height).toBeLessThanOrEqual(390);
  }
});
