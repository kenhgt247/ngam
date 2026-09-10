import { test, expect, webkit, devices } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE='https://dhhd-tools-v022.vercel.app';
const fixture=path.join(process.cwd(),'.fixtures-v05-public','mobile-sign.pdf');

test.beforeAll(async()=>{
  await fs.mkdir(path.dirname(fixture),{recursive:true});
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),page=pdf.addPage([595.28,841.89]);
  page.drawText('DHHD MOBILE SIGN QA',{x:70,y:720,size:28,font});
  await fs.writeFile(fixture,await pdf.save());
});

test('31 public home exposes 41 tools on v0.7',async({page})=>{
  const r=await page.goto(`${BASE}/#home`,{waitUntil:'load'});
  expect(r.status()).toBeLessThan(400);
  await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===41);
  await expect(page.getByText('41 công cụ hoạt động')).toBeVisible();
  await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.7.0');
});

test('32 mobile WebKit home/scanner/sign after v0.7 promotion',async()=>{
  const browser=await webkit.launch(),ctx=await browser.newContext({...devices['iPhone 13']}),page=await ctx.newPage();
  await page.goto(`${BASE}/#home`,{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===41);
  await expect(page.locator('.topbar')).toBeVisible();
  await page.goto(`${BASE}/#scanner`,{waitUntil:'load'});
  await expect(page.locator('#cameraBtn')).toBeVisible();
  await page.goto(`${BASE}/#sign`,{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.PDFLib);
  await page.setInputFiles('#signf',fixture);
  await expect(page.locator('#sig')).toBeVisible();
  await ctx.close();await browser.close();
});
