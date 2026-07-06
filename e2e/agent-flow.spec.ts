import { test, expect } from '@playwright/test';

async function loginViaPage(page: any) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('form', { timeout: 15_000 });
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe('Agent Flow (customer key-based)', () => {

  test('full flow: submit (computer + printer) → approve → verify via API', async ({ page }) => {
    await loginViaPage(page);
    const api = page.request;

    // Get first customer with agentKey
    const customers = await (await api.get('/api/customers')).json();
    const custData = await (await api.get(`/api/customers/${customers[0].id}`)).json();
    expect(custData.agentKey).toBeTruthy();

    // Submit inventory as agent (computer + colour printer)
    const timestamp = Date.now();
    const submitRes = await api.post(
      `/api/agent-inventory/submit?customerId=${custData.id}&key=${custData.agentKey}`,
      {
        data: {
          action: 'inventory',
          deviceid: `E2E-${timestamp}`,
          content: {
            hardware: { name: `PC-${timestamp}`, chassis_type: 'laptop', memory: 8192, uuid: `uuid-${timestamp}` },
            bios: { smanufacturer: 'Dell Inc.', smodel: 'Latitude 5420', sserial: `SN-${timestamp}` },
            operatingsystem: { name: 'Windows', full_name: 'Windows 11 Pro' },
            cpus: [{ name: 'Intel i5' }],
            storages: [{ disksize: 256000 }],
            networks: [{ ipaddress: '10.0.0.1', macaddr: `AA:BB:CC:${timestamp % 10000}:${Math.floor(timestamp / 10000) % 10000}:FF` }],
            users: [{ LOGIN: 'tester' }],
            printers: [
              {
                name: `HP LaserJet Pro ${timestamp}`,
                manufacturer: 'HP',
                model: `LaserJet Pro ${timestamp}`,
                serial: `SN-PRN-${timestamp}`,
                port: `IP_10.0.0.${timestamp % 100}`,
                driver: `HP LaserJet Pro M404dw PCL 6 ${timestamp}`,
                color: false,
                duplex: true,
                resolution: '1200x1200',
                network: true,
                shared: false,
                status: 'Online',
                pages_total: 15420,
              },
            ],
          },
        },
      }
    );
    expect(submitRes.ok()).toBeTruthy();
    const { data: submitData } = await submitRes.json();
    expect(submitData.status).toBe('pending');
    expect(submitData.deviceCount).toBe(2); // computer + printer
    const submissionId = submitData.id;

    // Verify in submissions list
    const listData = await (await api.get('/api/agent-inventory/submissions')).json();
    expect(listData.data.find((s: any) => s.id === submissionId)).toBeTruthy();

    // Verify review data has printer with correct fields
    const detailBefore = await (await api.get(`/api/agent-inventory/submissions/${submissionId}`)).json();
    const rd = detailBefore.data.reviewData;
    expect(rd.devices.length).toBe(2);
    const printerDev = rd.devices.find((d: any) => d.parsed.deviceType === 'printer');
    expect(printerDev).toBeTruthy();
    expect(printerDev.parsed.manufacturer).toBe('HP');
    expect(printerDev.parsed.name).toContain(String(timestamp));
    // color: false → notes không chứa 'màu'
    expect(printerDev.parsed.notes).not.toContain('màu');
    // duplex: true → notes chứa '2 mặt'
    expect(printerDev.parsed.notes).toContain('2 mặt');
    expect(printerDev.parsed.notes).toContain('15420 trang');
    expect(printerDev.parsed.notes).toContain(String(timestamp));

    // Approve both devices
    const approveRes = await api.post(`/api/agent-inventory/submissions/${submissionId}/review`, {
      data: { action: 'approve' },
    });
    expect(approveRes.ok()).toBeTruthy();
    const approveJson = await approveRes.json();
    expect(approveJson.data.status).toBe('approved');
    expect(approveJson.data.confirmedCount).toBe(2);

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
    const ts = Date.now();
    const submitRes = await api.post(
      `/api/agent-inventory/submit?customerId=${custData.id}&key=${custData.agentKey}`,
      {
        data: {
          action: 'inventory',
          deviceid: `E2E-REJ-${ts}`,
          content: {
            hardware: { name: `REJ-PC-${ts}`, chassis_type: 'desktop', memory: 4096, uuid: `rej-${ts}` },
            bios: { smanufacturer: 'HP', smodel: 'ProDesk', sserial: `SN-REJ-${ts}` },
            operatingsystem: { name: 'Windows', full_name: 'Windows 10' },
            cpus: [{ name: 'Intel i3' }],
            storages: [{ disksize: 128000 }],
            networks: [{ ipaddress: '10.0.0.2', macaddr: `11:22:33:${ts % 10000}:${Math.floor(ts / 10000) % 10000}:66` }],
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
