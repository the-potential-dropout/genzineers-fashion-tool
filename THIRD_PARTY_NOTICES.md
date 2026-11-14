# Third-party notices

Genzineers Fashion Tool uses these open-source components under their own licences:

| Component | Licence | Use |
|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) | MIT | 3D rendering, loaders, exporters |
| [Tauri](https://github.com/tauri-apps/tauri) | MIT / Apache-2.0 | Desktop app shell |
| [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) | MIT | MCP server |
| [ws](https://github.com/websockets/ws) | MIT | Live-link hub |
| [zod](https://github.com/colinhacks/zod) | MIT | MCP tool schemas |
| [Vite](https://github.com/vitejs/vite) | MIT | Build tool (dev only) |
| [occt-import-js](https://github.com/kovacsv/occt-import-js) | LGPL-2.1 | STEP/IGES/BREP import. Not bundled: downloaded from a CDN at runtime only when you import such a file |
| [MakeHuman](https://static.makehumancommunity.org/) assets | CC0 1.0 | The male and female mannequins in `public/models/` were generated from MakeHuman's CC0 base mesh and targets (via the MPFB Blender extension, which is GPL and is only used as a generation tool, not distributed). See `scripts/make_mannequins.py` |
| [fflate](https://github.com/101arrowz/fflate) | MIT | Compression (via three.js loaders) |

The cloth solver (Rust/WebAssembly), application code, catalogs and templates are
© Genzineers and covered by the [LICENSE](LICENSE).

Brand names mentioned in catalogs as references (e.g. Gore-Tex®, PrimaLoft®, Thinsulate™,
Cordura®, Lycra®, Tencel™, Ventile®, Harris Tweed®, Argentium®) are trademarks of their owners and are
used only to describe comparable material categories. The app uses generic names.
