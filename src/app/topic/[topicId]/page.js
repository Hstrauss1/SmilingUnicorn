"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import generatedTopicSession from "@/testPy/out/topic_session_after_learning.json";
import diagnosticSession from "@/testPy/out/topic_session_intro_c_pointers.json";

function TopicSessionContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const topicId = params.topicId;
  const packId = searchParams.get('packId');
  
  const [loading, setLoading] = useState(true);
  const [topicData, setTopicData] = useState(null);
  const [currentView, setCurrentView] = useState('diagnostic'); // diagnostic, learning, final_quiz
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(null);

  useEffect(() => {
    const loadTopicData = async () => {
      setLoading(true);
      
      // Simulate fetching topic session data
      setTimeout(() => {
        // For now, use mock data based on topicId
        let mockTopicData;
        
        if (topicId === generatedTopicSession.topic_session.topic_id) {
          mockTopicData = generatedTopicSession.topic_session;
        } else {
          mockTopicData = diagnosticSession.topic_session;
        }
        
        setTopicData(mockTopicData);
        
        // Determine which view to show based on state
        if (mockTopicData.state === 'diagnostic') {
          setCurrentView('diagnostic');
        } else if (mockTopicData.state === 'learning_session') {
          setCurrentView('learning');
        } else if (mockTopicData.state === 'final') {
          setCurrentView('final_quiz');
        }
        
        setLoading(false);
      }, 500);
    };
    
    loadTopicData();
  }, [topicId]);

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  const handleSubmitQuiz = () => {
    if (!topicData) return;
    
    const questions = currentView === 'diagnostic' 
      ? topicData.diagnostic.questions 
      : topicData.final_quiz.questions;
    
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.question_id] === q.correct_answer) {
        correctCount++;
      }
    });
    
    const score = {
      num_correct: correctCount,
      num_total: questions.length,
      percent: (correctCount / questions.length) * 100
    };
    
    setQuizScore(score);
    setShowResults(true);
  };

  const handleContinueAfterQuiz = () => {
    if (currentView === 'diagnostic') {
      setCurrentView('learning');
      setShowResults(false);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setQuizScore(null);
    } else if (currentView === 'final_quiz') {
      router.push(`/roadmap?packId=${packId}`);
    }
  };

  const handleNextModule = () => {
    if (currentModuleIndex < topicData.learning_session.active_modules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
    } else {
      setCurrentView('final_quiz');
      setCurrentModuleIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!topicData) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Topic Not Found</h2>
            <button 
              onClick={() => router.push(`/roadmap?packId=${packId}`)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Roadmap
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Render Diagnostic or Final Quiz
  if ((currentView === 'diagnostic' || currentView === 'final_quiz') && !showResults) {
    const questions = currentView === 'diagnostic' 
      ? topicData.diagnostic.questions 
      : topicData.final_quiz.questions;
    
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        
        <main className="grow pt-24 pb-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <button 
              onClick={() => router.push(`/roadmap?packId=${packId}`)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 flex items-center gap-1"
            >
              <span>&larr;</span> Back to Roadmap
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {currentView === 'diagnostic' ? '📝 Diagnostic Quiz' : '🎯 Final Quiz'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">{topicData.title}</p>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-700 dark:text-gray-300">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  {currentQuestion.prompt}
                </h2>

                <div className="space-y-3">
                  {currentQuestion.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(currentQuestion.question_id, choice)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        answers[currentQuestion.question_id] === choice
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion.question_id] === choice
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {answers[currentQuestion.question_id] === choice && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-gray-900 dark:text-white">{choice}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Previous
                </button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(answers).length !== questions.length}
                    className="px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    className="px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  // Render Quiz Results
  if (showResults && quizScore) {
    const questions = currentView === 'diagnostic' 
      ? topicData.diagnostic.questions 
      : topicData.final_quiz.questions;

    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        
        <main className="grow pt-24 pb-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">
                  {quizScore.percent >= 80 ? '🎉' : quizScore.percent >= 60 ? '👍' : '📚'}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Quiz Complete!
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  You scored {quizScore.num_correct} out of {quizScore.num_total} ({Math.round(quizScore.percent)}%)
                </p>
              </div>

              {/* Results Summary */}
              <div className="mb-8 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Your Answers</h2>
                {questions.map((q, index) => {
                  const userAnswer = answers[q.question_id];
                  const isCorrect = userAnswer === q.correct_answer;
                  
                  return (
                    <div key={q.question_id} className={`p-4 rounded-xl border-2 ${
                      isCorrect 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    }`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{isCorrect ? '✅' : '❌'}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white mb-2">
                            Q{index + 1}: {q.prompt}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Your answer: <span className={isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>{userAnswer}</span>
                          </p>
                          {!isCorrect && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Correct answer: <span className="text-green-700 dark:text-green-400">{q.correct_answer}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleContinueAfterQuiz}
                className="w-full px-8 py-4 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm text-lg"
              >
                {currentView === 'diagnostic' ? 'Continue to Learning Modules' : 'Back to Roadmap'}
              </button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  // Render Learning Session
  if (currentView === 'learning' && topicData.learning_session.active_modules.length > 0) {
    const currentModule = topicData.learning_session.active_modules[currentModuleIndex];
    const progress = ((currentModuleIndex + 1) / topicData.learning_session.active_modules.length) * 100;

    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        
        <main className="grow pt-24 pb-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <button 
              onClick={() => router.push(`/roadmap?packId=${packId}`)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 flex items-center gap-1"
            >
              <span>&larr;</span> Back to Roadmap
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  🔄 Learning Module
                </h1>
                <p className="text-gray-600 dark:text-gray-400">{topicData.title}</p>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-700 dark:text-gray-300">
                    Module {currentModuleIndex + 1} of {topicData.learning_session.active_modules.length}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Module Content */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {currentModule.title}
                </h2>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6 border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    📖 Explanation
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {currentModule.explanation}
                  </p>
                </div>

                {currentModule.evidence_chunk_ids && currentModule.evidence_chunk_ids.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      📚 Reference Materials
                    </h3>
                    <ul className="space-y-2">
                      {currentModule.evidence_chunk_ids.map((chunkId, idx) => (
                        <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                          • {chunkId.split('__').pop()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={handleNextModule}
                className="w-full px-8 py-4 rounded-lg font-semibold transition-colors bg-purple-600 text-white hover:bg-purple-700 shadow-sm text-lg"
              >
                {currentModuleIndex < topicData.learning_session.active_modules.length - 1 
                  ? 'Next Module' 
                  : 'Continue to Final Quiz'}
              </button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return null;
}

export default function TopicSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <TopicSessionContent />
    </Suspense>
  );
}
