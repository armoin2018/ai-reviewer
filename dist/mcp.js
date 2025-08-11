import readline from 'readline';
import { Skills } from './lib.js';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});
function send(res) {
    process.stdout.write(JSON.stringify(res) + '\n');
}
async function handle(line) {
    line = line.trim();
    if (!line)
        return;
    let req;
    try {
        req = JSON.parse(line);
    }
    catch {
        return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    }
    const id = req.id ?? null;
    try {
        const fn = Skills[req.method];
        if (!fn)
            throw new Error(`Method not found: ${req.method}`);
        const result = await fn(req.params || {});
        send({ jsonrpc: '2.0', id, result });
    }
    catch (e) {
        send({ jsonrpc: '2.0', id, error: { code: -32603, message: e?.message || 'Internal error' } });
    }
}
rl.on('line', handle);
process.on('SIGINT', () => process.exit(0));
