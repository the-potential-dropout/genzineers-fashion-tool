# Contributing

Thanks for helping improve Genzineers Fashion Tool!

## Contributor License Agreement (required)

By opening a pull request, issue with code, or otherwise submitting a
contribution (code, templates, catalog data, docs, art), you agree that:

1. You wrote the contribution, or have the right to submit it.
2. You grant Genzineers a perpetual, worldwide, irrevocable, royalty-free,
   non-exclusive licence to use, modify, sublicense and distribute your
   contribution under any terms, **including commercial licences**, and to
   relicense it as part of the Software.
3. You keep the copyright to your contribution, and you will not assert any
   patent or other rights against Genzineers or its licensees for using it.
4. Your contribution is provided "as is" without warranty.

If you can't agree to this, please open an issue describing the idea instead.

## Development

```bash
npm install
npm run dev            # web app at http://localhost:5173
npm test               # headless cloth simulation over every template
npm run build:wasm     # rebuild the Rust solver (needs rustup target wasm32-unknown-unknown)
npm run desktop:dev    # Tauri desktop app (needs Rust + platform prerequisites)
```

Keep it fast and light: render on demand, no new runtime dependencies
without discussion, and test on a phone-sized viewport.
