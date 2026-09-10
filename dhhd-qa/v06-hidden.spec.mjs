import { test, expect } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE='https://dhhd-tools-v022.vercel.app';
const root=process.cwd(),fx=path.join(root,'.fixtures-v06'),out=path.join(root,'test-results','v06-downloads');
const files={a:path.join(fx,'compare-a.pdf'),b:path.join(fx,'compare-b.pdf'),overlay:path.join(fx,'overlay.pdf'),imgpdf:path.join(fx,'images.pdf'),crop:path.join(fx,'crop.pdf'),logo:path.join(fx,'logo.png'),scan:path.join(fx,'scan.pdf')};

async function makeFixtures(){
  await fs.mkdir(fx,{recursive:true});await fs.mkdir(out,{recursive:true});
  const fontDoc=async(changed=false)=>{const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.HelveticaBold);for(let i=0;i<2;i++){const p=pdf.addPage([595.28,841.89]);p.drawText('DHHD V06 QA',{x:70,y:740,size:30,font});p.drawRectangle({x:100,y:250,width:320,height:220,borderWidth:3,borderColor:rgb(.1,.2,.7)});if(changed&&i===1)p.drawRectangle({x:250,y:560,width:110,height:55,color:rgb(.8,.1,.1)})}return pdf.save()};
  await fs.writeFile(files.a,await fontDoc(false));await fs.writeFile(files.b,await fontDoc(true));
  {const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.HelveticaBold),p=pdf.addPage([595.28,841.89]);p.drawText('CONFIDENTIAL QA',{x:90,y:430,size:48,font,color:rgb(.85,.1,.1),opacity:.55});await fs.writeFile(files.overlay,await pdf.save())}
  await sharp({create:{width:420,height:260,channels:4,background:{r:255,g:255,b:255,alpha:1}}}).composite([{input:Buffer.from('<svg width="420" height="260"><rect width="420" height="260" fill="white"/><circle cx="100" cy="130" r="70" fill="red"/><text x="190" y="145" font-size="52">DHHD</text></svg>'),top:0,left:0}]).png().toFile(files.logo);
  {const pdf=await PDFDocument.create(),png=await pdf.embedPng(await fs.readFile(files.logo)),p=pdf.addPage([595.28,841.89]);p.drawImage(png,{x:80,y:400,width:300,height:186});await fs.writeFile(files.imgpdf,await pdf.save())}
  {const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),p=pdf.addPage([595.28,841.89]);p.drawText('CONTENT',{x:220,y:430,size:36,font});p.drawRectangle({x:170,y:300,width:250,height:260,borderWidth:4,borderColor:rgb(0,0,0)});await fs.writeFile(files.crop,await pdf.save())}
  {const img=await sharp({create:{width:800,height:1100,channels:3,background:{r:229,g:226,b:218}}}).composite([{input:Buffer.from('<svg width="800" height="1100"><rect x="80" y="90" width="640" height="920" fill="#efede5"/><text x="140" y="270" font-size="70" fill="#666">SCAN QA</text><line x1="140" y1="340" x2="650" y2="340" stroke="#777" stroke-width="6"/></svg>'),top:0,left:0}]).jpeg({quality:88}).toBuffer(),pdf=await PDFDocument.create(),jpg=await pdf.embedJpg(img),p=pdf.addPage([595.28,841.89]);p.drawImage(jpg,{x:0,y:0,width:595.28,height:841.89});await fs.writeFile(files.scan,await pdf.save())}
}
async function goto(page,key){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.PDFLib&&!!window.JSZip,null,{timeout:30000});await expect(page.locator('.toolHero h1')).toBeVisible()}
async function dl(page,selector,name,timeout=120000){const w=page.waitForEvent('download',{timeout});await page.locator(selector).click();const d=await w,dest=path.join(out,name);await d.saveAs(dest);expect((await fs.stat(dest)).size).toBeGreaterThan(80);return dest}
async function validPdf(file,count){const pdf=await PDFDocument.load(await fs.readFile(file));expect(pdf.getPageCount()).toBe(count);return pdf}

test.beforeAll(makeFixtures);
test.describe.serial('DHHD v0.6 hidden production real-file gate',()=>{
 test('33 compare PDF detects difference and exports diff PDF',async({page})=>{await goto(page,'comparepdf');await page.setInputFiles('#cmpa',files.a);await page.setInputFiles('#cmpb',files.b);await page.locator('#cmpgo').click();await expect(page.locator('#cmpdl')).toBeVisible({timeout:60000});await expect(page.locator('#cmpresult')).toContainText('trang có khác biệt');await validPdf(await dl(page,'#cmpdl','33-compare.pdf'),2)});
 test('34 overlay PDF repeats overlay and preserves page count',async({page})=>{await goto(page,'overlaypdf');await page.setInputFiles('#ovbase',files.a);await page.setInputFiles('#ovlayer',files.overlay);await validPdf(await dl(page,'#ovgo','34-overlay.pdf'),2)});
 test('35 extract embedded images returns PNG ZIP',async({page})=>{await goto(page,'extractimages');await page.setInputFiles('#eximgf',files.imgpdf);await page.locator('#eximggo').click();await expect(page.locator('#eximgdl')).toBeVisible({timeout:60000});const z=await dl(page,'#eximgdl','35-images.zip'),zip=await JSZip.loadAsync(await fs.readFile(z)),names=Object.keys(zip.files).filter(n=>n.endsWith('.png'));expect(names.length).toBeGreaterThanOrEqual(1);const b=await zip.file(names[0]).async('uint8array');expect([...b.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10])});
 test('36 auto crop requires review then reduces crop box',async({page})=>{await goto(page,'autocrop');await page.setInputFiles('#acropf',files.crop);await page.locator('#acropscan').click();await expect(page.locator('#acropapply')).toBeVisible({timeout:60000});const dst=await dl(page,'#acropapply','36-crop.pdf'),src=await PDFDocument.load(await fs.readFile(files.crop)),outpdf=await validPdf(dst,1);expect(outpdf.getPage(0).getCropBox().width).toBeLessThan(src.getPage(0).getCropBox().width)});
 test('37 image watermark/logo exports valid PDF',async({page})=>{await goto(page,'imagewatermark');await page.setInputFiles('#iwpdf',files.a);await page.setInputFiles('#iwimg',files.logo);await page.locator('#iwpos').selectOption('br');await validPdf(await dl(page,'#iwgo','37-logo.pdf'),2)});
 test('38 enhance scan B&W exports valid PDF',async({page})=>{await goto(page,'enhancescan');await page.setInputFiles('#enhf',files.scan);await page.locator('#enhmode').selectOption('bw');await validPdf(await dl(page,'#enhgo','38-enhance.pdf'),1)});
 test('39 hidden beta does not change public 29-tool home',async({page})=>{await page.goto(`${BASE}/#home`);await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===29);for(const key of ['comparepdf','overlaypdf','extractimages','autocrop','imagewatermark','enhancescan'])await expect(page.locator(`[href="#${key}"]`)).toHaveCount(0)});
});
