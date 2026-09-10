import { test, expect, webkit, devices } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const BASE='https://dhhd-tools-v022.vercel.app';
const root=process.cwd(),fx=path.join(root,'.fixtures-v15'),out=path.join(root,'test-results','v15-downloads');
const src=path.join(fx,'archive-source.pdf');

async function fixture(){
  await fs.mkdir(fx,{recursive:true});await fs.mkdir(out,{recursive:true});
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle('DHHD SOURCE METADATA');pdf.setAuthor('QA AUTHOR');
  const p1=pdf.addPage([595.28,841.89]);p1.drawText('DHHD ARCHIVE SOURCE PAGE 1',{x:50,y:760,size:22,font});p1.drawRectangle({x:50,y:620,width:220,height:80,color:rgb(.2,.5,.8)});
  const form=pdf.getForm(),field=form.createTextField('student_name');field.setText('ARCHIVE FORM VALUE');field.addToPage(p1,{x:50,y:540,width:300,height:36});
  const p2=pdf.addPage([841.89,595.28]);p2.drawText('DHHD ARCHIVE SOURCE PAGE 2 LANDSCAPE',{x:50,y:520,size:22,font});p2.drawRectangle({x:50,y:300,width:420,height:120,color:rgb(.8,.3,.2)});
  await fs.writeFile(src,await pdf.save({useObjectStreams:true}));
}

async function openTool(page){await page.goto(`${BASE}/#pdfa`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toHaveText('PDF/A-2b lưu trữ',{timeout:30000});await page.setInputFiles('#pdfaf',src)}
async function makeCandidate(page,name){
  await openTool(page);const wait=page.waitForEvent('download',{timeout:180000});await page.locator('#pdfago').click();await expect(page.locator('#pdfadl')).toBeVisible({timeout:180000});await page.locator('#pdfadl').click();const d=await wait,p=path.join(out,name);await d.saveAs(p);expect((await fs.stat(p)).size).toBeGreaterThan(1000);return p;
}
function verifyVera(file){
  const bin=process.env.VERAPDF_BIN;expect(bin,'VERAPDF_BIN must be installed by workflow').toBeTruthy();
  const r=spawnSync(bin,['-f','2b','--format','text','--loglevel','0',file],{encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  if(r.error)throw r.error;expect(r.status,`veraPDF stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);expect(r.stdout.trim(),`veraPDF stderr: ${r.stderr}`).toMatch(/^PASS\b/m);return r.stdout;
}
async function inspect(file){
  const bytes=await fs.readFile(file),raw=bytes.toString('latin1');expect(raw).toMatch(/pdfaid:part/i);expect(raw).toMatch(/pdfaid:conformance/i);expect(raw).toMatch(/\/OutputIntents\b/);
  const pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBe(2);const s1=pdf.getPage(0).getSize(),s2=pdf.getPage(1).getSize();expect(s1.width).toBeCloseTo(595.28,1);expect(s1.height).toBeCloseTo(841.89,1);expect(s2.width).toBeCloseTo(841.89,1);expect(s2.height).toBeCloseTo(595.28,1);expect(pdf.getForm().getFields()).toHaveLength(0);return bytes;
}
async function textViaSite(page,file){await page.goto(`${BASE}/#pdftotext`,{waitUntil:'load'});await page.setInputFiles('#txtf',file);await page.locator('#txtgo').click();await page.locator('#txtout').waitFor({state:'visible',timeout:60000});return await page.locator('#txtout').inputValue()}

test.beforeAll(fixture);
test.describe.serial('DHHD v0.15 hidden PDF-A 2b external conformance gate',()=>{
  test('85 Chromium creates visual archive candidate that passes veraPDF PDF/A-2b',async({page})=>{const p=await makeCandidate(page,'85-pdfa-2b.pdf');await inspect(p);verifyVera(p);await expect(page.locator('#msg')).toContainText('đang giữ beta')});
  test('86 visual archive removes interactive form and original selectable text',async({page})=>{const p=await makeCandidate(page,'86-pdfa-visual.pdf');await inspect(p);const text=await textViaSite(page,p);expect(text).not.toContain('DHHD ARCHIVE SOURCE');expect(text).not.toContain('ARCHIVE FORM VALUE');verifyVera(p)});
  test('87 PDF-A stays hidden on 54-tool home and WebKit output also passes veraPDF 2b',async()=>{
    const browser=await webkit.launch(),ctx=await browser.newContext({...devices['iPhone 13']}),page=await ctx.newPage();await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});await expect(page.locator('[href="#pdfa"]')).toHaveCount(0);const p=await makeCandidate(page,'87-webkit-pdfa-2b.pdf');await inspect(p);verifyVera(p);await ctx.close();await browser.close();
  });
});
