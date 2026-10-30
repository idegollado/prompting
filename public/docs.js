export function starterDocumentation(){return [
 {id:'guide-structure',title:'Build a clear prompt',markdown:'# Build a clear prompt\n\n## Role\nDescribe the expertise and perspective needed.\n\n> You are a customer support specialist writing for a first-time customer.\n\n## Objectives\nState the outcome and how you will judge success.\n\n- Identify the customer’s issue.\n- Offer one practical next step.\n- Avoid promises you cannot verify.\n\n## Context\nProvide the audience, background, source material, and constraints. Clearly mark missing information.\n\n## Tasks\nUse concrete steps. Specify the response format, length, and tone.\n\n## Examples\nAdd a realistic input and the output you would consider good. Use a separate entry for each scenario.'},
 {id:'guide-examples',title:'Choose useful examples',markdown:'# Choose useful examples\n\nA **representative input** is information you would actually give the prompt. A role alone is not an input.\n\n## Customer support example\n\n**Input:** My headphones were due yesterday, but tracking has not updated.\n\n**Expected output:** Acknowledge the delay, ask for an order reference, and explain how to check the delivery status. Do not invent a delivery date.\n\n**Why it works:** It is specific, helpful, and honest about missing information.\n\n## Test the boundaries\n\n1. Add a typical successful case.\n2. Add an incomplete input.\n3. Add conflicting information.\n4. Show when the model should ask a clarifying question.'},
 {id:'guide-feedback',title:'Learn from a disappointing result',markdown:'# Learn from a disappointing result\n\nSave the actual test input and observed output in **Evaluate**. Rate the result, then create a new version with a clear change note.\n\n## Too generic\nAsk: Which details could only apply to this project? Add a specific audience, constraints, and a good example.\n\n## Incorrect or invented facts\nAsk: What is the source of truth? Supply evidence, require citations, and allow the model to say it does not know.\n\n## Ambiguous or incomplete\nAsk: Which instruction has multiple interpretations? Break the task into steps and define measurable success.\n\n## A useful meta-question\n\n> What information is missing from this prompt? Ask me up to three clarifying questions before answering.\n\nChange one thing at a time and retest the same input so you can compare versions.'}
];}
export function validDocumentation(docs){return Array.isArray(docs)&&new Set(docs.map(d=>d?.id)).size===docs.length&&docs.every(d=>d&&typeof d.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(d.id)&&typeof d.title==='string'&&d.title.trim()&&typeof d.markdown==='string');}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Deliberately limited Markdown. Raw HTML stays text; no scripts or remote resources.
export function renderMarkdown(source){
 const inline=s=>escape(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
 const lines=source.replace(/\r\n?/g,'\n').split('\n');let html='',list=null,code=null,paragraph=[];
 const flush=()=>{if(paragraph.length){html+='<p>'+paragraph.map(inline).join('<br>')+'</p>';paragraph=[];}if(list){html+=`</${list}>`;list=null;}};
 for(const line of lines){
  if(/^```/.test(line)){flush();if(code===null)code=[];else{html+='<pre><code>'+escape(code.join('\n'))+'</code></pre>';code=null;}continue;}
  if(code!==null){code.push(line);continue;}
  if(!line.trim()){flush();continue;}
  const heading=line.match(/^(#{1,6})\s+(.+)$/),item=line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)$/);
  if(heading){flush();const n=heading[1].length;html+=`<h${n}>${inline(heading[2])}</h${n}>`;}
  else if(item){if(paragraph.length||list&&list!==(item[1]?'ul':'ol'))flush();if(!list){list=item[1]?'ul':'ol';html+=`<${list}>`;}html+='<li>'+inline(item[2])+'</li>';}
  else if(line.startsWith('> ')){flush();html+='<blockquote>'+inline(line.slice(2))+'</blockquote>';}
  else{if(list)flush();paragraph.push(line);}
 }
 flush();if(code!==null)html+='<pre><code>'+escape(code.join('\n'))+'</code></pre>';return html||'<p class="muted">This section is empty. Edit it to add your guidance.</p>';
}
