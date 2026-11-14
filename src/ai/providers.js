// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * AI providers. Three wire formats cover everything:
 *  - "openai"    OpenAI-compatible /chat/completions (OpenAI, OpenRouter, Groq,
 *                Mistral, DeepSeek, xAI, Together, Ollama, LM Studio, llama.cpp,
 *                vLLM, Jan, any edge or cloud server that speaks it)
 *  - "anthropic" Claude Messages API
 *  - "gemini"    Google Generative Language API
 * Keys are stored only in this browser / desktop app and sent only to the
 * provider you pick. Model lists are suggestions: type any model id.
 */
export const PROVIDERS = {
  anthropic: { name: 'Anthropic Claude', format: 'anthropic', base: 'https://api.anthropic.com', models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-2'], keyUrl: 'https://console.anthropic.com/settings/keys', needsKey: true },
  openai: { name: 'OpenAI', format: 'openai', base: 'https://api.openai.com/v1', models: ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'o4-mini'], keyUrl: 'https://platform.openai.com/api-keys', needsKey: true },
  gemini: { name: 'Google Gemini', format: 'gemini', base: 'https://generativelanguage.googleapis.com/v1beta', models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'], keyUrl: 'https://aistudio.google.com/apikey', needsKey: true },
  openrouter: { name: 'OpenRouter (any model)', format: 'openai', base: 'https://openrouter.ai/api/v1', models: ['anthropic/claude-sonnet-5.5', 'openai/gpt-5', 'google/gemini-2.5-pro', 'meta-llama/llama-4-maverick', 'deepseek/deepseek-chat', 'qwen/qwen3-235b-a22b'], keyUrl: 'https://openrouter.ai/keys', needsKey: true },
  groq: { name: 'Groq (fast open models)', format: 'openai', base: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'qwen/qwen3-32b', 'openai/gpt-oss-120b'], keyUrl: 'https://console.groq.com/keys', needsKey: true },
  mistral: { name: 'Mistral', format: 'openai', base: 'https://api.mistral.ai/v1', models: ['mistral-large-latest', 'mistral-small-latest'], keyUrl: 'https://console.mistral.ai/api-keys', needsKey: true },
  deepseek: { name: 'DeepSeek', format: 'openai', base: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'], keyUrl: 'https://platform.deepseek.com/api_keys', needsKey: true },
  xai: { name: 'xAI Grok', format: 'openai', base: 'https://api.x.ai/v1', models: ['grok-4', 'grok-3-mini'], keyUrl: 'https://console.x.ai', needsKey: true },
  together: { name: 'Together AI', format: 'openai', base: 'https://api.together.xyz/v1', models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo'], keyUrl: 'https://api.together.ai/settings/api-keys', needsKey: true },
  ollama: { name: 'Ollama (local / edge)', format: 'openai', base: 'http://localhost:11434/v1', models: ['llama3.2', 'qwen2.5', 'mistral', 'gemma3', 'phi4'], needsKey: false, local: true },
  lmstudio: { name: 'LM Studio (local)', format: 'openai', base: 'http://localhost:1234/v1', models: ['local-model'], needsKey: false, local: true },
  llamacpp: { name: 'llama.cpp server (local / edge device)', format: 'openai', base: 'http://localhost:8080/v1', models: ['local'], needsKey: false, local: true },
  custom: { name: 'Custom OpenAI-compatible (vLLM, TGI, Jan, LocalAI, cloud GPU)', format: 'openai', base: 'http://localhost:8000/v1', models: ['your-model'], needsKey: false },
};

export const IMAGE_PROVIDERS = {
  'nano-banana': { name: 'Nano Banana (Gemini 2.5 Flash Image)', format: 'gemini-image', model: 'gemini-2.5-flash-image', keyFrom: 'gemini', note: 'Google AI Studio key. Great for photoreal renders of your 3D garment and for idea boards.' },
  'nano-banana-pro': { name: 'Nano Banana Pro (Gemini 3 Pro Image)', format: 'gemini-image', model: 'gemini-3-pro-image-preview', keyFrom: 'gemini', note: 'Higher quality / text rendering.' },
  'openai-image': { name: 'OpenAI gpt-image-1', format: 'openai-image', model: 'gpt-image-1', keyFrom: 'openai', note: 'OpenAI key.' },
  higgsfield: { name: 'Higgsfield (via endpoint or MCP)', format: 'custom-image', note: 'Higgsfield works best through its MCP server in your AI agent (Claude, Codex, etc.) alongside this app\'s MCP server. For in-app use, paste an HTTP endpoint that accepts {prompt, image} and returns {url} or {b64}.' },
  custom: { name: 'Custom image endpoint (ComfyUI, A1111, Replicate proxy...)', format: 'custom-image', note: 'POST JSON {prompt, image?}; response JSON with url / b64 / image field.' },
};

async function readErr(res) {
  let t = ''; try { t = await res.text(); } catch { /* ignore */ }
  return new Error(`${res.status} ${res.statusText}: ${t.slice(0, 400)}`);
}

/** Send a chat. messages: [{role:'user'|'assistant', content}] */
export async function chat(cfg, system, messages, { signal } = {}) {
  const p = PROVIDERS[cfg.provider] || PROVIDERS.custom;
  const base = (cfg.base || p.base).replace(/\/$/, '');
  const model = cfg.model || p.models[0];
  if (p.format === 'anthropic') {
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.key || '', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: 4096, system, messages }),
    });
    if (!res.ok) throw await readErr(res);
    const j = await res.json();
    return (j.content || []).map((c) => c.text || '').join('');
  }
  if (p.format === 'gemini') {
    const res = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.key || '' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }),
    });
    if (!res.ok) throw await readErr(res);
    const j = await res.json();
    return j.candidates?.[0]?.content?.parts?.map((x) => x.text || '').join('') || '';
  }
  const headers = { 'content-type': 'application/json' };
  if (cfg.key) headers.authorization = `Bearer ${cfg.key}`;
  if (cfg.provider === 'openrouter') { headers['HTTP-Referer'] = 'https://genzineers.com'; headers['X-Title'] = 'Genzineers Fashion Tool'; }
  const res = await fetch(`${base}/chat/completions`, { method: 'POST', signal, headers, body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...messages] }) });
  if (!res.ok) throw await readErr(res);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

