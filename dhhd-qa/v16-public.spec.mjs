import { test, expect } from '@playwright/test';

const BASE='https://dhhd-tools-v022.vercel.app';
const public60=['merge','split','organize','crop','rotate','numbers','watermark','images','jpg','png','compress','flatten','metadata','redact','protect','unlock','privacy','targetcompress','scanner','sign','heic','splitscan','nup','pdftotext','ocr','blankpages','grayscale','resize','repair','comparepdf','overlaypdf','extractimages','autocrop','imagewatermark','enhancescan','splitbysize','longimage','headerfooter','annotate','deskew','markdown','searchocr','smartprivacy','dossier','duplexscan','keywordpages','formfill','batchcompress','batchwatermark','searchredact','batchnormalize','batchocr','splitbypages','weboptimize','reversepages','oddeven','blankinsert','duplicatepages','booklet','addmargins'];
const v16=['reversepages','oddeven','blankinsert','duplicatepages','booklet','addmargins'];

test.describe.serial('DHHD v0.16 public 60-tool production release gate',()=>{
  test('96 public home exposes exactly 60 unique tools and keeps unreleased labs hidden',async({page})=>{
    const r=await page.goto(`${BASE}/#home`,{waitUntil:'load'});expect(r.status()).toBeLessThan(400);
    await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===60,null,{timeout:30000});
    await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.16.0');
    await expect(page.getByText('60 công cụ hoạt động')).toBeVisible();
    for(const key of public60)await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);
    const hrefs=await page.locator('[data-tool-card]').evaluateAll(es=>es.map(e=>e.getAttribute('href')));expect(new Set(hrefs).size).toBe(60);
    for(const key of ['pdfa','pdftoword','pdftoexcel','wordtopdf','exceltopdf','ppttopdf'])await expect(page.locator(`[href="#${key}"]`)).toHaveCount(0);
  });

  test('97 Chromium opens every one of the 60 public routes',async({page})=>{
    for(const key of public60){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000})}
  });

  test('98 v0.16 lazy-load cannot demote its six cards when returning home',async({page})=>{
    for(const key of v16){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000})}
    await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===60,null,{timeout:30000});
    await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.16.0');for(const key of v16)await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);
  });
});
