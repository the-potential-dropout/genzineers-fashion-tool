import { copyFileSync } from 'node:fs';
copyFileSync('sim-core/target/wasm32-unknown-unknown/release/atelier_sim.wasm', 'public/atelier_sim.wasm');
console.log('copied public/atelier_sim.wasm');
