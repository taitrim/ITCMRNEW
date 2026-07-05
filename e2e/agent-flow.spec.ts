import { test, expect } from '@playwright/test';

async function loginViaPage(page: any) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('form', { timeout: 15_000 });
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe('Agent Flow (customer key-based)', () => {

  test('full flow: submit → approve → verify via API', async ({ page }) => {
    await loginViaPage(page);
    const api = page.request;

    // Get first customer with agentKey
    const customers = await (await api.get('/api/customers')).json();
    const custData = await (await api.get(`/api/customers/${customers[0].id}`)).json();
    expect(custData.agentKey).toBeTruthy();

    // Submit inventory as agent
    const submitRes = await api.post(
      `/api/agent-inventory/submit?customerId=${custData.id}&key=${custData.agentKey}`,
      {
        data: {
          action: 'inventory',
          deviceid: `E2E-${Date.now()}`,
          content: {
            hardware: { name: `PC-${Date.now()}`, chassis_type: 'laptop', memory: 8192, uuid: `uuid-${Date.now()}` },
            bios: { smanufacturer: 'Dell Inc.', smodel: 'Latitude 5420', sserial: `SN-${Date.now()}` },
            operatingsystem: { name: 'Windows', full_name: 'Windows 11 Pro' },
            cpus: [{ name: 'Intel i5' }],
            storages: [{ disksize: 256000 }],
            networks: [{ ipaddress: '10.0.0.1', macaddr: 'AA:BB:CC:DD:EE:FF' }],
            users: [{ LOGIN: 'tester' }],
          },
        },
      }
    );
    expect(submitRes.ok()).toBeTruthy();
    const { data: submitData } = await submitRes.json();
    expect(submitData.status).toBe('pending');
    const submissionId = submitData.id;

    // Verify in submissions list
    const listData = await (await api.get('/api/agent-inventory/submissions')).json();
    expect(listData.data.find((s: any) => s.id === submissionId)).toBeTruthy();

    // Approve
    const approveRes = await api.post(`/api/agent-inventory/submissions/${submissionId}/review`, {
      data: { action: 'approve' },
    });
    expect(approveRes.ok()).toBeTruthy();
    const approveJson = await approveRes.json();
    expect(approveJson.data.status).toBe('approved');
    expect(approveJson.data.confirmedCount).toBe(1);

    // Verify detail
    const detailRes = await api.get(`/api/agent-inventory/submissions/${submissionId}`);
    expect(detailRes.status()).toBe(200);
    const detail = await detailRes.json();
    expect(detail.data.status).toBe('approved');
  });

  test('reject flow via API', async ({ page }) => {
    await loginViaPage(page);
    const api = page.request;

    const customers = await (await api.get('/api/customers')).json();
    const custData = await (await api.get(`/api/customers/${customers[0].id}`)).json();

    // Submit
    const submitRes = await api.post(
      `/api/agent-inventory/submit?customerId=${custData.id}&key=${custData.agentKey}`,
      {
        data: {
          action: 'inventory',
          deviceid: `E2E-REJ-${Date.now()}`,
          content: {
            hardware: { name: `REJ-PC-${Date.now()}`, chassis_type: 'desktop', memory: 4096, uuid: `rej-${Date.now()}` },
            bios: { smanufacturer: 'HP', smodel: 'ProDesk', sserial: `SN-REJ-${Date.now()}` },
            operatingsystem: { name: 'Windows', full_name: 'Windows 10' },
            cpus: [{ name: 'Intel i3' }],
            storages: [{ disksize: 128000 }],
            networks: [{ ipaddress: '10.0.0.2', macaddr: '11:22:33:44:55:66' }],
            users: [{ LOGIN: 'rejuser' }],
          },
        },
      }
    );
    expect(submitRes.ok()).toBeTruthy();
    const { data: { id: submissionId } } = await submitRes.json();

    // Reject
    const rejectRes = await api.post(`/api/agent-inventory/submissions/${submissionId}/review`, {
      data: { action: 'reject' },
    });
    expect(rejectRes.ok()).toBeTruthy();
    expect((await rejectRes.json()).data.status).toBe('rejected');

    // Verify
    const detail = await (await api.get(`/api/agent-inventory/submissions/${submissionId}`)).json();
    expect(detail.data.status).toBe('rejected');
  });

  test('customer Agent tab + agent-updates list page', async ({ page }) => {
    await loginViaPage(page);
    const api = page.request;
    const customers = await (await api.get('/api/customers')).json();
    const customerId = customers[0].id;

    // Navigate to customer detail (dedicated page)
    await page.goto(`/customers/${customerId}`);
    await page.waitForURL(`/customers/${customerId}`, { timeout: 15_000 });
    await page.waitForTimeout(1000);

    // Click Agent tab
    const agentBtn = page.locator('button', { hasText: 'Agent' });
    await expect(agentBtn).toBeVisible({ timeout: 10_000 });
    await agentBtn.click();

    // Verify agent config
    await expect(page.locator('text=Cấu hình Agent')).toBeVisible({ timeout: 10_000 });

    // Verify mode selector buttons
    await expect(page.locator('button', { hasText: 'Đầy đủ (GLPI Agent)' })).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button', { hasText: 'Nhanh (PowerShell)' })).toBeVisible({ timeout: 5_000 });

    // Switch to Simple mode and check URL changes
    await page.locator('button', { hasText: 'Nhanh (PowerShell)' }).click();
    await expect(page.locator('a[href*="mode=simple"]')).toBeVisible({ timeout: 3_000 });

    // Switch back to GLPI mode, check OS selector appears
    await page.locator('button', { hasText: 'Đầy đủ (GLPI Agent)' }).click();
    await expect(page.locator('button', { hasText: 'Windows' })).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('button', { hasText: 'Linux' })).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('button', { hasText: 'macOS' })).toBeVisible({ timeout: 3_000 });

    // Verify download URL includes mode and os params
    const downloadLink = page.locator('a[href*="/api/agent-inventory/download/"]').first();
    const href = await downloadLink.getAttribute('href');
    expect(href).toContain('mode=');
    expect(href).toContain('os=');

    // Verify download button exists
    await expect(downloadLink).toBeVisible({ timeout: 3_000 });

    // Check agent-updates list page
    await page.goto('/agent-updates');
    await page.waitForURL('/agent-updates', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Cập nhật Agent' })).toBeVisible({ timeout: 10_000 });
  });

  test('Agent tab in customer list modal', async ({ page }) => {
    await loginViaPage(page);
    const api = page.request;
    const customers = await (await api.get('/api/customers')).json();
    const customerId = customers[0].id;

    // Navigate to customers list page — it opens the detail in a modal
    await page.goto(`/customers?id=${customerId}`);
    await page.waitForURL(`/customers?id=${customerId}`, { timeout: 15_000 });
    await page.waitForTimeout(1500);

    // The modal should have an Agent tab button
    const agentBtn = page.locator('button', { hasText: 'Agent' });
    await expect(agentBtn).toBeVisible({ timeout: 10_000 });
    await agentBtn.click();

    // Verify agent config renders
    await expect(page.locator('text=Cấu hình Agent')).toBeVisible({ timeout: 10_000 });
  });
});