/** Generate an image; returns a data URL. refImage = optional data URL (e.g. the 3D view). */
export async function generateImage(cfg, prompt, refImage) {
  const p = IMAGE_PROVIDERS[cfg.provider] || IMAGE_PROVIDERS['nano-banana'];
  if (p.format === 'gemini-image') {
    const parts = [{ text: prompt }];
    if (refImage) parts.push({ inlineData: { mimeType: 'image/png', data: refImage.split(',')[1] } });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.key || '' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } }) });
    if (!res.ok) throw await readErr(res);
    const j = await res.json();
    const img = j.candidates?.[0]?.content?.parts?.find((x) => x.inlineData)?.inlineData;
    if (!img) throw new Error('No image returned');
    return `data:${img.mimeType || 'image/png'};base64,${img.data}`;
  }
  if (p.format === 'openai-image') {
    if (refImage) {
      const fd = new FormData();
      fd.append('model', p.model); fd.append('prompt', prompt);
      fd.append('image', await (await fetch(refImage)).blob(), 'ref.png');
      const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { authorization: `Bearer ${cfg.key}` }, body: fd });
      if (!res.ok) throw await readErr(res);
      return `data:image/png;base64,${(await res.json()).data[0].b64_json}`;
    }
    const res = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.key}` }, body: JSON.stringify({ model: p.model, prompt, size: '1024x1024' }) });
    if (!res.ok) throw await readErr(res);
    return `data:image/png;base64,${(await res.json()).data[0].b64_json}`;
  }
  if (!cfg.endpoint) throw new Error('Set the endpoint URL for this image provider in Connect > Image tools.');
  const headers = { 'content-type': 'application/json' };
  if (cfg.key) headers.authorization = `Bearer ${cfg.key}`;
  const res = await fetch(cfg.endpoint, { method: 'POST', headers, body: JSON.stringify({ prompt, image: refImage || undefined }) });
  if (!res.ok) throw await readErr(res);
  const j = await res.json();
  const v = j.b64 || j.image || j.url || j.output?.[0] || j.data?.[0]?.url || j.data?.[0]?.b64_json;
  if (!v) throw new Error('Endpoint response had no url / b64 / image field');
  return v.startsWith('http') || v.startsWith('data:') ? v : `data:image/png;base64,${v}`;
}
