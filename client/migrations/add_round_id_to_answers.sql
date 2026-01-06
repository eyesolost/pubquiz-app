-- Änderung: Füge round_id zu answers Tabelle hinzu
-- Datum: 2026-01-05

-- ==============================================
-- SCHRITT 1: Füge round_id Spalte hinzu (falls nicht vorhanden)
-- ==============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'answers' AND column_name = 'round_id') THEN
        ALTER TABLE answers ADD COLUMN round_id UUID NOT NULL;
        ALTER TABLE answers ADD CONSTRAINT answers_round_id_fkey 
          FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ==============================================
-- SCHRITT 2: Erstelle Foreign Keys
-- ==============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answers_team_id_fkey') THEN
        ALTER TABLE answers DROP CONSTRAINT answers_team_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answers_question_id_fkey') THEN
        ALTER TABLE answers DROP CONSTRAINT answers_question_id_fkey;
    END IF;
END $$;

ALTER TABLE answers
ADD CONSTRAINT answers_team_id_fkey 
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE answers
ADD CONSTRAINT answers_question_id_fkey 
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

-- ==============================================
-- SCHRITT 3: Erstelle Unique Constraint
-- ==============================================
-- Verhindert doppelte Antworten (ein Team antwortet nicht zweimal auf die gleiche Frage in der gleichen Runde)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answers_round_team_question_unique') THEN
        ALTER TABLE answers DROP CONSTRAINT answers_round_team_question_unique;
    END IF;
    ALTER TABLE answers ADD CONSTRAINT answers_round_team_question_unique 
      UNIQUE (round_id, team_id, question_id);
END $$;

-- ==============================================
-- SCHRITT 4: Indizes für Performance
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_answers_round_id ON answers(round_id);
CREATE INDEX IF NOT EXISTS idx_answers_team_id ON answers(team_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_round_team ON answers(round_id, team_id);
