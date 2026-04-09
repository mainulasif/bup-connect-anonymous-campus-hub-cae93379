
-- Fix 1: Add UPDATE policy to messages table for delete functionality
CREATE POLICY "Members can update own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  OR is_conversation_member(auth.uid(), conversation_id)
)
WITH CHECK (
  sender_id = auth.uid()
  OR is_conversation_member(auth.uid(), conversation_id)
);

-- Fix 2: Add DELETE policy to messages (in case direct delete is needed)
CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  sender_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =============================================
-- NEW DATA: 20 more bubble colors
-- =============================================
INSERT INTO public.bubble_colors (name, css_class, price) VALUES
('Coral Red', 'bg-red-500', 800),
('Amber Gold', 'bg-amber-500', 900),
('Lime Green', 'bg-lime-500', 700),
('Teal', 'bg-teal-500', 1000),
('Indigo', 'bg-indigo-600', 1200),
('Fuchsia', 'bg-fuchsia-500', 1500),
('Sky Blue', 'bg-sky-400', 600),
('Slate Gray', 'bg-slate-500', 500),
('Violet', 'bg-violet-500', 1800),
('Rose', 'bg-rose-500', 2000),
('Warm Sunset', 'bg-gradient-sunset', 3500),
('Neon Glow', 'bg-gradient-neon', 5000),
('Midnight Blue', 'bg-blue-900', 2500),
('Forest Green', 'bg-green-700', 1100),
('Cherry Blossom', 'bg-pink-300', 1300),
('Steel Blue', 'bg-blue-400', 750),
('Crimson', 'bg-red-700', 2200),
('Lavender', 'bg-purple-300', 1600),
('Mint', 'bg-emerald-300', 900),
('Obsidian', 'bg-gray-900', 4000);

-- =============================================
-- NEW DATA: Expressive sticker packs
-- =============================================

-- Pack 1: BUP Expressions (free)
INSERT INTO public.sticker_packs (id, name, icon_url, price, is_free) VALUES
('a0000001-0000-0000-0000-000000000001', 'BUP Expressions', '😊', 0, true);

INSERT INTO public.sticker_pack_stickers (pack_id, emoji, label) VALUES
('a0000001-0000-0000-0000-000000000001', '😂', 'haha'),
('a0000001-0000-0000-0000-000000000001', '😢', 'sad'),
('a0000001-0000-0000-0000-000000000001', '🥺', 'care'),
('a0000001-0000-0000-0000-000000000001', '👋', 'bye'),
('a0000001-0000-0000-0000-000000000001', '🖐️', 'hello'),
('a0000001-0000-0000-0000-000000000001', '😩', 'life sucks'),
('a0000001-0000-0000-0000-000000000001', '🔥', 'bup is hell'),
('a0000001-0000-0000-0000-000000000001', '❤️', 'love you'),
('a0000001-0000-0000-0000-000000000001', '💜', 'love bup'),
('a0000001-0000-0000-0000-000000000001', '😡', 'angry'),
('a0000001-0000-0000-0000-000000000001', '😊', 'happy'),
('a0000001-0000-0000-0000-000000000001', '🤣', 'funny'),
('a0000001-0000-0000-0000-000000000001', '😱', 'shocked'),
('a0000001-0000-0000-0000-000000000001', '😭', 'crying'),
('a0000001-0000-0000-0000-000000000001', '😮', 'wow');

-- Pack 2: Mood Board (paid)
INSERT INTO public.sticker_packs (id, name, icon_url, price, is_free) VALUES
('a0000002-0000-0000-0000-000000000002', 'Mood Board', '🎭', 500, false);

INSERT INTO public.sticker_pack_stickers (pack_id, emoji, label) VALUES
('a0000002-0000-0000-0000-000000000002', '😴', 'tired'),
('a0000002-0000-0000-0000-000000000002', '😐', 'bored'),
('a0000002-0000-0000-0000-000000000002', '🥰', 'miss you'),
('a0000002-0000-0000-0000-000000000002', '🌙', 'good night'),
('a0000002-0000-0000-0000-000000000002', '☀️', 'good morning'),
('a0000002-0000-0000-0000-000000000002', '🙏', 'thank you'),
('a0000002-0000-0000-0000-000000000002', '😞', 'sorry'),
('a0000002-0000-0000-0000-000000000002', '🙅', 'no way'),
('a0000002-0000-0000-0000-000000000002', '✅', 'yes'),
('a0000002-0000-0000-0000-000000000002', '❌', 'no'),
('a0000002-0000-0000-0000-000000000002', '👌', 'okay'),
('a0000002-0000-0000-0000-000000000002', '😎', 'chill'),
('a0000002-0000-0000-0000-000000000002', '🆘', 'help'),
('a0000002-0000-0000-0000-000000000002', '🎉', 'congrats'),
('a0000002-0000-0000-0000-000000000002', '🍀', 'good luck');

-- Pack 3: Fire Reactions (paid)
INSERT INTO public.sticker_packs (id, name, icon_url, price, is_free) VALUES
('a0000003-0000-0000-0000-000000000003', 'Fire Reactions', '🔥', 1500, false);

