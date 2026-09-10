import { test, expect, webkit, devices } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE='https://dhhd-tools-v022.vercel.app';
const root=process.cwd(),fx=path.join(root,'.fixtures-v09'),out=path.join(root,'test-results','v09-downloads');
const f={front:path.join(fx,'front.pdf'),back:path.join(fx,'back.pdf'),keywords:path.join(fx,'keywords.pdf'),form:path.join(fx,'form.pdf')};

async function makeTextPdf(file,labels){
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.HelveticaBold);
  for(const label of labels){const p=pdf.addPage([595.28,841.89]);p.drawText(label,{x:60,y:700,size:30,font});p.drawText('DHHD V09 REAL FILE QA',{x:60,y:640,size:15,font})}
  await fs.writeFile(file,await pdf.save());
}
async function fixtures(){
  await fs.mkdir(fx,{recursive:true});await fs.mkdir(out,{recursive:true});
  await makeTextPdf(f.front,['FRONT 1','FRONT 2']);
  await makeTextPdf(f.back,['BACK 2','BACK 1']);
  await makeTextPdf(f.keywords,['HOC BA TARGET PAGE 1','OTHER DOCUMENT PAGE 2','HOC BA TARGET PAGE 3']);
  const pdf=await PDFDocument.create(),p=pdf.addPage([595.28,841.89]),form=pdf.getForm();
  const name=form.createTextField('Ho va ten');name.setText('');name.addToPage(p,{x:120,y:650,width:330,height:32});
  const code=form.createTextField('Ma ho so');code.addToPage(p,{x:120,y:590,width:200,height:32});
  const agree=form.createCheckBox('Dong y');agree.addToPage(p,{x:120,y:530,width:22,height:22});
  await fs.writeFile(f.form,await pdf.save());
}
async function go(page,key){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await page.waitForFunction(()=>!!window.PDFLib&&!!window.JSZip,null,{timeout:30000});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000})}
async function dl(page,sel,name,timeout=120000){const wait=page.waitForEvent('download',{timeout});await page.locator(sel).click();const d=await wait,p=path.join(out,name);await d.saveAs(p);expect((await fs.stat(p)).size).toBeGreaterThan(80);return p}
async function validPdf(file,count){const d=await PDFDocument.load(await fs.readFile(file));expect(d.getPageCount()).toBe(count);return d}
async function textViaSite(page,file){await go(page,'pdftotext');await page.setInputFiles('#txtf',file);await page.locator('#txtgo').click();await page.locator('#txtout').waitFor({state:'visible',timeout:60000});return await page.locator('#txtout').inputValue()}

test.beforeAll(fixtures);
test.describe.serial('DHHD v0.9 production real-file gate',()=>{
  test('56 duplex scan reverses back pass and interleaves pages correctly',async({page})=>{
    await go(page,'duplexscan');await expect(page.locator('.toolHero h1')).toHaveText('Ghép scan 2 mặt');
    await page.setInputFiles('#dupfront',f.front);await page.setInputFiles('#dupback',f.back);await expect(page.locator('#duprev')).toBeChecked();
    await page.locator('#dupgo').click();await expect(page.locator('#dupdl')).toBeVisible({timeout:60000});const p=await dl(page,'#dupdl','56-duplex.pdf');await validPdf(p,4);
    const text=await textViaSite(page,p),order=['FRONT 1','BACK 1','FRONT 2','BACK 2'].map(x=>text.indexOf(x));for(const i of order)expect(i).toBeGreaterThanOrEqual(0);expect(order).toEqual([...order].sort((a,b)=>a-b));
  });

  test('57 keyword extraction finds two pages, review deselect exports only chosen page',async({page})=>{
    await go(page,'keywordpages');await page.setInputFiles('#kwpf',f.keywords);await page.locator('#kwpterms').fill('HOC BA');await page.locator('#kwpscan').click();
    await expect(page.locator('[data-kwp-page]')).toHaveCount(2,{timeout:60000});await expect(page.locator('[data-kwp-page]:checked')).toHaveCount(2);
    await page.locator('[data-kwp-page="2"]').uncheck();await expect(page.locator('[data-kwp-page]:checked')).toHaveCount(1);
    const p=await dl(page,'#kwpexport','57-keyword.pdf');await validPdf(p,1);const text=await textViaSite(page,p);expect(text).toContain('TARGET PAGE 1');expect(text).not.toContain('TARGET PAGE 3');
  });

  test('58 AcroForm fill persists Vietnamese text and checkbox state',async({page})=>{
    await go(page,'formfill');await page.setInputFiles('#formf',f.form);await page.locator('#formread').click();await expect(page.locator('[data-form-i]')).toHaveCount(3,{timeout:30000});
    const fields=page.locator('[data-form-i]');await fields.nth(0).fill('Nguyễn Văn A');await fields.nth(1).fill('HS-2026-001');await fields.nth(2).check();
    const p=await dl(page,'#formexport','58-form.pdf',120000),pdf=await validPdf(p,1),form=pdf.getForm();expect(form.getTextField('Ho va ten').getText()).toBe('Nguyễn Văn A');expect(form.getTextField('Ma ho so').getText()).toBe('HS-2026-001');expect(form.getCheckBox('Dong y').isChecked()).toBeTruthy();
  });

  test('59 v0.9 remains public on 50-tool v0.10 home after route visit',async({page})=>{
    await go(page,'duplexscan');await page.goto(`${BASE}/#home`,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelectorAll('[data-tool-card]').length===50,null,{timeout:30000});
    await expect(page.getByText('50 công cụ hoạt động')).toBeVisible();for(const key of ['duplexscan','keywordpages','formfill'])await expect(page.locator(`[href="#${key}"]`)).toHaveCount(1);
  });

  test('60 mobile WebKit opens all public v0.9 routes',async()=>{
    const browser=await webkit.launch(),ctx=await browser.newContext({...devices['iPhone 13']}),page=await ctx.newPage();
    for(const key of ['duplexscan','keywordpages','formfill']){await page.goto(`${BASE}/#${key}`,{waitUntil:'load'});await expect(page.locator('.toolHero h1')).toBeVisible({timeout:30000})}
    await ctx.close();await browser.close();
  });
});
