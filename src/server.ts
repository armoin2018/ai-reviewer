import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { summarizeRules } from "./rules.js";
import { normalizeUnifiedDiff } from "./diff.js";
import { assertCompliance } from "./assert.js";
import { loadRules, getFileContents } from "./github.js";
import { listBundled, getBundledPack } from "./bundled.js";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.post("/load-rules", async (req, res) => {
  try {
    const { owner, repo, ref } = req.body ?? {};
    if (!owner || !repo || !ref) return res.status(400).json({ error: "owner, repo, ref required" });
    const guidance = await loadRules({ owner, repo, ref });
    return res.json(guidance);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "load_rules_failed" });
  }
});

app.post("/summarize-rules", async (req, res) => {
  try {
    const { markdown, maxItems = 200 } = req.body ?? {};
    if (typeof markdown !== "string") return res.status(400).json({ error: "markdown required" });
    return res.json({ checklist: summarizeRules(markdown, maxItems) });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "summarize_rules_failed" });
  }
});

app.post("/infer-quality-gates", async (req, res) => {
  try {
    const files = (req.body?.files || []).map((f:any)=> f.path);
    const has = (re: RegExp) => files.some((p:string)=> re.test(p));
    const cmds: string[] = [];
    if (has(/package\.json$/)) { cmds.push("npm run -s lint || true", "npm test --silent || true"); }
    if (has(/pyproject\.toml$|requirements\.txt$/)) { cmds.push("ruff check . || true", "pytest -q || true"); }
    if (has(/go\.mod$/)) { cmds.push("go vet ./... || true", "go test ./... || true"); }
    if (has(/pom\.xml$|build\.gradle/)) { cmds.push("mvn -q test || true"); }
    return res.json({ recommendedCommands: Array.from(new Set(cmds)) });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "infer_quality_gates_failed" });
  }
});

app.post("/normalize-diff", async (req, res) => {
  try {
    const { diff, strip = 0 } = req.body ?? {};
    if (!diff) return res.status(400).json({ error: "diff required" });
    return res.json(normalizeUnifiedDiff(diff, strip));
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "normalize_diff_failed" });
  }
});

app.post("/assert-compliance", async (req, res) => {
  try {
    const { diff, checklist = [], requireTests = true, maxFileBytes = 500000, owner, repo, ref, prLabels = [], prTitle = "" } = req.body ?? {};
    if (!diff) return res.status(400).json({ error: "diff required" });
    let effectiveChecklist = checklist;
    let guidanceMarkdown = "";
    if ((!effectiveChecklist || effectiveChecklist.length === 0) && owner && repo && ref) {
      const guidance = await loadRules({ owner, repo, ref });
      guidanceMarkdown = guidance.combinedMarkdown || "";
      effectiveChecklist = summarizeRules(guidanceMarkdown, 400);
    }
    // Extract file paths to optionally load HEAD contents if caller asks
    const files = Array.from(new Set((diff.replace(/\r\n/g,"\n").split("\n").map(l=>{
      const m1 = l.match(/^\+\+\+\s+[ab]\/([^\s].*)$/); if (m1) return m1[1];
      const m2 = l.match(/^diff --git a\/(.+?) b\/(.+)$/); if (m2) return m2[2];
      return null;
    }).filter(Boolean)) as string[]));
    let fileContents: Record<string,string> | undefined = undefined;
    if (owner && repo && ref) {
      fileContents = await getFileContents({ owner, repo, ref, paths: files });
    }
    const result = assertCompliance({ diff, checklist: effectiveChecklist, requireTests, maxFileBytes, guidanceText: guidanceMarkdown, prLabels, prTitle, fileContents });
    return res.json({ ...result, usedChecklistCount: effectiveChecklist?.length || 0, guidanceInferred: Boolean(guidanceMarkdown && effectiveChecklist?.length) });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "assert_compliance_failed" });
  }
});

app.post("/file-contents", async (req, res) => {
  try {
    const { owner, repo, ref, paths } = req.body ?? {};
    if (!owner || !repo || !ref || !Array.isArray(paths)) return res.status(400).json({ error: "owner, repo, ref, paths[] required" });
    const contents = await getFileContents({ owner, repo, ref, paths });
    return res.json({ contents, count: Object.keys(contents).length });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "file_contents_failed" });
  }
});

app.get("/bundled-guidance", async (req, res) => {
  try {
    const packId = (req.query.packId as string) || "";
    if (packId) return res.json(getBundledPack(packId));
    return res.json(listBundled());
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "bundled_guidance_failed" });
  }
});

app.post("/select-instruction-pack", async (req, res) => {
  try {
    const { packId, owner, repo, ref, mode = "merged" } = req.body ?? {};
    if (!packId) return res.status(400).json({ error: "packId required" });
    const pack = getBundledPack(packId);
    let combined = pack.combinedMarkdown;
    let files: string[] = [];
    if (owner && repo && ref) {
      const guidance = await loadRules({ owner, repo, ref });
      files = guidance.files;
      if (mode === "org") combined = pack.combinedMarkdown;
      else if (mode === "repo") combined = guidance.combinedMarkdown;
      else combined = [pack.combinedMarkdown, guidance.combinedMarkdown].filter(Boolean).join("\n\n");
    }
    return res.json({ pack: { id: pack.id, title: pack.title }, mode, files, combinedMarkdown: combined });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "select_instruction_pack_failed" });
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, ()=> console.log(`[skillset] listening on :${port}`));
