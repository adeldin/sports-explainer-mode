# Icon artwork — how to change it, and how to undo it

Custom art replacing the app's emoji icons. Generated with GPT Image 2, background-stripped with
Recraft, committed as transparent PNGs.

**The art is committed on purpose.** `*.png` is gitignored repo-wide; this directory is explicitly
un-ignored in `/.gitignore`. That is load-bearing — git history is the undo button for artwork.

---

## Undoing something

Four levels, smallest blast radius first. Pick the smallest one that solves your problem.

### 1. One icon back to its emoji
Add its emoji to `DISABLED_ICONS` in [`lib/iconAssets.ts`](../../lib/iconAssets.ts):

```ts
export const DISABLED_ICONS = new Set<string>(['🧠']);
```

That icon renders as the emoji again. The art stays on disk, so it's a one-character change to
bring back.

### 2. One icon back to a PREVIOUS version
Every generated PNG is in git, so history is the archive:

```bash
git log --oneline -- assets/icons/brain.png     # find the version you liked
git checkout <sha> -- assets/icons/brain.png
```

### 3. One icon redrawn
Edit its `subject` in [`scripts/icons/spec.mjs`](../../scripts/icons/spec.mjs), then:

```bash
OPENAI_API_KEY=... RECRAFT_API_KEY=... node scripts/icons/generate.mjs --only brain
```

The generator is incremental — it hashes each prompt into `MANIFEST.json` and only redraws icons
whose art is missing or whose prompt changed. Editing one line costs one image, not thirty-six.
Add `--force` to redraw regardless (useful when you just want a different roll of the dice).

### 4. Everything back to emoji
One line in [`lib/iconAssets.ts`](../../lib/iconAssets.ts):

```ts
export const USE_IMAGE_ICONS = false;
```

The whole app reverts to exactly how it looked before this system existed. Nothing else changes,
because none of the icon DATA was ever touched — see below.

---

## Why nothing else has to change

The registry is keyed **by the emoji it replaces**, not by a new icon id. The app's 131 icon slots
across 8 data files still say `'🏈'`, and `AppIcon` decides at render time whether to draw the
emoji or the artwork. That means:

- adding art for a new emoji is one line in `ART`
- removing art is one line in `DISABLED_ICONS`
- an unmapped emoji renders as the emoji, so a half-finished set is a valid state
- reverting is never a search-and-replace across the codebase

`AppIcon` takes the same `size` the old `fontSize` used, so layout is unchanged in both directions.

---

## Adding a new icon

1. Add an entry to `ICONS` in `scripts/icons/spec.mjs` — `file`, `emoji`, `subject`.
2. Run the generator (it will pick up only the new one).
3. Add the `require` line to `ART` in `lib/iconAssets.ts`.
4. Run `python3 scripts/icons/normalize.py` to fix format and size (the generator does this automatically).

### Writing a good `subject`

Four rounds of bake-off produced two rules worth obeying:

**Name the structure.** "A soccer ball" made every model invent a panel layout; naming the
black-pentagons-surrounded-by-white-hexagons geometry produced a correct ball every time. Anything
whose meaning depends on its construction needs that construction spelled out.

**Assign colours a role, in hex.** A list of allowed colours makes each icon pick differently — one
got a grey clip, another a red button, and the set stopped looking related. `PALETTE` in the spec
states the role of each hex, and sports opt out via `trueColour` because a navy football would be
unrecognisable.

The palette is the app's own (`FieldEngine`'s `FE` + the theme). Earlier rounds used generic bright
orange and blue that would have looked foreign on the navy UI.

---

## Sizes

`scripts/icons/normalize.py` downscales to the size actually displayed — 256px for icons, 512px for
characters. The generators emit 1024px, which is ~25MB of bundle for art drawn at 28–56pt. Run it
after generating; it is idempotent and skips anything already small enough.

```bash
python3 scripts/icons/normalize.py --check    # report sizes, change nothing
python3 scripts/icons/normalize.py            # fix format + resize in place
```
