

## Plan: Regenerate All 20 Sticker Packs Using AI Image Generation

### Problem
The current sticker SVGs are simple geometric shapes (circles, lines, polygons) that look nothing like the actual avatar characters (detailed chibi-style PNG illustrations). The user wants stickers that are visually derived from the same characters shown in the avatar grid.

### Approach
Use the AI image generation model (`google/gemini-3.1-flash-image-preview`) to generate ~15 sticker images per avatar, using the actual avatar PNG as a reference. Each sticker will be a PNG showing the same character in a different expression/pose.

### Step-by-step

**Step 1 — Generate sticker images for all 20 avatars**
- For each of the 20 avatars (dragon, dinosaur, phoenix, robot, ghost, wolf, alien, ninja, samurai, kraken, yeti, cyborg, griffin, golem, serpent, sphinx, wraith, mantis, scorpion, chimera):
  - Read the avatar PNG from `public/avatars/{name}.png`
  - Use the AI image editing model with the avatar as input, prompting for each of 15 expressions: Hello, Bye, Laugh, Happy, Love, Angry, Sad, Crying, Care, Pleading, Chill, Bored, Good Morning, Good Night, Shocked
  - Save each generated sticker as `public/stickers/{name}-{expression}.png`
- Total: ~300 PNG sticker images

**Step 2 — Replace old SVG stickers**
- Delete or replace the existing geometric SVG stickers in `public/stickers/`
- The new PNGs will use the same naming convention the database already references

**Step 3 — Update database records**
- Clear existing `sticker_pack_stickers` entries that reference old SVG paths
- Insert new records pointing to the generated PNG files
- Update `sticker_packs` icon_url to use each avatar's actual PNG (`/avatars/{name}.png`) as the pack icon
- Keep existing pack ownership (`user_sticker_packs`) intact

**Step 4 — Verify rendering**
- Confirm `StickerPicker.tsx` and `ShopPage.tsx` already handle image paths (they do — `isImageSticker` checks for `/`, `.svg`, `.png`)
- No component code changes should be needed

**Step 5 — QA each pack**
- Visually inspect a sample of generated stickers to confirm they match the avatar character
- Re-generate any that don't match

### Technical details
- Model: `google/gemini-3.1-flash-image-preview` (fast + high quality image gen/edit)
- Input: each avatar PNG + expression prompt
- Output: ~300 PNG files in `public/stickers/`
- DB migration: update `sticker_packs.icon_url` + replace `sticker_pack_stickers.emoji` paths
- Files changed: `public/stickers/*.png` (new), old `public/stickers/*.svg` (removed)
- Tables changed: `sticker_packs`, `sticker_pack_stickers`

### Risks
- AI image generation has rate limits; generating 300 images will take time and may need batching with delays
- Some generated stickers may not perfectly match the avatar — those will be re-generated
- The process may take multiple iterations for quality assurance

