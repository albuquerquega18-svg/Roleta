import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    rouletteAudioMeters: AnalyserNode[];
  }
}

// Tap the real output graph, preserving playback, so the tests measure audio samples.
async function observeAudio(page: Page) {
  await page.addInitScript(() => {
    window.rouletteAudioMeters = [];
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (...args: unknown[]) {
      const destination = args[0];
      if (destination instanceof AudioDestinationNode) {
        const meter = this.context.createAnalyser();
        meter.fftSize = 2048;
        window.rouletteAudioMeters.push(meter);
        Reflect.apply(connect, this, [meter]);
        Reflect.apply(connect, meter, [destination]);
        return destination;
      }
      return Reflect.apply(connect, this, args);
    } as typeof AudioNode.prototype.connect;
  });
}

async function amplitude(page: Page) {
  return page.evaluate(() => {
    let peak = 0;
    for (const meter of window.rouletteAudioMeters) {
      const samples = new Float32Array(meter.fftSize);
      meter.getFloatTimeDomainData(samples);
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    }
    return peak;
  });
}

test('toca tambor durante o giro e comemoração ao revelar, sem áudio automático ao abrir', async ({ page }) => {
  await observeAudio(page);
  await page.goto('/');
  await expect(page.getByText('Tudo pronto para o próximo sorteio!', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.rouletteAudioMeters.length)).toBe(0);
  await page.getByRole('button', { name: 'Girar a roleta', exact: true }).click();
  await expect.poll(() => amplitude(page)).toBeGreaterThan(0.001);
  await expect(page.getByRole('button', { name: 'Girando…' })).toBeDisabled();
  await expect(page.locator('.winner-label')).toBeVisible({ timeout: 8000 });
  await expect.poll(() => amplitude(page)).toBeGreaterThan(0.001);
  await expect.poll(() => amplitude(page), { timeout: 4000 }).toBeLessThan(0.00001);
  await page.reload();
  expect(await page.evaluate(() => window.rouletteAudioMeters.length)).toBe(0);
});

test('silencia imediatamente, reativa durante o giro e mantém a preferência ao recarregar', async ({ page }) => {
  await observeAudio(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Tela cheia', exact: true }).click();
  await page.getByRole('button', { name: 'Girar a roleta', exact: true }).click();
  await expect.poll(() => amplitude(page)).toBeGreaterThan(0.001);
  await page.getByRole('button', { name: 'Silenciar sons' }).click();
  await expect.poll(() => amplitude(page)).toBeLessThan(0.00001);
  await page.getByRole('button', { name: 'Ativar sons' }).click();
  await expect.poll(() => amplitude(page)).toBeGreaterThan(0.001);
  await page.getByRole('button', { name: 'Silenciar sons' }).click();
  await expect(page.locator('.winner-label')).toBeVisible({ timeout: 8000 });
  expect(await amplitude(page)).toBeLessThan(0.00001);
  await page.getByRole('button', { name: 'Sair da tela cheia' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Ativar sons' })).toHaveAttribute('aria-pressed', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Girar a roleta', exact: true }).click();
  await expect(page.locator('.winner-label')).toBeVisible();
  expect(await page.evaluate(() => window.rouletteAudioMeters.length)).toBe(0);
});

test('falhas no dispositivo de áudio não interrompem o sorteio', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('Dispositivo indisponível'); } } });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Girar a roleta', exact: true }).click();
  await expect(page.locator('.winner-label')).toBeVisible();
  await expect(page.locator('.history-list li')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Girar novamente', exact: true })).toBeEnabled();
});
