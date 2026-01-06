-- Foreign Key Struktur für PubQuiz App (Schritt für Schritt)
-- Datum: 2026-01-05

-- ==============================================
-- SCHRITT 1: game_teams (Junction-Tabelle)
-- ==============================================
-- Lösche existierende Foreign Keys falls vorhanden
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_teams_game_id_fkey') THEN
        ALTER TABLE game_teams DROP CONSTRAINT game_teams_game_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_teams_team_id_fkey') THEN
        ALTER TABLE game_teams DROP CONSTRAINT game_teams_team_id_fkey;
    END IF;
END $$;

-- Setze Foreign Keys
ALTER TABLE game_teams
ADD CONSTRAINT game_teams_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

ALTER TABLE game_teams
ADD CONSTRAINT game_teams_team_id_fkey 
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Composite Primary Key (falls noch nicht vorhanden)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_teams_pkey') THEN
        ALTER TABLE game_teams DROP CONSTRAINT game_teams_pkey;
    END IF;
    ALTER TABLE game_teams ADD CONSTRAINT game_teams_pkey PRIMARY KEY (game_id, team_id);
END $$;

-- ==============================================
-- SCHRITT 2: rounds → games
-- ==============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rounds_game_id_fkey') THEN
        ALTER TABLE rounds DROP CONSTRAINT rounds_game_id_fkey;
    END IF;
END $$;

ALTER TABLE rounds
ADD CONSTRAINT rounds_game_id_fkey 
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

-- ==============================================
-- SCHRITT 3: round_questions
-- ==============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'round_questions_round_id_fkey') THEN
        ALTER TABLE round_questions DROP CONSTRAINT round_questions_round_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'round_questions_question_id_fkey') THEN
        ALTER TABLE round_questions DROP CONSTRAINT round_questions_question_id_fkey;
    END IF;
END $$;

ALTER TABLE round_questions
ADD CONSTRAINT round_questions_round_id_fkey 
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE;

ALTER TABLE round_questions
ADD CONSTRAINT round_questions_question_id_fkey 
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

-- Unique constraint
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'round_questions_round_question_unique') THEN
        ALTER TABLE round_questions DROP CONSTRAINT round_questions_round_question_unique;
    END IF;
    ALTER TABLE round_questions ADD CONSTRAINT round_questions_round_question_unique UNIQUE (round_id, question_id);
END $$;

-- ==============================================
-- SCHRITT 4: questions → categories
-- ==============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_category_id_fkey') THEN
        ALTER TABLE questions DROP CONSTRAINT questions_category_id_fkey;
    END IF;
END $$;

ALTER TABLE questions
ADD CONSTRAINT questions_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- ==============================================
-- INDIZES für Performance
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_game_teams_game_id ON game_teams(game_id);
CREATE INDEX IF NOT EXISTS idx_game_teams_team_id ON game_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_rounds_game_id ON rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_round_questions_round_id ON round_questions(round_id);
CREATE INDEX IF NOT EXISTS idx_round_questions_question_id ON round_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
