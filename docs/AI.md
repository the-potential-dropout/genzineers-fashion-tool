# Connecting AI

Everything in Genzineers Fashion Tool works without AI. AI is an optional co-designer. You stay in control of **what** it may change.

## 1. Chat inside the app (API)

1. Click **✦ AI** (top right) → **Connect**.
2. Pick a **provider**, paste your **API key** (it is stored only on your device and sent only to that provider), and choose a **model**.
3. Click **Test connection**, then go to **Chat**.
4. Tick what the AI may design: *Shape & pattern · Stitching & assembly · Fabrics, blends & fill · Colour & dyeing · Prints & paint · Buttons, trims & decorations · Jewelry · Production settings*. Anything outside those boxes is ignored.
5. Describe what you want. Changes appear in 3D and are undoable (↶).

| Provider | Where to get a key | Example models |
|---|---|---|
| Anthropic Claude | console.anthropic.com | `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-fable-5-2` |
| OpenAI | platform.openai.com | `gpt-5`, `gpt-5-mini` |
| Google Gemini | aistudio.google.com | `gemini-2.5-pro`, `gemini-2.5-flash` |
| OpenRouter (any model) | openrouter.ai | `anthropic/claude-sonnet-5.5`, `meta-llama/llama-4-maverick`, `qwen/qwen3-235b-a22b` |
| Groq, Mistral, DeepSeek, xAI, Together | their consoles | see the model list in the app |
| **Local / edge**: Ollama, LM Studio, llama.cpp, vLLM, Jan, LocalAI | none | any model you have pulled |

Type any model id: the lists are only suggestions.

### Local and edge models
- **Ollama**: `ollama pull qwen2.5` then start with `OLLAMA_ORIGINS=* ollama serve` (lets the app call it). Provider: *Ollama*.
- **LM Studio**: load a model → Developer → Start server (enable CORS). Provider: *LM Studio*.
- **Edge device** (Jetson, Raspberry Pi, a GPU box on your LAN): run any OpenAI-compatible server and set **Base URL** to `http://<device-ip>:<port>/v1`.
- **Cloud GPU** (vLLM / TGI / RunPod / your server): provider *Custom OpenAI-compatible*, Base URL to your endpoint.

## 2. Image tools (ideas, renders, prints)

AI → **Images**:
- **Nano Banana / Nano Banana Pro**: uses your **Google Gemini** key. Tick *Use the current 3D view as reference* to get a photoreal render of your design, or generate moodboards.
- **OpenAI gpt-image-1**: uses your **OpenAI** key.
- **Higgsfield**: easiest through its **MCP server** in the same agent as this app's MCP (see 3): e.g. ask Claude to "render the current design with Higgsfield". Or paste an HTTP endpoint in Connect → Image tools.
- **Custom** (ComfyUI, A1111, Replicate proxy…): endpoint that accepts `{prompt, image}` and returns `{url}` / `{b64}`.

Generated images can be downloaded or applied as a **fabric print** in one click.

## 3. MCP: let any agent drive the app

The MCP server exposes tools: `get_catalog`, `get_project`, `new_design`, `apply_actions`, `recommend`, `check_design`, `export`, `snapshot`, `production_guide`, `load_project`, `status`.

**Run it** (Node 18+): `node mcp-server/index.js` from a clone of this repo (after `npm install`).

**Add it to your client:**

```jsonc
// Claude Desktop: claude_desktop_config.json   ·   Claude Code: .mcp.json
{ "mcpServers": { "genzineers-fashion": { "command": "node", "args": ["/path/to/genzineers-fashion-tool/mcp-server/index.js"] } } }
```
```bash
# Claude Code CLI
claude mcp add genzineers-fashion -- node /path/to/genzineers-fashion-tool/mcp-server/index.js
```
```toml
# OpenAI Codex CLI: ~/.codex/config.toml
[mcp_servers.genzineers-fashion]
command = "node"
args = ["/path/to/genzineers-fashion-tool/mcp-server/index.js"]
```
```jsonc
// Gemini CLI: ~/.gemini/settings.json   (Cursor / Windsurf / VS Code: same shape in their MCP settings)
{ "mcpServers": { "genzineers-fashion": { "command": "node", "args": ["/path/to/genzineers-fashion-tool/mcp-server/index.js"] } } }
```

**See it live:** in the app open AI → Connect → tick **Live link**. The agent's changes now appear instantly, and `snapshot` returns the 3D view. Without the app, the server edits `gft-project.json` (set `GFT_PROJECT` to change the file, `GFT_PORT` to change the port 7821).

## 4. Command line

```bash
export ANTHROPIC_API_KEY=...   # or OPENAI_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY / GROQ_API_KEY ...
node cli/gft.mjs "a boxy heavyweight tee, garment-dyed sage, puff-print chest logo" --model claude-sonnet-5-5
node cli/gft.mjs "14k rose gold cuban bracelet, 3 mm" --scope jewelry
node cli/gft.mjs --provider ollama --model qwen2.5 "make the cuffs ribbed"
node cli/gft.mjs do set_size '{"chart":"womens","size":"S"}'
node cli/gft.mjs export techpack techpack.html
```

## Privacy
Keys and designs stay on your device. Requests go directly from your browser or desktop app to the provider you selected, with nothing in between.
