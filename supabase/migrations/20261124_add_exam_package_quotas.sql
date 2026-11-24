-- Add package_a_questions and package_b_questions quota columns to exam_configurations
ALTER TABLE exam_configurations
  ADD COLUMN IF NOT EXISTS package_a_questions INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS package_b_questions INTEGER DEFAULT 50;

UPDATE exam_configurations
SET
  package_a_questions = COALESCE(package_a_questions, 50),
  package_b_questions = COALESCE(package_b_questions, 50),
  questions_per_attempt = COALESCE(package_a_questions, 50) + COALESCE(package_b_questions, 50);
