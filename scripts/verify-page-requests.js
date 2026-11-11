// Run against page-requests-qa.html with playwright-cli run-code --filename.
// The temporary harness mounts the actual GenericPaginatedPage and VisualBlock with in-memory Axios responses.
async page => {
  await page.reload();
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  await page.getByRole('heading', { name: 'Shared product', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Selected: Shared product', exact: true }).waitFor();
  assert(await page.locator('#reads').textContent() === '1', 'Matching table and visual should make one dataset read');
  await page.getByRole('button', { name: 'Different visual filter', exact: true }).click();
  await page.getByRole('heading', { name: 'Active product', exact: true }).waitFor();
  assert(await page.locator('#reads').textContent() === '2', 'Different filters should make a second read');
  assert(await page.getByRole('cell').filter({ hasText: 'Shared product' }).count() === 1, 'Table must retain its own result');
  await page.getByRole('button', { name: 'Match again', exact: true }).click();
  await page.getByRole('heading', { name: 'Shared product', exact: true }).waitFor();
  assert(await page.locator('#reads').textContent() === '2', 'Matching again should reuse fresh data');
  await page.getByRole('columnheader', { name: 'Name ↓', exact: true }).locator('th').click();
  await page.waitForFunction(() => document.querySelector('#reads')?.textContent === '3');
  await page.getByRole('button', { name: 'Reset to shared defaults', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#reads')?.textContent === '3');
  await page.screenshot({ path: 'output/playwright/page-requests/runtime.png', fullPage: true });
  console.log('PASS: shared=1; different filter=2; matching again=2; local sort=3; reset=3.');
}
