import { test, expect, webkit, devices } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE='https://dhhd-tools-v022.vercel.app';
const root=process.cwd(),fx=path.join(root,'.fixtures-v08'),out=path.join(root,'test-results','v08-downloads');
const f={searchImg:path.join(fx,'search.png'),searchPdf:path.join(fx,'search.pdf'),privacyImg:path.join(fx,'privacy.png'),privacyPdf:path.join(fx,'privacy.pdf'),native:path.join(fx,'native.pdf'),photo:path.join(fx,'photo.jpg')};

async function imagePdf(imgPath,pdfPath){
  const img=await fs.readFile(imgPath),pdf=await PDFDocument.create(),emb=await pdf.embedPng(img),p=pdf.addPage([595.28,841.89]);
  const s=Math.min(520/emb.width,700/emb.height),w=emb.width*s,h=emb.height*s;p.drawImage(emb,{x:(595.28-w)/2,y:(841.89-h)/2,width:w,height:h});
  await fs.writeFile(pdfPath,await pdf.save());
}
async function setup(){
  await fs.mkdir(fx,{recursive:true});await fs.mkdir(out,{recursive:true});
  await sharp({create:{width:1400,height:700,channels:3,background:'white'}}).composite([{input:Buffer.from('<svg width="1400" height="700"><rect width="1400" height="700" fill="white"/><text x="90" y="270" font-family="Arial" font-size="104" font-weight="700" fill="black">DHHD SEARCH OCR</text><text x="90" y="450" font-family="Arial" font-size="100" fill="black">67890 DOCUMENT</text></svg>'),top:0,left:0}]).png().toFile(f.searchImg);
  await imagePdf(f.searchImg,f.searchPdf);
  await sharp({create:{width:1500,height:850,channels:3,background:'white'}}).composite([{input:Buffer.from('<svg width="1500" height="850"><rect width="1500" height="850" fill="white"/><text x="80" y="240" font-family="Arial" font-size="88" font-weight="700" fill="black">CCCD 012345678901</text><text x="80" y="420" font-family="Arial" font-size="88" fill="black">PHONE 0987654321</text><text x="80" y="600" font-family="Arial" font-size="72" fill="black">PUBLIC TEXT</text></svg>'),top:0,left:0}]).png().toFile(f.privacyImg);
  await imagePdf(f.privacyImg,f.privacyPdf);
  {const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.HelveticaBold),p=pdf.addPage([700,1000]);p.drawText('DHHD DOSSIER PAGE',{x:90,y:820,size:42,font});p.drawRectangle({x:70,y:150,width:560,height:700,borderWidth:3,borderColor:rgb(0,0,0)});await fs.writeFile(f.native,await pdf.save())}
  await sharp({create:{width:900,height:1300,channels:3,background:{r:242,g:240,b:234}}}).composite([{input:Buffer.from('<svg width="900" height="1300"><rect x="100" y="120" width="700" height="1050" fill="white" stroke="black" stroke-width="5"/><text x="170" y="360" font-family="Arial" font-size="80" fill="black">PHOTO PAGE</text></svg>'),top:0,left:0}]).jpeg({quality:90}).toFile(f.photo);
}
async function goto(page,key){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.PDFLib&&!!window.JSZip,null,{timeout:30000});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000})}
async function dl(page,sel,name,timeout=240000){const w=page.waitForEvent('download',{timeout});await page.locator(sel).click();const d=await w,p=path.join(out,name);await d.saveAs(p);expect((await fs.stat(p)).size).toBeGreaterThan(100);return p}
async function validPdf(p,count){const d=await PDFDocument.load(await fs.readFile(p));expect(d.getPageCount()).toBe(count);return d}
async function pdfTextViaSite(page,file){await goto(page,'pdftotext');await page.setInputFiles('#txtf',file);await page.locator('#txtgo').click();await page.locator('#txtout').waitFor({state:'visible',timeout:60000});return await page.locator('#txtout').inputValue()}

test.beforeAll(setup);
test.describe.serial('DHHD v0.8 hidden production real-file gate',()=>{
  test('48 Searchable OCR creates valid PDF with extractable text layer',async({page})=>{
    await goto(page,'searchocr');await expect(page.locator('.toolHero h1')).toHaveText('Searchable OCR PDF');await page.setInputFiles('#socf',f.searchPdf);await page.locator('#soclang').selectOption('eng');
    await page.locator('#socgo').click();await expect(page.locator('#socdl')).toBeVisible({timeout:240000});const p=await dl(page,'#socdl','48-searchable.pdf');await validPdf(p,1);
    const text=(await pdfTextViaSite(page,p)).toUpperCase();expect(text).toContain('DHHD');expect(text).toContain('67890');
  });
  test('49 Smart Privacy detects CCCD/phone and exports raster-redacted PDF',async({page})=>{
    await goto(page,'smartprivacy');await page.setInputFiles('#spif',f.privacyPdf);await page.locator('#spilang').selectOption('eng');await page.locator('#spiscan').click();
    await page.locator('[data-pii]').first().waitFor({state:'visible',timeout:240000});await expect(page.locator('#spiresult')).toContainText('CCCD 12 số');await expect(page.locator('[data-pii]:checked')).not.toHaveCount(0);
    const p=await dl(page,'#spiexport','49-smart-privacy.pdf');await validPdf(p,1);const text=await pdfTextViaSite(page,p);expect(text).not.toContain('012345678901');expect(text).not.toContain('0987654321');
  });
  test('50 Dossier normalizer merges PDF + JPG into two A4 portrait pages',async({page})=>{
    await goto(page,'dossier');await page.setInputFiles('#dosf',[f.native,f.photo]);await page.locator('#dosgo').click();await expect(page.locator('#dosdl')).toBeVisible({timeout:120000});const p=await dl(page,'#dosdl','50-dossier.pdf'),pdf=await validPdf(p,2);
    for(const pg of pdf.getPages()){const s=pg.getSize();expect(Math.abs(s.width-595.28)).toBeLessThan(1);expect(Math.abs(s.height-841.89)).toBeLessThan(1)}
  });
  test('51 v0.8 remains hidden from 41-tool public home',async({page})=>{
    await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===41);await expect(page.getByText('41 công cụ hoạt động')).toBeVisible();
    for(const key of ['searchocr','smartprivacy','dossier'])await expect(page.locator(`[href="#${key}"]`)).toHaveCount(0);
  });
  test('52 mobile WebKit opens all hidden v0.8 routes',async()=>{
    const browser=await webkit.launch(),ctx=await browser.newContext({...devices['iPhone 13']}),page=await ctx.newPage();
    for(const key of ['searchocr','smartprivacy','dossier']){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await page.waitForFunction(()=>!!document.querySelector('.toolHero h1'),null,{timeout:30000});await expect(page.locator('.toolHero h1')).toBeVisible()}
    await ctx.close();await browser.close();
  });
});
