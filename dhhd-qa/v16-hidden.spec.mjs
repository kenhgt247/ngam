import { test, expect, webkit, devices } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE='https://dhhd-tools-v022.vercel.app';
const root=process.cwd(),fx=path.join(root,'.fixtures-v16'),out=path.join(root,'test-results','v16-downloads');
const src=path.join(fx,'eight-pages.pdf'),wide=path.join(fx,'wide-two-pages.pdf');
const labs={reversepages:'Đảo thứ tự trang PDF',oddeven:'Tách trang chẵn / lẻ',blankinsert:'Chèn trang trắng',duplicatepages:'Nhân bản trang PDF',booklet:'Dàn trang in booklet',addmargins:'Thêm lề PDF'};

async function makePdf(file,size,count,prefix='PAGE'){
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.HelveticaBold);
  for(let i=1;i<=count;i++){const p=pdf.addPage(size);p.drawText(`${prefix} ${i}`,{x:60,y:size[1]-90,size:30,font})}
  await fs.writeFile(file,await pdf.save());
}
async function fixtures(){await fs.mkdir(fx,{recursive:true});await fs.mkdir(out,{recursive:true});await makePdf(src,[595.28,841.89],8);await makePdf(wide,[720,360],2,'MARGIN')}
async function go(page,key){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toHaveText(labs[key],{timeout:30000})}
async function saveDownload(page,selector,name){const wait=page.waitForEvent('download',{timeout:60000});await page.locator(selector).click();const d=await wait,p=path.join(out,name);await d.saveAs(p);expect((await fs.stat(p)).size).toBeGreaterThan(100);return p}
async function textPages(page,file){await page.goto(`${BASE}/#pdftotext`,{waitUntil:'load'});await page.setInputFiles('#txtf',file);await page.locator('#txtgo').click();await expect(page.locator('#txtout')).toBeVisible({timeout:30000});const text=await page.locator('#txtout').inputValue();return text.split(/===== TRANG \d+ =====\n/).slice(1).map(s=>s.trim())}

 test.beforeAll(fixtures);
 test.describe.serial('DHHD v0.16 hidden six-tool real-file release gate',()=>{
  test('88 reverse pages preserves eight pages in exact 8 to 1 order',async({page})=>{await go(page,'reversepages');await page.setInputFiles('#rpf',src);await page.locator('#rpgo').click();await expect(page.locator('#rpres [data-dl]')).toBeVisible();const p=await saveDownload(page,'#rpres [data-dl]','88-reverse.pdf');expect((await PDFDocument.load(await fs.readFile(p))).getPageCount()).toBe(8);expect(await textPages(page,p)).toEqual(['PAGE 8','PAGE 7','PAGE 6','PAGE 5','PAGE 4','PAGE 3','PAGE 2','PAGE 1'])});

  test('89 odd even ZIP contains correct four-page odd and even PDFs',async({page})=>{await go(page,'oddeven');await page.setInputFiles('#oef',src);await page.locator('#oego').click();await expect(page.locator('#oedl')).toBeVisible();const zp=await saveDownload(page,'#oedl','89-odd-even.zip'),zip=await JSZip.loadAsync(await fs.readFile(zp)),names=Object.keys(zip.files).filter(n=>n.endsWith('.pdf'));expect(names).toHaveLength(2);const oddName=names.find(n=>n.includes('trang-le')),evenName=names.find(n=>n.includes('trang-chan'));expect(oddName).toBeTruthy();expect(evenName).toBeTruthy();const op=path.join(out,'89-odd.pdf'),ep=path.join(out,'89-even.pdf');await fs.writeFile(op,await zip.file(oddName).async('nodebuffer'));await fs.writeFile(ep,await zip.file(evenName).async('nodebuffer'));expect((await PDFDocument.load(await fs.readFile(op))).getPageCount()).toBe(4);expect((await PDFDocument.load(await fs.readFile(ep))).getPageCount()).toBe(4);expect(await textPages(page,op)).toEqual(['PAGE 1','PAGE 3','PAGE 5','PAGE 7']);expect(await textPages(page,ep)).toEqual(['PAGE 2','PAGE 4','PAGE 6','PAGE 8'])});

  test('90 insert two blank pages after page two preserves exact position',async({page})=>{await go(page,'blankinsert');await page.setInputFiles('#bif',src);await page.locator('#bimode').selectOption('after');await page.locator('#bipage').fill('2');await page.locator('#bicount').fill('2');await page.locator('#bigo').click();await expect(page.locator('#bires [data-dl]')).toBeVisible();const p=await saveDownload(page,'#bires [data-dl]','90-blank-insert.pdf');expect((await PDFDocument.load(await fs.readFile(p))).getPageCount()).toBe(10);expect(await textPages(page,p)).toEqual(['PAGE 1','PAGE 2','','','PAGE 3','PAGE 4','PAGE 5','PAGE 6','PAGE 7','PAGE 8'])});

  test('91 duplicate selected pages inserts copies immediately after originals',async({page})=>{await go(page,'duplicatepages');await page.setInputFiles('#dupf',src);await page.locator('#duppages').fill('2,4');await page.locator('#dupcount').fill('1');await page.locator('#dupgo').click();await expect(page.locator('#dupres [data-dl]')).toBeVisible();const p=await saveDownload(page,'#dupres [data-dl]','91-duplicate.pdf');expect((await PDFDocument.load(await fs.readFile(p))).getPageCount()).toBe(10);expect(await textPages(page,p)).toEqual(['PAGE 1','PAGE 2','PAGE 2','PAGE 3','PAGE 4','PAGE 4','PAGE 5','PAGE 6','PAGE 7','PAGE 8'])});

  test('92 booklet creates four A4-landscape spreads with correct page pairs',async({page})=>{await go(page,'booklet');await page.setInputFiles('#bkf',src);await page.locator('#bkgo').click();await expect(page.locator('#bkdl')).toBeVisible();const p=await saveDownload(page,'#bkdl','92-booklet.pdf'),pdf=await PDFDocument.load(await fs.readFile(p));expect(pdf.getPageCount()).toBe(4);for(const pg of pdf.getPages()){const {width,height}=pg.getSize();expect(width).toBeCloseTo(841.89,1);expect(height).toBeCloseTo(595.28,1)}const pages=await textPages(page,p),pairs=[[8,1],[2,7],[6,3],[4,5]];expect(pages).toHaveLength(4);for(let i=0;i<4;i++){for(const n of pairs[i])expect(pages[i]).toContain(`PAGE ${n}`)}});

  test('93 add margins preserves original page size and native text layer',async({page})=>{const original=await fs.readFile(wide);await go(page,'addmargins');await page.setInputFiles('#amf',wide);await page.locator('#ammm').fill('20');await page.locator('#amgo').click();await expect(page.locator('#amres [data-dl]')).toBeVisible();const p=await saveDownload(page,'#amres [data-dl]','93-margins.pdf'),bytes=await fs.readFile(p),pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBe(2);for(const pg of pdf.getPages()){const {width,height}=pg.getSize();expect(width).toBeCloseTo(720,1);expect(height).toBeCloseTo(360,1)}expect(Buffer.compare(original,bytes)).not.toBe(0);expect(await textPages(page,p)).toEqual(['MARGIN 1','MARGIN 2'])});

  test('94 all six v0.16 routes remain hidden from certified 54-tool home',async({page})=>{await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.14.0');for(const key of Object.keys(labs))await expect(page.locator(`[href="#${key}"]`)).toHaveCount(0)});

  test('95 mobile WebKit opens all hidden routes and really reverses a PDF',async()=>{const browser=await webkit.launch(),ctx=await browser.newContext({...devices['iPhone 13'],acceptDownloads:true}),page=await ctx.newPage();for(const [key,title] of Object.entries(labs)){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toHaveText(title,{timeout:30000})}await page.goto(`${BASE}/#reversepages`,{waitUntil:'load'});await page.setInputFiles('#rpf',src);await page.locator('#rpgo').click();await expect(page.locator('#rpres [data-dl]')).toBeVisible();const wait=page.waitForEvent('download',{timeout:60000});await page.locator('#rpres [data-dl]').click();const d=await wait,p=path.join(out,'95-webkit-reverse.pdf');await d.saveAs(p);expect((await PDFDocument.load(await fs.readFile(p))).getPageCount()).toBe(8);await ctx.close();await browser.close()});
 });
