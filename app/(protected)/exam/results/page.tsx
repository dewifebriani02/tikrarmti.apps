'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  Award,
  TrendingUp,
  Home,
  FileText
} from 'lucide-react';

interface SectionResult {
  section_number: number;
  section_title: string;
  total_questions: number;
  correct_answers: number;
  percentage: number;
}

interface ExamResult {
  attempt: {
    id: string;
    juz_number: number;
    started_at: string;
    submitted_at: string;
    total_questions: number;
    correct_answers: number;
    score: number;
    answers: Array<{
      questionId: string;
      answer: string;
      isCorrect: boolean;
    }>;
  };
  sections: SectionResult[];
  overall_percentage: number;
  passing_score?: number;
  passed: boolean;
}

export default function ExamResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading results...</p>
          </div>
        </div>
      }
    >
      <ExamResultsContent />
    </Suspense>
  );
}

function ExamResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ExamResult | null>(null);

  const source = searchParams.get('source') || '';
  const batchId = searchParams.get('batchId') || '';
  const backUrl = source === 'final-exam' ? '/ujian?tab=akhir' : '/perjalanan-saya';

  useEffect(() => {
    const attemptId = searchParams.get('attemptId');
    if (attemptId) {
      loadExamResult(attemptId);
      return;
    }

    if (source === 'final-exam') {
      resolveFinalExamAttemptAndLoad();
      return;
    }

    toast.error('No exam attempt found');
    router.push(backUrl);
  }, [searchParams]);

  const resolveFinalExamAttemptAndLoad = async () => {
    try {
      setLoading(true);
      const url = `/api/exam/attempts?source=final-exam${batchId ? `&batchId=${encodeURIComponent(batchId)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.attempt?.id && data.attempt?.status === 'submitted') {
        await loadExamResult(data.attempt.id);
        return;
      }
      toast.error('Belum ada hasil ujian akhir yang tersimpan');
      router.push(backUrl);
    } catch (error) {
      console.error('Error resolving final exam attempt:', error);
      toast.error('Failed to load exam results');
      router.push(backUrl);
    } finally {
      setLoading(false);
    }
  };

  const loadExamResult = async (attemptId: string) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/exam/attempts/${attemptId}`);

      if (!response.ok) {
        toast.error('Failed to load exam results');
        router.push(backUrl);
        return;
      }

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load exam results');
      router.push(backUrl);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load results</p>
          <button
            onClick={() => router.push(backUrl)}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {source === 'final-exam' ? 'Kembali ke Halaman Ujian' : 'Go to Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  const timeSpent = result.attempt.submitted_at && result.attempt.started_at
    ? Math.floor(
        (new Date(result.attempt.submitted_at).getTime() -
          new Date(result.attempt.started_at).getTime()) /
          1000
      )
    : 0;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const passingGrade = result.passing_score ?? 60;
  const passed = result.passed ?? (result.overall_percentage >= passingGrade);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-green-600 mb-4">
            {passed ? (
              <CheckCircle className="w-12 h-12 text-white" />
            ) : (
              <XCircle className="w-12 h-12 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Results</h1>
          <p className="text-gray-600">Juz {result.attempt.juz_number} Multiple Choice Exam</p>
        </div>

        {/* Overall Score Card */}
        <div
          className={`rounded-lg p-8 mb-6 ${
            passed
              ? 'bg-gradient-to-r from-green-500 to-green-600'
              : 'bg-gradient-to-r from-orange-500 to-orange-600'
          }`}
        >
          <div className="text-center text-white">
            <div className="text-6xl font-bold mb-2">{result.overall_percentage}%</div>
            <div className="text-xl font-medium mb-4">
              {passed ? 'Congratulations! You Passed!' : 'Keep Trying!'}
            </div>
            <div className="flex items-center justify-center gap-8 text-sm">
              <div>
                <div className="text-white/80">Correct Answers</div>
                <div className="text-2xl font-bold">
                  {result.attempt.correct_answers} / {result.attempt.total_questions}
                </div>
              </div>
              <div>
                <div className="text-white/80">Time Spent</div>
                <div className="text-2xl font-bold">{formatTime(timeSpent)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold text-gray-900">{result.attempt.total_questions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Correct</p>
                <p className="text-2xl font-bold text-green-600">{result.attempt.correct_answers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Incorrect</p>
                <p className="text-2xl font-bold text-red-600">
                  {result.attempt.total_questions - result.attempt.correct_answers}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Section Breakdown
          </h2>
          <div className="space-y-4">
            {result.sections.map((section) => {
              const sectionPassed = section.percentage >= passingGrade;
              return (
                <div key={section.section_number} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{section.section_title}</h3>
                      <p className="text-sm text-gray-600">
                        Section {section.section_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${sectionPassed ? 'text-green-600' : 'text-orange-600'}`}>
                        {section.percentage}%
                      </div>
                      <p className="text-sm text-gray-600">
                        {section.correct_answers} / {section.total_questions}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        sectionPassed ? 'bg-green-600' : 'bg-orange-600'
                      }`}
                      style={{ width: `${section.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pass/Fail Message */}
        <div
          className={`rounded-lg p-6 mb-6 ${
            passed ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
          }`}
        >
          <div className="flex items-start gap-4">
            {passed ? (
              <Award className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <XCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold mb-2 ${passed ? 'text-green-900' : 'text-orange-900'}`}>
                {passed ? 'Exam Passed!' : 'Exam Not Passed'}
              </h3>
              <p className={`text-sm ${passed ? 'text-green-700' : 'text-orange-700'}`}>
                {passed
                  ? 'Alhamdulillah! You have successfully passed the exam. You may now proceed to the next step in your journey.'
                  : `The passing grade is ${passingGrade}%. Please review the material and consult your pembimbing if needed.`}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push(backUrl)}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Home className="w-5 h-5" />
            {source === 'final-exam' ? 'Kembali ke Portal Ujian' : 'Go to Dashboard'}
          </button>
        </div>

        {/* Exam Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Submitted on {new Date(result.attempt.submitted_at).toLocaleString('id-ID')}</p>
        </div>
      </div>
    </div>
  );
}
