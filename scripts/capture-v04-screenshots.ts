/**
 * CBUP v0.4.0 Final Screenshot Script
 * Each view gets its own page load + login to avoid state crashes
 */
import { chromium, type Browser, type Page, type BrowserContext } from 'playwright'

const BASE_URL = 'http://localhost:3000'
const DIR = '/home/z/my-project/download/screenshots-v04'
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${DIR}/${name}.png` })
  console.log(`  ✅ ${name}.png`)
}

async function login(page: Page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await wait(1000)
  
  // Click header Sign In
  await page.locator('header button:has-text("Sign In")').click()
  await wait(2000)
  
  // Switch to login tab
  const formSignIn = page.locator('.max-w-md button').filter({ hasText: 'Sign In' }).first()
  const isVisible = await formSignIn.isVisible({ timeout: 2000 }).catch(() => false)
  if (isVisible) {
    await formSignIn.click()
    await wait(500)
  }
  
  // Fill form
  await page.locator('input#email').fill('admin@cbup.io')
  await page.locator('input#password').fill('admin123')
  await page.locator('button[type="submit"]').click()
  await wait(4000)
  
  // Verify we're on dashboard
  const dashBtn = page.locator('nav button:has-text("Dashboard")')
  return await dashBtn.count().catch(() => 0) > 0
}

async function clickAndWait(page: Page, label: string, waitMs = 3000) {
  const btns = page.locator('nav button, header button')
  const count = await btns.count()
  for (let i = 0; i < count; i++) {
    const text = await btns.nth(i).textContent().catch(() => '')
    if (text?.trim().includes(label) && text!.trim().length < 30) {
      await btns.nth(i).click({ force: true })
      await wait(waitMs)
      return true
    }
  }
  return false
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })

  try {
    // ── 1. Landing Page (no auth needed) ─────────────────
    console.log('📸 [1] Landing Page...')
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page1 = await ctx1.newPage()
    await page1.goto(BASE_URL, { waitUntil: 'networkidle' })
    await wait(1000)
    await shot(page1, '01-landing-page')
    await ctx1.close()

    // ── 2. Auth Page ────────────────────────────────────
    console.log('📸 [2] Auth Page...')
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page2 = await ctx2.newPage()
    await page2.goto(BASE_URL, { waitUntil: 'networkidle' })
    await wait(1000)
    await page2.locator('header button:has-text("Sign In")').click()
    await wait(2000)
    await shot(page2, '02-auth-page')
    await ctx2.close()

    // ── 3. Dashboard ───────────────────────────────────
    console.log('📸 [3] Dashboard...')
    const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page3 = await ctx3.newPage()
    await login(page3)
    await shot(page3, '03-dashboard')
    await ctx3.close()

    // ── 4. Agents ──────────────────────────────────────
    console.log('📸 [4] Agents...')
    const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page4 = await ctx4.newPage()
    await login(page4)
    await clickAndWait(page4, 'Agents', 4000)
    await shot(page4, '04-agents-management')
    await ctx4.close()

    // ── 5. Alerts ──────────────────────────────────────
    console.log('📸 [5] Alerts...')
    const ctx5 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page5 = await ctx5.newPage()
    await login(page5)
    await clickAndWait(page5, 'Alerts', 3000)
    await shot(page5, '05-alerts')
    await ctx5.close()

    // ── 6. Super Admin Overview ────────────────────────
    console.log('📸 [6] Super Admin Overview...')
    const ctx6 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page6 = await ctx6.newPage()
    await login(page6)
    await clickAndWait(page6, 'Admin', 5000)
    await shot(page6, '06-super-admin-overview')

    // ── 7. Tenants Tab ─────────────────────────────────
    console.log('📸 [7] Tenants...')
    const tTab = page6.locator('[role="tab"]').filter({ hasText: 'Tenants' })
    if (await tTab.count() > 0) {
      await tTab.click()
      await wait(2000)
      await shot(page6, '07-super-admin-tenants')
    }

    // ── 8. All Endpoints ───────────────────────────────
    console.log('📸 [8] All Endpoints...')
    const eTab = page6.locator('[role="tab"]').filter({ hasText: 'Endpoints' })
    if (await eTab.count() > 0) {
      await eTab.click()
      await wait(2000)
      await shot(page6, '08-super-admin-all-endpoints')
    }

    // ── 8b. Users ─────────────────────────────────────
    console.log('📸 [8b] Users...')
    const uTab = page6.locator('[role="tab"]').filter({ hasText: 'Users' })
    if (await uTab.count() > 0) {
      await uTab.click()
      await wait(2000)
      await shot(page6, '08b-super-admin-users')
    }

    // ── 8c. Activity Log ──────────────────────────────
    console.log('📸 [8c] Activity Log...')
    const aTab = page6.locator('[role="tab"]').filter({ hasText: 'Activity' })
    if (await aTab.count() > 0) {
      await aTab.click()
      await wait(2000)
      await shot(page6, '08c-super-admin-activity')
    }
    await ctx6.close()

    // ── 9. Reports List ────────────────────────────────
    console.log('📸 [9] Reports...')
    const ctx9 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page9 = await ctx9.newPage()
    await login(page9)
    await clickAndWait(page9, 'Reports', 5000)
    await shot(page9, '09-reports-list')

    // ── 10. Report Detail ──────────────────────────────
    console.log('📸 [10] Report Detail...')
    const viewBtn = page9.locator('button[title="View"]').first()
    if (await viewBtn.count() > 0) {
      await viewBtn.click({ force: true })
      await wait(3000)
      await shot(page9, '10-report-detail')
    } else {
      console.log('  ⚠️ View button not found')
    }
    await ctx9.close()

    console.log('\n✅ All screenshots captured!')
    console.log(`📁 ${DIR}\n`)

  } catch (err: any) {
    console.error('❌ Error:', err?.message || err)
  } finally {
    await browser.close()
  }
}

main().catch(console.error)
