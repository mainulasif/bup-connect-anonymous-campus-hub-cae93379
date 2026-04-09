
-- Create shop_items table
CREATE TABLE public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('face', 'hand', 'head')),
  icon_url text NOT NULL,
  price integer NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shop items" ON public.shop_items FOR SELECT USING (true);

-- Create user_items table
CREATE TABLE public.user_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  is_equipped boolean NOT NULL DEFAULT false,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user items" ON public.user_items FOR SELECT USING (true);
CREATE POLICY "Users can insert own items" ON public.user_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON public.user_items FOR UPDATE USING (auth.uid() = user_id);

-- Purchase item RPC
CREATE OR REPLACE FUNCTION public.purchase_item(p_item_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price integer;
  v_user_id uuid;
  v_points integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT price INTO v_price FROM public.shop_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Item not found');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already owned');
  END IF;

  SELECT points INTO v_points FROM public.profiles WHERE user_id = v_user_id;
  IF v_points < v_price THEN
    RETURN json_build_object('success', false, 'error', 'Not enough points');
  END IF;

  UPDATE public.profiles SET points = points - v_price WHERE user_id = v_user_id;
  INSERT INTO public.user_items (user_id, item_id) VALUES (v_user_id, p_item_id);

  RETURN json_build_object('success', true, 'points_spent', v_price);
END;
$$;

-- Update cleanup to 50 messages
CREATE OR REPLACE FUNCTION public.cleanup_old_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.messages
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) as rn
      FROM public.messages
    ) ranked WHERE rn > 50
  );
END;
$$;

-- Seed shop items
INSERT INTO public.shop_items (name, category, icon_url, price, description) VALUES
('Eye Mask', 'face', '/accessories/eye-mask.svg', 500, 'A mysterious eye mask'),
('Sunglasses', 'face', '/accessories/sunglasses.svg', 800, 'Cool shades'),
('Spy Goggles', 'face', '/accessories/spy-goggles.svg', 2000, 'Night vision goggles'),
('Monocle', 'face', '/accessories/monocle.svg', 3000, 'A distinguished monocle'),
('Gas Mask', 'face', '/accessories/gas-mask.svg', 10000, 'Industrial gas mask'),
('Neon Visor', 'face', '/accessories/neon-visor.svg', 25000, 'Futuristic neon visor'),
('Guitar', 'hand', '/accessories/guitar.svg', 1500, 'Rock on!'),
('Basketball', 'hand', '/accessories/basketball.svg', 1000, 'Game time'),
('Katana', 'hand', '/accessories/katana.svg', 5000, 'A sharp blade'),
('Magic Wand', 'hand', '/accessories/magic-wand.svg', 8000, 'Cast spells'),
('Camera', 'hand', '/accessories/camera.svg', 2500, 'Say cheese!'),
('Boombox', 'hand', '/accessories/boombox.svg', 15000, 'Blast the beats'),
('Cowboy Hat', 'head', '/accessories/cowboy-hat.svg', 1200, 'Yeehaw!'),
('Crown', 'head', '/accessories/crown.svg', 50000, 'Royal headpiece'),
('Ninja Hood', 'head', '/accessories/ninja-hood.svg', 3000, 'Silent and deadly'),
('Viking Helmet', 'head', '/accessories/viking-helmet.svg', 20000, 'Warrior spirit'),
('Wizard Hat', 'head', '/accessories/wizard-hat.svg', 7500, 'Magical headwear'),
('Space Helmet', 'head', '/accessories/space-helmet.svg', 100000, 'To infinity!');
