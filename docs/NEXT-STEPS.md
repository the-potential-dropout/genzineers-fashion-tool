# Next steps

Working list for the cloth simulation and assembly work. Updated 2026-11-16 (v0.11.6).

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

### Shoes made like lasted shoes (v0.11.1)
- Last: every cross-section convex (leather bridges toes and joints), the whole last faired round and along.
- Insole drawn, not traced: flat heel seat, one shank curve to the ball, toe spring. The upper is lasted down onto it.
- Sole: the feather edge (lowest 6 mm of the upper at each station), median-filtered, drawn as one smooth curve over
  6 cm, set out by a real edge projection (about 4 mm cemented, 5 to 6 mm welted), read as monotone edges.
  Curvature steps along the outline are now 0.2 to 0.6 mm (were 2 to 60 mm). Heel block matches the heel seat.
- Laces rest on the leather (lifted along the surface normal, then smoothed), never snapped to mesh points.
- Rucksack built on the backpack body and harness: throat with drawcord, eyelets and cord lock; lid draped over it
  with bound edge and two straps to buckles; bellows side pockets with flaps.

### Shapes and fit (v0.11.2)
- Shoe smoothing kept to the foot sections; heel fan and drawn toe box keep their shapes (no wedge toes, no cut heels).
- Lasting pulls only the bottom edge and sides under; toe boxes keep their volume.
- Foot skin outside the last is moved straight in where the shoe covers it (exact inside test, once per shoe):
  ray test shows no skin through any closed or heeled shoe checked (oxford, derbies, loafers, sneakers, booties,
  heeled boots, pumps); open sandals keep the bare foot natural.
- Bags: weave straight across each cut panel; duffel straps and handles on one line.
- Cowboy hat: real cattleman crease depths and brim roll.

### Strap and handle attachments (v0.11.3)
- Tabs (chapes) are strips folded round the ring's bottom bar (or over the handle end where there is no ring),
  laid on the bag and sewn through both layers with a stitched box (box-X on webbing), riveted where the bag is.
- Handle and strap ends go round the ring's top bar (or a snap hook's eye) and fold back flat on themselves,
  box-stitched. Tabs over a handle end are cut wider than the handle.
- Shoulder straps from side rings lie flat against the bag at each end and turn flat over the shoulder.
- Flap bags with top handles carry one handle behind the flap's hinge.

