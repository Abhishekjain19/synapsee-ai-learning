-- Create reports table to store generated reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (
    notebook_id IN (
      SELECT id FROM public.notebooks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    notebook_id IN (
      SELECT id FROM public.notebooks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own reports"
  ON public.reports FOR DELETE
  USING (
    notebook_id IN (
      SELECT id FROM public.notebooks WHERE user_id = auth.uid()
    )
  );

-- Create flashcards table
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  summary_id UUID REFERENCES public.summaries(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on flashcards
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- RLS policies for flashcards
CREATE POLICY "Users can view their own flashcards"
  ON public.flashcards FOR SELECT
  USING (
    notebook_id IN (
      SELECT id FROM public.notebooks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own flashcards"
  ON public.flashcards FOR INSERT
  WITH CHECK (
    notebook_id IN (
      SELECT id FROM public.notebooks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own flashcards"
  ON public.flashcards FOR DELETE
  USING (
    notebook_id IN (
      SELECT id FROM public.notebooks WHERE user_id = auth.uid()
    )
  );