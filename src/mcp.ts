import readline from "readline";
import { Skills } from "./lib.js";
type JsonRpcReq = { jsonrpc: "2.0"; id?: number | string; method: string; params?: any };
type JsonRpcRes = { jsonrpc: "2.0"; id?: number | string; result?: any; error?: { code: number; message: string } };
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
function send(res: JsonRpcRes) { process.stdout.write(JSON.stringify(res) + "\n"); }
async function handle(line: string) {
  line = line.trim(); if (!line) return;
  let req: JsonRpcReq; try { req = JSON.parse(line); } catch { return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  const id = req.id ?? null;
  try { const fn = (Skills as any)[req.method]; if (!fn) throw new Error(`Method not found: ${req.method}`); const result = await fn(req.params || {}); send({ jsonrpc: "2.0", id, result }); }
  catch (e: any) { send({ jsonrpc: "2.0", id, error: { code: -32603, message: e?.message || "Internal error" } }); }
}
rl.on("line", handle); process.on("SIGINT", ()=>process.exit(0));
