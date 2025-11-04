-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create notebooks table
CREATE TABLE public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📓',
  color TEXT DEFAULT 'bg-blue-100 dark:bg-blue-950',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on notebooks
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

-- Notebooks policies
CREATE POLICY "Users can view their own notebooks"
  ON public.notebooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notebooks"
  ON public.notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notebooks"
  ON public.notebooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notebooks"
  ON public.notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- Create sources table (uploaded documents)
CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'pdf', 'text', 'url'
  content TEXT, -- extracted text content
  file_path TEXT, -- path to stored file
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on sources
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- Sources policies (check via notebooks)
CREATE POLICY "Users can view sources in their notebooks"
  ON public.sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = sources.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sources in their notebooks"
  ON public.sources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = sources.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sources in their notebooks"
  ON public.sources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = sources.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Create summaries table
CREATE TABLE public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  key_points JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on summaries
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Summaries policies
CREATE POLICY "Users can view summaries in their notebooks"
  ON public.summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = summaries.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create summaries in their notebooks"
  ON public.summaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = summaries.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Create audio_overviews table
CREATE TABLE public.audio_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  summary_id UUID REFERENCES public.summaries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration INTEGER, -- in seconds
  transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on audio_overviews
ALTER TABLE public.audio_overviews ENABLE ROW LEVEL SECURITY;

-- Audio overviews policies
CREATE POLICY "Users can view audio in their notebooks"
  ON public.audio_overviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = audio_overviews.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create audio in their notebooks"
  ON public.audio_overviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = audio_overviews.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Create mind_maps table
CREATE TABLE public.mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  summary_id UUID REFERENCES public.summaries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  data JSONB NOT NULL, -- mind map structure
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on mind_maps
ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;

-- Mind maps policies
CREATE POLICY "Users can view mind maps in their notebooks"
  ON public.mind_maps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = mind_maps.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mind maps in their notebooks"
  ON public.mind_maps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = mind_maps.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Users can view messages in their notebooks"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = chat_messages.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their notebooks"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notebooks
      WHERE notebooks.id = chat_messages.notebook_id
      AND notebooks.user_id = auth.uid()
    )
  );

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Storage policies for documents
CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notebooks_updated_at
  BEFORE UPDATE ON public.notebooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();