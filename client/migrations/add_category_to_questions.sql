-- Migration: Add category_id foreign key to questions table
-- Date: 2026-01-05

ALTER TABLE questions
ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create an index on category_id for faster filtering
CREATE INDEX idx_questions_category_id ON questions(category_id);