### Lasts, footbeds and clogs (v0.11.4)
- **Toe shapes measured against real lasts** (width 1 cm / 2 cm behind the tip on a men's last): round 5.4 / 7.2 cm,
  almond 4.1 / 5.9, square 7.2 / 7.8, chisel 5.1 / 6.8, pointed 1.3 / 2.4. Almond was as sharp as a pointed toe and is
  now fuller.
- **Toe profiles:** round, almond and pointed toes are domed; square toes keep a flat top and end in a front wall about
  1.5 cm high; chisel toes are a flat bevel from the vamp down to a squared front edge about 1.1 cm high. Near the tip a
  section is never taller than 0.6 of its width, so pointed toes end in a flat, sleek point, not a blade.
- **One convex line from throat to tip:** the top line of the last and its outline seen from above are each lifted to their
  convex hull over the forepart (leather bridges the hollow behind the toe joints and the notch where the ball meets the
  toe box). The lasting pull now ends with matching slope (no ridge along the side), pulls only the lower part of each
  section, and is gentler in the toe box.
- **Moulded footbeds on open shoes:** heel cup (about 12 mm), medial arch (about 13 mm) and a low lateral arch, a slight
  dome behind the ball, the toe bar under the toe roots, and a rim along the sides; full on cork-latex beds, less on
  moulded EVA, a little on a rubber flip-flop, none on a flat leather insole. Held 1.2 mm under the skin wherever the
  foot stands over it, smoothed as if pressed in a mould. The cover is wrapped over the bed's edge.
- **The bare foot stands on the bed:** skin that sinks into it is lifted straight onto it with a soft blend (the heel pad
  flattens); open shoes no longer run the enclosed-foot test (it pushed heel skin sideways into shards).
- **Straps go under the footbed:** the lasting allowance of each strap is tucked below the bed's surface, so straps come
  out of its edge cleanly.
- **Template parts were ignored in 3D:** the renderer looked for part names in the built part list. Horsebits, tassels,
  bows, western scallops, pull straps, ankle straps, clog vents and staples now all show.
- **Moulded foam clog:** vents are holes through the upper with round moulded lips and walls (foot and footbed show
  through); the heel strap is one moulded band round the back of the heel on two rivets through the side walls.
- **Wooden clog:** one carved wooden base on a 4.5 mm rubber sole, the upper nailed along its edge (a staple crown every
  14 mm). New construction: nailed to a wooden base.

### Heels joined to the shoe (v0.11.5)
- **Flat heel seat on the last:** the foot's heel bone is round underneath, so the last's heel used to curve up from the
  seat (on a pump it was 8.6 cm high 2 cm from the back) and the sole and heel narrowed to a point behind it while the
  upper hung a centimetre over each side. Each point of the heel is now lowered by the height of the last's surface
  beneath it (eased over the surface, fading out a few cm up): the heel stands on a flat seat out to its full outline
  and the counter's walls come straight down onto the sole.
- **Sole covers the feather edge everywhere:** where the 6 cm smoothing drew the outline inside the upper (tight heel
  curves) it is set out by that much more there.
- **Heel flush with the sole:** the heel's top is cut to the sole's exact outline, and over the heel seat the sole edge
  is square (no roll-under groove). Pin heels (stiletto, kitten) leave the seat at its full outline and draw in to the
  pin in one concave curve instead of pinching straight under it.

### Inside the shoe (v0.11.5)
- **What the foot stands on inside a closed shoe** is built by type (Footbed option, default by type): a calf half sock
  over the heel, stitched round its edge with a skived front edge, on welted and Blake shoes (the natural leather insole
  shows in front); a full calf sock on cemented dress shoes; a removable moulded EVA or memory-foam insole on sneakers
  and boots with a unit sole (4 mm at the heel, 3 at the ball, heel cup and arch, a visible edge, perforated forefoot and
  a printed heel panel); shearling in shearling shoes. Shaped to the foot and kept 1.2 mm under it.
- **Upper and lining are lasted under the insole:** they end at the feather edge (the last's downward-facing bottom,
  the hollow under the arch included), so from inside only the insole and sock show.
- **Insole board** coloured by what it is: leather on welted, Blake and stitchdown shoes, a non-woven sock on strobel,
  board on cemented.
- **Cut list:** half sock, full sock or removable insole, and the cork-latex bottom filler on welted shoes.
- **Fixed a v0.11.4 regression:** a comment added mid-line in the viewer cut off the rest of that line, so the step
  that keeps feet inside closed shoes stopped running (it threw at runtime; the build still passed).

### Socks knitted as socks (v0.11.6)
- **One seamless tube** (`src/render/sock3d.js`) swept through exact sections of the wearer's leg and foot, each made
  convex (stretched knit bridges the hollow behind the ankle bone and between the toes): leg rings, a fan round the
  heel, foot sections, a toe pocket pulled smooth over the toes. Replaces the old skin layer for socks, which had
  sawtoothed tops, a split toe cap and swirling patterns. Tights and stockings keep the skin layer.
- **Parts cut cleanly from the tube:** rib welt with a rolled top edge (folded double), leg, Y-heel pocket bounded by
  the diagonal gusset lines (about 6.8 cm up the back, 7.8 cm along the sole), toe pocket closed by a linked seam ridge
  across the top of the toes. Ankle socks have the heel tab; no-show liners are cut low round the heel and sides and
  cover the toes.
- **Knit coordinates:** a fixed number of needles (the ankle's round), so the knit stretches over the calf; patterns go
  round a whole number of repeats (no step where the rounds meet); rows follow the leg and, through the heel, each
  needle's own column (the instep knits straight on while the heel's short rows are added at the back).
- **Patterns at real size:** argyle diamonds about 4.5 x 7 cm on the leg with a plain foot; stripes in 2 cm bands.
- Over-the-knee socks now reach above the knee.

### Tests (`npm test`)
`jitter-test` (settled cloth is still), `layer-test` (layers never cross, tucked or not), `pull-test` (seams hold,
garment returns to the body) run with the existing suites.

## Open, in order

1. **Shoes, continued:** heel heights on high heels read low in side view (the foot's pitch caps the heel seat at about
   6 cm for an 8.5 cm pump): check against the stance; flip-flop thong post through the footbed; footbed nubs on
   moulded clogs.
2. **Audit every other bag and assembly** the same way as the backpack: crossbody, satchel, bucket and box bags, wallet and card holder,
   hats (sweatband, crown seams, bill), shoe laces through every eyelet. Look for anything floating or
   disconnected and anything simplified.
3. **Backpack options:** hip belt, laptop sleeve shown open, reflective tab, interior organiser when opened.
4. Remaining features: pose animation, sketch-to-3D, review of AI fashion tools for missing features.
5. Release and desktop rebuild after each batch (version in package.json, src-tauri/tauri.conf.json,
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
