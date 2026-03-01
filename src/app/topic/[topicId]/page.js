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
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [finalQuizPassed, setFinalQuizPassed] = useState(false);

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
          
          // Determine which view to show based on state
          if (topicSessionData.state === 'diagnostic') {
            // Check if diagnostic has been completed
            const hasSubmission = topicSessionData.diagnostic?.submission?.answers?.length > 0;
            if (hasSubmission && topicSessionData.learning_session?.active_modules?.length > 0) {
              setCurrentView('learning');
            } else {
              setCurrentView('diagnostic');
            }
          } else if (topicSessionData.state === 'discussion') {
            // After diagnostic, redirect to discussion page
            const topicTitle = encodeURIComponent(topicSessionData.title || 'Topic Discussion');
            router.push(`/discussion?packId=${packId}&topicId=${topicId}&topicTitle=${topicTitle}`);
            return;
          } else if (topicSessionData.state === 'learning_session') {
            setCurrentView('learning');
          } else if (topicSessionData.state === 'final' || topicSessionData.state === 'final_quiz') {
            // Re-use diagnostic quiz for final quiz
            setCurrentView('diagnostic');
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
  }, [topicId, packId, supabase, router]);

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  const handleSubmitQuiz = async () => {
    if (!topicData) return;
    
    // Always use diagnostic questions, regardless of currentView
    const questions = topicData.diagnostic?.questions || [];
    
    if (questions.length === 0) return;
    
    const isFinalQuiz = topicData.state === 'final_quiz' || topicData.state === 'final';
    
    // Always submit to API for grading and learning module generation
    setSubmittingQuiz(true);
    
    try {
      // Prepare answers in the format the API expects
      const submittedAnswers = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer
      }));

      console.log('Submitting quiz to API...', { packId, answers: submittedAnswers, isFinalQuiz });
      
      // Call the submit-diagnostic API
      const response = await fetch('/api/submit-diagnostic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coursePackId: packId,
          answers: submittedAnswers,
          isFinalQuiz: isFinalQuiz // Flag to indicate this is the final quiz
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit quiz: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Quiz submission result:', result);

      // Update local state with the score from the API
      setQuizScore(result.score);
      setShowResults(true);
      
      // Store whether they passed the final quiz
      if (isFinalQuiz && result.passed !== undefined) {
        setFinalQuizPassed(result.passed);
      }
      
      // Check if they aced the diagnostic (100% on first try)
      const acedDiagnostic = result.acedDiagnostic || false;

      // Reload the topic data to get updated mastery and learning modules
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('course_packs')
        .select('course_packs')
        .eq('user_id', user.id)
        .single();
      
      const pack = data.course_packs.find(p => p.course_pack_id === packId);
      if (pack?.topic_session) {
        setTopicData(pack.topic_session);
      }
      
      // If they aced the diagnostic, show a special message in the results
      if (acedDiagnostic) {
        console.log('User aced the diagnostic! Module completed.');
      }

    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleContinueAfterQuiz = () => {
    // If topic is completed, go to dashboard, otherwise to discussion
    if (topicData?.state === 'completed') {
      router.push('/dashboard');
    } else {
      router.push(`/discussion?topicId=${topicId}&packId=${packId}&topicTitle=${encodeURIComponent(topicData?.title || '')}`);
    }
  };

  const handleNextModule = () => {
    const activeModules = topicData?.learning_session?.active_modules || [];
    if (currentModuleIndex < activeModules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
    } else {
      // After completing all learning modules, go to discussion
      router.push(`/discussion?topicId=${topicId}&packId=${packId}&topicTitle=${encodeURIComponent(topicData?.title || '')}`);
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

  // Render Diagnostic Quiz (used for both initial diagnostic and final quiz)
  if (currentView === 'diagnostic' && !showResults) {
    // Always use diagnostic questions
    const questions = topicData.diagnostic?.questions || [];
    
    // If no questions available, show error
    if (questions.length === 0) {
      return (
        <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e3e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
          <Header />
          <main className="grow flex items-center justify-center">
            <div className="max-w-md mx-auto px-4 text-center">
              <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl border border-[#e8e3d3] dark:border-[#4a4a4a] p-8">
                <div className="text-6xl mb-4">📝</div>
                <h2 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-3">
                  Quiz Not Available
                </h2>
                <p className="text-[#5a5a5a] dark:text-[#b8b3a3] mb-6">
                  The quiz questions haven&apos;t been generated yet for this topic. Please check back later or contact support.
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
                  {topicData.state === 'final_quiz' || topicData.state === 'final' ? '🎯 Final Assessment' : '📝 Diagnostic Quiz'}
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
                    disabled={Object.keys(answers).length !== questions.length || submittingQuiz}
                    className="px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white hover:shadow-lg flex items-center gap-2"
                  >
                    {submittingQuiz ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Grading...
                      </>
                    ) : (
                      'Submit Quiz'
                    )}
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
    // Always use diagnostic questions
    const questions = topicData.diagnostic?.questions || [];
    
    const diagnosticAnalysis = topicData.diagnostic?.submission?.analysis || {};
    const perQuestion = diagnosticAnalysis.per_question || [];
    
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <Header />
        
        <main className="grow pt-24 pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl border border-[#e8e3d3] dark:border-[#4a4a4a] p-8 shadow-lg">
              
              {/* Score Header */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">
                  {(topicData.state === 'final_quiz' || topicData.state === 'final') 
                    ? (finalQuizPassed ? '🎉' : '💪')
                    : (topicData.state === 'completed' && quizScore.percent === 1
                      ? '🏆'
                      : quizScore.percent >= 0.8 ? '🎉' : quizScore.percent >= 0.6 ? '👍' : '📚')}
                </div>
                <h1 className="text-3xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                  {topicData.state === 'final_quiz' || topicData.state === 'final' ? 'Final Assessment' : 'Diagnostic'} Results
                </h1>
                {(topicData.state === 'final_quiz' || topicData.state === 'final') && (
                  <div className={`inline-block px-4 py-2 rounded-lg font-semibold mb-3 ${
                    finalQuizPassed 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {finalQuizPassed ? '✓ Passed - Module Complete!' : '○ Not Passed - Retake Required'}
                  </div>
                )}
                {topicData.state === 'completed' && quizScore.percent === 1 && !(topicData.state === 'final_quiz' || topicData.state === 'final') && (
                  <div className="inline-block px-4 py-2 rounded-lg font-semibold mb-3 bg-linear-to-r from-yellow-100 to-green-100 dark:from-yellow-900/30 dark:to-green-900/30 text-green-800 dark:text-green-200 border-2 border-green-500">
                    🏆 Perfect Score - Module Completed!
                  </div>
                )}
                <p className="text-xl text-[#5a5a5a] dark:text-[#b8b3a3] mb-4">
                  You scored {quizScore.num_correct} out of {quizScore.num_total}
                </p>
                <div className={`inline-block px-6 py-3 rounded-full text-white text-2xl font-bold ${
                  (topicData.state === 'final_quiz' || topicData.state === 'final')
                    ? (finalQuizPassed 
                      ? 'bg-green-600' 
                      : 'bg-yellow-600')
                    : (topicData.state === 'completed' && quizScore.percent === 1
                      ? 'bg-linear-to-r from-yellow-500 to-green-500'
                      : 'bg-linear-to-r from-[#c09080] to-[#d4c4dc]')
                }`}>
                  {Math.round(quizScore.percent * 100)}%
                </div>
              </div>

              {/* Detailed Results */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
                  Question Review
                </h2>
                <div className="space-y-4">
                  {questions.map((q, index) => {
                    const userAnswer = topicData.diagnostic?.submission?.answers?.find(
                      a => a.question_id === q.question_id
                    );
                    const isCorrect = userAnswer?.answer === q.correct_answer;
                    const questionAnalysis = perQuestion.find(pq => pq.question_id === q.question_id);
                    
                    return (
                      <div 
                        key={q.question_id}
                        className={`p-6 rounded-xl border-2 ${
                          isCorrect 
                            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                            : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-2xl">
                            {isCorrect ? '✓' : '✗'}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                              Q{index + 1}: {q.prompt}
                            </p>
                            
                            {!isCorrect && (
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                  <span className="text-red-600 dark:text-red-400 font-semibold">Your answer:</span>
                                  <span className="text-red-700 dark:text-red-300">{userAnswer?.answer || 'No answer'}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-600 dark:text-green-400 font-semibold">Correct answer:</span>
                                  <span className="text-green-700 dark:text-green-300">{q.correct_answer}</span>
                                </div>
                              </div>
                            )}
                            
                            {isCorrect && (
                              <p className="text-sm text-green-700 dark:text-green-300">
                                Correct! You answered: {userAnswer?.answer}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mastery Analysis */}
              {topicData?.subskills && (
                <div className="mb-8 p-6 bg-[#e8e3d3] dark:bg-[#3a3a3a] rounded-xl">
                  <h2 className="text-xl font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
                    Your Skill Mastery
                  </h2>
                  <div className="space-y-3">
                    {topicData.subskills.map((skill) => {
                      const masteryPercent = Math.round((skill.mastery || 0) * 100);
                      const isWeak = masteryPercent < 100;
                      
                      return (
                        <div key={skill.subskill_id} className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[#2d2d2d] dark:text-[#e8e3d3]">
                              {skill.name}
                            </span>
                            <span className={`text-sm font-bold ${
                              isWeak ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {masteryPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-[#e8e3d3] dark:bg-[#4a4a4a] rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                isWeak ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.max(masteryPercent, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="text-center">
                {/* Show different messages based on final quiz pass/fail */}
                {(topicData.state === 'final_quiz' || topicData.state === 'final') && !finalQuizPassed ? (
                  <div className="space-y-4">
                    <div className="bg-[#fef3c7] dark:bg-[#78350f] rounded-xl p-6 border-2 border-[#f59e0b] dark:border-[#fbbf24]">
                      <div className="text-4xl mb-3">🔄</div>
                      <h3 className="text-xl font-bold text-[#92400e] dark:text-[#fef3c7] mb-2">
                        Almost There!
                      </h3>
                      <p className="text-sm text-[#78350f] dark:text-[#fde68a] mb-4">
                        You need to get all questions correct to complete this module. Review the incorrect answers above and try again!
                      </p>
                      <button
                        onClick={() => {
                          setShowResults(false);
                          setAnswers({});
                          setCurrentQuestionIndex(0);
                          setQuizScore(null);
                        }}
                        className="px-6 py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg font-semibold transition-all"
                      >
                        🔁 Retake Final Quiz
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleContinueAfterQuiz}
                      className="px-8 py-4 bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-xl hover:shadow-lg font-semibold text-lg transition-all"
                    >
                      {topicData.state === 'completed' ? '🎉 Back to Dashboard' : currentView === 'diagnostic' ? '💬 Continue to Discussion' : '🎉 View Roadmap'}
                    </button>
                    <p className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3] mt-4">
                      {topicData.state === 'completed'
                        ? (quizScore.percent === 1 && currentView === 'diagnostic'
                          ? 'You already know this material perfectly - no learning needed!'
                          : 'Congratulations on completing this topic!')
                        : currentView === 'diagnostic' 
                        ? 'Next: Discuss this topic with an AI tutor to strengthen your understanding'
                        : 'Great job! Continue to the next step.'}
                    </p>
                  </>
                )}
              </div>
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
                  No learning modules have been generated for this topic yet. You can skip to discussion or return to the dashboard.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={() => router.push(`/discussion?topicId=${topicId}&packId=${packId}&topicTitle=${encodeURIComponent(topicData?.title || '')}`)}
                    className="w-full px-6 py-3 bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-lg hover:shadow-lg font-semibold transition-all"
                  >
                    Skip to Discussion
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
