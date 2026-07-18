import { test, expect } from '@playwright/test';

// End-to-end determinism check for the Scan Results dashboard.
//
// The prefilled sample artifact depends on `log4jira@2.10.0`, which the mock
// advisory DB flags as a CRITICAL direct vulnerability (OZW-2021-0001). The
// policy MUST therefore evaluate this artifact to `block` with >= 1 finding.
//
// This asserts the EXACT verdict, not merely that "some verdict" rendered — so
// if the verdict logic is removed (e.g. policy always returns `allow`), the
// `block` assertion fails and this test goes red. That is the point.
test('submitting a vulnerable artifact renders a deterministic block verdict + findings', async ({
  page,
}) => {
  await page.goto('/');

  // Prefilled form -> just submit.
  await page.getByTestId('submit').click();

  const results = page.getByTestId('results');
  await expect(results).toBeVisible();

  // Determinism: this specific artifact evaluates to exactly `block`.
  await expect(page.getByTestId('verdict')).toHaveText('block');

  // And at least one finding must render.
  const findings = page.getByTestId('finding');
  await expect(findings.first()).toBeVisible();
  expect(await findings.count()).toBeGreaterThanOrEqual(1);

  // The finding is the expected advisory, tying the render to real scan output.
  await expect(findings.first()).toContainText('log4jira');
});
