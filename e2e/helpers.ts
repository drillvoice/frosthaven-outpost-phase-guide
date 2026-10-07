import { expect, type Page } from '@playwright/test';

export async function addParty(page: Page, members: [name: string, className: string][]) {
  await page.getByRole('button', { name: 'Party' }).click();
  for (const [name, className] of members) {
    await page.getByLabel('New character name').fill(name);
    await page.getByLabel('New character class').fill(className);
    await page.getByRole('button', { name: 'Add to party' }).click();
  }
  await page.getByRole('button', { name: 'Checklist' }).click();
}

export const phase = (page: Page, id: string) => page.locator(`#phase-${id}`);

/** Ticks every unticked step in an (open) phase. */
export async function tickAll(page: Page, id: string) {
  const unticked = phase(page, id).locator('.step:not(.is-checked) .step-check');
  while ((await unticked.count()) > 0) await unticked.first().click();
}

export async function expectActive(page: Page, title: string) {
  await expect(page.locator('.phase.is-active .phase-title')).toContainText(title);
}
