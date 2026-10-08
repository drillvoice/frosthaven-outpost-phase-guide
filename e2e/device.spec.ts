import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  // Force the download path; headless Chromium's share support varies by platform.
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined }));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Outpost Phase' })).toBeVisible();
});

// Chrome will install any page as a plain shortcut, so its own installability
// check always passes. These are what make it install as a full app instead.
test('meets Chrome\'s install-as-app requirements', async ({ page, request }) => {
  // A service worker controls the page (also what makes it work offline).
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  const cdp = await page.context().newCDPSession(page);
  const { url, errors, manifest } = await cdp.send('Page.getAppManifest');
  expect(url).toMatch(/manifest\.webmanifest$/);
  expect(errors).toEqual([]);
  const m = manifest as { name?: string; display?: string; startUrl?: string; scope?: string; icons?: { url: string; sizes?: string }[] };
  expect(m.name).toBe('Frosthaven Outpost Phase');
  expect(m.display).toBe('kStandalone');
  expect(m.startUrl).toBe(page.url().replace(/#.*$/, ''));
  expect(m.scope).toBe(m.startUrl);
  for (const size of ['192x192', '512x512']) {
    const icon = m.icons?.find((i) => i.sizes === size);
    expect(icon, size).toBeDefined();
    expect((await request.get(icon!.url)).ok(), size).toBe(true);
  }
});

test('backs up from settings and records when', async ({ page }) => {
  await page.getByRole('button', { name: 'Log', exact: true }).click();
  await expect(page.getByText('Never backed up on this device')).toBeVisible();
  await expect(page.getByTestId('persistence')).toBeVisible();
  await expect(page.getByText(/Install app|Installed as an app/).first()).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up now' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^outpost-local-\d{4}-\d{2}-\d{2}\.json$/);
  const saved = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(saved.schemaVersion).toBe(2);
  await expect(page.getByText('Last backup: today')).toBeVisible();
});

test('reminds to back up once there is a finished phase, from the checklist and new-phase dialog', async ({ page }) => {
  await expect(page.locator('.backup-nudge')).toHaveCount(0); // nothing worth losing yet

  await page.getByRole('button', { name: 'Start new Outpost Phase' }).click();
  await expect(page.locator('.backup-row')).toContainText('Never backed up');
  await page.getByRole('button', { name: 'Start new phase' }).click();

  const nudge = page.locator('.backup-nudge');
  await expect(nudge).toBeVisible();
  const download = page.waitForEvent('download');
  await nudge.getByRole('button', { name: 'Back up' }).click();
  await download;
  await expect(nudge).toHaveCount(0);

  await page.getByRole('button', { name: 'Start new Outpost Phase' }).click();
  await expect(page.locator('.backup-row')).toContainText('Last backup: today');
});
