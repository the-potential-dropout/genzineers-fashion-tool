# Next steps

Working list for the cloth simulation and assembly work. Updated 2026-11-15.

Standing rules for all of it: full quality, nothing simplified; every product assembled from its real
components the way it is made; physics from material properties; core features work without AI; the
site stays fully static.

## Done in this batch

- **Trousers no longer "dance".** Root causes, each fixed at the source:
  - Inner layers were being pulled onto the body (the old inner-layer pull). Retired; layers are now kept
    apart cloth to cloth (`sim.layerPass` in `src/sim/cloth.js`).
  - Leg tubes were placed straight down from the hip while the mannequin's ankles stand ~6.5 cm further
    out, so the hem started *through* the ankle. Leg panels now lean with the leg (`placement.lean`,
    `BODY.ankleX` / `BODY.ankleY` in `src/core/sizes.js`).
  - Body field had wrong-sign streaks behind the heel (sign taken from the wrong face at mesh edges).
    Fixed: most-facing triangle wins ties, then a flood fill from the grid edge decides inside/outside
    (`src/sim/bodyfield.js`).
  - Tiny corner particles were too light. Lumped mass floor raised to 0.4 h².
- **Trouser pattern follows the body.** Hip ease is now industry values (slim 3, regular 6, relaxed 10,
  oversized 18 cm, plus fullness for pleats, pull-on waists and wide legs; it was ~17–20 cm). Knee and calf
  are drafted from the body's girths plus the style's ease (negative only in stretch cloth).
- **Skirt slits are real openings.** A front/back slit splits that piece into halves joined by a centre seam
  stitched only down to the top of the slit; a side slit leaves the side seam open. The pencil skirt no
  longer has to stretch round both thighs.
- **Cuffs sit at the wrist.** A long sleeve now starts high enough that the cuff begins at the wrist, not
  over the hand (a closed cuff cannot be pulled back over the knuckles). This was the cuff flicker / "cuff
  sticking out" glitch.
- **Interfaced bands** (barrel cuffs, waistbands, collar stands, plackets, facings) are stiffer in stretch
  and bending than the single layer around them.
- New check: `node scripts/jitter-test.mjs [template or a+b ...]` measures frame-to-frame motion after the
  drape. Current results: jeans, chinos, sweatpants, skinny jeans, pencil skirt, shirt alone, tee all still
  (≤ 2 mm/frame).

## Open, in order

1. **Shirt over jeans: last flicker** (~7 mm/frame at the shirt's side hem over the jeans hip,
   `jeans-straight+oxford-shirt`). Without the layer pass the outfit is still (1.6 mm), so it is the pass:
   the set of inner neighbours toggles frame to frame. Next: make the pass continuous (inner points demand
   less with lateral distance instead of a hard 1.6 cm cut-off, soft weight instead of the `dot ≥ 0.7`
   cut-off), smaller per-frame share (0.3 → ~0.15). Then add `jitter-test.mjs` to `npm test`.
   Tried and rejected (made it worse): reversal damping, a final body push after the step, Coulomb static
   friction in the contact, gap closing of the body field.
2. **Belt through the loops:** check visually that the belt follows the waistband and threads through the
   3D loops with no interference with jeans or shirt; add a centre-back loop where the style has one.
3. **Tie:** knot and blade must be one connected topology with the neckband (no disconnected front).
4. **Feet in shoes:** feet must never poke through; the shoe wraps the foot physically.
5. **Skin peeking through clothes:** find the cases and fix the cause.
6. **Pulling:** grabbing hard never tears clothes off the body; stretch follows the material (stiff vs
   elastic) up to its limit.
7. **Per-garment zip/button** controls for every piece of an outfit.
8. **Backpack rebuild** from researched real components: padded front/back panels, gussets, base, zips
   with double sliders and garages, front and side pockets, compression straps, haul loop, S-curve padded
   shoulder straps attached with webbing and ladder locks, sternum strap, load lifters, binding.
9. **Audit every other assembly** for disconnected parts: bag straps, tabs, hat parts, shoe laces, etc.
10. Remaining features: pose animation, sketch-to-3D, review of AI fashion tools for missing features.
11. Release the next version and update the desktop app (Tauri build, install, relaunch).

## Useful commands

```bash
npm test
```

```bash
node scripts/jitter-test.mjs
```

```bash
node scripts/jitter-test.mjs jeans-straight+oxford-shirt
```

```bash
npm run build:wasm
```
