import { test, expect } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE='https://dhhd-tools-v022.vercel.app';
const root=process.cwd(),fx=path.join(root,'.fixtures-v05'),out=path.join(root,'test-results','v05-downloads');
const f={text:path.join(fx,'text.pdf'),ocr:path.join(fx,'ocr.png'),blank:path.join(fx,'blank.pdf'),color:path.join(fx,'color.pdf'),wide:path.join(fx,'wide.pdf'),junk:path.join(fx,'junk.pdf')};

async function setup(){
 await fs.mkdir(fx,{recursive:true});await fs.mkdir(out,{recursive:true});
 let pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);for(let i=1;i<=2;i++){const p=pdf.addPage([595.28,841.89]);p.drawText(`DHHD TEXT QA PAGE ${i}`,{x:60,y:720,size:28,font});p.drawText('Editable native PDF text 12345',{x:60,y:670,size:18,font})}await fs.writeFile(f.text,await pdf.save());
 await sharp({create:{width:1100,height:500,channels:3,background:'white'}}).composite([{input:Buffer.from('<svg width="1100" height="500"><text x="70" y="210" font-family="Arial" font-size="92" fill="black">DHHD OCR 12345</text><text x="70" y="330" font-family="Arial" font-size="54" fill="black">DOCUMENT TEST</text></svg>'),top:0,left:0}]).png().toFile(f.ocr);
 pdf=await PDFDocument.create();let p=pdf.addPage([595.28,841.89]);p.drawText('PAGE ONE',{x:80,y:700,size:30,font:await pdf.embedFont(StandardFonts.Helvetica)});pdf.addPage([595.28,841.89]);p=pdf.addPage([595.28,841.89]);p.drawText('PAGE THREE',{x:80,y:700,size:30,font:await pdf.embedFont(StandardFonts.Helvetica)});await fs.writeFile(f.blank,await pdf.save());
 pdf=await PDFDocument.create();p=pdf.addPage([595.28,841.89]);p.drawRectangle({x:50,y:400,width:480,height:250,color:rgb(1,0,0)});p.drawRectangle({x:50,y:100,width:480,height:250,color:rgb(0,0,1)});await fs.writeFile(f.color,await pdf.save());
 pdf=await PDFDocument.create();p=pdf.addPage([1000,500]);p.drawText('WIDE PAGE',{x:100,y:250,size:40,font:await pdf.embedFont(StandardFonts.Helvetica)});await fs.writeFile(f.wide,await pdf.save());
 const normal=await fs.readFile(f.text);await fs.writeFile(f.junk,Buffer.concat([normal,Buffer.from('\n\nJUNK_AFTER_EOF_DHHD_QA\n'.repeat(20))]));
}
async function goto(page,key){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.PDFLib&&!!window.JSZip);await expect(page.locator('.toolHero h1')).toBeVisible()}
async function dl(page,sel,name,timeout=180000){const w=page.waitForEvent('download',{timeout});await page.locator(sel).click();const d=await w,p=path.join(out,name);await d.saveAs(p);expect((await fs.stat(p)).size).toBeGreaterThan(20);return p}
async function readPdf(p,n){const d=await PDFDocument.load(await fs.readFile(p));expect(d.getPageCount()).toBe(n);return d}

test.beforeAll(setup);
test.describe.serial('DHHD v0.5 regression real-file gate',()=>{
 test('24 PDF to Text extracts native text + TXT download',async({page})=>{await goto(page,'pdftotext');await page.setInputFiles('#txtf',f.text);await page.locator('#txtgo').click();await expect(page.locator('#txtout')).toContainText('');const value=await page.locator('#txtout').inputValue();expect(value).toContain('DHHD TEXT QA PAGE 1');expect(value).toContain('12345');const txt=await dl(page,'#txtdl','24-text.txt');expect(await fs.readFile(txt,'utf8')).toContain('DHHD TEXT QA PAGE 2')});
 test('25 OCR English recognizes real PNG + downloads TXT',async({page})=>{await goto(page,'ocr');await page.setInputFiles('#ocrf',f.ocr);await page.locator('#ocrlang').selectOption('eng');await page.locator('#ocrgo').click();await page.locator('#ocrout').waitFor({state:'visible',timeout:180000});const text=(await page.locator('#ocrout').inputValue()).toUpperCase();expect(text).toContain('DHHD');expect(text).toContain('12345');const txt=await dl(page,'#ocrdl','25-ocr.txt');expect((await fs.readFile(txt,'utf8')).toUpperCase()).toContain('DHHD')});
 test('26 blank page detector requires review and removes blank page',async({page})=>{await goto(page,'blankpages');await page.setInputFiles('#blankf',f.blank);await page.locator('#blankscan').click();await page.locator('[data-blank-page="1"]').waitFor({state:'visible',timeout:60000});await expect(page.locator('[data-blank-page]:checked')).toHaveCount(1);await readPdf(await dl(page,'#blankexport','26-no-blank.pdf'),2)});
 test('27 grayscale rebuild outputs valid same-size PDF',async({page})=>{await goto(page,'grayscale');await page.setInputFiles('#grayf',f.color);const d=await readPdf(await dl(page,'#graygo','27-gray.pdf'),1);const s=d.getPage(0).getSize();expect(Math.abs(s.width-595.28)).toBeLessThan(1);expect(Math.abs(s.height-841.89)).toBeLessThan(1)});
 test('28 resize wide PDF to portrait A4 with margin',async({page})=>{await goto(page,'resize');await page.setInputFiles('#resizef',f.wide);await page.locator('#paperorient').selectOption('portrait');const d=await readPdf(await dl(page,'#resizego','28-a4.pdf'),1),s=d.getPage(0).getSize();expect(Math.abs(s.width-595.28)).toBeLessThan(1);expect(Math.abs(s.height-841.89)).toBeLessThan(1)});
 test('29 repair/rebuild tolerates trailing garbage and outputs clean PDF',async({page})=>{await goto(page,'repair');await page.setInputFiles('#repairf',f.junk);const p=await dl(page,'#repairgo','29-repaired.pdf');await readPdf(p,2);expect((await fs.readFile(p)).includes(Buffer.from('JUNK_AFTER_EOF_DHHD_QA'))).toBeFalsy()});
 test('30 all six v0.5 tools remain public after v0.6 promotion',async({page})=>{await page.goto(`${BASE}/#home`);await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===35);for(const title of ['PDF → Text','OCR tài liệu','Xóa trang trắng','PDF đen trắng','Chuẩn hóa kích thước PDF','Repair / Rebuild PDF'])await expect(page.getByText(title,{exact:true})).toBeVisible()});
});
