import { expect, test, type Page } from '@playwright/test';

async function openCalendar(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
}

async function setUp(page: Page, weeks: number) {
  await page.getByLabel('Weeks marked', { exact: true }).fill(String(weeks));
  await page.getByRole('button', { name: 'Start tracking the calendar' }).click();
}

const box = (page: Page, week: number) => page.getByRole('gridcell', { name: new RegExp(`^Week ${week}(,|$)`) });

test('sets up from the current game state', async ({ page }) => {
  await openCalendar(page);
  await page.getByLabel('Weeks marked', { exact: true }).fill('9');
  await expect(page.getByText('That puts you in summer. The next Outpost Phase marks week 10.')).toBeVisible();
  await page.getByRole('button', { name: 'Start tracking the calendar' }).click();

  await expect(page.locator('.cal-summary')).toContainText('Week 9 of 80 · Summer · Winter after the next week');
  await expect(box(page, 9)).toHaveAccessibleName('Week 9, marked');
  await expect(box(page, 10)).toHaveClass(/is-next/);

  await page.reload();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.locator('.cal-summary')).toContainText('Week 9 of 80');
});

test('adds sections and notes to future weeks, then edits and deletes them', async ({ page }) => {
  await openCalendar(page);
  await setUp(page, 9);

  // "Add section 32.3 three weeks from now" -> week 12
  await page.getByLabel('Section number').fill('32.3');
  await page.getByLabel('Weeks from now', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Add to week 12' }).click();

  // A note on an explicit week number
  await page.getByRole('radio', { name: 'Note' }).click();
  await page.getByLabel('Note').fill("Check Bo's quest");
  await page.getByRole('radio', { name: 'Week number' }).click();
  await page.getByLabel('Week number', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Add to week 10' }).click();

  const upcoming = page.locator('.entry-row');
  await expect(upcoming).toHaveCount(2);
  await expect(upcoming.nth(0)).toContainText("Week 10next week📝 Check Bo's quest");
  await expect(upcoming.nth(1)).toContainText('Week 12in 3 weeksSection 32.3');
  await expect(box(page, 12)).toHaveAccessibleName('Week 12, 1 entry');

  // Edit and delete from the week panel
  await box(page, 12).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Week 12' })).toBeVisible();
  await dialog.getByLabel('Edit section').fill('32.4');
  await dialog.getByLabel('Edit section').blur();
  await dialog.getByLabel('Section number').fill('64.1');
  await dialog.getByRole('button', { name: 'Add to week 12' }).click();
  await expect(dialog.locator('.entry-edit')).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Delete section 64.1' }).click();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(upcoming.nth(1)).toContainText('Section 32.4');
});

test('time passing outside the Outpost Phase carries entries to the next week', async ({ page }) => {
  await openCalendar(page);
  await setUp(page, 9);
  await page.getByLabel('Section number').fill('32.3');
  await page.getByRole('button', { name: 'Add to week 10' }).click();

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Mark week 10 now' }).click();

  await expect(page.locator('.cal-summary')).toContainText('Week 10 of 80 · Winter');
  await expect(page.locator('.entry-row')).toContainText('Week 11');
  await expect(page.locator('.entry-row')).toContainText('carried over');
});

test('corrects the number of weeks marked', async ({ page }) => {
  await openCalendar(page);
  await setUp(page, 9);
  await page.getByLabel('Correct weeks marked', { exact: true }).fill('14');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Set to 14 weeks' }).click();
  await expect(page.locator('.cal-summary')).toContainText('Week 14 of 80 · Winter · Summer in 6 weeks');
});

test('the next Outpost Phase marks week 10, shows its sections and switches to winter', async ({ page }) => {
  await openCalendar(page);
  await setUp(page, 9);
  await page.getByLabel('Section number').fill('32.3');
  await page.getByRole('button', { name: 'Add to week 10' }).click();
  await page.getByRole('radio', { name: 'Note' }).click();
  await page.getByLabel('Note').fill("Check Bo's quest");
  await page.getByRole('button', { name: 'Add to week 10' }).click();

  const chip = page.locator('.week-chip');
  await expect(chip).toHaveText('Week 9 · Summer');

  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  const time = page.locator('#phase-time');
  await expect(time.getByText('Ticking this marks week 10 in the app.')).toBeVisible();
  await expect(time.getByText('Check the season')).toHaveCount(0);

  await time.getByText('Mark the next calendar box').click();
  await expect(chip).toHaveText('Week 10 · Winter');
  await expect(time.getByText('Week 10 marked · now winter')).toBeVisible();
  await expect(time.getByText("📝 Check Bo's quest")).toBeVisible();
  await expect(time.locator('.phase-count')).toHaveText('1/3');

  // Unticking undoes the mark.
  await time.getByText('Mark the next calendar box').click();
  await expect(chip).toHaveText('Week 9 · Summer');
  await expect(time.getByText('Read section 32.3')).toHaveCount(0);

  await time.getByText('Mark the next calendar box').click();
  await page.reload();
  await time.getByText('Read section 32.3').click();
  await time.getByText('Season changes to winter').click();
  await expect(page.locator('.phase.is-active .phase-title')).toContainText('Outpost Event');
  await expect(page.locator('#phase-event').getByText('Draw a winter outpost event')).toBeVisible();

  // The week is recorded in the log.
  await page.getByRole('button', { name: 'Start new Outpost Phase' }).click();
  await page.getByRole('button', { name: 'Start new phase' }).click();
  await page.getByRole('button', { name: 'Log', exact: true }).click();
  await expect(page.locator('.log-row')).toContainText('Week 10');
});
