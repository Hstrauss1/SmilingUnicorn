"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

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
      
      try {
        // Fetch from Supabase
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('User not authenticated:', userError);
          setTopicData(null);
          setLoading(false);
          return;
        }

        // Fetch user's course_packs row
        const { data, error: fetchError } = await supabase
          .from('course_packs')
          .select('course_packs')
          .eq('user_id', user.id)
          .single();
        
        if (fetchError || !data) {
          console.error('Error fetching course packs:', fetchError);
          setTopicData(null);
          setLoading(false);
          return;
        }

        // Find the course pack with matching course_pack_id
        const pack = data.course_packs.find(p => p.course_pack_id === packId);
        
        if (!pack || !pack.topic_session) {
          console.error('Topic session not found in course pack');
          setTopicData(null);
          setLoading(false);
          return;
        }

        const topicSessionData = pack.topic_session;
        
        if (topicSessionData) {
          setTopicData(topicSessionData);
          
          // Determine which view to show based on state and quiz completion
          if (topicSessionData.state === 'diagnostic') {
            // Check if diagnostic has been completed
            const hasSubmission = topicSessionData.diagnostic?.submission?.answers?.length > 0;
            if (hasSubmission && topicSessionData.learning_session?.active_modules?.length > 0) {
              setCurrentView('learning');
            } else {
              setCurrentView('diagnostic');
            }
          } else if (topicSessionData.state === 'learning_session') {
            setCurrentView('learning');
          } else if (topicSessionData.state === 'final') {
            setCurrentView('final_quiz');
          } else {
            // Default to diagnostic if state is unclear
            setCurrentView('diagnostic');
          }
        } else {
          setTopicData(null);
        }
      } catch (error) {
        console.error('Error loading topic data:', error);
        setTopicData(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadTopicData();
  }, [topicId, packId, supabase]);

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  const handleSubmitQuiz = () => {
    if (!topicData) return;
    
    const questions = currentView === 'diagnostic' 
      ? topicData.diagnostic?.questions || []
      : topicData.final_quiz?.questions || [];
    
    if (questions.length === 0) return;
    
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
      // Check if learning modules are available
      const hasLearningModules = topicData?.learning_session?.active_modules?.length > 0;
      
      if (hasLearningModules) {
        setCurrentView('learning');
        setShowResults(false);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setQuizScore(null);
      } else {
        // Navigate to discussion page for voice practice
        router.push(`/discussion?topicId=${topicId}&packId=${packId}&topicTitle=${encodeURIComponent(topicData?.title || '')}`);
      }
    } else if (currentView === 'final_quiz') {
      router.push(`/roadmap?packId=${packId}`);
    }
  };

  const handleNextModule = () => {
    const activeModules = topicData?.learning_session?.active_modules || [];
    if (currentModuleIndex < activeModules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
    } else {
      setCurrentView('final_quiz');
      setCurrentModuleIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <Header />
        <main className="grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c09080]"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!topicData) {
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <Header />
        <main className="grow flex items-center justify-center">
          <div className="max-w-md mx-auto px-4 text-center">
            <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl border border-[#e8e3d3] dark:border-[#4a4a4a] p-8">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-3">
                Topic Not Found
              </h2>
              <p className="text-[#5a5a5a] dark:text-[#b8b3a3] mb-6">
                We couldn&apos;t find the topic session data for this topic. The content may not have been generated yet.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="w-full px-6 py-3 bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-lg hover:shadow-lg font-semibold transition-all"
                >
                  Return to Dashboard
                </button>
                <button 
                  onClick={() => router.push(`/roadmap?packId=${packId}`)}
                  className="w-full px-6 py-3 bg-[#e8e3d3] dark:bg-[#3a3a3a] text-[#2d2d2d] dark:text-[#e8e3d3] rounded-lg hover:bg-[#f4f1e8] dark:hover:bg-[#4a4a4a] font-semibold transition-colors"
                >
                  Back to Roadmap
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Render Diagnostic or Final Quiz
  if ((currentView === 'diagnostic' || currentView === 'final_quiz') && !showResults) {
    const questions = currentView === 'diagnostic' 
      ? topicData.diagnostic?.questions || []
      : topicData.final_quiz?.questions || [];
    
    // If no questions available, show error
    if (questions.length === 0) {
      return (
        <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
          <Header />
          <main className="grow flex items-center justify-center">
            <div className="max-w-md mx-auto px-4 text-center">
              <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl border border-[#e8e3d3] dark:border-[#4a4a4a] p-8">
                <div className="text-6xl mb-4">📝</div>
                <h2 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-3">
                  {currentView === 'diagnostic' ? 'Diagnostic Quiz' : 'Final Quiz'} Not Available
                </h2>
                <p className="text-[#5a5a5a] dark:text-[#b8b3a3] mb-6">
                  The {currentView === 'diagnostic' ? 'diagnostic' : 'final'} quiz questions haven&apos;t been generated yet for this topic. Please check back later or contact support.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="w-full px-6 py-3 bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-lg hover:shadow-lg font-semibold transition-all"
                  >
                    Return to Dashboard
                  </button>
                  <button 
                    onClick={() => router.push(`/roadmap?packId=${packId}`)}
                    className="w-full px-6 py-3 bg-[#e8e3d3] dark:bg-[#3a3a3a] text-[#2d2d2d] dark:text-[#e8e3d3] rounded-lg hover:bg-[#f4f1e8] dark:hover:bg-[#4a4a4a] font-semibold transition-colors"
                  >
                    Back to Roadmap
                  </button>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <Header />
        
        <main className="grow pt-24 pb-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <button 
              onClick={() => router.push(`/roadmap?packId=${packId}`)}
              className="text-sm text-[#c09080] dark:text-[#d4c4dc] hover:underline mb-4 flex items-center gap-1"
            >
              <span>&larr;</span> Back to Roadmap
            </button>

            <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl border border-[#e8e3d3] dark:border-[#4a4a4a] p-8 shadow-lg">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                  {currentView === 'diagnostic' ? '📝 Diagnostic Quiz' : '🎯 Final Quiz'}
                </h1>
                <p className="text-[#5a5a5a] dark:text-[#b8b3a3]">{topicData.title}</p>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[#5a5a5a] dark:text-[#b8b3a3]">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span className="font-semibold text-[#2d2d2d] dark:text-[#e8e3d3]">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full bg-[#e8e3d3] dark:bg-[#4a4a4a] rounded-full h-2">
                  <div
                    className="bg-linear-to-r from-[#c09080] to-[#d4c4dc] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-6">
                  {currentQuestion.prompt}
                </h2>

                <div className="space-y-3">
                  {currentQuestion.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(currentQuestion.question_id, choice)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        answers[currentQuestion.question_id] === choice
                          ? 'border-[#c09080] bg-[#f5d5cb] dark:bg-[#5a4a45]'
                          : 'border-[#e8e3d3] dark:border-[#4a4a4a] hover:border-[#d4c4dc] dark:hover:border-[#5a4a60]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion.question_id] === choice
                            ? 'border-[#c09080] bg-[#c09080]'
                            : 'border-[#8a8a8a] dark:border-[#888378]'
                        }`}>
                          {answers[currentQuestion.question_id] === choice && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[#2d2d2d] dark:text-[#e8e3d3]">{choice}</span>
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
                  className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#e8e3d3] dark:bg-[#4a4a4a] text-[#2d2d2d] dark:text-[#e8e3d3] hover:bg-[#f4f1e8] dark:hover:bg-[#5a5a5a]"
                >
                  Previous
                </button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(answers).length !== questions.length}
                    className="px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white hover:shadow-lg"
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    className="px-6 py-2 rounded-lg font-medium transition-all bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white hover:shadow-lg"
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
      ? topicData.diagnostic?.questions || []
      : topicData.final_quiz?.questions || [];

    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <Header />
        
        <main className="grow pt-24 pb-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl border border-[#e8e3d3] dark:border-[#4a4a4a] p-8 shadow-lg">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">
                  {quizScore.percent >= 80 ? '🎉' : quizScore.percent >= 60 ? '👍' : '📚'}
                </div>
                <h1 className="text-3xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                  Quiz Complete!
                </h1>
                <p className="text-xl text-[#5a5a5a] dark:text-[#b8b3a3]">
                  You scored {quizScore.num_correct} out of {quizScore.num_total} ({Math.round(quizScore.percent)}%)
                </p>
              </div>

              {/* Results Summary */}
              <div className="mb-8 space-y-4">
                <h2 className="text-lg font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">Review Your Answers</h2>
                {questions.map((q, index) => {
                  const userAnswer = answers[q.question_id];
                  const isCorrect = userAnswer === q.correct_answer;
                  
                  return (
                    <div key={q.question_id} className={`p-4 rounded-xl border-2 ${
                      isCorrect 
                        ? 'border-[#d4e5d4] bg-[#d4e5d4] dark:bg-[#4a5a4a]' 
                        : 'border-[#f5d5cb] bg-[#f5d5cb] dark:bg-[#5a4a45]'
                    }`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{isCorrect ? '✅' : '❌'}</span>
                        <div className="flex-1">
                          <p className="font-medium text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                            Q{index + 1}: {q.prompt}
                          </p>
                          <p className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3]">
                            Your answer: <span className={isCorrect ? 'text-[#4a5a4a] dark:text-[#c8e6d0] font-semibold' : 'text-[#5a4a45] dark:text-[#e8b4a0] font-semibold'}>{userAnswer}</span>
                          </p>
                          {!isCorrect && (
                            <p className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3] mt-1">
                              Correct answer: <span className="text-[#4a5a4a] dark:text-[#c8e6d0] font-semibold">{q.correct_answer}</span>
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
                className="w-full px-8 py-4 rounded-lg font-semibold transition-all bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white hover:shadow-lg text-lg"
              >
                {currentView === 'diagnostic' 
                  ? (topicData?.learning_session?.active_modules?.length > 0 
                      ? 'Continue to Learning Modules' 
                      : 'Continue to Discussion')
                  : 'Back to Roadmap'}
              </button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  // Render Learning Session
  if (currentView === 'learning') {
    const activeModules = topicData.learning_session?.active_modules || [];
    
    // If no modules, show error with option to skip to final quiz
    if (activeModules.length === 0) {
      return (
        <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
          <Header />
          <main className="grow flex items-center justify-center">
            <div className="max-w-md mx-auto px-4 text-center">
              <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl border border-[#e8e3d3] dark:border-[#4a4a4a] p-8">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-3">
                  Learning Modules Not Available
                </h2>
                <p className="text-[#5a5a5a] dark:text-[#b8b3a3] mb-6">
                  No learning modules have been generated for this topic yet. You can skip to the final quiz or return to the dashboard.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => setCurrentView('final_quiz')}
                    className="w-full px-6 py-3 bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-lg hover:shadow-lg font-semibold transition-all"
                  >
                    Skip to Final Quiz
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="w-full px-6 py-3 bg-[#e8e3d3] dark:bg-[#3a3a3a] text-[#2d2d2d] dark:text-[#e8e3d3] rounded-lg hover:bg-[#f4f1e8] dark:hover:bg-[#4a4a4a] font-semibold transition-colors"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }
    
    const currentModule = activeModules[currentModuleIndex];
    const progress = ((currentModuleIndex + 1) / activeModules.length) * 100;

    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <Header />
        
        <main className="grow pt-24 pb-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <button 
              onClick={() => router.push(`/roadmap?packId=${packId}`)}
              className="text-sm text-[#c09080] dark:text-[#d4c4dc] hover:underline mb-4 flex items-center gap-1"
            >
              <span>&larr;</span> Back to Roadmap
            </button>

            <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl border border-[#e8e3d3] dark:border-[#4a4a4a] p-8 shadow-lg">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                  🔄 Learning Module
                </h1>
                <p className="text-[#5a5a5a] dark:text-[#b8b3a3]">{topicData.title}</p>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[#5a5a5a] dark:text-[#b8b3a3]">
                    Module {currentModuleIndex + 1} of {activeModules.length}
                  </span>
                  <span className="font-semibold text-[#2d2d2d] dark:text-[#e8e3d3]">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full bg-[#e8e3d3] dark:bg-[#4a4a4a] rounded-full h-2">
                  <div
                    className="bg-linear-to-r from-[#d4c4dc] to-[#e6dff0] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Module Content */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
                  {currentModule.title}
                </h2>
                
                <div className="bg-[#d4e8f0] dark:bg-[#455560] rounded-xl p-6 mb-6 border border-[#c8e6d0] dark:border-[#5a6a70]">
                  <h3 className="text-lg font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-3">
                    📖 Explanation
                  </h3>
                  <p className="text-[#5a5a5a] dark:text-[#b8b3a3]">
                    {currentModule.explanation}
                  </p>
                </div>

                {currentModule.evidence_chunk_ids && currentModule.evidence_chunk_ids.length > 0 && (
                  <div className="bg-[#f4f1e8] dark:bg-[#3a3a3a] rounded-xl p-6 border border-[#e8e3d3] dark:border-[#4a4a4a]">
                    <h3 className="text-sm font-semibold text-[#5a5a5a] dark:text-[#b8b3a3] mb-3">
                      📚 Reference Materials
                    </h3>
                    <ul className="space-y-2">
                      {currentModule.evidence_chunk_ids.map((chunkId, idx) => (
                        <li key={idx} className="text-sm text-[#5a5a5a] dark:text-[#888378]">
                          • {chunkId.split('__').pop()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={handleNextModule}
                className="w-full px-8 py-4 rounded-lg font-semibold transition-all bg-linear-to-r from-[#d4c4dc] to-[#e6dff0] text-white hover:shadow-lg text-lg"
              >
                {currentModuleIndex < activeModules.length - 1 
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
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c09080]"></div>
      </div>
    }>
      <TopicSessionContent />
    </Suspense>
  );
}
