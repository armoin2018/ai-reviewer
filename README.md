# Copilot Skillset Reviewer — Hybrid

Features:
- GitHub App **Skillset** HTTP API (repo-aware).
- **MCP server** (JSON-RPC over stdio).
- **VS Code** extension (status-bar pack switcher, preview guidance, pack lint).
- Deterministic checks: secrets, tests present, directives ([ASSERT] lines), license headers (heuristic + strict with HEAD), deny-import, labels, commit-type, path blocks.
- Bundled packs: baseline-secure, oss-apache-2, enterprise-strict, pci-dss, pii-redaction, design-doc-reviewer.
- GitHub Action: PR comment + **Check Run** with annotations.

## Quick start
```bash
npm i
npm run dev   # starts HTTP service on :8080
# MCP
npm run mcp   # stdio JSON-RPC
# VS Code extension
cd vscode-extension && npm i && npm run build
```


## Container image (Armoin LLC)
Default image tag: `armoin2018/copilot-skillset:latest`

```bash
make build            # builds armoin2018/copilot-skillset:latest
make push             # pushes to your registry (ensure you're logged in)
docker compose up -d  # builds & runs via docker-compose.yml
```


## GitHub App (manifest-based) setup
1. In GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App** → **Create GitHub App from manifest**.
2. Paste the contents of `.github/app/app-manifest.json` when prompted (or upload as a file if supported).
3. You’ll receive a **one-time code**. Run:
   ```bash
   node scripts/create-github-app-from-manifest.mjs <one-time-code>
   ```
4. Save the resulting `pem` private key to your secrets and set `GH_APP_ID`/`GH_APP_PRIVATE_KEY` in `.env`.


## Versioned container tags
This package pins the container to **armoin2018/copilot-skillset:v0.9.0**.

```bash
make build            # builds armoin2018/copilot-skillset:v0.9.0
make push             # pushes armoin2018/copilot-skillset:v0.9.0
make tag-latest       # optionally tag as :latest
make push-all         # push versioned + latest
```
