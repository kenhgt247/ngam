import { test, expect, chromium, webkit, devices } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE='https://dhhd-tools-v022.vercel.app';
const root=process.cwd(),fx=path.join(root,'.fixtures-v10'),out=path.join(root,'test-results','v10-downloads');
const f={big1:path.join(fx,'big-one.pdf'),big2:path.join(fx,'big-two.pdf'),wm1:path.join(fx,'wm-one.pdf'),wm2:path.join(fx,'wm-two.pdf'),secret:path.join(fx,'secret.pdf')};

async function textPdf(file,labels){const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.HelveticaBold);for(const label of labels){const p=pdf.addPage([595.28,841.89]);p.drawText(label,{x:55,y:700,size:28,font});p.drawText('DHHD V10 QA',{x:55,y:650,size:16,font})}await fs.writeFile(file,await pdf.save())}
async function bigPdf(file,jpeg){const pdf=await PDFDocument.create(),img=await pdf.embedJpg(jpeg),p=pdf.addPage([595.28,841.89]);p.drawImage(img,{x:0,y:0,width:595.28,height:841.89});await fs.writeFile(file,await pdf.save({useObjectStreams:true}))}
async function fixtures(){
  await fs.mkdir(fx,{recursive:true});await fs.mkdir(out,{recursive:true});
  const w=1800,h=2400,raw=Buffer.alloc(w*h*3);let z=0x12345678;for(let i=0;i<raw.length;i++){z=(1664525*z+1013904223)>>>0;raw[i]=(z>>>16)&255}const jpeg=await sharp(raw,{raw:{width:w,height:h,channels:3}}).jpeg({quality:94}).toBuffer();
  await bigPdf(f.big1,jpeg);await bigPdf(f.big2,jpeg);expect((await fs.stat(f.big1)).size).toBeGreaterThan(1024*1024);
  await textPdf(f.wm1,['WATERMARK SOURCE ONE']);await textPdf(f.wm2,['WATERMARK SOURCE TWO A','WATERMARK SOURCE TWO B']);
  await textPdf(f.secret,['PUBLIC PAGE 1 SECRET_CODE_12345','PUBLIC PAGE 2 SECRET_CODE_12345']);
}
async function go(page,key){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.PDFLib&&!!window.JSZip,null,{timeout:30000});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000})}
async function dl(page,sel,name,timeout=240000){const wait=page.waitForEvent('download',{timeout});await page.locator(sel).click();const d=await wait,p=path.join(out,name);await d.saveAs(p);expect((await fs.stat(p)).size).toBeGreaterThan(80);return p}
async function validPdfBytes(bytes,count){const d=await PDFDocument.load(bytes);expect(d.getPageCount()).toBe(count);return d}
async function textViaSite(page,file){await go(page,'pdftotext');await page.setInputFiles('#txtf',file);await page.locator('#txtgo').click();await page.locator('#txtout').waitFor({state:'visible',timeout:60000});return await page.locator('#txtout').inputValue()}

test.beforeAll(fixtures);
test.describe.serial('DHHD v0.10 regression on v0.14 production',()=>{
  test('64 batch compress creates ZIP with two valid PDFs at or below 1MB',async({page})=>{
    await go(page,'batchcompress');await page.setInputFiles('#bcf',[f.big1,f.big2]);await page.locator('#bctarget').selectOption('1');await page.locator('#bcgo').click();await expect(page.locator('#bcdl')).toBeVisible({timeout:240000});
    const zpath=await dl(page,'#bcdl','64-batch-compress.zip'),zip=await JSZip.loadAsync(await fs.readFile(zpath)),pdfNames=Object.keys(zip.files).filter(n=>n.endsWith('.pdf'));expect(pdfNames).toHaveLength(2);
    for(const name of pdfNames){const bytes=await zip.file(name).async('uint8array');expect(bytes.length).toBeLessThanOrEqual(1024*1024);await validPdfBytes(bytes,1)}
    const report=await zip.file('DHHD-bao-cao-nen.txt').async('string');expect(report).toContain('1 MB');expect(report).toContain('big-one.pdf');expect(report).toContain('big-two.pdf');
  });

  test('65 batch watermark returns two changed PDFs with original page counts',async({page})=>{
    await go(page,'batchwatermark');await page.setInputFiles('#bwf',[f.wm1,f.wm2]);await page.locator('#bwtext').fill('DU HỌC HẢI DƯƠNG');await page.locator('#bwmode').selectOption('repeat');await page.locator('#bwgo').click();await expect(page.locator('#bwdl')).toBeVisible({timeout:90000});
    const zpath=await dl(page,'#bwdl','65-batch-watermark.zip'),zip=await JSZip.loadAsync(await fs.readFile(zpath)),names=Object.keys(zip.files).filter(n=>n.endsWith('.pdf')).sort();expect(names).toHaveLength(2);
    const a=await zip.file(names[0]).async('uint8array'),b=await zip.file(names[1]).async('uint8array');await validPdfBytes(a,1);await validPdfBytes(b,2);expect(a.length).toBeGreaterThan((await fs.stat(f.wm1)).size);expect(b.length).toBeGreaterThan((await fs.stat(f.wm2)).size);
  });

  test('66 keyword redaction requires review and exports raster PDF without secret text layer',async({page})=>{
    await go(page,'searchredact');await page.setInputFiles('#srf',f.secret);await page.locator('#srterms').fill('SECRET_CODE_12345');await page.locator('#srscan').click();await expect(page.locator('[data-sr]')).toHaveCount(2,{timeout:60000});await expect(page.locator('[data-sr]:checked')).toHaveCount(2);
    await page.locator('[data-sr]').nth(1).uncheck();await expect(page.locator('[data-sr]:checked')).toHaveCount(1);const p=await dl(page,'#srexport','66-search-redact.pdf');await validPdfBytes(await fs.readFile(p),2);await expect(page.locator('#msg')).toContainText('Đã che 1 vùng');const text=await textViaSite(page,p);expect(text).not.toContain('SECRET_CODE_12345');
  });

  test('67 v0.10 tools remain public on 54-tool v0.14 home',async({page})=>{
    await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.14.0');await expect(page.getByText('54 công cụ hoạt động')).toBeVisible();for(const key of ['batchcompress','batchwatermark','searchredact'])await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);
  });

  test('68 static fallback keeps v0.10 tools inside 54 cards',async()=>{
    const browser=await chromium.launch(),ctx=await browser.newContext({javaScriptEnabled:false}),page=await ctx.newPage();const r=await page.goto(`${BASE}/`,{waitUntil:'load'});expect(r.status()).toBeLessThan(400);await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.14.0');await expect(page.locator('.grid .card')).toHaveCount(54);for(const key of ['batchcompress','batchwatermark','searchredact'])await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);await ctx.close();await browser.close();
  });

  test('69 mobile WebKit keeps v0.10 tools on v0.14',async()=>{
    const browser=await webkit.launch(),ctx=await browser.newContext({...devices['iPhone 13']}),page=await ctx.newPage();await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});for(const key of ['batchcompress','batchwatermark','searchredact']){await page.goto(`${BASE}/#home`,{waitUntil:'load'});await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000})}await ctx.close();await browser.close();
  });
});
