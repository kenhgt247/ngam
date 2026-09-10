import { test, expect, chromium, webkit, devices } from '@playwright/test';

const BASE='https://dhhd-tools-v022.vercel.app';
const v09=['duplexscan','keywordpages','formfill'];

test.describe.serial('DHHD v0.9 public regression on v0.14 production',()=>{
  test('61 public home exposes 54 tools and keeps all v0.9 cards',async({page})=>{
    const r=await page.goto(`${BASE}/#home`,{waitUntil:'load'});expect(r.status()).toBeLessThan(400);
    await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});
    await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.14.0');await expect(page.getByText('54 công cụ hoạt động')).toBeVisible();
    for(const key of v09)await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);
  });

  test('62 JavaScript-off fallback exposes 54 cards including v0.9',async()=>{
    const browser=await chromium.launch(),ctx=await browser.newContext({javaScriptEnabled:false}),page=await ctx.newPage();
    const r=await page.goto(`${BASE}/`,{waitUntil:'load'});expect(r.status()).toBeLessThan(400);await expect(page.locator('.grid .card')).toHaveCount(54);await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.14.0');
    for(const key of v09)await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);
    await ctx.close();await browser.close();
  });

  test('63 mobile WebKit home keeps v0.9 cards and every route opens on v0.14',async()=>{
    const browser=await webkit.launch(),ctx=await browser.newContext({...devices['iPhone 13']}),page=await ctx.newPage();
    await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});for(const key of v09)await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);
    for(const key of v09){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000})}
    await ctx.close();await browser.close();
  });
});
