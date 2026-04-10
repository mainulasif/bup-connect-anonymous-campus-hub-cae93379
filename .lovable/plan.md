

## Plan: Generate Sticker Packs as Grid Images, Then Slice

### Approach
For each remaining pack, generate **1 image** containing a 5x3 grid (15 stickers) or 4x5 grid (17 stickers) of all expressions, then use Python/PIL to slice the grid into individual PNG files. After slicing each pack, update the database records to point to the new PNG paths.

### Packs to process (18 remaining)
Phoenix (needs 9 more), Robot, Ghost, Wolf, Alien, Ninja, Samurai, Kraken, Yeti, Cyborg, Griffin, Golem, Serpent, Sphinx, Wraith, Mantis, Scorpion, Chimera

### Per-pack workflow (repeated 18 times)
1. **Generate 1 grid image** using `edit_image` with the avatar as reference. Prompt: "Create a sticker sheet with 17 chibi stickers of this exact character in a neat grid (4 columns x 5 rows, last row has 1). Each sticker shows a different expression: Hello, Bye, Haha, Happy, Love, Angry, Sad, Crying, Care, Chill, Bored, Good Morning, Good Night, Shocked, Pleading, Nope, Yes. Label each sticker. White outline, transparent/solid background. Same character identity throughout."
2. **Slice the grid** using a Python script with PIL — divide the image into equal cells, crop each, remove background padding, save as `public/stickers/{name}-{expression}.png`
3. **Update database** via migration — change `emoji` column from `.svg` to `.png` paths for that pack
4. **Move to next pack**

### Technical details
- Input: `public/avatars/{name}.png` as reference image
- Grid output: `/tmp/{name}-grid.png`
- Sliced output: `public/stickers/{name}-{expression}.png`
- Slicing script: Python with PIL, auto-detect grid cell size from image dimensions
- DB update: Single migration per pack updating `sticker_pack_stickers.emoji` paths

### Why this works
- 1 API call per pack instead of 15-17
- Consistent style across all stickers in a pack (same generation)
- Automated slicing is instant
- Sequential pack-by-pack ensures progress is saved

