"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "hi", name: "Hindi" },
];

// Sample questions - in production, these would come from the backend/database
const SAMPLE_QUESTIONS = [
  {
    id: 1,
    question: "What is the capital of France?",
    correctAnswer: "Paris",
    hints: ["It's known as the City of Light", "The Eiffel Tower is located here"],
  },
  {
    id: 2,
    question: "What is 2 + 2?",
    correctAnswer: "4",
    hints: ["It's an even number", "It's less than 5"],
  },
  {
    id: 3,
    question: "What planet is known as the Red Planet?",
    correctAnswer: "Mars",
    hints: ["It's the fourth planet from the Sun", "It's named after the Roman god of war"],
  },
  {
    id: 4,
    question: "What is the largest ocean on Earth?",
    correctAnswer: "Pacific Ocean",
    hints: ["It covers more area than all the land masses combined", "It borders the Americas on one side"],
  },
  {
    id: 5,
    question: "Who wrote Romeo and Juliet?",
    correctAnswer: "William Shakespeare",
    hints: ["He was an English playwright from the 16th century", "He's often called the Bard of Avon"],
  },
];

function DiscussionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get topic context from URL params
  const topicId = searchParams.get('topicId');
  const packId = searchParams.get('packId');
  const topicTitle = searchParams.get('topicTitle') || 'Practice Session';
  
  // Voice agent state
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const conversationRef = useRef(null);
  
  // Discussion state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [questions, setQuestions] = useState(SAMPLE_QUESTIONS);
  const [transcript, setTranscript] = useState([]);
  const [feedbackGiven, setFeedbackGiven] = useState()
  // Get current question
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession();
      }
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // Auto-advance when feedback is given
  useEffect(() => {
    if (feedbackGiven && isActive) {
      feedbackTimerRef.current = setTimeout(() => {
        handleNextQuestion();
      }, 2000); // Wait 2 seconds after feedback before advancing
    }
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, [feedbackGiven, isActive]);

  // Auto-redirect after session complete
  useEffect(() => {
    if (sessionComplete) {
      const redirectTimer = setTimeout(() => {
        if (packId) {
          router.push(`/roadmap?packId=${packId}`);
        } else {
          router.push('/dashboard');
        }
      }, 5000);
      return () => clearTimeout(redirectTimer);
    }
  }, [sessionComplete, packId, router]);

  // Track if agent has given feedback for current question
  const feedbackTimerRef = useRef(null);

  // Build the agent prompt with current question context
  const buildAgentPrompt = useCallback(() => {
    const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English";
    
    return `You are a friendly educational discussion facilitator conducting an interactive voice Q&A session.

IMPORTANT: You MUST speak in ${languageName} at all times. The user cannot see the questions on screen, so you must ask them verbally.

Question to ask: "${currentQuestion?.question}"
Correct Answer: "${currentQuestion?.correctAnswer}"
This is question ${currentQuestionIndex + 1} of ${totalQuestions}.

Your EXACT flow:
1. Start by saying "Question ${currentQuestionIndex + 1}" then ask: "${currentQuestion?.question}"
2. Wait silently for the user to give their verbal answer. Do not prompt them or say anything until they respond.
3. After the user responds, evaluate their answer:
   - If CORRECT: Say "That's correct!" and briefly explain why (1-2 sentences).
   - If INCORRECT: Say "Not quite." Give the correct answer "${currentQuestion?.correctAnswer}" with a brief explanation.
4. After giving feedback, end with EXACTLY: "QUESTION COMPLETE"

Rules:
- Be encouraging and supportive.
- Keep all responses concise.
- Always end your feedback with "QUESTION COMPLETE" so the system advances to the next question.
- Speak in ${languageName} throughout, but say "QUESTION COMPLETE" in English at the end.`;
  }, [currentQuestionIndex, currentQuestion, selectedLanguage, totalQuestions]);

  const startDiscussion = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    setSessionStarted(true);

    try {
      const { Conversation } = await import("@elevenlabs/client");

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English";

      const sessionConfig = {
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
        dynamicVariables: {
          languageName: languageName,
          selectedLanguage: selectedLanguage,
          currentQuestion: currentQuestion?.question || "",
          currentQuestionNumber: currentQuestionIndex + 1,
          totalQuestions: totalQuestions,
          correctAnswer: currentQuestion?.correctAnswer || "",
          hints: currentQuestion?.hints?.join(", ") || "",
          systemPrompt: buildAgentPrompt(),
        },
        onConnect: () => {
          console.log("Discussion agent connected");
          setIsActive(true);
          setIsConnecting(false);
          
          // Add welcome message to transcript
          setTranscript(prev => [...prev, {
            type: 'system',
            message: `Discussion started in ${languageName}. Question ${currentQuestionIndex + 1} of ${totalQuestions}.`
          }]);
        },
        onDisconnect: () => {
          console.log("Discussion agent disconnected");
          setIsActive(false);
          setIsSpeaking(false);
        },
        onError: (err) => {
          console.error("Discussion agent error:", err);
          const errorMsg = err.message || "Connection failed";
          if (errorMsg.includes("language") || selectedLanguage !== "en") {
            setError(`${errorMsg}. Make sure "${languageName}" is enabled in your ElevenLabs agent settings.`);
          } else {
            setError(errorMsg);
          }
          setIsActive(false);
          setIsConnecting(false);
        },
        onModeChange: (mode) => {
          setIsSpeaking(mode.mode === "speaking");
        },
        onMessage: (message) => {
          // Track conversation messages
          if (message.source === 'user') {
            setTranscript(prev => [...prev, { type: 'user', message: message.message }]);
          } else if (message.source === 'ai') {
            setTranscript(prev => [...prev, { type: 'agent', message: message.message }]);
            // Check if agent has completed giving feedback
            if (message.message && message.message.toUpperCase().includes('QUESTION COMPLETE')) {
              setFeedbackGiven(true);
            }
          }
        },
      };

      // Add language override if not English
      if (selectedLanguage !== "en") {
        sessionConfig.overrides = {
          agent: {
            language: selectedLanguage,
          },
        };
      }

      const conversation = await Conversation.startSession(sessionConfig);
      conversationRef.current = conversation;
    } catch (err) {
      console.error("Failed to start discussion:", err);
      setError(err.message || "Failed to start discussion. Please check microphone permissions.");
      setIsConnecting(false);
    }
  }, [selectedLanguage, currentQuestion, currentQuestionIndex, totalQuestions, buildAgentPrompt]);

  const stopDiscussion = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setIsActive(false);
    setIsSpeaking(false);
  }, []);

  const handleNextQuestion = useCallback(async () => {
    // Reset feedback state
    setFeedbackGiven(false);
    
    // Record response for current question
    setResponses(prev => [...prev, {
      questionIndex: currentQuestionIndex,
      question: currentQuestion?.question,
      timestamp: new Date().toISOString(),
    }]);

    if (currentQuestionIndex < totalQuestions - 1) {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      
      // Restart the conversation with new question context
      if (isActive) {
        await stopDiscussion();
        // Small delay before restarting
        setTimeout(() => {
          startDiscussion();
        }, 1000);
      }
    } else {
      // All questions completed
      setSessionComplete(true);
      await stopDiscussion();
    }
  }, [currentQuestionIndex, currentQuestion, totalQuestions, isActive, stopDiscussion, startDiscussion]);

  const handleToggle = () => {
    if (isActive) {
      stopDiscussion();
    } else {
      startDiscussion();
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setResponses([]);
    setSessionStarted(false);
    setSessionComplete(false);
    setTranscript([]);
    setError(null);
    setFeedbackGiven(false);
  };

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / totalQuestions) * 100;
  };

  // Handle navigation back to roadmap
  const handleBackToRoadmap = () => {
    if (packId) {
      router.push(`/roadmap?packId=${packId}`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24 max-w-4xl">
        {/* Back Button */}
        {packId && (
          <button 
            onClick={handleBackToRoadmap}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 flex items-center gap-1"
          >
            <span>&larr;</span> Back to Roadmap
          </button>
        )}

        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🎙️ Voice Discussion
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {topicTitle !== 'Practice Session' ? (
              <>Practicing: <span className="font-medium">{topicTitle}</span></>
            ) : (
              'Practice your knowledge with our AI voice assistant'
            )}
          </p>
        </div>

        {/* Concept Mastered Screen */}
        {sessionComplete ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="text-8xl mb-6 animate-bounce">🏆</div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 mb-4">
              Concept Mastered!
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
              Excellent work! You've completed all {totalQuestions} questions.
            </p>
            
            {/* Success Badge */}
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 px-6 py-3 rounded-full mb-8">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-700 dark:text-green-400 font-semibold">
                {topicTitle !== 'Practice Session' ? topicTitle : 'Topic'} Complete
              </span>
            </div>

            {/* Auto-redirect notice */}
            <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 mb-6">
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span>Redirecting to roadmap in 5 seconds...</span>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRestart}
                className="px-8 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Practice Again
              </button>
              <button
                onClick={handleBackToRoadmap}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105"
              >
                Continue to Roadmap
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Discussion Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Bar */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(getProgressPercentage())}% Complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>

              {/* Voice Session Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                {/* Instruction when not started */}
                {!isActive && !feedbackGiven && (
                  <div className="mb-6 text-center py-8">
                    <div className="text-5xl mb-4">🎧</div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Voice Q&A Session
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      {sessionStarted 
                        ? "Click below to resume. The agent will continue asking questions."
                        : "Start the session and the AI agent will ask you questions verbally. Listen and respond out loud!"}
                    </p>
                  </div>
                )}

                {/* Voice Status Indicator */}
                {isActive && (
                  <div className="mb-6 flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-xl border border-blue-200 dark:border-gray-600">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 rounded-full transition-all duration-300 ${
                            isSpeaking
                              ? "bg-purple-500 animate-pulse"
                              : "bg-blue-500"
                          }`}
                          style={{
                            animationDelay: `${i * 100}ms`,
                            height: isSpeaking ? `${16 + Math.random() * 16}px` : "20px",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {isSpeaking ? "Agent is responding..." : "Listening to your answer..."}
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Auto-advancing indicator */}
                {feedbackGiven && (
                  <div className="mb-6 flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {currentQuestionIndex < totalQuestions - 1 
                        ? "Moving to next question..." 
                        : "Completing session..."}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleToggle}
                    disabled={isConnecting || feedbackGiven}
                    className={`flex-1 py-3 px-6 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      isActive
                        ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                        : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    } shadow-lg`}
                  >
                    {isConnecting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : isActive ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <rect x="5" y="5" width="10" height="10" rx="1" />
                        </svg>
                        Stop Session
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                        </svg>
                        {sessionStarted ? "Resume Session" : "Start Session"}
                      </>
                    )}
                  </button>

                  {sessionStarted && !isActive && !feedbackGiven && (
                    <button
                      onClick={handleNextQuestion}
                      disabled={isConnecting}
                      className="py-3 px-6 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-2"
                    >
                      Skip Question
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Transcript */}
              {transcript.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span>📝</span> Conversation Transcript
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {transcript.map((entry, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          entry.type === 'user'
                            ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                            : entry.type === 'agent'
                            ? 'bg-purple-50 dark:bg-purple-900/20 mr-8'
                            : 'bg-gray-50 dark:bg-gray-700 text-center text-sm'
                        }`}
                      >
                        {entry.type !== 'system' && (
                          <span className={`text-xs font-medium ${
                            entry.type === 'user' 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-purple-600 dark:text-purple-400'
                          }`}>
                            {entry.type === 'user' ? 'You' : 'Agent'}
                          </span>
                        )}
                        <p className={`${entry.type === 'system' ? 'text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                          {entry.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Language Selector */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>🌍</span> Language
                </h3>
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  disabled={isActive || isConnecting}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Both you and the agent will speak in this language
                </p>
              </div>

              {/* Progress Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📋</span> Progress
                </h3>
                <div className="flex justify-center gap-2 mb-4">
                  {questions.map((q, index) => (
                    <div
                      key={q.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        index === currentQuestionIndex
                          ? 'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-2'
                          : index < currentQuestionIndex
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {index < currentQuestionIndex ? '✓' : index + 1}
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {currentQuestionIndex < totalQuestions 
                    ? `Question ${currentQuestionIndex + 1} of ${totalQuestions}` 
                    : 'All questions completed!'}
                </p>
              </div>

              {/* Tips */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span>💡</span> Tips
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <li>• Speak clearly and at a normal pace</li>
                  <li>• Wait for the agent to finish before responding</li>
                  <li>• The agent will give feedback and auto-advance</li>
                  <li>• Complete all 5 questions to master the concept</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

export default function DiscussionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <DiscussionContent />
    </Suspense>
  );
}
