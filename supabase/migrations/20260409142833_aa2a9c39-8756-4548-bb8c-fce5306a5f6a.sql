
-- 1. Message points trigger
CREATE OR REPLACE FUNCTION public.award_message_point()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET points = points + 1 WHERE user_id = NEW.sender_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_message_point
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.award_message_point();

-- 2. Bubble colors table
CREATE TABLE public.bubble_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  css_class text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bubble_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bubble colors"
ON public.bubble_colors FOR SELECT USING (true);

-- 3. Add bubble_color to profiles
ALTER TABLE public.profiles ADD COLUMN bubble_color text DEFAULT NULL;

-- 4. Purchase bubble color RPC
CREATE OR REPLACE FUNCTION public.purchase_bubble_color(p_color_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_price integer;
  v_css_class text;
  v_points integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT price, css_class INTO v_price, v_css_class FROM public.bubble_colors WHERE id = p_color_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Color not found');
  END IF;

  SELECT points INTO v_points FROM public.profiles WHERE user_id = v_user_id;
  IF v_points < v_price THEN
    RETURN json_build_object('success', false, 'error', 'Not enough points');
  END IF;

  UPDATE public.profiles SET points = points - v_price, bubble_color = v_css_class WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'points_spent', v_price, 'color', v_css_class);
END;
$$;

-- 5. Seed bubble colors
INSERT INTO public.bubble_colors (name, css_class, price) VALUES
  ('Default', 'bg-primary', 0),
  ('Ocean Blue', 'bg-blue-600', 500),
  ('Sunset Orange', 'bg-orange-500', 1000),
  ('Neon Green', 'bg-emerald-500', 1500),
  ('Royal Purple', 'bg-purple-600', 3000),
  ('Rose Gold', 'bg-pink-400', 5000),
  ('Diamond', 'bg-cyan-400', 8000),
  ('Aurora', 'bg-gradient-to-r from-purple-500 to-cyan-400', 10000);
