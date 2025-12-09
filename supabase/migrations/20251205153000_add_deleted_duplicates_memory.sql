-- Create table to store memory of deleted duplicates to prevent re-scanning
CREATE TABLE public.deleted_duplicates_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  source_content_hash TEXT NOT NULL,
  duplicate_content_hash TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  duplicate_file_name TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Create indexes for efficient querying
CREATE INDEX idx_deleted_duplicates_memory_user_id ON public.deleted_duplicates_memory(user_id);
CREATE INDEX idx_deleted_duplicates_memory_hashes ON public.deleted_duplicates_memory(source_content_hash, duplicate_content_hash);

-- Enable Row Level Security
ALTER TABLE public.deleted_duplicates_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deleted_duplicates_memory
CREATE POLICY "Users can view own deleted duplicates memory"
  ON public.deleted_duplicates_memory FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own deleted duplicates memory"
  ON public.deleted_duplicates_memory FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own deleted duplicates memory"
  ON public.deleted_duplicates_memory FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add a function to check if a duplicate pair has been previously deleted
CREATE OR REPLACE FUNCTION public.check_deleted_duplicate_pair(user_uuid UUID, source_hash TEXT, duplicate_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.deleted_duplicates_memory 
    WHERE user_id = user_uuid 
    AND (
      (source_content_hash = source_hash AND duplicate_content_hash = duplicate_hash)
      OR
      (source_content_hash = duplicate_hash AND duplicate_content_hash = source_hash)
    )
  );
END;
$$;