INSERT INTO public.sticker_pack_stickers (pack_id, emoji, label) VALUES
('a0000003-0000-0000-0000-000000000003', '💀', 'dead'),
('a0000003-0000-0000-0000-000000000003', '🤡', 'clown'),
('a0000003-0000-0000-0000-000000000003', '🗿', 'bruh'),
('a0000003-0000-0000-0000-000000000003', '💅', 'slay'),
('a0000003-0000-0000-0000-000000000003', '🫠', 'melting'),
('a0000003-0000-0000-0000-000000000003', '🤯', 'mind blown'),
('a0000003-0000-0000-0000-000000000003', '🫶', 'heart hands'),
('a0000003-0000-0000-0000-000000000003', '🤗', 'hug'),
('a0000003-0000-0000-0000-000000000003', '😈', 'evil'),
('a0000003-0000-0000-0000-000000000003', '🫣', 'peeking'),
('a0000003-0000-0000-0000-000000000003', '🤧', 'sneezing'),
('a0000003-0000-0000-0000-000000000003', '🥶', 'freezing'),
('a0000003-0000-0000-0000-000000000003', '🤑', 'rich'),
('a0000003-0000-0000-0000-000000000003', '👀', 'sus'),
('a0000003-0000-0000-0000-000000000003', '🫡', 'salute');

-- Pack 4: Love Language (paid)
INSERT INTO public.sticker_packs (id, name, icon_url, price, is_free) VALUES
('a0000004-0000-0000-0000-000000000004', 'Love Language', '💕', 3000, false);

INSERT INTO public.sticker_pack_stickers (pack_id, emoji, label) VALUES
('a0000004-0000-0000-0000-000000000004', '💘', 'cupid'),
('a0000004-0000-0000-0000-000000000004', '💝', 'gift heart'),
('a0000004-0000-0000-0000-000000000004', '💗', 'growing heart'),
('a0000004-0000-0000-0000-000000000004', '💓', 'heartbeat'),
('a0000004-0000-0000-0000-000000000004', '💞', 'revolving hearts'),
('a0000004-0000-0000-0000-000000000004', '💖', 'sparkling heart'),
('a0000004-0000-0000-0000-000000000004', '🥹', 'touched'),
('a0000004-0000-0000-0000-000000000004', '😘', 'kiss'),
('a0000004-0000-0000-0000-000000000004', '🫂', 'hug'),
('a0000004-0000-0000-0000-000000000004', '💌', 'love letter');

-- Pack 5: Campus Life (paid)  
INSERT INTO public.sticker_packs (id, name, icon_url, price, is_free) VALUES
('a0000005-0000-0000-0000-000000000005', 'Campus Life', '🎓', 5000, false);

INSERT INTO public.sticker_pack_stickers (pack_id, emoji, label) VALUES
('a0000005-0000-0000-0000-000000000005', '📚', 'study time'),
('a0000005-0000-0000-0000-000000000005', '☕', 'coffee break'),
('a0000005-0000-0000-0000-000000000005', '🎓', 'graduation'),
('a0000005-0000-0000-0000-000000000005', '📝', 'exam mode'),
('a0000005-0000-0000-0000-000000000005', '🏃', 'running late'),
('a0000005-0000-0000-0000-000000000005', '🤓', 'nerd'),
('a0000005-0000-0000-0000-000000000005', '🍕', 'canteen time'),
('a0000005-0000-0000-0000-000000000005', '😪', 'lecture sleep'),
('a0000005-0000-0000-0000-000000000005', '🎶', 'vibing'),
('a0000005-0000-0000-0000-000000000005', '📱', 'scrolling');

-- =============================================
-- NEW DATA: More accessories
-- =============================================
INSERT INTO public.shop_items (name, category, icon_url, price, description) VALUES
-- Face items
('Round Glasses', 'face', '/accessories/sunglasses.svg', 200, 'Classic round specs'),
('Steampunk Goggles', 'face', '/accessories/spy-goggles.svg', 800, 'Industrial chic'),
('Phantom Mask', 'face', '/accessories/eye-mask.svg', 1500, 'Half-face mystery'),
('Cyber Visor', 'face', '/accessories/neon-visor.svg', 3000, 'Futuristic HUD'),
('Gas Mask Pro', 'face', '/accessories/gas-mask.svg', 5000, 'Full face tactical'),
-- Hand items
('Acoustic Guitar', 'hand', '/accessories/guitar.svg', 500, 'Strum away'),
('Basketball', 'hand', '/accessories/basketball.svg', 300, 'Baller mode'),
('Boombox', 'hand', '/accessories/boombox.svg', 1200, 'Party starter'),
('Magic Wand', 'hand', '/accessories/magic-wand.svg', 2500, 'Cast spells'),
('Camera', 'hand', '/accessories/camera.svg', 700, 'Capture moments'),
('Katana', 'hand', '/accessories/katana.svg', 8000, 'Legendary blade'),
-- Head items
('Crown', 'head', '/accessories/crown.svg', 10000, 'Royal headpiece'),
('Viking Helmet', 'head', '/accessories/viking-helmet.svg', 5000, 'Nordic warrior'),
('Cowboy Hat', 'head', '/accessories/cowboy-hat.svg', 1500, 'Yeehaw style'),
('Wizard Hat', 'head', '/accessories/wizard-hat.svg', 3000, 'Magical headgear'),
('Ninja Hood', 'head', '/accessories/ninja-hood.svg', 4000, 'Stealth mode'),
('Space Helmet', 'head', '/accessories/space-helmet.svg', 15000, 'Cosmic explorer'),
('Monocle', 'face', '/accessories/monocle.svg', 600, 'Distinguished look');
