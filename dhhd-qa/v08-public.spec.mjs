import { test, expect, chromium, webkit, devices } from '@playwright/test';

const BASE='https://dhhd-tools-v022.vercel.app';
const v08=['searchocr','smartprivacy','dossier'];

test.describe.serial('DHHD v0.8 public regression on v0.10 production',()=>{
  test('53 v0.8 tools remain on 50-tool public home',async({page})=>{
    const r=await page.goto(`${BASE}/#home`,{waitUntil:'load'});expect(r.status()).toBeLessThan(400);
    await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===50,null,{timeout:30000});
    await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.10.0');
    await expect(page.getByText('50 công cụ hoạt động')).toBeVisible();
    for(const key of v08)await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);
  });

  test('54 static fallback keeps v0.8 tools inside 50 cards',async()=>{
    const browser=await chromium.launch(),ctx=await browser.newContext({javaScriptEnabled:false}),page=await ctx.newPage();
    const r=await page.goto(`${BASE}/`,{waitUntil:'load'});expect(r.status()).toBeLessThan(400);
    await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.10.0');
    await expect(page.locator('.grid .card')).toHaveCount(50);
    for(const key of v08)await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);
    await ctx.close();await browser.close();
  });

  test('55 mobile WebKit still opens all v0.8 routes on v0.10',async()=>{
    const browser=await webkit.launch(),ctx=await browser.newContext({...devices['iPhone 13']}),page=await ctx.newPage();
    await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===50,null,{timeout:30000});
    for(const key of v08)await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);
    for(const key of v08){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000})}
    await ctx.close();await browser.close();
  });
});
