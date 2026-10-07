import { expect, test } from '@playwright/test';
import { addParty, expectActive, phase, tickAll } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Outpost Phase' })).toBeVisible();
});

test('walks a full Outpost Phase and starts the next one', async ({ page }) => {
  await addParty(page, [['Ann', 'Drifter'], ['Bo', 'Blinkblade']]);

  for (const [id, next] of [
    ['time', 'Outpost Event'],
    ['event', 'Building Operations'],
    ['operations', 'Downtime'],
    ['downtime', 'Construction'],
  ] as const) {
    await tickAll(page, id);
    await expectActive(page, next);
  }
  // Downtime repeats per character.
  await expect(phase(page, 'downtime').locator('.phase-count').first()).toHaveText('8/8');

  await tickAll(page, 'construction');
  await expect(page.locator('.all-done')).toBeVisible();

  await page.getByRole('button', { name: 'Start new Outpost Phase' }).click();
  await page.getByLabel('Note for the log (optional)').fill('Won scenario 5');
  await page.getByRole('button', { name: 'Start new phase' }).click();

  await expectActive(page, 'Passage of Time');
  await expect(phase(page, 'time').locator('.phase-count')).toHaveText('0/2');

  await page.getByRole('button', { name: 'Log & settings' }).click();
  await expect(page.locator('.log-row')).toHaveCount(1);
  await expect(page.locator('.log-row')).toContainText('Won scenario 5');
  await expect(page.locator('.log-row .pill')).toHaveCount(0); // logged as complete

  await page.getByRole('button', { name: 'Party' }).click();
  await expect(page.locator('.party-row')).toHaveCount(2);
});

test('toggles show and hide the steps they control', async ({ page }) => {
  await addParty(page, [['Ann', 'Drifter'], ['Bo', 'Blinkblade']]);

  // Season selector picks the event deck.
  await page.getByRole('radio', { name: 'Winter' }).click();
  await tickAll(page, 'time');
  const event = phase(page, 'event');
  await expect(event.getByText('Draw a winter outpost event')).toBeVisible();
  await expect(event.getByText('Draw a summer outpost event')).toHaveCount(0);

  // Attack toggle reveals the attack group; Barracks follow-up appears with it.
  await expect(event.getByText('Defense check for each targeted building')).toHaveCount(0);
  await event.getByText('The event card has an attack on its back').click();
  await expect(event.getByText('Defense check for each targeted building')).toBeVisible();
  await event.getByText('The Barracks is wrecked').click();
  await expect(event.getByText('Barracks wrecked: every check has disadvantage')).toBeVisible();

  // Skipping the event replaces everything with a single step.
  await event.getByText('We were told not to resolve an outpost event this week').click();
  await expect(event.locator('.step')).toHaveCount(1);
  await expect(event.getByText('No outpost event this week')).toBeVisible();

  // Per-character toggles only affect that character.
  await phase(page, 'downtime').locator('.phase-head').click();
  const [ann, bo] = [phase(page, 'downtime').locator('.char').nth(0), phase(page, 'downtime').locator('.char').nth(1)];
  await bo.getByText('Personal quest is complete (must retire)').click();
  await expect(bo.getByText('Retire (required)')).toBeVisible();
  await expect(bo.getByText('First character of this class to retire')).toBeVisible();
  await expect(ann.getByText('Retire (required)')).toHaveCount(0);
});

test('resumes mid-phase after a reload, keeping house notes', async ({ page }) => {
  await addParty(page, [['Ann', 'Drifter']]);
  const time = phase(page, 'time');
  await time.getByText('Mark the next calendar box').click();
  await time.getByRole('button', { name: 'Show reminder' }).first().click();
  await time.getByPlaceholder('Our own reminder for this step…').fill('Remember the Garden bonus');

  await page.reload();

  await expectActive(page, 'Passage of Time');
  await expect(time.locator('.step.is-checked')).toHaveCount(1);
  await expect(time.locator('.info-btn.has-note')).toHaveCount(1);
  await time.locator('.info-btn.has-note').click();
  await expect(time.getByPlaceholder('Our own reminder for this step…')).toHaveValue('Remember the Garden bonus');
});

test('keeps each group separate by URL', async ({ page }) => {
  await addParty(page, [['Ann', 'Drifter']]);
  await expect(page).toHaveURL(/#\/g\/local$/);

  await page.goto('./#/g/theslayers');
  await expect(page.locator('.group-chip')).toHaveText('theslayers');
  await page.getByRole('button', { name: 'Party' }).click();
  await expect(page.locator('.party-row')).toHaveCount(0);

  await page.goto('./#/g/local');
  await expect(page.locator('.group-chip')).toHaveText('local');
  await page.getByRole('button', { name: 'Party' }).click();
  await expect(page.locator('.party-row')).toHaveCount(1);
});

test('works offline once loaded', async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await addParty(page, [['Ann', 'Drifter']]);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Outpost Phase' })).toBeVisible();
  await page.getByRole('button', { name: 'Party' }).click();
  await expect(page.locator('.party-row')).toHaveCount(1);
});
