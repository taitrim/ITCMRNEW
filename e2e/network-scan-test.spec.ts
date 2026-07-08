import { test, expect } from '@playwright/test';

const CUSTOMER_ID = 'cmqxea9ok003jlsqqnpxbxtgh';

test.describe('Network SNMP Import', () => {
  test('POST mock network devices → verify submission created → review', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    // 1. POST mock GLPI Network Inventory (native netinventory format)
    const mockPayload = {
      action: 'netinventory',
      deviceid: 'TEST-SCAN-001',
      content: {
        versionclient: '1.0',
        network_device: {
          name: 'Core-Switch-01',
          manufacturer: 'Cisco',
          model: 'Catalyst 2960X-48TS-L',
          serial: 'SNMP-TEST-SW-001',
          type: 'Networking',
          mac: '00:1C:58:AB:CD:01',
          firmware: '15.2(2)E7',
          uptime: '180 days, 3:45:12',
          location: 'Server Room A - Rack 03',
          ips: ['10.0.0.1'],
        },
        network_ports: [
          {
            ifname: 'Gi1/0/1',
            ifdescr: 'GigabitEthernet1/0/1',
            ifspeed: 1000000000,
            ifstatus: 1,
            ifinternalstatus: 1,
            iftype: 6,
            mac: '00:1C:58:AB:CD:11',
            ifmtu: 1500,
            ifportduplex: 2,
            connections: [{ ip: '10.0.0.2', sysname: 'Server-Web01' }],
            vlans: [{ name: 'default', number: '1' }],
          },
          {
            ifname: 'Gi1/0/2',
            ifdescr: 'GigabitEthernet1/0/2',
            ifspeed: 1000000000,
            ifstatus: 1,
            ifinternalstatus: 1,
            iftype: 6,
            mac: '00:1C:58:AB:CD:12',
            ifmtu: 1500,
            ifportduplex: 2,
            connections: [{ ip: '10.0.0.3', sysname: 'Server-DB01' }],
          },
          {
            ifname: 'Gi1/0/48',
            ifdescr: 'GigabitEthernet1/0/48',
            ifspeed: 1000000000,
            ifstatus: 1,
            ifinternalstatus: 1,
            iftype: 6,
            mac: '00:1C:58:AB:CD:48',
            ifmtu: 1500,
          },
        ],
        firmwares: [
          { name: 'IOS', version: '15.2(2)E7', type: 'device' },
        ],
      },
    };

    const response = await page.request.post(
      `/api/agent-inventory/network-import?customerId=${CUSTOMER_ID}`,
      { data: mockPayload }
    );
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    console.log('Import result:', JSON.stringify(result, null, 2));
    expect(result.data).toBeDefined();
    expect(result.data.submissionId).toBeDefined();
    expect(result.data.deviceCount).toBe(1);

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

    // Should show network device (name visible in compact card)
    await expect(page.locator('text=Core-Switch-01').first()).toBeVisible({ timeout: 5000 });
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

    // Should show network device by manufacturer+modelName visible text
    await expect(page.locator('text=Cisco Catalyst 2960X-48TS-L').first()).toBeVisible({ timeout: 5000 });
    // Serial number visible
    await expect(page.locator('text=SN: SNMP-TEST-SW-001').first()).toBeVisible({ timeout: 3000 });

    // 8. Check global device list
    await page.goto('/customer-devices');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Cisco Catalyst 2960X-48TS-L').first()).toBeVisible({ timeout: 5000 });

    // 9. Assert zero uncaught errors
    expect(pageErrors, `Uncaught errors: ${pageErrors.join(' | ')}`).toHaveLength(0);
  });

  test('legacy backward-compat format still works', async ({ page }) => {
    // POST old flat format — verify it's still accepted
    const legacyPayload = {
      action: 'network_inventory',
      deviceid: 'LEGACY-TEST',
      content: [{
        type: 'firewall',
        manufacturer: 'Fortinet',
        model: 'FortiGate 60F',
        serial: 'LEGACY-FW-001',
        name: 'FW-Legacy',
        ip: '10.0.0.254',
        mac: '00:1C:58:AA:BB:01',
        firmware: '7.2.5',
        uptime: '90 days',
        ports: [
          { name: 'wan1', speed: 1000, status: 'up' },
          { name: 'lan1', speed: 1000, status: 'down' },
        ],
      }],
    };

    const resp = await page.request.post(
      `/api/agent-inventory/network-import?customerId=${CUSTOMER_ID}`,
      { data: legacyPayload }
    );
    expect(resp.ok()).toBeTruthy();
    const result = await resp.json();
    expect(result.data.deviceCount).toBe(1);
    expect(result.data.submissionId).toBeDefined();
    console.log('Legacy import ok:', JSON.stringify(result.data));
  });
});
