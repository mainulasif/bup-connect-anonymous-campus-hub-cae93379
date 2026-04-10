

## Plan: Batch-Generate All Remaining Stickers via Script

### What changes
Instead of calling the image generation tool one-by-one across many messages, I will write a single Python script that:

1. Loops through all 17 remaining avatars (robot, ghost, wolf, alien, ninja, samurai, kraken, yeti, cyborg, griffin, golem, serpent, sphinx, wraith, mantis, scorpion, chimera)
2. For each avatar, generates 15 expression stickers using the AI gateway
3. Saves each PNG directly to `public/stickers/{name}-{expression}.png`
4. Includes a delay between calls to avoid rate limits
5. Logs progress so we can see which ones completed

Then after the script finishes:
- Remove old SVG sticker files
- Update the database records to point to the new PNG paths

### Technical details
- Script: `/tmp/generate_stickers.py` using the `lovable_ai` library's `edit_image` function
- Input: avatar PNGs from `public/avatars/{name}.png`
- Output: ~255 PNG files (17 avatars x 15 expressions)
- Timeout: Will need extended timeout (~600s) since each image takes a few seconds
- Rate limit handling: 2-3 second delay between generations

### Why this is faster
- One script execution instead of 50+ messages
- No back-and-forth between me and the tools
- Automatic retry/continuation built in

### Steps
1. Copy the AI gateway script to `/tmp/`
2. Write and run the batch generation script (with 600s timeout)
3. Verify all files were created
4. Remove old SVG files
5. Update database records via migration
6. Final QA check

