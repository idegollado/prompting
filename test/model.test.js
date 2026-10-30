import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,newVersion,score,suggestions,compile,factors} from '../public/model.js';
test('new versions preserve the original snapshot and start separate evaluations',()=>{const p=seed().prompts[0];const original=structuredClone(p.versions[0]);const next=newVersion(p,{...original,tasks:'Improved steps'},'Clarified task');p.versions.push(next);next.evaluations.push({});assert.deepEqual(p.versions[0],original);assert.equal(next.number,2);assert.notEqual(next.id,original.id);assert.equal(next.tasks,'Improved steps');});
test('required content cannot be blank',()=>{assert.throws(()=>newVersion({versions:[]},{title:' ',objectives:'goal',tasks:'task'},''),/required/);});
test('scoring includes every factor and generates targeted improvements',()=>{const ratings=Object.fromEntries(Object.keys(factors).map(k=>[k,5]));assert.equal(score({ratings}),100);assert.deepEqual(suggestions({ratings}),[]);ratings.clarity=1;ratings.correctness=2;assert.equal(score({ratings}),77);assert.deepEqual(suggestions({ratings}),[factors.clarity[1],factors.correctness[1]]);});
test('compiled prompts contain the five structured sections',()=>{const v=seed().prompts[0].versions[0];const text=compile(v);assert.match(text,/ROLE\n/);assert.match(text,/OBJECTIVES\n/);assert.match(text,/CONTEXT\n/);assert.match(text,/TASKS\n/);assert.match(text,/EXAMPLES\n/);assert.ok(text.includes('{{transcript}}'));});

test('example lists preserve legacy text and remain independent across versions',async()=>{
 const {exampleList,formatExamples}=await import('../public/model.js');
 assert.deepEqual(exampleList('Legacy example'),[{input:'',output:'Legacy example',notes:''}]);
 assert.deepEqual(exampleList(''),[]);
 const p=seed().prompts[0],examples=[{input:'Request A',output:'Answer A',notes:'Specific'}];
 const v=newVersion(p,{...p.versions[0],examples},'Examples as a list');
 examples[0].output='Changed elsewhere';
 assert.equal(v.examples[0].output,'Answer A');
 const text=compile(v);assert.match(text,/Example 1\nINPUT\nRequest A/);assert.match(text,/EXPECTED OUTPUT\nAnswer A/);assert.match(text,/NOTES\nSpecific/);assert.ok(!formatExamples(v.examples).includes('[object Object]'));
});
