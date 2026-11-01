const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_URL||'http://127.0.0.1:3000');
 const library=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('promptfolio-v1')));
 // Seed a persisted legacy role with no metadata, keeping all prompt and documentation data.
 await page.evaluate(async()=>{const {seed}=await import('/model.js');const {starterDocumentation}=await import('/docs.js');const d=seed();d.documentation=starterDocumentation();d.workflows=[];d.roles=[{id:'legacy',name:'Legacy reviewer',responsibilities:'Review evidence',activities:'Read findings',expertise:'Quality',boundaries:'Escalate',skills:[]}];localStorage.setItem('promptfolio-v1',JSON.stringify(d));});
 await page.reload();const before=await library();
 const roles=()=>page.getByRole('button',{name:'Roles',exact:true}).click();
 const open=()=>page.getByRole('button',{name:'Import roles',exact:true}).click();
 const upload=source=>page.locator('#roles-file').setInputFiles({name:'roles.json',mimeType:'application/json',buffer:Buffer.from(typeof source==='string'?source:JSON.stringify(source))});
 const wrap=roles=>({format:'promptfolio-roles',version:1,roles});
 await roles();await open();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download template',exact:true}).click();const download=await downloadPromise;const fs=require('node:fs/promises');const template=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(template.format,'promptfolio-roles');
 await upload(template);await page.getByRole('heading',{name:'Preview: 1 roles to add'}).waitFor();assert.deepEqual(await library(),before);
 await page.getByRole('button',{name:'Close dialog'}).click();assert.deepEqual(await library(),before);
 await open();
 for(const input of ['{bad',wrap([{name:'Valid'},{name:'Bad',skills:['missing']}]),wrap([{name:'Bad',projects:['unknown']}]),wrap([{name:'Bad',tags:[null]}])]){
 await upload(input);await page.waitForFunction(()=>document.querySelector('#role-import-error').textContent.length>0);assert.ok(await page.locator('#add-imported-roles').isDisabled());assert.deepEqual(await library(),before);
 }
 await page.locator('#roles-file').setInputFiles({name:'large.json',mimeType:'application/json',buffer:Buffer.alloc(1_000_001,32)});await page.waitForFunction(()=>document.querySelector('#role-import-error').textContent.includes('1 MB'));
 const payload=wrap([{id:'legacy',name:'Company reviewer',projects:['starter'],tags:['Acme, Inc.','quality'],skills:['research'],responsibilities:['Assess risk'],activities:['Review evidence']},{name:'Shared reviewer',tags:['Acme, Inc.']}]);
 await upload(payload);await page.getByRole('heading',{name:'Preview: 2 roles to add'}).waitFor();assert.match(await page.locator('#role-preview').innerText(),/Assess risk/);assert.deepEqual(await library(),before);
 await page.getByRole('button',{name:'Add imported roles',exact:true}).click();const imported=await library();assert.equal(imported.roles.length,3);assert.notEqual(imported.roles[1].id,'legacy');assert.deepEqual(imported.roles[0],before.roles[0]);assert.deepEqual(imported.prompts,before.prompts);assert.deepEqual(imported.documentation,before.documentation);
 const count=async n=>assert.equal(await page.locator('[data-role-card]:visible').count(),n);
 await count(3);await page.locator('#role-tag-filter').selectOption('Acme, Inc.');await count(2);await page.locator('#role-project-filter').selectOption('starter');await count(1);await page.locator('#role-unassigned-filter').check();await count(0);assert.match(await page.locator('#role-count').innerText(),/no matching roles/);
 await page.locator('#role-project-filter').selectOption('');await count(1);await page.locator('#role-tag-filter').selectOption('');await count(2);await page.locator('#role-unassigned-filter').uncheck();
 await page.locator(`[data-role-card="${imported.roles[1].id}"]`).getByRole('button',{name:'Edit role'}).click();assert.equal(await page.locator('#role-editor [name=tags]').inputValue(),'Acme, Inc.\nquality');assert.ok(await page.locator('#role-editor [name=projects]').isChecked());await page.getByRole('button',{name:'Save role',exact:true}).click();assert.deepEqual((await library()).roles[1],imported.roles[1]);
 // Assign metadata to a legacy role through the UI, then clear it again.
 await page.locator('[data-role-card="legacy"]').getByRole('button',{name:'Edit role'}).click();await page.locator('#role-editor [name=projects]').check();await page.locator('#role-editor [name=tags]').fill('Company\nCompany\n  Team  ');await page.getByRole('button',{name:'Save role',exact:true}).click();assert.deepEqual((await library()).roles[0].tags,['Company','Team']);
 await page.locator('[data-role-card="legacy"]').getByRole('button',{name:'Edit role'}).click();await page.locator('#role-editor [name=projects]').uncheck();await page.locator('#role-editor [name=tags]').fill('');await page.getByRole('button',{name:'Save role',exact:true}).click();const saved=await library();assert.deepEqual(saved.roles[0].projects,[]);assert.deepEqual(saved.roles[0].tags,[]);
 await page.reload();await roles();await count(3);assert.deepEqual(await library(),saved);
 const backupPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:false}).click();const backup=await fs.readFile(await (await backupPromise).path());await page.locator('#import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:backup});await page.getByRole('button',{name:'Replace library',exact:true}).click();assert.deepEqual(await library(),saved);await roles();
 const invalid=structuredClone(saved);invalid.roles[1].projects=['missing'];await page.locator('#import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});await page.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Invalid backup'));assert.deepEqual(await library(),saved);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Roles mobile overflow');await open();await upload(payload);await page.getByRole('heading',{name:'Preview: 2 roles to add'}).waitFor();assert.ok(await page.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth),'Import mobile overflow');await page.screenshot({path:'/tmp/promptfolio-role-import-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS: template, preview, cancellation, atomic validation, safe references, unique IDs, metadata editing and clearing, combined filters, legacy roles, reload, backup round trip, mobile layout, no browser errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
