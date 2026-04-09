

## Plan: 10 Fixes — Avatars, Moderation, Accessories, Points, Gifts, Chat Bubbles

### Fix 1: Cooler Avatars
The current SVGs are simple flat circles. Replace all 20 SVG files in `public/avatars/` with more detailed, character-style illustrations — larger bodies, expressive eyes, distinctive features (wings, claws, horns, armor). Inspired by the Antiland dragon/owl style but as flat-design SVGs with more detail and personality.

**Files**: Replace all 20 `public/avatars/*.svg` files

### Fix 2: Demote Option Missing
The demote button logic at `GroupSettingsPage.tsx:234-241` already exists and works correctly — it shows ChevronDown for moderators when `canPromoteDemote` is true. The issue is likely that the current user's role isn't being detected as `creator`. Will add debug logging and ensure the `canPromoteDemote` check includes proper fallback for founder email check.

**Files**: `src/pages/GroupSettingsPage.tsx`

### Fix 3: Show "Chat Mod" Label in Member List
Currently roles show as `(moderator)` in parentheses (line 215). Change to show a styled colored label like "Chat Mod" next to the name, matching the Antiland screenshot style — magenta/pink color, right-aligned.

**Files**: `src/pages/GroupSettingsPage.tsx`

### Fix 4 & 5: Ban/Jail with Timed Durations from Admin Panel
The `admin_punish_user` RPC and `BAN_DURATIONS` constants exist, but the ban dialog only appears from reports. Add a **Users** tab to the Admin Panel where admins can search any user and directly ban/jail them with duration selection. The existing ban dialog already supports duration + reason + ban/jail toggle.

**Files**: `src/pages/AdminPage.tsx` — add "Users" tab with user search + punish action

### Fix 6: Cooler Accessory SVGs
Replace all 18 SVG files in `public/accessories/` with more detailed, stylized designs — thicker lines, gradients, more visual appeal similar to Reddit-style avatar accessories.

**Files**: Replace all 18 `public/accessories/*.svg` files

### Fix 7: Equipped Items Show on Avatar
The `AvatarWithAccessories` component already exists but isn't used everywhere. Update `ProfilePage.tsx`, `UserProfilePage.tsx`, `PostCard.tsx`, `ChatPage.tsx`, `GroupSettingsPage.tsx`, and `InboxPage.tsx` to:
1. Fetch user's equipped items
2. Render `<AvatarWithAccessories>` instead of `<AvatarImg>` showing head/face/hand overlays positioned on the avatar

**Files**: All components rendering avatars, plus `AvatarWithAccessories.tsx` positioning refinements

### Fix 8: Points Not Increasing on Messages
There's a trigger `award_comment_point` on comments but **no trigger on messages**. Need a new database trigger on `messages` INSERT that increments the sender's points by 1.

**Database migration**: Create `award_message_point()` trigger function + trigger on `messages` table

### Fix 9: Gift Announcement in Chat
When a gift is sent, insert a system message into the active conversation (group or DM) like "🎁 X sent Y a Diamond!" Update `GiftDialog.tsx` to accept an optional `conversationId` prop. After successful gift send, insert a message into that conversation. Update `UserProfilePage.tsx` and `ChatPage.tsx` to pass the conversation context.

**Files**: `src/components/GiftDialog.tsx`, `src/pages/ChatPage.tsx` (add gift button in chat header for group chats)

### Fix 10: Chat Bubble Colors
Add a new table `bubble_colors` with color options and prices (500–10,000 pts). Add `bubble_color` column to `profiles`. In Shop, add a "Chat Bubbles" section where users buy colors. In `ChatPage.tsx`, fetch sender's bubble color and apply it to their message background.

**Database migration**: 
- New `bubble_colors` table (id, name, css_class, price)
- Add `bubble_color` column to profiles (nullable text, stores CSS class)
- New RPC `purchase_bubble_color`
- Seed ~8 colors: Default (free), Ocean Blue (500), Sunset Orange (1000), Neon Green (1500), Royal Purple (3000), Rose Gold (5000), Diamond (8000), Aurora (10000)

**Files**: `src/pages/ShopPage.tsx`, `src/pages/ChatPage.tsx`, `src/pages/ProfilePage.tsx`

---

### Files Summary

| File | Action |
|------|--------|
| `public/avatars/*.svg` (20) | Redesign with more detail |
| `public/accessories/*.svg` (18) | Redesign with more detail |
| `src/pages/GroupSettingsPage.tsx` | Fix demote visibility, add "Chat Mod" label |
| `src/pages/AdminPage.tsx` | Add Users tab with search + ban/jail |
| `src/components/AvatarWithAccessories.tsx` | Refine overlay positioning |
| `src/pages/ProfilePage.tsx` | Use AvatarWithAccessories, add bubble color |
| `src/pages/UserProfilePage.tsx` | Use AvatarWithAccessories |
| `src/components/PostCard.tsx` | Use AvatarWithAccessories |
| `src/pages/ChatPage.tsx` | Use AvatarWithAccessories, apply bubble colors, add gift button |
| `src/pages/InboxPage.tsx` | Use AvatarWithAccessories |
| `src/components/GiftDialog.tsx` | Add conversationId prop for chat announcements |
| `src/pages/ShopPage.tsx` | Add Chat Bubbles section |
| Migration SQL | Message points trigger, bubble_colors table, profiles.bubble_color column |

