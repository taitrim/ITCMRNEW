import { test as setup } from '@playwright/test';
import path from 'node:path';

const authFile = path.join('e2e', '.auth', 'user.json');

setup('authenticate via page login', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Wait for the form to render (it has default values: admin/admin123)
  await page.waitForSelector('form', { timeout: 20_000 });

  // Submit directly — the inputs already have default values
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

  await page.context().storageState({ path: authFile });
});
