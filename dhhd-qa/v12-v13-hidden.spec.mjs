import { test, expect, webkit, devices } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE='https://dhhd-tools-v022.vercel.app';
const labs=['pdftoword','pdftoexcel','wordtopdf','exceltopdf','ppttopdf'];
const root=process.cwd(),fx=path.join(root,'.fixtures-v12v13');
const pdfFile=path.join(fx,'quality-lab.pdf'),docxFile=path.join(fx,'dummy.docx'),xlsxFile=path.join(fx,'dummy.xlsx'),pptxFile=path.join(fx,'dummy.pptx');

async function fixtures(){
  await fs.mkdir(fx,{recursive:true});
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.HelveticaBold),p=pdf.addPage([595.28,841.89]);p.drawText('DHHD QUALITY LAB',{x:60,y:700,size:30,font});await fs.writeFile(pdfFile,await pdf.save());
  await fs.writeFile(docxFile,Buffer.from('PK\x03\x04dummy-docx'));await fs.writeFile(xlsxFile,Buffer.from('PK\x03\x04dummy-xlsx'));await fs.writeFile(pptxFile,Buffer.from('PK\x03\x04dummy-pptx'));
}

test.beforeAll(fixtures);
test.describe.serial('DHHD v0.12/v0.13 hidden high-fidelity quality-lab safety gate',()=>{
  test('76 conversion control-plane reports configuration state without secrets',async({request})=>{
    const r=await request.get(`${BASE}/api/pdf-export`);expect(r.status()).toBe(200);const j=await r.json();expect(j.ok).toBeTruthy();expect(j.engine).toBe('Adobe PDF Services');expect(j.uploadPath).toBe('direct-to-provider');expect(j.exportFormats).toEqual(expect.arrayContaining(['docx','xlsx']));expect(j.createPdfFrom).toEqual(expect.arrayContaining(['docx','xlsx','pptx']));
    const raw=JSON.stringify(j).toLowerCase();expect(raw).not.toContain('client_secret');expect(raw).not.toContain('client_id');expect(raw).not.toContain('pdf_services_client');
  });

  test('77 API rejects cross-origin and unsupported conversion requests before upload',async({request})=>{
    const badOrigin=await request.post(`${BASE}/api/pdf-export`,{headers:{Origin:'https://evil.example','Content-Type':'application/json'},data:{action:'initExport',targetFormat:'docx'}});expect(badOrigin.status()).toBe(403);
    const unsupported=await request.post(`${BASE}/api/pdf-export`,{headers:{Origin:BASE,'Content-Type':'application/json'},data:{action:'initExport',targetFormat:'exe'}});expect(unsupported.status()).toBe(400);
  });

  test('78 public home remains exactly 54 tools and all five quality-lab routes stay hidden',async({page})=>{
    await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});await expect(page.locator('.hero .eyebrow')).toHaveText('DHHD TOOLS v0.14.0');for(const key of labs)await expect(page.locator(`[href="#${key}"]`)).toHaveCount(0);
  });

  test('79 PDF to Office labs fail closed when engine is not configured',async({page,request})=>{
    const st=await (await request.get(`${BASE}/api/pdf-export`)).json();expect(st.configured).toBeFalsy();
    for(const key of ['pdftoword','pdftoexcel']){
      await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000});await expect(page.getByText('Engine chuẩn cao chưa được mở')).toBeVisible();await page.setInputFiles('#v12file',pdfFile);await expect(page.locator('#v12consent')).toBeDisabled();await expect(page.locator('#v12go')).toBeDisabled();
    }
    const init=await request.post(`${BASE}/api/pdf-export`,{headers:{Origin:BASE,'Content-Type':'application/json'},data:{action:'initExport',targetFormat:'docx'}});expect(init.status()).toBe(503);const j=await init.json();expect(j.code).toBe('ENGINE_NOT_CONFIGURED');
  });

  test('80 Office to PDF labs also fail closed without low-quality fallback',async({page,request})=>{
    const st=await (await request.get(`${BASE}/api/pdf-export`)).json();expect(st.configured).toBeFalsy();
    const pairs=[['wordtopdf',docxFile],['exceltopdf',xlsxFile],['ppttopdf',pptxFile]];
    for(const [key,file] of pairs){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000});await expect(page.getByText('Engine chuẩn cao chưa được mở')).toBeVisible();await page.setInputFiles('#v13file',file);await expect(page.locator('#v13consent')).toBeDisabled();await expect(page.locator('#v13go')).toBeDisabled()}
  });

  test('81 mobile WebKit can open all hidden quality-lab routes while 54-tool home stays public',async()=>{
    const browser=await webkit.launch(),ctx=await browser.newContext({...devices['iPhone 13']}),page=await ctx.newPage();await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===54,null,{timeout:30000});for(const key of labs){await expect(page.locator(`[href="#${key}"]`)).toHaveCount(0);await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000});await page.goto(`${BASE}/#home`,{waitUntil:'load'})}await ctx.close();await browser.close();
  });
});
