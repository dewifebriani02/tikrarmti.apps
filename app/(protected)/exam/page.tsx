'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  Clock,
  Flag,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  GraduationCap
} from 'lucide-react';
import { ExamQuestion, ExamAnswer, JuzNumber } from '@/types/exam';

interface ExamAttempt {
  id: string;
  juz_number: JuzNumber;
  total_questions: number;
  started_at: string;
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-600">Memuat Ujian...</p></div>}>
      <ExamContent />
    </Suspense>
  );
}

function ExamContent() {
  const searchParams = useSearchParams();
  const source = searchParams?.get('source') || '';
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagMessage, setFlagMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    checkEligibilityAndLoadExam();
  }, []);

  // Timer effect
  useEffect(() => {
    if (attempt) {
      const interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [attempt]);

  const checkEligibilityAndLoadExam = async () => {
    try {
      setLoading(true);

      // Check eligibility
      const eligibilityResponse = await fetch('/api/exam/eligibility' + (source ? '?source=' + source : ''));
      const eligibilityResult = await eligibilityResponse.json();

      if (!eligibilityResponse.ok || !eligibilityResult.data.isEligible) {
        toast.error(eligibilityResult.data.reason || 'Not eligible for exam');
        router.push(source === 'final-exam' ? '/ujian?tab=akhir' : '/perjalanan-saya');
        return;
      }

      const requiredJuz = eligibilityResult.data.requiredJuz;

      // Start or resume exam attempt
      const startResponse = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juz_number: requiredJuz, source }),
      });

      const startResult = await startResponse.json();

      if (!startResponse.ok) {
        toast.error(startResult.error || 'Failed to start exam');
        router.push(source === 'final-exam' ? '/ujian?tab=akhir' : '/perjalanan-saya');
        return;
      }

      setAttempt(startResult.attempt);

      // Load questions
      const questionsResponse = await fetch('/api/exam/questions/for-user' + (source ? '?source=' + source : ''));
      const questionsResult = await questionsResponse.json();

      if (questionsResponse.ok) {
        setQuestions(questionsResult.data || []);

        // Restore previous answers if resuming
        if (startResult.attempt.answers && Array.isArray(startResult.attempt.answers) && startResult.attempt.answers.length > 0) {
          const existingAnswers: Record<string, string> = {};
          startResult.attempt.answers.forEach((ans: ExamAnswer) => {
            existingAnswers[ans.questionId] = ans.answer;
          });
          setAnswers(existingAnswers);
          setShowIntro(false);
        }
      } else {
        toast.error('Failed to load questions');
        router.push(source === 'final-exam' ? '/ujian?tab=akhir' : '/perjalanan-saya');
      }
    } catch (error) {
      console.error('Error loading exam:', error);
      toast.error('Failed to load exam');
      router.push(source === 'final-exam' ? '/ujian?tab=akhir' : '/perjalanan-saya');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleFlagQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    if (flaggedQuestions.has(currentQuestion.id)) {
      // Unflag
      setFlaggedQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentQuestion.id);
        return newSet;
      });
      toast.success('Question unflagged');
    } else {
      // Flag
      setShowFlagModal(true);
    }
  };

  const confirmFlag = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setFlaggedQuestions((prev) => new Set(prev).add(currentQuestion.id));
    setShowFlagModal(false);
    setFlagMessage('');
    toast.success('Question flagged for review');
  };

  const handleSubmitExam = async () => {
    if (!attempt) return;

    // Check if all questions are answered
    const unansweredCount = questions.filter((q) => !answers[q.id]).length;
    if (unansweredCount > 0) {
      const confirmed = window.confirm(
        `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirmed) return;
    }

    try {
      setSubmitting(true);

      const examAnswers: ExamAnswer[] = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));

      const flaggedQuestionsArray = Array.from(flaggedQuestions).map((qId) => ({
        questionId: qId,
        flagType: 'incorrect_answer',
        message: flagMessage || 'Reported by user during exam',
      }));

      const response = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attempt.id,
          answers: examAnswers,
          flaggedQuestions: flaggedQuestionsArray,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Exam submitted successfully!');
        router.push(`/exam/results?attemptId=${attempt.id}` + (source ? `&source=${source}` : ''));
      } else {
        toast.error(result.error || 'Failed to submit exam');
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast.error('Failed to submit exam');
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!attempt || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load exam</p>
        </div>
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 space-y-6">
          <div className="flex justify-center mb-4">
             <GraduationCap className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900">Ketentuan Ujian Akhir Juz {attempt.juz_number}</h2>
          <div className="bg-green-50 text-green-900 p-6 rounded-xl space-y-4 text-sm leading-relaxed border border-green-100">
            <p><strong>Bismillah..</strong> Apakah habibaty siap mengerjakan soal Ujian Akhir Juz {attempt.juz_number} dengan jujur karena Allah tanpa melihat Al Quran, HP, Google atau nanya ke teman, saudara, Mama, Papa, chat GPT, Gemini, Siri atau siapapun yang akan membuat hasil dari ujian muroja'ah ini tidak valid?</p>
            <p>Perlu diketahui hasil ujian bukanlah ajang tinggi-tinggian nilai, yang dapat nilai Mumtaz Murtafi juga ga akan mendapat hadiah apapun dari Akademi, tapi ini sangat berarti buat kami untuk memperbaiki kekurangan program pada angkatan yang akan datang.</p>
            <div className="bg-white/60 p-4 rounded-lg my-4">
               <p className="font-bold mb-2">Kisi-kisi soal:</p>
               <ol className="list-decimal list-inside space-y-1">
                 <li>Sambung ayat</li>
                 <li>Tebak Halaman</li>
               </ol>
            </div>
            <p>Tafaddhol, silakan muroja'ah terlebih dahulu.. Kami serahkan persaksian kejujuran menjawab soal-soal ini kepada Allah Asy-Syahid yang Maha Menyaksikan.</p>
            <p className="font-medium text-green-700">Semoga Allah mudahkan, Baarakallahu Fiikunn</p>
            
            <hr className="border-green-200" />
            
            <p className="italic text-xs">"Tak ada gading yang tak retak."<br/>Jika antum menemukan kesalahan dalam kunci jawaban atau pengetikan, silakan japri Kak Mara melalui WA di: 0813-1365-0842</p>
            <div className="bg-red-50 text-red-800 p-3 rounded border border-red-100 text-xs flex gap-2 items-start mt-2">
               <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
               <p><strong>TANBIH:</strong> Protes kesalahan kunci jawaban hanya jika antunna punya bukti Screenshot saja, setelah selesai submit dan cek Al Quran. Mohon maaf kami tidak melayani protes saat mengerjakan soal atau setelah mengerjakan soal tanpa bukti kesalahan kami.</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowIntro(false)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-green-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Bismillah saya siap dan paham semua ketentuan di atas
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Ujian Juz {attempt.juz_number}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-5 h-5" />
                <span className="font-mono font-medium">{formatTime(elapsedTime)}</span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-green-600">{answeredCount}</span>
                <span className="text-gray-400"> / {questions.length}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Question */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full mb-3">
                  {currentQuestion.section_title}
                </span>
                <h2 className="text-lg font-semibold text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {currentQuestion.question_text}
                </h2>
              </div>
              <button
                onClick={handleFlagQuestion}
                className={`ml-4 p-2 rounded-lg transition ${
                  flaggedQuestions.has(currentQuestion.id)
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={flaggedQuestions.has(currentQuestion.id) ? 'Unflag question' : 'Flag question'}
              >
                <Flag className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => {
              const optText = (option as any).option_text || option.text;
              const isSelected = answers[currentQuestion.id] === optText;
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentQuestion.id, optText)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition ${
                    isSelected
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-green-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-green-600 bg-green-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`flex-1 ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {optText}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Send className="w-4 h-4" />
                Submit Exam
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Question Grid */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((q, index) => {
              const isAnswered = !!answers[q.id];
              const isFlagged = flaggedQuestions.has(q.id);
              const isCurrent = index === currentQuestionIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`aspect-square rounded-lg text-sm font-medium transition ${
                    isCurrent
                      ? 'bg-green-600 text-white ring-2 ring-green-600 ring-offset-2'
                      : isAnswered
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${isFlagged ? 'ring-2 ring-red-500' : ''}`}
                  title={`Question ${index + 1}${isFlagged ? ' (Flagged)' : ''}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span>Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span>Not Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-2 border-red-500 rounded"></div>
              <span>Flagged</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Flag Question</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for flagging this question (optional):
            </p>
            <textarea
              value={flagMessage}
              onChange={(e) => setFlagMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder="e.g., Wrong answer key, unclear question, etc."
            />
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowFlagModal(false);
                  setFlagMessage('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmFlag}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Flag Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Exam?</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-700">
                <span className="font-medium">Total Questions:</span> {questions.length}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Answered:</span>{' '}
                <span className="text-green-600">{answeredCount}</span>
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Unanswered:</span>{' '}
                <span className="text-red-600">{questions.length - answeredCount}</span>
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Time Spent:</span> {formatTime(elapsedTime)}
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Once you submit, you cannot change your answers. Are you sure you want to submit?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Review Answers
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Exam
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
