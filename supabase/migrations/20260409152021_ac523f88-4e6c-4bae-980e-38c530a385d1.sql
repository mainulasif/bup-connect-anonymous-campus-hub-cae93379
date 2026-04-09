
-- 1. Sticker packs
CREATE TABLE public.sticker_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon_url text NOT NULL DEFAULT '',
  price integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sticker packs" ON public.sticker_packs FOR SELECT USING (true);

CREATE TABLE public.sticker_pack_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sticker_pack_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stickers" ON public.sticker_pack_stickers FOR SELECT USING (true);

CREATE TABLE public.user_sticker_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id uuid NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, pack_id)
);
ALTER TABLE public.user_sticker_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sticker packs" ON public.user_sticker_packs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sticker packs" ON public.user_sticker_packs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Purchased bubble colors (persistent)
CREATE TABLE public.purchased_bubble_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  color_id uuid NOT NULL REFERENCES public.bubble_colors(id) ON DELETE CASCADE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, color_id)
);
ALTER TABLE public.purchased_bubble_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own purchased colors" ON public.purchased_bubble_colors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchased colors" ON public.purchased_bubble_colors FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Media moderation queue
CREATE TABLE public.media_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.media_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view media reports" ON public.media_reports FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update media reports" ON public.media_reports FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create media reports" ON public.media_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 4. Reply threading on messages
ALTER TABLE public.messages ADD COLUMN reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- 5. Purchase sticker pack RPC
CREATE OR REPLACE FUNCTION public.purchase_sticker_pack(p_pack_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_price integer;
  v_is_free boolean;
  v_points integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT price, is_free INTO v_price, v_is_free FROM public.sticker_packs WHERE id = p_pack_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Pack not found'); END IF;

  IF EXISTS (SELECT 1 FROM public.user_sticker_packs WHERE user_id = v_user_id AND pack_id = p_pack_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already owned');
  END IF;

  IF NOT v_is_free THEN
    SELECT points INTO v_points FROM public.profiles WHERE user_id = v_user_id;
    IF v_points < v_price THEN RETURN json_build_object('success', false, 'error', 'Not enough points'); END IF;
    UPDATE public.profiles SET points = points - v_price WHERE user_id = v_user_id;
  END IF;

  INSERT INTO public.user_sticker_packs (user_id, pack_id) VALUES (v_user_id, p_pack_id);
  RETURN json_build_object('success', true, 'points_spent', CASE WHEN v_is_free THEN 0 ELSE v_price END);
END;
$$;

-- 6. Update purchase_bubble_color to store persistently
CREATE OR REPLACE FUNCTION public.purchase_bubble_color(p_color_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_price integer;
  v_css_class text;
  v_points integer;
  v_already_owned boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT price, css_class INTO v_price, v_css_class FROM public.bubble_colors WHERE id = p_color_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Color not found'); END IF;

  SELECT EXISTS(SELECT 1 FROM public.purchased_bubble_colors WHERE user_id = v_user_id AND color_id = p_color_id) INTO v_already_owned;

  IF NOT v_already_owned AND v_price > 0 THEN
    SELECT points INTO v_points FROM public.profiles WHERE user_id = v_user_id;
    IF v_points < v_price THEN RETURN json_build_object('success', false, 'error', 'Not enough points'); END IF;
    UPDATE public.profiles SET points = points - v_price WHERE user_id = v_user_id;
    INSERT INTO public.purchased_bubble_colors (user_id, color_id) VALUES (v_user_id, p_color_id);
  ELSIF NOT v_already_owned AND v_price = 0 THEN
    INSERT INTO public.purchased_bubble_colors (user_id, color_id) VALUES (v_user_id, p_color_id);
  END IF;

  UPDATE public.profiles SET bubble_color = v_css_class WHERE user_id = v_user_id;
  RETURN json_build_object('success', true, 'points_spent', CASE WHEN v_already_owned THEN 0 ELSE v_price END, 'color', v_css_class);
END;
$$;

-- 7. Seed sticker packs
DO $$
DECLARE
  pack1_id uuid := gen_random_uuid();
  pack2_id uuid := gen_random_uuid();
  pack3_id uuid := gen_random_uuid();
  pack4_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.sticker_packs (id, name, icon_url, price, is_free) VALUES
    (pack1_id, 'Classic Vibes', '😊', 0, true),
    (pack2_id, 'Cool Cats', '😎', 500, false),
    (pack3_id, 'Fire Pack', '🔥', 2000, false),
    (pack4_id, 'Premium Gold', '👑', 10000, false);

  INSERT INTO public.sticker_pack_stickers (pack_id, emoji, label) VALUES
    (pack1_id, '😊', 'Smile'), (pack1_id, '😂', 'Laugh'), (pack1_id, '❤️', 'Heart'),
    (pack1_id, '👍', 'Thumbs Up'), (pack1_id, '🎉', 'Party'), (pack1_id, '🙏', 'Pray'),
    (pack2_id, '😎', 'Cool'), (pack2_id, '🤙', 'Hang Loose'), (pack2_id, '💪', 'Strong'),
    (pack2_id, '🤘', 'Rock'), (pack2_id, '🕶️', 'Shades'), (pack2_id, '🐱', 'Cat'),
    (pack3_id, '🔥', 'Fire'), (pack3_id, '💥', 'Boom'), (pack3_id, '⚡', 'Lightning'),
    (pack3_id, '🌋', 'Volcano'), (pack3_id, '☄️', 'Comet'), (pack3_id, '🎯', 'Target'),
    (pack4_id, '👑', 'Crown'), (pack4_id, '💎', 'Diamond'), (pack4_id, '🏆', 'Trophy'),
    (pack4_id, '⭐', 'Star'), (pack4_id, '🥇', 'Gold Medal'), (pack4_id, '✨', 'Sparkle');
END $$;
