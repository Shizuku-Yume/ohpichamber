import { appendFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const [stateFile, toolName = 'fixture_echo'] = process.argv.slice(2);
if (!stateFile || !/^[a-z_]+$/.test(toolName)) process.exit(2);
writeFileSync(stateFile, JSON.stringify({ pid: process.pid }) + '\n');
const input = createInterface({ input: process.stdin });
function observe(method) { appendFileSync(stateFile, JSON.stringify({ method }) + '\n'); }
function send(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'); }
input.on('line', line => {
  let request;
  try { request = JSON.parse(line); } catch { process.exitCode = 2; input.close(); return; }
  observe(request.method);
  if (request.id === undefined) return;
  if (request.method === 'initialize') send(request.id, { protocolVersion: request.params.protocolVersion, capabilities: { tools: { listChanged: true } }, serverInfo: { name: 'omp-m0-local-fixture', version: '1.0.0' }, instructions: 'Controlled local M0 tools.' });
  else if (request.method === 'ping') send(request.id, {});
  else if (request.method === 'tools/list') send(request.id, { tools: [{ name: toolName, description: 'Controlled M0 echo.', inputSchema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false } }] });
  else if (request.method === 'tools/call' && request.params.name === toolName) send(request.id, { content: [{ type: 'text', text: 'm0-tool-observed' }], isError: false });
  else process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Fixture method unavailable' } }) + '\n');
});
input.on('close', () => { observe('fixture.stdin.closed'); process.exit(0); });
process.on('SIGTERM', () => { observe('fixture.sigterm'); process.exit(0); });
