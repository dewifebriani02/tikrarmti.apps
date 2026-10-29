"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  BookOpen,
  Heart,
  Shield,
  Award,
  HelpCircle,
  Star,
  CheckCircle,
  AlertCircle,
  Info,
  GraduationCap,
  Lightbulb
} from "lucide-react";

// Mapping icons from string to Lucide component
const ICON_MAP: Record<string, any> = {
  HelpCircle, Info, BookOpen, Shield, GraduationCap, Users, Lightbulb, Star, Clock, AlertCircle, CheckCircle, Heart, Award
};

export default function FAQ() {
  const [expandedCategory, setExpandedCategory] = useState<number | null>(0);
  const [expandedQuestion, setExpandedQuestion] = useState<{ category: number; question: number } | null>({
    category: 0,
    question: 0
  });

  const [faqData, setFaqData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const res = await fetch('/api/public/faqs', { cache: 'no-store' });
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setFaqData(json.data);
        } else {
          // Fallback static data if no data in db
          setFaqData([
            {
              category: "Program Umum",
              icon: 'BookOpen',
              color: "green",
              questions: [
                {
                  q: "Apa itu Program Tahfidz Tikrar MTI?",
                  a: "Program Tahfidz Tikrar MTI adalah program hafalan Al-Qur'an gratis yang menggunakan metode Tikrar 40x. Program ini khusus untuk Ibu rumah tangga dan remaja putri yang serius ingin menghafal Al-Qur'an dengan komitmen waktu minimal 2 jam per hari."
                },
                {
                  q: "Apakah program ini benar-benar gratis?",
                  a: "Ya, program ini 100% gratis. Tidak ada biaya pendaftaran, biaya bulanan, atau biaya tersembunyi apa pun. Program ini didukung oleh Muallimah dan Musyrifah profesional yang berdedikasi."
                }
              ]
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch FAQs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFaqs();
  }, []);

  const toggleCategory = (index: number) => {
    setExpandedCategory(expandedCategory === index ? null : index);
    if (expandedCategory !== index) {
      setExpandedQuestion({ category: index, question: 0 });
    }
  };

  const toggleQuestion = (categoryIndex: number, questionIndex: number) => {
    if (expandedQuestion?.category === categoryIndex && expandedQuestion?.question === questionIndex) {
      setExpandedQuestion(null);
    } else {
      setExpandedQuestion({ category: categoryIndex, question: questionIndex });
      setExpandedCategory(categoryIndex);
    }
  };

  if (loading) {
    return (
      <section id="faq" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="space-y-4 mt-12">
              <div className="h-24 bg-gray-100 rounded-2xl"></div>
              <div className="h-24 bg-gray-100 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="faq" className="py-24 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-green-50/50 to-transparent"></div>
      <div className="absolute -left-1/4 top-0 w-1/2 h-full bg-gradient-to-tr from-green-50/50 to-transparent rounded-full blur-3xl opacity-50"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="bg-green-100 text-green-800 mb-4 hover:bg-green-200 transition-colors">
            Pusat Bantuan
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Pertanyaan yang Sering{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
              Diajukan
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Temukan jawaban untuk pertanyaan umum seputar program Tahfidz Tikrar MTI. 
            Kami telah merangkum informasi penting untuk memudahkan langkah Ukhti.
          </p>
        </div>

        <div className="space-y-6">
          {faqData.map((category, categoryIndex) => {
            const Icon = ICON_MAP[category.icon] || HelpCircle;
            return (
            <Card 
              key={categoryIndex} 
              className={`overflow-hidden border-2 transition-all duration-300 ${
                expandedCategory === categoryIndex 
                  ? 'border-green-200 shadow-lg shadow-green-100/50' 
                  : 'border-transparent shadow-sm hover:shadow-md hover:border-gray-200'
              }`}
            >
              {/* Category Header */}
              <div
                className={`p-6 cursor-pointer transition-colors duration-300 ${
                  expandedCategory === categoryIndex ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => toggleCategory(categoryIndex)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                      category.color === 'green' ? 'bg-green-100' :
                      category.color === 'blue' ? 'bg-blue-100' :
                      category.color === 'yellow' ? 'bg-yellow-100' :
                      category.color === 'red' ? 'bg-red-100' :
                      category.color === 'purple' ? 'bg-purple-100' :
                      category.color === 'indigo' ? 'bg-indigo-100' :
                      'bg-emerald-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        category.color === 'green' ? 'text-green-900' :
                        category.color === 'blue' ? 'text-blue-600' :
                        category.color === 'yellow' ? 'text-yellow-600' :
                        category.color === 'red' ? 'text-red-600' :
                        category.color === 'purple' ? 'text-purple-600' :
                        category.color === 'indigo' ? 'text-indigo-600' :
                        'text-emerald-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{category.category}</h3>
                      <p className="text-sm text-gray-600">{category.questions.length} pertanyaan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedCategory === categoryIndex ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Questions */}
              {expandedCategory === categoryIndex && (
                <div className="border-t border-gray-200">
                  {category.questions.map((faq: any, questionIndex: number) => (
                    <div
                      key={questionIndex}
                      id={`faq-question-${categoryIndex}-${questionIndex}`}
                      className={`border-b border-gray-100 last:border-b-0 ${
                        expandedQuestion?.category === categoryIndex && expandedQuestion?.question === questionIndex ? 'bg-green-50' : ''
                      }`}
                    >
                      <div
                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                        onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-semibold text-gray-600">
                                {String(questionIndex + 1).padStart(2, '0')}
                              </span>
                            </div>
                            <p className="text-gray-900 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: faq.q }}></p>
                          </div>
                          {expandedQuestion?.category === categoryIndex && expandedQuestion?.question === questionIndex ? (
                            <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </div>
                      {expandedQuestion?.category === categoryIndex && expandedQuestion?.question === questionIndex && (
                        <div className="px-6 pb-6">
                          <div className="pl-11">
                            <div className="bg-white rounded-lg p-4 border border-green-200 prose prose-sm max-w-none prose-emerald">
                              <div dangerouslySetInnerHTML={{ __html: faq.a }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )})}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Masih Ada Pertanyaan?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Jika jawaban yang Ukhti cari tidak ada di atas, jangan ragu untuk menghubungi kami melalui WhatsApp atau official account MTI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://wa.me/628123456789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-green-900 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Hubungi WhatsApp
                </a>
                <a
                  href="https://www.instagram.com/markaztikrar.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity duration-200"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                  </svg>
                  Follow Instagram
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}