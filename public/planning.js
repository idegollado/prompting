export function roleList(value) {
 return typeof value === 'string' ? (value.trim() ? [value] : []) : Array.isArray(value) ? [...value] : [];
}

// Planning metadata extends the existing library; prompts remain the versioned skill records.
export function initializePlanning(data) {
 data.roles ??= []; data.workflows ??= [];
 return data;
}
const text = x => typeof x === 'string';
const identifier = x => text(x) && /^[a-zA-Z0-9_-]{1,100}$/.test(x);
const unique = a => a.every(x=>x && identifier(x.id)) && new Set(a.map(x=>x.id)).size === a.length;
const stringSet = a => Array.isArray(a) && a.every(x=>text(x)&&x.trim().length>0) && new Set(a).size===a.length;
const roleMetadata = (r,d) => (r.projects===undefined || stringSet(r.projects)&&r.projects.every(id=>d.projects.some(p=>p.id===id))) && (r.tags===undefined || stringSet(r.tags));

// Imports add roles only. IDs in the file never overwrite existing records.
export function prepareRoleImport(data,source,makeId=()=>crypto.randomUUID()) {
 if (!source || source.format!=='promptfolio-roles' || source.version!==1 || !Array.isArray(source.roles) || !source.roles.length) throw Error('Choose a non-empty Promptfolio roles JSON file (format: promptfolio-roles, version: 1).');
 const roles=source.roles.map((r,i)=>{
  if (!r || typeof r!=='object' || Array.isArray(r) || !text(r.name) || !r.name.trim()) throw Error(`Role ${i+1}: a name is required.`);
  for(const k of ['expertise','boundaries']) if(r[k]!==undefined&&!text(r[k])) throw Error(`Role ${i+1}: ${k} must be text.`);
  for(const k of ['responsibilities','activities']) if(r[k]!==undefined&&!text(r[k])&&!(Array.isArray(r[k])&&r[k].every(text))) throw Error(`Role ${i+1}: ${k} must be text or a list of text.`);
  for(const k of ['projects','skills','tags']) if(r[k]!==undefined&&!stringSet(r[k])) throw Error(`Role ${i+1}: ${k} must be a list of unique, non-empty strings.`);
  for(const [key,items] of [['projects',data.projects],['skills',data.prompts]]) if((r[key]||[]).some(id=>!items.some(item=>item.id===id))) throw Error(`Role ${i+1}: unknown ${key} reference. Use IDs from this library, or leave ${key} empty and assign them after importing.`);
  return {id:makeId(),name:r.name.trim(),responsibilities:roleList(r.responsibilities),expertise:r.expertise||'',activities:roleList(r.activities),boundaries:r.boundaries||'',skills:[...(r.skills||[])],projects:[...(r.projects||[])],tags:[...(r.tags||[])]};
 });
 if(!validPlanning({...data,roles:[...data.roles,...roles]})) throw Error('Invalid role data or duplicate generated IDs. No roles were added.');
 return roles;
}
export function filterRoles(roles,{project='',tag='',unassigned=false}={}) {
 return roles.filter(r=>(!project||(r.projects||[]).includes(project))&&(!tag||(r.tags||[]).includes(tag))&&(!unassigned||!(r.projects||[]).length));
}
export function validPlanning(d) {
 if (!d || !Array.isArray(d.projects) || !Array.isArray(d.prompts)) return false;
 const roles=d.roles??[], workflows=d.workflows??[];
 if (!Array.isArray(roles)||!Array.isArray(workflows)||!unique(roles)||!unique(workflows)) return false;
 if (!d.projects.every(p=>p && ['goals','context','resources'].every(k=>p[k]===undefined||text(p[k])))) return false;
 if (!d.prompts.every(p=>p && Array.isArray(p.versions) && p.versions.every(v=>v && ['inputs','outputs'].every(k=>v[k]===undefined||text(v[k]))))) return false;
 if (!roles.every(r=>r&&identifier(r.id)&&roleMetadata(r,d)&&['name','expertise','boundaries'].every(k=>text(r[k]))&&['responsibilities','activities'].every(k=>text(r[k])||Array.isArray(r[k])&&r[k].every(text))&&Array.isArray(r.skills)&&new Set(r.skills).size===r.skills.length&&r.skills.every(id=>d.prompts.some(p=>p.id===id)))) return false;
 return workflows.every(w=>w&&identifier(w.id)&&d.projects.some(p=>p.id===w.project)&&roles.some(r=>r.id===w.role)&&['name','objective','authority','escalation','criteria'].every(k=>text(w[k]))&&Array.isArray(w.steps)&&w.steps.length>0&&unique(w.steps)&&w.steps.every(s=>s&&identifier(s.id)&&['title','inputs','outputs','handoff'].every(k=>text(s[k]))&&roles.some(r=>r.id===s.role&&r.skills.includes(s.skill))&&d.prompts.some(p=>p.id===s.skill&&p.versions.some(v=>v.id===s.version))));
}
export function validateWorkflow(data,w) {
 if (!w.name.trim()||!w.objective.trim()||!w.authority.trim()||!w.escalation.trim()||!w.criteria.trim()) throw Error('Complete the workflow perspective, objective, authority, escalation boundaries, and success criteria.');
 if (!w.steps.length||w.steps.some(s=>!s.title.trim()||!s.inputs.trim()||!s.outputs.trim()||!s.handoff.trim())) throw Error('Each step needs a title, inputs, outputs, and explicit handoff (including the final recipient).');
 if (!validPlanning({...data,workflows:[w]})) throw Error('Choose a saved perspective role, project, and a responsible role with an available skill and version for each step.');
 return w;
}
export function planningUI({data,kind,main,esc,showModal,persist,render,toast,openSkill,newSkill}) {
 const $=s=>document.querySelector(s);
 const fields=(keys,item={})=>keys.map(([k,label])=>`<label class="field">${label}<textarea name="${k}" ${k==='name'?'required':''}>${esc(item[k]||'')}</textarea></label>`).join('');
 const options=(items,id,label=x=>x.name)=>items.map(x=>`<option value="${esc(x.id)}" ${id===x.id?'selected':''}>${esc(label(x))}</option>`).join('');
 const select=(name,label,items,id,fn)=>`<label class="field">${label}<select name="${name}" required><option value="">Choose…</option>${options(items,id,fn)}</select></label>`;
 const finish=message=>{persist();$('#modal').close();render();toast(message);};
 const roleFields=[['name','Role name'],['responsibilities','Responsibilities'],['expertise','Expertise'],['activities','Activities'],['boundaries','Boundaries']];
 const workflowFields=[['name','Workflow name'],['objective','Objective'],['authority','Decision authority'],['escalation','Escalation boundaries'],['criteria','Success criteria']];
 function roleEditor(role) {
 showModal(`<h2>${role?'Edit role':'Create role'}</h2><form id="role-editor">${fields(roleFields.filter(([k])=>!['responsibilities','activities'].includes(k)),role)}<fieldset><legend>Responsibilities</legend><ul id="responsibility-list"></ul><button type="button" id="add-responsibility">+ Add responsibility</button></fieldset><fieldset><legend>Activities</legend><ul id="activity-list"></ul><button type="button" id="add-activity">+ Add activity</button></fieldset><fieldset><legend>Projects (optional)</legend><p class="muted">Leave empty to reuse this role across contexts.</p>${data.projects.map(p=>`<label class="skill-choice"><input type="checkbox" name="projects" value="${esc(p.id)}" ${role?.projects?.includes(p.id)?'checked':''}> ${esc(p.name)}</label>`).join('')}</fieldset><label class="field">Tags (optional, one per line)<textarea name="tags" placeholder="Company or team">${esc((role?.tags||[]).join('\n'))}</textarea></label><fieldset><legend>Available skills</legend>${data.prompts.map(p=>`<label class="skill-choice"><input type="checkbox" name="skills" value="${esc(p.id)}" ${role?.skills.includes(p.id)?'checked':''}> ${esc(p.versions.at(-1).title)}</label>`).join('')||'<p>Create a skill in the prompt library first.</p>'}</fieldset><button class="primary">Save role</button><p id="plan-error" role="alert"></p></form>`);
 for(const [key,singular,label] of [['responsibilities','responsibility','Responsibility'],['activities','activity','Activity']]) {
 const addEntry=(value='')=>{const li=document.createElement('li');li.innerHTML=`<label class="field">${label}<textarea name="${key}" required>${esc(value)}</textarea></label><button type="button">Remove ${singular}</button>`;li.querySelector('button').onclick=()=>li.remove();$(`#${singular}-list`).append(li);};
 roleList(role?.[key]).forEach(addEntry);$(`#add-${singular}`).onclick=()=>addEntry();
 }
 $('#role-editor').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),r={...role,id:role?.id||crypto.randomUUID(),...Object.fromEntries(roleFields.map(([k])=>[k,String(f.get(k)).trim()])),...Object.fromEntries(['responsibilities','activities'].map(k=>[k,f.getAll(k).map(s=>s.trim()).filter(Boolean)])),skills:f.getAll('skills'),projects:f.getAll('projects'),tags:[...new Set(String(f.get('tags')||'').split(/\r?\n/).map(t=>t.trim()).filter(Boolean))]};if(!r.name)return;
 if(data.workflows.some(w=>w.steps.some(s=>s.role===r.id&&!r.skills.includes(s.skill)))){$('#plan-error').textContent='A workflow uses a skill you removed. Update that workflow before removing the role’s available skill.';return;}
 const i=data.roles.findIndex(x=>x.id===r.id);if(i<0)data.roles.push(r);else data.roles[i]=r;finish('Role saved');};
 }
 function roleImporter() {
 showModal(`<h2>Import roles</h2><p>Add roles from a JSON file. Existing roles stay intact, and every imported role gets a new ID.</p><p>Projects and skills use IDs from this library. Leave their lists empty to assign them later.</p><button id="role-template">Download template</button><details><summary>Available reference IDs</summary><h3>Projects</h3><ul>${data.projects.map(p=>`<li>${esc(p.name)}: <code>${esc(p.id)}</code></li>`).join('')}</ul><h3>Skills</h3><ul>${data.prompts.map(p=>`<li>${esc(p.versions.at(-1).title)}: <code>${esc(p.id)}</code></li>`).join('')}</ul></details><label class="field">Roles JSON file<input type="file" id="roles-file" accept=".json,application/json"></label><p id="role-import-error" role="alert"></p><div id="role-preview" aria-live="polite"></div><button id="add-imported-roles" class="primary" disabled>Add imported roles</button>`);
 const preview=$('#role-preview');
 let pending=null;
 $('#role-template').onclick=()=>{
 const template={format:'promptfolio-roles',version:1,roles:[{name:'QA Lead',responsibilities:['Assess release quality'],expertise:'Risk assessment',activities:['Review release evidence'],boundaries:'Escalate release approval',skills:[],projects:[],tags:['example-company']}]};
 const url=URL.createObjectURL(new Blob([JSON.stringify(template,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='promptfolio-roles-template.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 let request=0;
 $('#roles-file').onchange=async e=>{
 const current=++request,file=e.target.files[0];pending=null;$('#add-imported-roles').disabled=true;$('#role-preview').innerHTML='';$('#role-import-error').textContent='';if(!file)return;
 try {
 if(file.size>1_000_000)throw Error('Choose a roles JSON file under 1 MB.');
 const source=JSON.parse(await file.text());if(current!==request||$('#role-preview')!==preview)return;
 pending=prepareRoleImport(data,source);
 $('#role-preview').innerHTML=`<h3>Preview: ${pending.length} roles to add</h3>${pending.map(r=>`<article class="plan-card"><h4>${esc(r.name)}</h4>${roleFields.slice(1).map(([k,label])=>detail(label,Array.isArray(r[k])?r[k].join('\n'):r[k])).join('')}${detail('Projects',r.projects.map(id=>name(data.projects,id)).join(', ')||'Unassigned — reusable')}${detail('Tags',r.tags.join(', '))}${detail('Available skills',r.skills.map(id=>data.prompts.find(p=>p.id===id)?.versions.at(-1).title).join(', '))}</article>`).join('')}`;
 $('#add-imported-roles').disabled=false;
 } catch(err) {if(current===request&&$('#role-preview')===preview)$('#role-import-error').textContent=err instanceof SyntaxError?'Invalid JSON. Choose the downloaded template or a compatible roles file.':err.message;}
 };
 $('#add-imported-roles').onclick=()=>{
 if(!pending)return;
 if(!validPlanning({...data,roles:[...data.roles,...pending]})){$('#role-import-error').textContent='Library references changed. Select the file again to refresh the preview.';return;}
 data.roles.push(...pending);finish(`${pending.length} roles imported`);
 };
 }
 function projectEditor(p) {
 showModal(`<h2>Edit project</h2><form id="project-details">${fields([['name','Project name'],['description','Description'],['goals','Shared goals'],['context','Shared context'],['resources','Resources (links or notes)']],p)}<button class="primary">Save project</button></form>`);
 $('#project-details').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);if(!String(f.get('name')).trim())return;for(const [k,v] of f)p[k]=v.trim();finish('Project saved');};
 }
 function workflowEditor(w) {
 showModal(`<h2>${w?'Edit workflow':'Create workflow'}</h2><p class="muted">Plan manually. Steps reference a saved skill version; later revisions do not change this plan.</p><form id="workflow-editor">${fields(workflowFields,w)}${select('project','Project',data.projects,w?.project)}${select('role','Acting as',data.roles,w?.role)}<h3>Ordered steps</h3><ol id="workflow-steps"></ol><button type="button" id="add-step">+ Add step</button><button class="primary">Save workflow</button><p id="plan-error" role="alert"></p></form>`);
 const renumber=()=>$('#workflow-steps').querySelectorAll('li').forEach((li,i)=>{li.querySelector('h4').textContent=`Step ${i+1}`;});
 function addStep(s={}) {
 const li=document.createElement('li');li.dataset.id=s.id||crypto.randomUUID();li.className='plan-step';
 li.innerHTML=`<h4></h4>${fields([['title','Step title']],s)}${select('responsible','Responsible role',data.roles,s.role)}<div class="step-skill"></div><div class="step-version"></div>${fields([['inputs','Inputs / source'],['outputs','Expected outputs'],['handoff','Handoff to / acceptance conditions']],s)}<button type="button" data-move="-1" aria-label="Move step up">↑ Move up</button> <button type="button" data-move="1" aria-label="Move step down">↓ Move down</button> <button type="button" class="remove-step">Remove step</button>`;
 const updateVersion=(id)=>{const p=data.prompts.find(p=>p.id===li.querySelector('[name=skill]').value);li.querySelector('.step-version').innerHTML=select('version','Skill version',p?.versions||[],id,v=>`v${v.number} · ${v.title}`);};
 const updateSkills=(skill,version)=>{const r=data.roles.find(r=>r.id===li.querySelector('[name=responsible]').value);li.querySelector('.step-skill').innerHTML=select('skill','Skill',data.prompts.filter(p=>r?.skills.includes(p.id)),skill,p=>p.versions.at(-1).title);li.querySelector('[name=skill]').onchange=()=>updateVersion();updateVersion(version);};
 li.querySelector('[name=responsible]').onchange=()=>updateSkills();updateSkills(s.skill,s.version);
 li.querySelector('.remove-step').onclick=()=>{li.remove();renumber();};
 li.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{if(b.dataset.move==='-1'&&li.previousElementSibling)li.previousElementSibling.before(li);else if(b.dataset.move==='1'&&li.nextElementSibling)li.nextElementSibling.after(li);renumber();});
 $('#workflow-steps').append(li);renumber();
 }
 (w?.steps||[{}]).forEach(addStep);$('#add-step').onclick=()=>addStep();
 $('#workflow-editor').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const entry={...w,id:w?.id||crypto.randomUUID(),...Object.fromEntries([...workflowFields.map(([k])=>k),'project','role'].map(k=>[k,String(f.get(k)).trim()])),steps:[...$('#workflow-steps').children].map(li=>({id:li.dataset.id,...Object.fromEntries(['title','inputs','outputs','handoff','skill','version'].map(k=>[k,li.querySelector(`[name=${k}]`).value.trim()])),role:li.querySelector('[name=responsible]').value}))};try{validateWorkflow(data,entry);const i=data.workflows.findIndex(x=>x.id===entry.id);if(i<0)data.workflows.push(entry);else data.workflows[i]=entry;finish('Workflow saved');}catch(err){$('#plan-error').textContent=err.message;}};
 }
 const name=(items,id)=>items.find(x=>x.id===id)?.name||'Unknown';
 const detail=(label,value)=>`<h4>${label}</h4><p class="plan-text">${esc(value||'Not specified')}</p>`;
 main.innerHTML=`<header><div class="breadcrumb">Workspace / ${esc(kind)}</div><span class="private">Manual planning</span></header><div class="page-heading"><div><div class="eyebrow">SHARED PURPOSE, CLEAR HANDOFFS</div><h1>${esc(kind)}</h1><p>${kind==='Skills'?'Versioned capabilities, powered by your existing prompts.':kind==='Workflows'?'Plan responsibilities, inputs, outputs, and decisions before doing the work.':'Reusable context for intentional work.'}</p></div>${kind==='Skills'?'<button id="new-skill" class="primary">+ New skill</button>':kind==='Roles'||kind==='Workflows'?`<button id="new-plan" class="primary">+ New ${kind==='Roles'?'role':'workflow'}</button>`:''}</div>${kind==='Skills'?'<p class="hint">Every prompt is available as a skill. Open one to create versions, add examples, compare changes, and evaluate results.</p>':''}${kind==='Roles'?'<div class="role-tools"><button id="import-roles">Import roles</button><label>Project<select id="role-project-filter"><option value="">All projects</option>'+options(data.projects)+'</select></label><label>Tag<select id="role-tag-filter"><option value="">All tags</option>'+[...new Set(data.roles.flatMap(r=>r.tags||[]))].sort().map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')+'</select></label><label class="skill-choice"><input type="checkbox" id="role-unassigned-filter"> Unassigned roles only</label><p id="role-count" role="status"></p></div>':''}<div class="planning-grid ${kind==='Roles'?'roles-layout':''}">${kind==='Projects'?data.projects.map(p=>`<article class="plan-card"><h2>${esc(p.name)}</h2>${detail('Description',p.description)}${detail('Shared goals',p.goals)}${detail('Context',p.context)}${detail('Resources',p.resources)}<button data-project-edit="${esc(p.id)}">Edit project</button></article>`).join(''):kind==='Roles'?data.roles.map(r=>`<article class="plan-card" data-role-card="${esc(r.id)}"><h2>${esc(r.name)}</h2>${detail('Projects',(r.projects||[]).map(id=>name(data.projects,id)).join(', ')||'Unassigned — reusable')}${detail('Tags',(r.tags||[]).join(', '))}${roleFields.slice(1).map(([k,l])=>['responsibilities','activities'].includes(k)?`<h4>${l}</h4>${roleList(r[k]).length?`<ul class="${k}">${roleList(r[k]).map(item=>`<li class="plan-text">${esc(item)}</li>`).join('')}</ul>`:'<p>Not specified</p>'}`:detail(l,r[k])).join('')}${detail('Available skills',r.skills.map(id=>data.prompts.find(p=>p.id===id)?.versions.at(-1).title).join(', '))}<button data-role-edit="${esc(r.id)}">Edit role</button></article>`).join(''):kind==='Skills'?data.prompts.map(p=>`<article class="plan-card"><h2>${esc(p.versions.at(-1).title)}</h2>${detail('Objective',p.versions.at(-1).objectives)}<p>${p.versions.length} versions · ${p.versions.reduce((n,v)=>n+v.evaluations.length,0)} evaluations</p><button data-skill-open="${esc(p.id)}">Open skill</button></article>`).join(''):data.workflows.map(w=>`<article class="plan-card"><h2>${esc(w.name)}</h2>${detail('Project',name(data.projects,w.project))}${detail('Acting as',name(data.roles,w.role))}${workflowFields.slice(1).map(([k,l])=>detail(l,w[k])).join('')}<ol>${w.steps.map(s=>{const p=data.prompts.find(p=>p.id===s.skill),v=p?.versions.find(v=>v.id===s.version);return `<li class="plan-step"><h3>${esc(s.title)}</h3><p>${esc(name(data.roles,s.role))} · ${esc(v?.title)} · v${v?.number}</p>${detail('Inputs',s.inputs)}${detail('Expected outputs',s.outputs)}${detail('Handoff',s.handoff)}</li>`;}).join('')}</ol><button data-workflow-edit="${esc(w.id)}">Edit workflow</button></article>`).join('')||'<p class="empty">No entries yet. Create one to begin.</p>'}</div>`;
 if(kind==='Roles') {
 $('#import-roles').onclick=roleImporter;
 const applyFilters=()=>{
 const visible=filterRoles(data.roles,{project:$('#role-project-filter').value,tag:$('#role-tag-filter').value,unassigned:$('#role-unassigned-filter').checked});
 document.querySelectorAll('[data-role-card]').forEach(card=>{card.hidden=!visible.some(r=>r.id===card.dataset.roleCard);});
 $('#role-count').textContent=`${visible.length} of ${data.roles.length} roles${visible.length?'':' — no matching roles. Adjust your filters.'}`;
 };
 for(const id of ['role-project-filter','role-tag-filter','role-unassigned-filter'])$('#'+id).onchange=applyFilters;
 applyFilters();
 }
 if($('#new-skill'))$('#new-skill').onclick=newSkill;
 if($('#new-plan'))$('#new-plan').onclick=()=>kind==='Roles'?roleEditor():workflowEditor();
 document.querySelectorAll('[data-role-edit]').forEach(b=>b.onclick=()=>roleEditor(data.roles.find(r=>r.id===b.dataset.roleEdit)));
 document.querySelectorAll('[data-project-edit]').forEach(b=>b.onclick=()=>projectEditor(data.projects.find(p=>p.id===b.dataset.projectEdit)));
 document.querySelectorAll('[data-workflow-edit]').forEach(b=>b.onclick=()=>workflowEditor(data.workflows.find(w=>w.id===b.dataset.workflowEdit)));
 document.querySelectorAll('[data-skill-open]').forEach(b=>b.onclick=()=>openSkill(b.dataset.skillOpen));
}
