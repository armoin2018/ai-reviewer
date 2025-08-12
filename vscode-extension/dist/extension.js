"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const node_fetch_1 = require("node-fetch");
const lib_js_1 = require("../../src/lib.js");
function activate(context) {
    const runAssertCompliance = vscode.commands.registerCommand('skillset.runAssertCompliance', async () => {
        try {
            const cfg = vscode.workspace.getConfiguration('skillset');
            const serverMode = cfg.get('serverMode', 'local');
            const baseUrl = cfg.get('httpBaseUrl', 'http://localhost:8080');
            const owner = cfg.get('owner', '');
            const repo = cfg.get('repo', '');
            const ref = cfg.get('ref', 'main');
            const diff = await vscode.window.showInputBox({ prompt: 'Paste unified diff to check' });
            if (!diff)
                return;
            let result;
            if (serverMode === 'http') {
                const r = await (0, node_fetch_1.default)(`${baseUrl}/assert-compliance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diff, owner, repo, ref }) });
                result = await r.json();
            }
            else {
                result = await lib_js_1.Skills.assert_compliance({ diff, owner, repo, ref });
            }
            const doc = await vscode.workspace.openTextDocument({ content: JSON.stringify(result, null, 2), language: 'json' });
            await vscode.window.showTextDocument(doc, { preview: true });
        }
        catch (e) {
            vscode.window.showErrorMessage(e?.message || 'assert_compliance failed');
        }
    });
    const summarizeRules = vscode.commands.registerCommand('skillset.summarizeRules', async () => {
        try {
            const cfg = vscode.workspace.getConfiguration('skillset');
            const serverMode = cfg.get('serverMode', 'local');
            const baseUrl = cfg.get('httpBaseUrl', 'http://localhost:8080');
            const owner = cfg.get('owner', '');
            const repo = cfg.get('repo', '');
            const ref = cfg.get('ref', 'main');
            const guidanceMode = cfg.get('guidanceMode', 'merged');
            const packId = cfg.get('packId', 'baseline-secure');
            let combined = '';
            if (guidanceMode === 'org') {
                if (serverMode === 'http') {
                    const r = await (0, node_fetch_1.default)(`${baseUrl}/select-instruction-pack`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId, mode: 'org', owner, repo, ref }) });
                    const data = await r.json();
                    combined = data.combinedMarkdown || '';
                }
                else {
                    combined = await lib_js_1.Guidance.combine('org', packId, { owner, repo, ref });
                }
            }
            else if (guidanceMode === 'repo') {
                if (serverMode === 'http') {
                    const r = await (0, node_fetch_1.default)(`${baseUrl}/select-instruction-pack`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId, mode: 'repo', owner, repo, ref }) });
                    const data = await r.json();
                    combined = data.combinedMarkdown || '';
                }
                else {
                    combined = await lib_js_1.Guidance.combine('repo', packId, { owner, repo, ref });
                }
            }
            else {
                if (serverMode === 'http') {
                    const r = await (0, node_fetch_1.default)(`${baseUrl}/select-instruction-pack`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId, mode: 'merged', owner, repo, ref }) });
                    const data = await r.json();
                    combined = data.combinedMarkdown || '';
                }
                else {
                    combined = await lib_js_1.Guidance.combine('merged', packId, { owner, repo, ref });
                }
            }
            const checklist = await lib_js_1.Skills.summarize_rules({ markdown: combined, maxItems: 400 });
            const doc = await vscode.workspace.openTextDocument({ content: JSON.stringify({ count: checklist.checklist.length, checklist: checklist.checklist }, null, 2), language: 'json' });
            await vscode.window.showTextDocument(doc, { preview: true });
        }
        catch (e) {
            vscode.window.showErrorMessage(e?.message || 'summarize_rules failed');
        }
    });
    const previewGuidance = vscode.commands.registerCommand('skillset.previewGuidance', async () => {
        try {
            const cfg = vscode.workspace.getConfiguration('skillset');
            const serverMode = cfg.get('serverMode', 'local');
            const baseUrl = cfg.get('httpBaseUrl', 'http://localhost:8080');
            const owner = cfg.get('owner', '');
            const repo = cfg.get('repo', '');
            const ref = cfg.get('ref', 'main');
            const guidanceMode = cfg.get('guidanceMode', 'merged');
            const packId = cfg.get('packId', 'baseline-secure');
            let combined = '';
            if (guidanceMode === 'org') {
                if (serverMode === 'http') {
                    const r = await (0, node_fetch_1.default)(`${baseUrl}/select-instruction-pack`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId, mode: 'org', owner, repo, ref }) });
                    const data = await r.json();
                    combined = data.combinedMarkdown || '';
                }
                else {
                    combined = await lib_js_1.Guidance.combine('org', packId, { owner, repo, ref });
                }
            }
            else if (guidanceMode === 'repo') {
                if (serverMode === 'http') {
                    const r = await (0, node_fetch_1.default)(`${baseUrl}/select-instruction-pack`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId, mode: 'repo', owner, repo, ref }) });
                    const data = await r.json();
                    combined = data.combinedMarkdown || '';
                }
                else {
                    combined = await lib_js_1.Guidance.combine('repo', packId, { owner, repo, ref });
                }
            }
            else {
                if (serverMode === 'http') {
                    const r = await (0, node_fetch_1.default)(`${baseUrl}/select-instruction-pack`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId, mode: 'merged', owner, repo, ref }) });
                    const data = await r.json();
                    combined = data.combinedMarkdown || '';
                }
                else {
                    combined = await lib_js_1.Guidance.combine('merged', packId, { owner, repo, ref });
                }
            }
            const doc = await vscode.workspace.openTextDocument({ content: combined || '# (no guidance found)', language: 'markdown' });
            await vscode.window.showTextDocument(doc, { preview: true });
        }
        catch (e) {
            vscode.window.showErrorMessage(e?.message || 'previewGuidance failed');
        }
    });
    // Quick switcher in status bar
    const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    status.command = 'skillset.selectPack';
    function refreshStatus() {
        const mode = vscode.workspace.getConfiguration('skillset').get('guidanceMode', 'merged');
        const pack = vscode.workspace.getConfiguration('skillset').get('packId', 'baseline-secure');
        status.text = `$(tools) Skillset: ${mode}/${pack}`;
        status.tooltip = 'Click to switch guidance mode and pack';
        status.show();
    }
    refreshStatus();
    const selectPack = vscode.commands.registerCommand('skillset.selectPack', async () => {
        const cfg = vscode.workspace.getConfiguration('skillset');
        const mode = await vscode.window.showQuickPick(['org', 'repo', 'merged'], { placeHolder: 'Select guidance mode', ignoreFocusOut: true });
        if (!mode)
            return;
        const pack = await vscode.window.showQuickPick(['baseline-secure', 'oss-apache-2', 'enterprise-strict', 'pci-dss', 'pii-redaction', 'design-doc-reviewer'], { placeHolder: 'Select bundled pack', ignoreFocusOut: true });
        if (!pack)
            return;
        await cfg.update('guidanceMode', mode, vscode.ConfigurationTarget.Workspace);
        await cfg.update('packId', pack, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`Skillset: set ${mode}/${pack}`);
        refreshStatus();
    });
    // Claude Directory Management Commands
    const manageClaudeDirectory = vscode.commands.registerCommand('skillset.manageClaudeDirectory', async () => {
        try {
            const action = await vscode.window.showQuickPick([
                'View Directory Structure',
                'Read Main Instructions',
                'List Instructions Files',
                'List Personas Files',
                'List Commands Files',
                'Create New Instruction',
                'Create New Persona',
                'Create New Command'
            ], { placeHolder: 'Select Claude Directory Action', ignoreFocusOut: true });
            if (!action)
                return;
            const cfg = vscode.workspace.getConfiguration('skillset');
            const serverMode = cfg.get('serverMode', 'local');
            const baseUrl = cfg.get('httpBaseUrl', 'http://localhost:8080');
            switch (action) {
                case 'View Directory Structure':
                    let directory;
                    if (serverMode === 'http') {
                        const r = await (0, node_fetch_1.default)(`${baseUrl}/claude-directory`);
                        directory = await r.json();
                    }
                    else {
                        directory = await lib_js_1.Skills.list_claude_directory();
                    }
                    const doc = await vscode.workspace.openTextDocument({
                        content: JSON.stringify(directory, null, 2),
                        language: 'json'
                    });
                    await vscode.window.showTextDocument(doc, { preview: true });
                    break;
                case 'Read Main Instructions':
                    let instructions;
                    if (serverMode === 'http') {
                        const r = await (0, node_fetch_1.default)(`${baseUrl}/claude-instructions`);
                        instructions = await r.json();
                    }
                    else {
                        instructions = await lib_js_1.Skills.read_claude_instructions();
                    }
                    const instrDoc = await vscode.workspace.openTextDocument({
                        content: instructions.content,
                        language: 'markdown'
                    });
                    await vscode.window.showTextDocument(instrDoc, { preview: true });
                    break;
                case 'Create New Instruction':
                    const instrName = await vscode.window.showInputBox({
                        prompt: 'Enter instruction file name (without .md)',
                        validateInput: (value) => value && value.trim() ? null : 'Name is required'
                    });
                    if (!instrName)
                        return;
                    const instrContent = await vscode.window.showInputBox({
                        prompt: 'Enter initial instruction content',
                        value: `# ${instrName} Instructions\n\napplyTo: "**/*"\n\n## Description\n\nInstructions for ${instrName}.`
                    });
                    if (!instrContent)
                        return;
                    const instrPath = `.claude/agents/instructions/${instrName.trim()}.md`;
                    if (serverMode === 'http') {
                        await (0, node_fetch_1.default)(`${baseUrl}/claude-file`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filePath: instrPath, content: instrContent })
                        });
                    }
                    else {
                        await lib_js_1.Skills.write_claude_file({ filePath: instrPath, content: instrContent });
                    }
                    vscode.window.showInformationMessage(`Instruction file created: ${instrPath}`);
                    break;
                case 'Create New Persona':
                    const personaName = await vscode.window.showInputBox({
                        prompt: 'Enter persona file name (without .md)',
                        validateInput: (value) => value && value.trim() ? null : 'Name is required'
                    });
                    if (!personaName)
                        return;
                    const personaContent = await vscode.window.showInputBox({
                        prompt: 'Enter initial persona content',
                        value: `# Persona: ${personaName}\n\n## 1. Role Summary\n${personaName} persona for project-specific tasks.\n\n## 2. Goals & Responsibilities\n- Define key responsibilities\n- Outline primary objectives\n\n## 3. Tools & Capabilities\n- List relevant tools and frameworks\n- Specify technical capabilities\n\n## 4. Knowledge Scope\n- Domain expertise areas\n- Technical knowledge boundaries\n\n## 5. Constraints\n- Operating limitations\n- Compliance requirements\n\n## 6. Behavioral Directives\n- Decision-making principles\n- Communication style\n\n## 7. Interaction Protocol\n- Input/Output formats\n- Escalation procedures\n\n## 8. Example Workflows\n**Example 1:**\n\`\`\`\nUser: [scenario]\nAgent: [response approach]\n\`\`\`\n\n## 9. Templates & Patterns\n- Code templates\n- Common patterns\n\n## 10. Metadata\n- **Version**: 1.0\n- **Created By**: VS Code Extension\n- **Last Updated**: ${new Date().toISOString().split('T')[0]}`
                    });
                    if (!personaContent)
                        return;
                    const personaPath = `.claude/agents/personas/${personaName.trim()}.md`;
                    if (serverMode === 'http') {
                        await (0, node_fetch_1.default)(`${baseUrl}/claude-file`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filePath: personaPath, content: personaContent })
                        });
                    }
                    else {
                        await lib_js_1.Skills.write_claude_file({ filePath: personaPath, content: personaContent });
                    }
                    vscode.window.showInformationMessage(`Persona file created: ${personaPath}`);
                    break;
                case 'Create New Command':
                    const cmdName = await vscode.window.showInputBox({
                        prompt: 'Enter command file name (without .md)',
                        validateInput: (value) => value && value.trim() ? null : 'Name is required'
                    });
                    if (!cmdName)
                        return;
                    const cmdContent = await vscode.window.showInputBox({
                        prompt: 'Enter initial command content',
                        value: `# Command: ${cmdName}\n\n## Usage\n\nDescription of how to use the ${cmdName} command.\n\n### Parameters\n\n- \`param1\`: Description of parameter 1\n- \`param2\`: Description of parameter 2\n\n### Examples\n\n\`\`\`\n${cmdName} --param1 value1 --param2 value2\n\`\`\`\n\n## Implementation\n\nCommand implementation details and behavior.`
                    });
                    if (!cmdContent)
                        return;
                    const cmdPath = `.claude/commands/${cmdName.trim()}.md`;
                    if (serverMode === 'http') {
                        await (0, node_fetch_1.default)(`${baseUrl}/claude-file`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filePath: cmdPath, content: cmdContent })
                        });
                    }
                    else {
                        await lib_js_1.Skills.write_claude_file({ filePath: cmdPath, content: cmdContent });
                    }
                    vscode.window.showInformationMessage(`Command file created: ${cmdPath}`);
                    break;
                default:
                    // For list actions, show the files in quick pick format
                    let files;
                    if (serverMode === 'http') {
                        const r = await (0, node_fetch_1.default)(`${baseUrl}/claude-directory`);
                        files = await r.json();
                    }
                    else {
                        files = await lib_js_1.Skills.list_claude_directory();
                    }
                    let fileList = [];
                    if (action === 'List Instructions Files') {
                        fileList = files.instructions || [];
                    }
                    else if (action === 'List Personas Files') {
                        fileList = files.personas || [];
                    }
                    else if (action === 'List Commands Files') {
                        fileList = files.commands || [];
                    }
                    if (fileList.length === 0) {
                        vscode.window.showInformationMessage(`No files found for ${action}`);
                        return;
                    }
                    const selectedFile = await vscode.window.showQuickPick(fileList.map(f => ({ label: f.name, description: f.path, detail: `${f.size} bytes, modified: ${new Date(f.lastModified).toLocaleString()}` })), { placeHolder: `Select file to open`, ignoreFocusOut: true });
                    if (selectedFile) {
                        let fileContent;
                        if (serverMode === 'http') {
                            const r = await (0, node_fetch_1.default)(`${baseUrl}/claude-file?path=${encodeURIComponent(selectedFile.description)}`);
                            fileContent = await r.json();
                        }
                        else {
                            fileContent = await lib_js_1.Skills.read_claude_file({ filePath: selectedFile.description });
                        }
                        const doc = await vscode.workspace.openTextDocument({
                            content: fileContent.content,
                            language: 'markdown'
                        });
                        await vscode.window.showTextDocument(doc, { preview: true });
                    }
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`Claude Directory Management failed: ${e?.message || 'Unknown error'}`);
        }
    });
    const packLint = vscode.commands.registerCommand('skillset.packLint', async () => {
        try {
            const sel = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectMany: false, openLabel: 'Select Pack Folder' });
            if (!sel || !sel[0])
                return;
            const folder = sel[0];
            try {
                const cp = await Promise.resolve().then(() => require('node:child_process'));
                const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
                const scriptPath = require('path').join(root, 'scripts', 'pack-lint.mjs');
                const exists = await vscode.workspace.fs.stat(vscode.Uri.file(scriptPath)).then(() => true, () => false);
                if (exists) {
                    await new Promise((resolve, reject) => {
                        const p = cp.spawn(process.execPath, [scriptPath, folder.fsPath], { cwd: root, stdio: 'inherit' });
                        p.on('exit', code => code === 0 ? resolve() : reject(new Error('pack-lint failed')));
                    });
                    vscode.window.showInformationMessage('Pack lint completed.');
                    return;
                }
            }
            catch { }
            const required = ['policies', 'personas'];
            for (const r of required) {
                const d = vscode.Uri.joinPath(folder, r);
                const ok = await vscode.workspace.fs.stat(d).then(() => true, () => false);
                if (!ok)
                    throw new Error(`Missing subfolder: ${r}`);
            }
            const list = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(folder, 'policies'));
            if (!list.length)
                throw new Error('No files in policies/');
            const listP = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(folder, 'personas'));
            if (!listP.length)
                throw new Error('No files in personas/');
            vscode.window.showInformationMessage('Pack structure looks valid.');
        }
        catch (e) {
            vscode.window.showErrorMessage(e?.message || 'packLint failed');
        }
    });
    context.subscriptions.push(runAssertCompliance, summarizeRules, previewGuidance, selectPack, manageClaudeDirectory, packLint, status);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map