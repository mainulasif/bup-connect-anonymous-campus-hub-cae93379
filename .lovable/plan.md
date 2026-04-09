

## Merged Plan: Avatars, Group Settings, Shop Accessories, Icons & Chat Retention

### 1. Replace Emoji Avatars with Custom SVG Illustrations

- Create 20 stylized SVG files in `public/avatars/` (~1-2KB each): dinosaur, phoenix, kraken, ghost, robot, alien, yeti, ninja, samurai, wolf, dragon, serpent, golem, cyborg, sphinx, griffin, wraith, mantis, scorpion, chimera
- Rewrite `src/lib/avatars.ts`: change from `{ id, emoji, label }` to `{ id, src, label }` where `src` is `/avatars/name.svg`
- Create a shared `<AvatarImg />` component for consistent rendering
- Update every component that renders avatars: `PostCard`, `FeedPage`, `PostDetailPage`, `ProfilePage`, `UserProfilePage`, `ChatPage`, `InboxPage`

### 2. Dedicated Group Settings Page

- **New file**: `src/pages/GroupSettingsPage.tsx` at route `/group/:id/settings`
- Layout inspired by the Antiland screenshot: dark card sections for group info, members, rules, actions
- Sections: Group name/type, Join/Leave button, Group Link (copyable for private groups), Group Rules (editable by mods), Pinned Announcements, Active Members list
- Member list shows: avatar image, display name, points, gender icon (Lucide `User`/`UserRound`), age, online dot, role label, DM button
- **Moderation actions** (visible to creator/admin/founder only): Promote to Mod, **Demote from Mod**, Kick, Ban
- Demote option restricted to group creator, admin, or founder — not other moderators
- **Simplify `ChatPage.tsx`**: remove inline members/rules/pinned panels, add a settings gear icon in the header that navigates to the new page

### 3. Replace All UI Emojis with Lucide Icons

No emoji for any system indicator. Replace throughout:

| Context | Lucide Icon |
|---------|-------------|
| Founder badge | `Crown` |
| Admin badge | `ShieldCheck` |
| Creator badge | `Star` |
| Moderator badge | `Wrench` |
| Premium badge | `Gem` |
| Jailed badge | `Lock` |
| Muted badge | `VolumeX` |
| Banned badge | `Ban` |
| Male gender | `User` |
| Female gender | `UserRound` |
| Unspecified gender | `UserX` |
| Promote | `ChevronUp` |
| Demote | `ChevronDown` |
| DM action | `MessageCircle` |
| Pin | `Pin` |
| Rules | `BookOpen` |
| Members | `Users` |
| Mute/Unmute | `BellOff` / `Bell` |

**Files to update**: `badges.ts`, `constants.ts`, `ChatPage`, `AdminPage`, `ProfilePage`, `UserProfilePage`, `PostCard`, `ShopPage`

Gift icons (🌸🧸💜💎) stay as-is — they are product icons, not UI indicators.

### 4. Purchasable Accessories System

**Database (migration)**:
- New table `shop_items`: id, name, category (`face`/`hand`/`head`), icon_url, price (100–100,000), description
- New table `user_items`: id, user_id, item_id (FK → shop_items), is_equipped (bool), purchased_at, UNIQUE(user_id, item_id)
- RPC `purchase_item(p_item_id uuid)`: atomic check-points → deduct → insert, security definer
- Seed ~18 items:
  - **Face**: Eye Mask (500), Sunglasses (800), Spy Goggles (2,000), Monocle (3,000), Gas Mask (10,000), Neon Visor (25,000)
  - **Hand**: Guitar (1,500), Basketball (1,000), Katana (5,000), Magic Wand (8,000), Camera (2,500), Boombox (15,000)
  - **Head**: Cowboy Hat (1,200), Crown (50,000), Ninja Hood (3,000), Viking Helmet (20,000), Wizard Hat (7,500), Space Helmet (100,000)

**SVG assets**: Create ~18 flat-design colored SVGs in `public/accessories/`

**Shop UI** (`ShopPage.tsx`):
- Inside Artifacts tab, add "Accessories" section with 3 sub-tabs: Face, Hand, Head
- Each card: SVG preview, name, price, Buy button (or "Owned" badge)
- Also add visual preview cards for **Profile Frames** (colored border rings), **Chat Bubbles** (gradient message styles), **Name Effects** (styled text) — all "Coming Soon"

**Profile display**:
- `ProfilePage.tsx`: "My Items" section, toggle equip/unequip (max 1 per category)
- `UserProfilePage.tsx`: show equipped items publicly
- New `src/components/AvatarWithAccessories.tsx`: renders avatar + equipped face/hand/head overlays

### 5. Chat Retention: 50 Messages

- Migration: update `cleanup_old_messages()` function from `rn > 100` to `rn > 50`
- `ChatPage.tsx`: change `.limit(100)` to `.limit(50)`

---

### Files Summary

| File | Action |
|------|--------|
| `public/avatars/*.svg` (20 files) | Create |
| `public/accessories/*.svg` (~18 files) | Create |
| `src/lib/avatars.ts` | Rewrite (SVG paths) |
| `src/lib/badges.ts` | Rewrite (Lucide icon names) |
| `src/lib/constants.ts` | Update gender icons |
| `src/components/AvatarWithAccessories.tsx` | Create |
| `src/pages/GroupSettingsPage.tsx` | Create |
| `src/pages/ShopPage.tsx` | Major update |
| `src/pages/ChatPage.tsx` | Simplify + icons |
| `src/pages/ProfilePage.tsx` | Avatars + items + icons |
| `src/pages/UserProfilePage.tsx` | Avatars + items + icons |
| `src/pages/AdminPage.tsx` | Icons |
| `src/pages/FeedPage.tsx` | Avatar rendering |
| `src/pages/PostDetailPage.tsx` | Avatar rendering |
| `src/pages/InboxPage.tsx` | Avatar rendering |
| `src/components/PostCard.tsx` | Avatar + icons |
| `src/App.tsx` | Add routes |
| Migration SQL | `shop_items`, `user_items`, `purchase_item` RPC, seed data, update `cleanup_old_messages` |

