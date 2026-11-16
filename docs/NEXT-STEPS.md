# Next steps

Working list for the cloth simulation and assembly work. Updated 2026-11-15 (v0.11.0).

Standing rules for all of it: full quality, nothing simplified; every product assembled from its real
components the way it is made; physics from material properties; core features work without AI; the
site stays fully static.

## Done

### Cloth that settles (v0.11.0)
- **Trousers no longer "dance".** Causes fixed at the source:
  - inner layers were pulled onto the body (retired);
  - leg tubes started straight below the hip while the ankles stand wider, so hems began inside the ankle:
    leg panels now lean with the leg (`placement.lean`, `BODY.ankleX/ankleY`);
  - wrong-sign streaks in the body field (most-facing triangle on ties, flood fill from outside);
  - tiny corner particles too light (mass floor 0.4 h²).
- **Layers held apart inside the solver.** Where an outer garment overlaps an inner one, its contact distance from
  the body is set to stand off the inner layer (the solver enforces it every substep); the inner layer is held no
  further out than the outer allows. No blanket clearance elsewhere. A correction after the step caused a two-frame
  flicker and was replaced.
- **Body creases up to 3.2 cm are bridged** for cloth contact (armpit, thumb–hand, fingers): cloth lies across them.
- **Trouser pattern from the body:** hip ease slim 3 / regular 6 / relaxed 10 / oversized 18 cm (+ pleats, pull-on
  waists, wide legs); knee and calf drafted from the body's girths.
- **Skirt slits are real openings** (split centre seam stitched to the top of the slit; side slit = open side seam).
- **Cuffs sit at the wrist:** long sleeves start so a closed cuff never begins over the hand.
- **Interfaced bands** (cuffs, waistbands, collar stands, plackets, facings) stiffer than the cloth around them.
- **Pulling never tears clothes:** sewn seams are held by their thread (open about 2.5 mm beyond the sewn gap under
  load); the hand's grip is firm but finite and its reach capped; cloth springs back on release.

### Assemblies
- **Belt loops** placed as made: five-pocket jeans 5 (front on the crease line, side-back, centre back), tailored
  trousers and chinos 7, each on the waistband's own line. Belt follows the waistband, threads every loop, sits under
  an untucked shirt and over a tucked one (checked numerically in the app).
- **Tie:** the neck loop is one continuous strip from one side of the knot round the neck and back to the other,
  lying flat on the collar stand and clear of the neck (checked for four-in-hand, Windsor, skinny).
- **Feet stay inside shoes:** skin under the shoe's body (upper, lining, footbed, sole) is pressed in to sit inside
  the lining; trims (laces, tassels, buckles) never press. Ray test: no foot showing through on the types checked.
- **Skin through clothes:** ray test on jeans + shirt, chinos + tee, sheath dress, skinny jeans + blazer, hoodie:
  nothing shows through (only hands and neck, which are uncovered).
- **Fastenings, piece by piece:** every zip, button (numbered from the top) and fly of the outfit on its own, plus
  fasten / undo everything. Garments remember their template and name.
- **Backpack rebuilt** from its real pieces (`src/render/backpack3d.js`): front and padded back panels joined by one
  strip (base, side gussets, zip panel) with welted seams; two-way coil zip with individual teeth, two sliders with
  cord pullers, garages; front pocket with its own gusset and zip; stretch-mesh bottle pockets; compression straps
  with side-release buckles; haul loop under a yoke; S-curve padded shoulder straps (shell, foam, air-mesh underside,
  bound edges), ladder-locks, adjusting webbing from folded anchor triangles at the base corners, sternum strap on
  rails, load lifters on larger packs. Real 23-piece cut list and hardware list.

### Tests (`npm test`)
`jitter-test` (settled cloth is still), `layer-test` (layers never cross, tucked or not), `pull-test` (seams hold,
garment returns to the body) run with the existing suites.

## Open, in order

1. **Audit every other bag and assembly** the same way as the backpack: rucksack (reuse the backpack harness and
   body, add the drawstring throat, lid/flap with buckles), duffel, tote, messenger and crossbody strap hardware,
   hats (sweatband, crown seams, bill), shoe laces through every eyelet. Look for anything floating or
   disconnected and anything simplified.
2. **Backpack options:** hip belt, laptop sleeve shown open, reflective tab, interior organiser when opened.
3. Remaining features: pose animation, sketch-to-3D, review of AI fashion tools for missing features.
4. Release and desktop rebuild after each batch (version in package.json, src-tauri/tauri.conf.json,
   src-tauri/Cargo.toml).

## Useful commands

```bash
npm test
```

```bash
node scripts/jitter-test.mjs jeans-straight+oxford-shirt
```

```bash
node scripts/pull-test.mjs
```

```bash
npm run build:wasm
```
