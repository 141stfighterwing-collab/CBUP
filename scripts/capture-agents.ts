import { chromium, type Page } from '@playwright/test';
import * as fs from 'fs';

const BASE = 'http://localhost:3000';
const DIR = '/home/z/my-project/download/screenshots';
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

async function shot(page: Page, name: string, ms = 2000): Promise<boolean> {
  const p = `${DIR}/${name}.png`;
  try {
    await wait(ms);
    await page.screenshot({ path: p, fullPage: true, animations: 'disabled' });
    const kb = (fs.statSync(p).size / 1024).toFixed(0);
    console.log(`  ${kb.padStart(5)}KB  ${name}.png`);
    return true;
  } catch (e: any) { console.log(`  FAIL  ${name}: ${e.message}`); return false; }
}

async function apiShot(page: Page, name: string, endpoint: string, title: string, color: string): Promise<boolean> {
  const p = `${DIR}/${name}.png`;
  try {
    const res = await page.goto(`${BASE}${endpoint}`, { waitUntil: 'networkidle' });
    const status = res?.status() || 0;
    const body = await page.textContent('body') || '{}';
    await page.setContent(`<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'SF Mono',monospace;background:linear-gradient(135deg,#0a0f0d,#0d1117);color:#c9d1d9;padding:48px;min-height:100vh}
.tag{display:inline-block;background:${color};color:#fff;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:700;margin-right:10px}
h1{color:#e6edf3;font-size:22px;margin:12px 0 20px}
pre{background:#161b22;padding:28px;border-radius:12px;border:1px solid #30363d;overflow-x:auto;white-space:pre-wrap;font-size:13px;line-height:1.7;color:#e6edf3}
.sm{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;margin-right:6px}
.foot{margin-top:32px;padding-top:16px;border-top:1px solid #21262d;color:#484f58;font-size:12px}
</style></head><body>
<div><span class="tag">GET</span><span style="color:#8b949e;font-size:14px">${endpoint}</span></div>
<h1>${title}</h1>
<div style="margin-bottom:20px">
  <span class="sm" style="background:#1f2937;color:#9ca3af">CBUP v0.4.0</span>
  <span class="sm" style="background:#064e3b;color:#6ee7b7">Agent API</span>
  <span class="sm" style="background:${status<400?'#064e3b':'#450a0a'};color:${status<400?'#6ee7b7':'#fca5a5'}">HTTP ${status}</span>
</div>
<pre>${body}</pre>
<div class="foot">CBUP Agent System | ${new Date().toISOString()}</div>
</body></html>`);
    await page.screenshot({ path: p, fullPage: true });
    const kb = (fs.statSync(p).size / 1024).toFixed(0);
    console.log(`  ${kb.padStart(5)}KB  ${name}.png`);
    return true;
  } catch (e: any) { console.log(`  FAIL  ${name}: ${e.message}`); return false; }
}

async function main() {
  console.log('CBUP Agent Screenshots');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  let ok = 0, fail = 0;
  const p = await ctx.newPage();

  // Signup
  console.log('\n-- Auth --');
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await wait(1000);
  await p.locator('button:has-text("Get Started")').first().click();
  await wait(2000);
  const suTab = p.locator('button:has-text("Sign Up")').first();
  if (await suTab.isVisible().catch(() => false)) { await suTab.click(); await wait(1000); }
  const nameEl = p.locator('#name');
  if (await nameEl.isVisible({ timeout: 5000 }).catch(() => false)) {
    await nameEl.fill('Admin');
    await p.locator('#email').fill(`admin-${Date.now()}@cbup.local`);
    await p.locator('#password').fill('Test2025!');
    await p.locator('button[type="submit"]').click();
    console.log('  Signed up');
    await wait(5000);
  }

  // Navigate to Agents view
  console.log('\n-- Agents View --');
  const agentsBtn = p.locator('button:has-text("Agents")').first();
  if (await agentsBtn.isVisible().catch(() => false)) {
    await agentsBtn.click();
    // Wait for agent data to load (API fetch + render)
    await wait(5000);
    // Wait until we see agent data or "No agents" text
    try {
      await p.waitForSelector('text=No agents deployed', { timeout: 5000 }).catch(() => {});
      await p.waitForSelector('text=WORKSTATION', { timeout: 5000 }).catch(() => {});
    } catch {}
    await wait(2000);
    if (await shot(p, '17-agents-overview', 2000)) ok++; else fail++;
    
    // If there's an agent card, click it for details
    const detailBtn = p.locator('button:has-text("Details")').first();
    if (await detailBtn.isVisible().catch(() => false)) {
      await detailBtn.click();
      await wait(2000);
      if (await shot(p, '18-agents-detail', 3000)) ok++; else fail++;
      
      // Switch to telemetry tab
      const telTab = p.locator('button:has-text("Telemetry")').first();
      if (await telTab.isVisible().catch(() => false)) {
        await telTab.click();
        await wait(2000);
        if (await shot(p, '19-agents-telemetry', 3000)) ok++; else fail++;
      }
      
      // Switch to EDR Scans tab
      const edrTab = p.locator('button:has-text("EDR Scans")').first();
      if (await edrTab.isVisible().catch(() => false)) {
        await edrTab.click();
        await wait(2000);
        if (await shot(p, '20-agents-edr-scans', 3000)) ok++; else fail++;
      }
      
      // Switch to Commands tab
      const cmdTab = p.locator('button:has-text("Commands")').first();
      if (await cmdTab.isVisible().catch(() => false)) {
        await cmdTab.click();
        await wait(2000);
        if (await shot(p, '21-agents-commands', 3000)) ok++; else fail++;
      }
    } else {
      console.log('  No agent cards visible (expected with mock data)');
      if (await shot(p, '18-agents-empty', 2000)) ok++; else fail++;
    }

    // Try C2 dialog
    const c2Btn = p.locator('button:has-text("Command")').first();
    if (await c2Btn.isVisible().catch(() => false)) {
      await c2Btn.click();
      await wait(2000);
      if (await shot(p, '22-agents-c2-dialog', 2000)) ok++; else fail++;
    }
    
    // Try Deploy dialog
    const deployBtn = p.locator('button:has-text("Deploy Agent")').first();
    if (await deployBtn.isVisible().catch(() => false)) {
      await deployBtn.click();
      await wait(2000);
      if (await shot(p, '23-agents-deploy-dialog', 2000)) ok++; else fail++;
    }
  } else {
    console.log('  WARN: Agents nav button not found');
    fail += 7;
  }

  // API screenshots
  console.log('\n-- Agent APIs --');
  if (await apiShot(p, '24-api-agents-list', '/api/agents/list', 'Agent List API', '#10b981')) ok++; else fail++;

  await browser.close();
  const files = fs.readdirSync(DIR).filter(f => f.startsWith('2') && f.endsWith('.png'));
  console.log(`\n  ${files.length} agent screenshots captured`);
}

main().catch(e => { console.error(e); process.exit(1); });
