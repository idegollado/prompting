import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,newVersion,compile} from '../public/model.js';
import {initializePlanning,validPlanning,validateWorkflow,roleList,prepareRoleImport,filterRoles} from '../public/planning.js';
function fixture(){const d=initializePlanning(seed());d.roles.push({id:'qa',name:'QA Lead',responsibilities:'Assess risk',expertise:'Quality',activities:'Review evidence',boundaries:'Escalate release decisions',skills:['research']});const w={id:'release',name:'Release readiness',project:'starter',role:'qa',objective:'Make a release recommendation',authority:'Recommend readiness',escalation:'Escalate critical unresolved defects',criteria:'Evidence for every release risk',steps:[{id:'risk',title:'Assess release risk',role:'qa',skill:'research',version:'sample-v1',inputs:'Release scope',outputs:'Risk summary',handoff:'Test lead accepts the risk summary'}]};return {d,w};}
test('legacy libraries retain every history, example and evaluation when planning is initialized',()=>{const d=seed(),before=structuredClone(d);initializePlanning(d);assert.deepEqual(d.prompts,before.prompts);assert.deepEqual(d.projects,before.projects);assert.deepEqual(d.roles,[]);assert.ok(validPlanning(d));assert.equal(initializePlanning(d),d);});
test('workflow references pin a version and survive later skill revisions and JSON round trips',()=>{const {d,w}=fixture();d.workflows.push(validateWorkflow(d,w));const p=d.prompts[0];p.versions.push(newVersion(p,{...p.versions[0],inputs:'Transcript',outputs:'Risk table',examples:[{input:'A',output:'B',notes:'C'}]},'Refine outputs'));assert.equal(w.steps[0].version,'sample-v1');assert.match(compile(p.versions[1]),/INPUTS\nTranscript/);assert.match(compile(p.versions[1]),/OUTPUTS\nRisk table/);const restored=JSON.parse(JSON.stringify(d));assert.ok(validPlanning(restored));assert.deepEqual(restored,d);});
test('plans reject dangling references, unavailable skills, duplicate steps and incomplete handoffs',()=>{for(const mutate of [w=>w.role='missing',w=>w.project='missing',w=>w.steps[0].role='missing',w=>w.steps[0].skill='missing',w=>w.steps[0].version='missing',w=>w.steps.push({...w.steps[0]}),w=>w.steps[0].handoff=' ',w=>w.criteria=' ']){const {d,w}=fixture();mutate(w);assert.throws(()=>validateWorkflow(d,w));}const {d,w}=fixture();d.roles[0].skills=[];assert.throws(()=>validateWorkflow(d,w));});
test('malformed planning collections and metadata are rejected',()=>{const {d}=fixture();for(const extra of [{roles:[null]},{workflows:[null]},{roles:{}},{projects:[{...d.projects[0],resources:42}]},{prompts:[{versions:[null]}]}])assert.equal(validPlanning({...d,...extra}),false);});

test('responsibility lists accept old text and new arrays without mutating source data',()=>{
 const legacy='Assess risk\nReview evidence';assert.deepEqual(roleList(legacy),[legacy]);assert.deepEqual(roleList(''),[]);
 const entries=['Assess risk','Review evidence'];const copy=roleList(entries);copy.push('Recommend');assert.deepEqual(entries,['Assess risk','Review evidence']);
 const {d}=fixture();assert.ok(validPlanning(d));d.roles[0].responsibilities=entries;assert.ok(validPlanning(JSON.parse(JSON.stringify(d))));d.roles[0].responsibilities=[42];assert.equal(validPlanning(d),false);
});

test('activity lists preserve legacy text and validate list backups',()=>{
 const {d}=fixture();const original=d.roles[0].activities;assert.deepEqual(roleList(original),[original]);
 d.roles[0].activities=['Review evidence','Assess defects'];assert.ok(validPlanning(JSON.parse(JSON.stringify(d))));
 d.roles[0].activities=[null];assert.equal(validPlanning(d),false);
});

test('optional role metadata preserves legacy data and validates backup references',()=>{
 const {d}=fixture();assert.ok(validPlanning(d));
 d.roles[0].projects=['starter'];d.roles[0].tags=['Acme','QA'];assert.ok(validPlanning(JSON.parse(JSON.stringify(d))));
 for(const extra of [{projects:['missing']},{projects:['starter','starter']},{projects:null},{tags:[42]},{tags:['']},{tags:['QA','QA']}])assert.equal(validPlanning({...d,roles:[{...d.roles[0],...extra}]}),false);
 d.roles[0].projects=[];d.roles[0].tags=[];assert.ok(validPlanning(d));
});

test('role imports add isolated records without overwriting IDs or mutating library history',()=>{
 const {d,w}=fixture();d.workflows.push(w);const before=structuredClone(d);
 const source={format:'promptfolio-roles',version:1,roles:[{...d.roles[0],projects:['starter'],tags:['Acme']},{name:'Reusable'}]};let n=0;
 const imported=prepareRoleImport(d,source,()=>`import-${++n}`);assert.deepEqual(d,before);assert.equal(imported[0].id,'import-1');assert.deepEqual(imported[0].responsibilities,['Assess risk']);assert.deepEqual(imported[1].projects,[]);assert.deepEqual(imported[1].skills,[]);
 imported[0].tags.push('QA');assert.deepEqual(source.roles[0].tags,['Acme']);d.roles.push(...imported);assert.ok(validPlanning(JSON.parse(JSON.stringify(d))));assert.deepEqual(d.prompts,before.prompts);assert.deepEqual(d.workflows,before.workflows);
 assert.throws(()=>prepareRoleImport(d,source,()=> 'qa'));
});
test('role import rejects malformed data and dangling references atomically',()=>{
 const {d}=fixture();const before=structuredClone(d),wrap=r=>({format:'promptfolio-roles',version:1,roles:[{name:'Valid'},r]});
 for(const r of [null,{}, {name:' '},{name:'QA',skills:['missing']},{name:'QA',projects:['missing']},{name:'QA',tags:'company'},{name:'QA',skills:['research','research']},{name:'QA',responsibilities:[4]},{name:'QA',activities:42},{name:'QA',expertise:[]},{name:'QA',boundaries:null}])assert.throws(()=>prepareRoleImport(d,wrap(r)));
 for(const source of [null,[],{roles:[]},{format:'promptfolio-roles',version:2,roles:[{name:'QA'}]},{format:'promptfolio-roles',version:1,roles:[]}])assert.throws(()=>prepareRoleImport(d,source));assert.deepEqual(d,before);
});
test('role filters combine project, tag, and unassigned criteria without changing data',()=>{
 const roles=[{id:'legacy'},{id:'shared',projects:[],tags:['Acme']},{id:'qa',projects:['starter','other'],tags:['Acme','QA']}],before=structuredClone(roles);
 assert.deepEqual(filterRoles(roles),roles);assert.deepEqual(filterRoles(roles,{project:'starter',tag:'Acme'}).map(r=>r.id),['qa']);assert.deepEqual(filterRoles(roles,{unassigned:true}).map(r=>r.id),['legacy','shared']);assert.deepEqual(filterRoles(roles,{tag:'Acme',unassigned:true}).map(r=>r.id),['shared']);assert.deepEqual(filterRoles(roles,{project:'starter',unassigned:true}),[]);assert.deepEqual(roles,before);
});
