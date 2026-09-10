import { test, expect, chromium, webkit, devices } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE='https://dhhd-tools-v022.vercel.app';
const root=process.cwd(),fx=path.join(root,'.fixtures-v14'),out=path.join(root,'test-results','v14-downloads'),src=path.join(fx,'web-source.pdf');

async function fixture(){await fs.mkdir(fx,{recursive:true});await fs.mkdir(out,{recursive:true});const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);for(let i=1;i<=5;i++){const p=pdf.addPage([595.28,841.89]);p.drawText(`DHHD WEB OPTIMIZE PAGE ${i}`,{x:50,y:730,size:24,font});for(let y=650;y>100;y-=24)p.drawText(`Line ${i}-${y} Lorem ipsum document profile test`,{x:50,y,size:11,font})}await fs.writeFile(src,await pdf.save({useObjectStreams:true}))}
async function runOptimize(page,name){await page.goto(`${BASE}/#weboptimize`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000});await page.setInputFiles('#wof',src);const dl=page.waitForEvent('download',{timeout:180000});await page.locator('#wogo').click();await expect(page.locator('#wodl')).toBeVisible({timeout:180000});await page.locator('#wodl').click();const d=await dl,p=path.join(out,name);await d.saveAs(p);return p}
async function validate(file){const b=await fs.readFile(file),head=b.subarray(0,4096).toString('latin1');expect(head).toMatch(/\/Linearized\s+[0-9.]+/);const pdf=await PDFDocument.load(b);expect(pdf.getPageCount()).toBe(5);return b}

test.beforeAll(fixture);
test.describe.serial('DHHD v0.14 public qpdf web optimization release gate',()=>{
  test('82 qpdf Web Optimize creates a real linearized PDF with same page count',async({page})=>{const p=await runOptimize(page,'82-web-linearized.pdf');await validate(p);await expect(page.locator('#msg')).toContainText('đã xác minh cấu trúc Linearized')});
  test('83 web optimizer is public on 54-tool home, survives lazy-load, and exists in JS-off fallback',async({page})=>{
    await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});await expect(page.locator('[href="#weboptimize"]')).toHaveCount(1);await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.14.0');await expect(page.getByText('54 công cụ hoạt động')).toBeVisible();
    await page.goto(`${BASE}/#weboptimize`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toHaveText('Web Optimize PDF',{timeout:30000});await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});await expect(page.locator('[href="#weboptimize"]')).toHaveCount(1);
    const browser=await chromium.launch(),ctx=await browser.newContext({javaScriptEnabled:false}),fallback=await ctx.newPage();const r=await fallback.goto(`${BASE}/`,{waitUntil:'load'});expect(r.status()).toBeLessThan(400);await expect(fallback.locator('.grid .card')).toHaveCount(54);await expect(fallback.locator('[href="#weboptimize"]')).toHaveCount(1);await expect(fallback.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.14.0');await ctx.close();await browser.close();
  });
  test('84 mobile WebKit runs qpdf WASM and produces linearized output',async()=>{const browser=await webkit.launch(),ctx=await browser.newContext({...devices['iPhone 13']}),page=await ctx.newPage();await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});await expect(page.locator('[href="#weboptimize"]')).toHaveCount(1);const p=await runOptimize(page,'84-webkit-linearized.pdf');await validate(p);await ctx.close();await browser.close()});
});
