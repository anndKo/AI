-- Function to add bonus questions
CREATE OR REPLACE FUNCTION public.add_bonus_questions(_user_id UUID, _amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.user_quotas
    SET bonus_questions = bonus_questions + _amount
    WHERE user_id = _user_id;
END;
$$;