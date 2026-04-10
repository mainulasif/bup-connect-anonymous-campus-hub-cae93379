

## Plan: Regenerate All 20 Sticker Packs with Transparent Backgrounds

### Problem
1. Current PNG stickers show a checkered/gray background instead of true transparency (visible in the screenshot)
2. The stickers need to look like the 2nd reference image -- high-quality chibi characters with completely transparent backgrounds, no text labels
3. Only 4 packs have PNGs (dragon, dinosaur, phoenix, robot); 16 packs still use SVGs

### Approach
For each of the 20 characters, generate one sticker sheet image using `edit_image` with the avatar as reference, then slice into 17 individual PNGs. The key change is the improved prompt that emphasizes:
- **No background at all** -- pure transparent/white background that can be removed
- **No text labels** -- expressions shown only through facial expressions and body language  
- **High-quality chibi style** like the reference image (2nd screenshot)
- Individual stickers clearly separated in a grid

After slicing, use Python/PIL to **remove the background** (crop to content, ensure alpha channel transparency) before saving each PNG.

### Per-pack workflow (repeated 20 times, one at a time)
1. **Generate 1 grid image** via `edit_image` with avatar reference. Prompt focuses on: "chibi sticker sheet, 17 expressions in 4x5 grid, each sticker on pure white background, NO text, NO labels, cute chibi style matching the character, expressions shown through face/body only"
2. **Slice grid into individual PNGs** using Python/PIL script that:
   - Divides image into grid cells
   - Removes white/near-white background pixels (converts to alpha transparency)
   - Crops to content bounds
   - Saves as `public/stickers/{name}-{expression}.png`
3. **Update database** -- emoji paths already point to `.png` for completed packs; update remaining 16 packs
4. **Move to next pack**

### Pack order
Start with Phoenix and Robot (redo with proper transparency), then Dragon, Dinosaur (redo), then the 16 remaining: Ghost, Wolf, Alien, Ninja, Samurai, Kraken, Yeti, Cyborg, Griffin, Golem, Serpent, Sphinx, Wraith, Mantis, Scorpion, Chimera

### Technical details
- Background removal: Convert white (>240,240,240) pixels to transparent alpha using PIL
- Grid slicing: Auto-detect cell size from image dimensions divided by 4 cols x 5 rows
- Expression mapping: Hello, Bye, Haha, Happy, Love, Angry, Sad, Crying, Care, Chill, Bored, Good Morning, Good Night, Shocked, Pleading, Nope, Yes (17 total, row-by-row left-to-right)
- DB updates for 16 packs that still have SVG paths in `sticker_pack_stickers.emoji`
- Will keep retrying on rate limit timeouts without stopping

