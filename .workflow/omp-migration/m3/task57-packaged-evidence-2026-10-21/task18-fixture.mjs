import { createServer } from 'node:http';
const PORT = 4611; const MODEL = 't18-fixture';
const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };
const chunk = (delta, finish = null) => ({ id: 'chatcmpl-t18', object: 'chat.completion.chunk', created: 0, model: MODEL, choices: [{ index: 0, delta, finish_reason: finish }] });
const readBody = req => new Promise(resolve => { let body=''; req.on('data', d => body += d); req.on('end', () => { try { resolve(JSON.parse(body||'{}')); } catch { resolve({}); } }); });
const lastUser = messages => { for (let i=messages.length-1;i>=0;i--) { const m=messages[i]; if (m?.role!=='user') continue; if (typeof m.content==='string') return m.content; if (Array.isArray(m.content)) return m.content.map(p=>typeof p?.text==='string'?p.text:'').join('\n'); return ''; } return ''; };
createServer(async (req,res) => {
  if (req.method==='GET' && req.url==='/v1/models') { res.writeHead(200,{'content-type':'application/json'}); res.end(JSON.stringify({object:'list',data:[{id:MODEL,object:'model'}]})); return; }
  if (req.method!=='POST' || !req.url?.endsWith('/chat/completions')) { res.writeHead(404).end(); return; }
  const body = await readBody(req); const messages = Array.isArray(body.messages)?body.messages:[];
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === 'user') { lastUserIndex = i; break; }
  const hasToolResult = lastUserIndex >= 0 && messages.slice(lastUserIndex + 1).some(m=>m?.role==='tool');
  const wantsTool = !hasToolResult && /T18-EDIT/.test(lastUser(messages));
  const bashWanted = !hasToolResult && /T18-BASH/.test(lastUser(messages));
  const editWanted = !hasToolResult && /T18-DIFF/.test(lastUser(messages));
  const sleepWanted = !hasToolResult && /T18-SLEEP/.test(lastUser(messages));
  const taskWanted = !hasToolResult && /T18-TASK/.test(lastUser(messages));
  const childWanted = !hasToolResult && /Return the T18 child marker\./.test(lastUser(messages));
  const w8Slow = /T18-W8/.test(lastUser(messages));
  const tool = childWanted ? { id:'t18-yield', name:'yield', args:{ data:{ marker:'T18 child marker' } } } : taskWanted ? { id:'t18-task', name:'task', args:{ agent:'scout', name:'t18-child-1', task:'Return the T18 child marker.' } } : bashWanted ? { id:'t18-write', name:'bash', args:{ command:'echo packaged-dialog-line' } } : sleepWanted ? { id:'t18-sleep', name:'bash', args:{ command:'sleep 20; echo packaged-sleep-done' } } : editWanted ? { id:'t18-edit', name:'edit', args:{ path:'NOTES.md', old_string:'Task 57 original line.', new_string:'Task 57 edited line.' } } : wantsTool ? { id:'t18-write', name:'write', args:{ path:'T18_PACKAGED.md', content:'packaged-one\npackaged-two\npackaged-three\n' } } : null;
  const final = 'Packaged write completed.';
  if (w8Slow) {
    res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache',connection:'keep-alive'});
    res.write(`data: ${JSON.stringify(chunk({role:'assistant',content:''}))}\n\n`);
    const parts=['w8',' snapshot',' recovery',' after',' reload',' done'];
    for (const part of parts) { res.write(`data: ${JSON.stringify(chunk({content:part}))}\n\n`); await new Promise(r=>setTimeout(r,350)); }
    res.write(`data: ${JSON.stringify({...chunk({},'stop'),usage})}\n\n`);
    res.end('data: [DONE]\n\n'); return;
  }
  if (!body.stream) { res.writeHead(200,{'content-type':'application/json'}); res.end(JSON.stringify({id:'chatcmpl-t18',object:'chat.completion',created:0,model:MODEL,choices:[{index:0,message:tool?{role:'assistant',content:null,tool_calls:[{id:tool?tool.id:'t18-write',type:'function',function:{name:tool.name,arguments:JSON.stringify(tool.args)}}]}:{role:'assistant',content:final},finish_reason:tool?'tool_calls':'stop'}]})); return; }
  res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache',connection:'keep-alive'});
  res.write(`data: ${JSON.stringify(chunk({role:'assistant',content:''}))}\n\n`);
  if (tool) {
    res.write(`data: ${JSON.stringify(chunk({tool_calls:[{index:0,id:tool.id,type:'function',function:{name:tool.name,arguments:''}}]}))}\n\n`);
    await new Promise(r=>setTimeout(r,120));
    res.write(`data: ${JSON.stringify(chunk({tool_calls:[{index:0,function:{arguments:JSON.stringify(tool.args)}}]}))}\n\n`);
    res.write(`data: ${JSON.stringify({...chunk({},'tool_calls'),usage})}\n\n`);
  } else {
    res.write(`data: ${JSON.stringify(chunk({content:final}))}\n\n`);
    res.write(`data: ${JSON.stringify({...chunk({},'stop'),usage})}\n\n`);
  }
  res.end('data: [DONE]\n\n');
}).listen(PORT,'127.0.0.1',()=>console.log(`t18 fixture listening ${PORT}`));
