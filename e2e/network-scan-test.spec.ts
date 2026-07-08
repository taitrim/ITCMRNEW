import { test, expect } from '@playwright/test';

const CUSTOMER_ID = 'cmqxea9ok003jlsqqnpxbxtgh';

test.describe('Network SNMP Import', () => {
  test('POST mock network devices → verify submission created → review', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    // 1. POST mock GLPI Network Inventory JSON
    const mockDevices = [
      {
        type: 'switch',
        manufacturer: 'Cisco',
        model: 'Catalyst 2960X-48TS-L',
        serial: 'SNMP-TEST-SW-001',
        name: 'Core-Switch-01',
        ip: '10.0.0.1',
        mac: '00:1C:58:AB:CD:01',
        firmware: '15.2(2)E7',
        sysDescr: 'Cisco IOS Software, C2960X Software (C2960X-UNIVERSALK9-M), Version 15.2(2)E7',
        sysObjectID: '.1.3.6.1.4.1.9.1.2345',
        uptime: '180 days, 3:45:12',
        portCount: 48,
        ports: [
          { name: 'Gi1/0/1', speed: 1000, status: 'up', mac: '00:1C:58:AB:CD:11', neighbor: 'Server-Web01' },
          { name: 'Gi1/0/2', speed: 1000, status: 'up', mac: '00:1C:58:AB:CD:12', neighbor: 'Server-DB01' },
          { name: 'Gi1/0/48', speed: 1000, status: 'up', mac: '00:1C:58:AB:CD:48' },
        ],
      },
      {
        type: 'firewall',
        manufacturer: 'Fortinet',
        model: 'FortiGate 60F',
        serial: 'SNMP-TEST-FW-001',
        name: 'FW-Main',
        ip: '10.0.0.254',
        mac: '00:1C:58:EF:GH:01',
        firmware: '7.2.5',
        sysDescr: 'FortiGate-60F v7.2.5 build1234',
        portCount: 10,
        ports: [
          { name: 'wan1', speed: 1000, status: 'up' },
          { name: 'lan1', speed: 1000, status: 'up' },
          { name: 'dmz1', speed: 100, status: 'down' },
        ],
      },
      {
        type: 'ap',
        manufacturer: 'Ubiquiti',
        model: 'UniFi 6 Pro',
        serial: 'SNMP-TEST-AP-001',
        name: 'AP-Floor3',
        ip: '10.0.1.50',
        mac: '00:1C:58:IJ:KL:01',
        firmware: '6.5.28',
        portCount: 2,
        ports: [
          { name: 'eth0', speed: 1000, status: 'up', poe: true },
          { name: 'eth1', speed: 1000, status: 'down' },
        ],
      },
    ];

    const response = await page.request.post(
      `/api/agent-inventory/network-import?customerId=${CUSTOMER_ID}`,
      { data: { action: 'network_inventory', deviceid: 'TEST-SCAN-001', content: mockDevices } }
    );
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    console.log('Import result:', JSON.stringify(result, null, 2));
    expect(result.data).toBeDefined();
    expect(result.data.submissionId).toBeDefined();
    expect(result.data.deviceCount).toBe(3);

    const submissionId = result.data.submissionId;
    console.log(`Submission ID: ${submissionId}`);

    // Make sure at least 2 seconds passed since submission creation
    await page.waitForTimeout(2000);

    // 3. Verify submission appears in agent-updates page
    await page.goto('/agent-updates');
    await page.waitForLoadState('networkidle');

    // Should see KPI cards
    await expect(page.locator('text=Agent Inventory').first()).toBeVisible();

    // 4. Navigate to review page
    const reviewUrl = `/agent-updates/${submissionId}`;
    await page.goto(reviewUrl);
    await page.waitForLoadState('networkidle');

    // Should show network devices (names visible in compact card)
    await expect(page.locator('text=Core-Switch-01').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=FW-Main').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=AP-Floor3').first()).toBeVisible({ timeout: 5000 });
    // Device type badge
    await expect(page.locator('text=Mạng').first()).toBeVisible({ timeout: 5000 });
    // Serial numbers
    await expect(page.locator('text=SNMP-TEST-SW-001').first()).toBeVisible({ timeout: 5000 });

    // 5. Approve the submission
    // Click all checkboxes to select devices
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    if (checkboxCount > 0) {
      for (let i = 0; i < checkboxCount; i++) {
        await checkboxes.nth(i).check({ force: true });
      }
    }

    // Click approve button (the primary action button in the bottom bar)
    const approveBtn = page.getByRole('button', { name: /Duyệt/i }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(3000);
    }

    // 6. Verify success — should show approved status
    await expect(page.locator('text=Đã duyệt').first().or(page.locator('text=approved').first())).toBeVisible({ timeout: 5000 });

    // 7. Verify device appears in customer devices (displays as "Manufacturer ModelName")
    await page.goto(`/customers/${CUSTOMER_ID}`);
    await page.waitForLoadState('networkidle');

    // Click "Thiết bị" tab
    const devicesTab = page.locator('button:has-text("Thiết bị")');
    if (await devicesTab.isVisible()) {
      await devicesTab.click();
      await page.waitForTimeout(2000);
    }

    // Should show network devices by manufacturer+modelName visible text
    await expect(page.locator('text=Cisco Catalyst 2960X-48TS-L').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=FortiGate 60F').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=UniFi 6 Pro').first()).toBeVisible({ timeout: 5000 });
    // Serial numbers visible
    await expect(page.locator('text=SN: SNMP-TEST-SW-001').first()).toBeVisible({ timeout: 3000 });

    // 8. Check global device list
    await page.goto('/customer-devices');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Cisco Catalyst 2960X-48TS-L').first()).toBeVisible({ timeout: 5000 });

    // 9. Assert zero uncaught errors
    expect(pageErrors, `Uncaught errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });
});
