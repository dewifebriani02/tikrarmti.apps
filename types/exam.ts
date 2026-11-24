// Exam System Types for MTI Tikrar Tahfidz
// Ujian Pilihan Ganda Juz 28, 29, 30

export type JuzNumber = number;

export type QuestionType = 'multiple_choice' | 'introduction';

export type ExamStatus = 'not_started' | 'in_progress' | 'completed';

export type AttemptStatus = 'in_progress' | 'submitted' | 'graded';

export type FlagType = 'wrong_answer' | 'typo' | 'unclear' | 'other';

export type FlagStatus = 'pending' | 'reviewing' | 'fixed' | 'rejected' | 'invalid';

// Multiple choice option
export interface ExamOption {
  text: string;
  isCorrect: boolean;
}

// Exam Question (from database)
export interface ExamQuestion {
  id: string;
  juz_number: JuzNumber;
  juz_code?: string;
  section_number?: number;
  section_title: string;
  question_number: number;
  question_text: string;
  question_type: QuestionType;
  options?: ExamOption[]; // JSONB array
  correct_answer?: string;
  points: number;
  question_package?: string; // 'A' | 'B' | 'Both'
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// User's answer to a question
export interface ExamAnswer {
  questionId: string;
  answer: string;
  isCorrect?: boolean; // Computed after submission
  flagged?: boolean; // If user flagged this question
}

// Exam Attempt (User submission)
export interface ExamAttempt {
  id: string;
  user_id: string;
  registration_id: string;
  juz_number: JuzNumber;
  started_at: string;
  submitted_at?: string;
  answers?: ExamAnswer[]; // JSONB array
  total_questions: number;
  correct_answers: number;
  score: number; // 0-100
  status: AttemptStatus;
  created_at: string;
  updated_at: string;
}

// Question Flag (Report from thalibah)
export interface ExamQuestionFlag {
  id: string;
  question_id: string;
  user_id: string;
  attempt_id?: string;
  flag_type: FlagType;
  flag_message?: string;
  status: FlagStatus;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// Extended ExamQuestion with flag info for admin
export interface ExamQuestionWithFlags extends ExamQuestion {
  flags?: ExamQuestionFlag[];
  flag_count?: number;
}

// Section structure for organizing questions
export interface ExamSection {
  section_number: number;
  section_title: string;
  description?: string;
  questions: ExamQuestion[];
}

// Complete exam structure
export interface ExamStructure {
  juz_number: JuzNumber;
  total_questions: number;
  sections: ExamSection[];
}

// Exam session state (for frontend)
export interface ExamSessionState {
  attemptId?: string;
  juzNumber: JuzNumber;
  currentSection: number;
  currentQuestion: number;
  answers: Map<string, string>; // questionId -> answer
  flaggedQuestions: Set<string>; // questionId set
  startedAt: Date;
  timeElapsed: number; // seconds
}

// Exam result summary
export interface ExamResult {
  attempt: ExamAttempt;
  sections: {
    section_number: number;
    section_title: string;
    total_questions: number;
    correct_answers: number;
    percentage: number;
  }[];
  overall_percentage: number;
  passed: boolean; // Based on passing criteria
}

// API Response types
export interface ExamQuestionsResponse {
  data: ExamQuestion[];
  total: number;
  juz_number: JuzNumber;
}

export interface ExamAttemptResponse {
  data: ExamAttempt;
  message?: string;
}

export interface ExamSubmitRequest {
  attemptId: string;
  answers: ExamAnswer[];
  flaggedQuestions?: {
    questionId: string;
    flagType: FlagType;
    message?: string;
  }[];
}

export interface ExamSubmitResponse {
  attempt: ExamAttempt;
  result: ExamResult;
  message: string;
}

// Admin types
export interface AdminExamStats {
  total_questions: number;
  active_questions: number;
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  pending_flags: number;
}

export interface AdminQuestionEditForm {
  juz_number: JuzNumber;
  juz_code?: string;
  section_number: number;
  section_title: string;
  question_number: number;
  question_text: string;
  question_type: QuestionType;
  options: ExamOption[];
  points: number;
  is_active: boolean;
  question_package?: string;
}

// Exam eligibility checker
export interface ExamEligibility {
  isEligible: boolean;
  requiredJuz: JuzNumber | null;
  reason?: string;
  hasCompleted: boolean;
  attemptId?: string;
  score?: number;
  maxAttempts?: number | null;
  attemptsUsed?: number;
  attemptsRemaining?: number | null;
}

// Form types
export interface ExamFlagForm {
  questionId: string;
  flagType: FlagType;
  message?: string;
}

// Exam navigation
export interface ExamNavigation {
  currentSection: number;
  currentQuestion: number;
  totalSections: number;
  totalQuestions: number;
  canGoBack: boolean;
  canGoNext: boolean;
  canSubmit: boolean;
  answeredQuestions: number;
  unansweredQuestions: number;
}

// Exam Configuration
export interface ExamConfiguration {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  start_time?: string;
  end_time?: string;
  max_attempts?: number;
  shuffle_questions: boolean;
  randomize_order: boolean;
  show_questions_all: boolean;
  questions_per_attempt?: number;
  package_a_questions?: number;
  package_b_questions?: number;
  passing_score: number;
  auto_grade: boolean;
  score_calculation_mode: 'highest' | 'average';
  allow_review: boolean;
  show_results: boolean;
  auto_submit_on_timeout: boolean;
  is_active: boolean;
  exam_type?: string; // 'selection' | 'final'
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ExamConfigurationForm {
  name: string;
  description?: string;
  duration_minutes: number;
  start_time?: string;
  end_time?: string;
  max_attempts?: number;
  shuffle_questions: boolean;
  randomize_order: boolean;
  show_questions_all: boolean;
  questions_per_attempt?: number;
  package_a_questions?: number;
  package_b_questions?: number;
  passing_score: number;
  auto_grade: boolean;
  score_calculation_mode: 'highest' | 'average';
  allow_review: boolean;
  show_results: boolean;
  auto_submit_on_timeout: boolean;
  is_active: boolean;
}

// Question Analytics
export interface QuestionAnalytics {
  questionId: string;
  question: ExamQuestion;
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  correctRate: number; // percentage
  avgTimeToAnswer?: number; // seconds
  optionStats: {
    optionText: string;
    timesChosen: number;
    percentage: number;
    isCorrect: boolean;
  }[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuestionAnalyticsResponse {
  data: QuestionAnalytics[];
  summary: {
    totalQuestions: number;
    totalAttempts: number;
    overallCorrectRate: number;
    easyQuestions: number;
    mediumQuestions: number;
    hardQuestions: number;
  };
}
