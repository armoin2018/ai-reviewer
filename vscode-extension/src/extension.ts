import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { Skills, Guidance } from '../../src/lib.js';

export function activate(context: vscode.ExtensionContext) {
  const runAssertCompliance = vscode.commands.registerCommand('skillset.runAssertCompliance', async () => {
    try {
      const cfg = vscode.workspace.getConfiguration('skillset');
      const serverMode = cfg.get<string>('serverMode', 'local');
      const baseUrl = cfg.get<string>('httpBaseUrl', 'http://localhost:8080');
      const owner = cfg.get<string>('owner', '');
      const repo = cfg.get<string>('repo', '');
      const ref = cfg.get<string>('ref', 'main');

      const diff = await vscode.window.showInputBox({ prompt: 'Paste unified diff to check' });
      if (!diff) return;

      let result: any;
      if (serverMode === 'http') {
        const r = await fetch(`${baseUrl}/assert-compliance`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ diff, owner, repo, ref }) });
        result = await r.json();
      } else {
        result = await Skills.assert_compliance({ diff, owner, repo, ref });
      }

      const doc = await vscode.workspace.openTextDocument({ content: JSON.stringify(result, null, 2), language: 'json' });
      await vscode.window.showTextDocument(doc, { preview: true });
    } catch (e: any) {
      vscode.window.showErrorMessage(e?.message || 'assert_compliance failed');
    }
  });

  const summarizeRules = vscode.commands.registerCommand('skillset.summarizeRules', async () => {
    try {
      const cfg = vscode.workspace.getConfiguration('skillset');
      const serverMode = cfg.get<string>('serverMode', 'local');
      const baseUrl = cfg.get<string>('httpBaseUrl', 'http://localhost:8080');
      const owner = cfg.get<string>('owner', '');
      const repo = cfg.get<string>('repo', '');
      const ref = cfg.get<string>('ref', 'main');
      const guidanceMode = cfg.get<string>('guidanceMode', 'merged') as 'org'|'repo'|'merged';
      const packId = cfg.get<string>('packId', 'baseline-secure');

      let combined = '';
      if (guidanceMode === 'org') {
        if (serverMode === 'http') {
          const r = await fetch(`${baseUrl}/select-instruction-pack`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ packId, mode:'org', owner, repo, ref })});
          const data = await r.json(); combined = data.combinedMarkdown || '';
        } else {
          combined = await Guidance.combine('org', packId, { owner, repo, ref });
        }
      } else if (guidanceMode === 'repo') {
        if (serverMode === 'http') {
          const r = await fetch(`${baseUrl}/select-instruction-pack`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ packId, mode:'repo', owner, repo, ref })});
          const data = await r.json(); combined = data.combinedMarkdown || '';
        } else {
          combined = await Guidance.combine('repo', packId, { owner, repo, ref });
        }
      } else {
        if (serverMode === 'http') {
          const r = await fetch(`${baseUrl}/select-instruction-pack`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ packId, mode:'merged', owner, repo, ref })});
          const data = await r.json(); combined = data.combinedMarkdown || '';
        } else {
          combined = await Guidance.combine('merged', packId, { owner, repo, ref });
        }
      }

      const checklist = await Skills.summarize_rules({ markdown: combined, maxItems: 400 });
      const doc = await vscode.workspace.openTextDocument({ content: JSON.stringify({ count: checklist.checklist.length, checklist: checklist.checklist }, null, 2), language: 'json' });
      await vscode.window.showTextDocument(doc, { preview: true });
    } catch (e: any) {
      vscode.window.showErrorMessage(e?.message || 'summarize_rules failed');
    }
  });

  const previewGuidance = vscode.commands.registerCommand('skillset.previewGuidance', async () => {
    try {
      const cfg = vscode.workspace.getConfiguration('skillset');
      const serverMode = cfg.get<string>('serverMode', 'local');
      const baseUrl = cfg.get<string>('httpBaseUrl', 'http://localhost:8080');
      const owner = cfg.get<string>('owner', '');
      const repo = cfg.get<string>('repo', '');
      const ref = cfg.get<string>('ref', 'main');
      const guidanceMode = cfg.get<string>('guidanceMode', 'merged') as 'org'|'repo'|'merged';
      const packId = cfg.get<string>('packId', 'baseline-secure');

      let combined = '';
      if (guidanceMode === 'org') {
        if (serverMode === 'http') {
          const r = await fetch(`${baseUrl}/select-instruction-pack`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ packId, mode:'org', owner, repo, ref })});
          const data = await r.json(); combined = data.combinedMarkdown || '';
        } else {
          combined = await Guidance.combine('org', packId, { owner, repo, ref });
        }
      } else if (guidanceMode === 'repo') {
        if (serverMode === 'http') {
          const r = await fetch(`${baseUrl}/select-instruction-pack`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ packId, mode:'repo', owner, repo, ref })});
          const data = await r.json(); combined = data.combinedMarkdown || '';
        } else {
          combined = await Guidance.combine('repo', packId, { owner, repo, ref });
        }
      } else {
        if (serverMode === 'http') {
          const r = await fetch(`${baseUrl}/select-instruction-pack`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ packId, mode:'merged', owner, repo, ref })});
          const data = await r.json(); combined = data.combinedMarkdown || '';
        } else {
          combined = await Guidance.combine('merged', packId, { owner, repo, ref });
        }
      }

      const doc = await vscode.workspace.openTextDocument({ content: combined || '# (no guidance found)', language: 'markdown' });
      await vscode.window.showTextDocument(doc, { preview: true });
    } catch (e: any) {
      vscode.window.showErrorMessage(e?.message || 'previewGuidance failed');
    }
  });

  // Quick switcher in status bar
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.command = 'skillset.selectPack';
  function refreshStatus() {
    const mode = vscode.workspace.getConfiguration('skillset').get<string>('guidanceMode', 'merged');
    const pack = vscode.workspace.getConfiguration('skillset').get<string>('packId', 'baseline-secure');
    status.text = `$(tools) Skillset: ${mode}/${pack}`;
    status.tooltip = 'Click to switch guidance mode and pack';
    status.show();
  }
  refreshStatus();

  const selectPack = vscode.commands.registerCommand('skillset.selectPack', async () => {
    const cfg = vscode.workspace.getConfiguration('skillset');
    const mode = await vscode.window.showQuickPick(['org','repo','merged'], { placeHolder: 'Select guidance mode', ignoreFocusOut: true });
    if (!mode) return;
    const pack = await vscode.window.showQuickPick(['baseline-secure','oss-apache-2','enterprise-strict','pci-dss','pii-redaction','design-doc-reviewer'], { placeHolder: 'Select bundled pack', ignoreFocusOut: true });
    if (!pack) return;
    await cfg.update('guidanceMode', mode, vscode.ConfigurationTarget.Workspace);
    await cfg.update('packId', pack, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(`Skillset: set ${mode}/${pack}`);
    refreshStatus();
  });

  const packLint = vscode.commands.registerCommand('skillset.packLint', async () => {
    try {
      const sel = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectMany: false, openLabel: 'Select Pack Folder' });
      if (!sel || !sel[0]) return;
      const folder = sel[0];
      try {
        const cp = await import('node:child_process');
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        const scriptPath = require('path').join(root, 'scripts', 'pack-lint.mjs');
        const exists = await vscode.workspace.fs.stat(vscode.Uri.file(scriptPath)).then(()=>true,()=>false);
        if (exists) {
          await new Promise<void>((resolve, reject) => {
            const p = cp.spawn(process.execPath, [scriptPath, folder.fsPath], { cwd: root, stdio: 'inherit' });
            p.on('exit', code => code === 0 ? resolve() : reject(new Error('pack-lint failed')));
          });
          vscode.window.showInformationMessage('Pack lint completed.');
          return;
        }
      } catch {}
      const required = ['policies', 'personas'];
      for (const r of required) {
        const d = vscode.Uri.joinPath(folder, r);
        const ok = await vscode.workspace.fs.stat(d).then(()=>true,()=>false);
        if (!ok) throw new Error(`Missing subfolder: ${r}`);
      }
      const list = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(folder, 'policies'));
      if (!list.length) throw new Error('No files in policies/');
      const listP = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(folder, 'personas'));
      if (!listP.length) throw new Error('No files in personas/');
      vscode.window.showInformationMessage('Pack structure looks valid.');
    } catch (e: any) {
      vscode.window.showErrorMessage(e?.message || 'packLint failed');
    }
  });

  context.subscriptions.push(runAssertCompliance, summarizeRules, previewGuidance, selectPack, packLint, status);
}

export function deactivate() {}
