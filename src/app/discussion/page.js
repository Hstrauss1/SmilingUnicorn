"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Languages with native names and descriptions
const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", description: "Speak with the AI in English" },
  { code: "es", name: "Español", description: "Habla con la IA en español" },
  { code: "fr", name: "Français", description: "Parlez avec l'IA en français" },
  { code: "de", name: "Deutsch", description: "Sprechen Sie mit der KI auf Deutsch" },
  { code: "it", name: "Italiano", description: "Parla con l'IA in italiano" },
  { code: "pt", name: "Português", description: "Fale com a IA em português" },
  { code: "ja", name: "日本語", description: "AIと日本語で話す" },
  { code: "ko", name: "한국어", description: "AI와 한국어로 대화하세요" },
  { code: "zh", name: "中文", description: "用中文与AI对话" },
  { code: "hi", name: "हिन्दी", description: "AI से हिंदी में बात करें" },
];

const TOTAL_DURATION = 3 * 60; // 3 minutes in seconds

function DiscussionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get topic context from URL params
  const packId = searchParams.get('packId');
  const topicId = searchParams.get('topicId');
  const topicTitle = searchParams.get('topicTitle') || 'Practice Session';
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_DURATION);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isQuitting, setIsQuitting] = useState(false);
  const [quitCountdown, setQuitCountdown] = useState(3);
  
  // Voice agent state
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const conversationRef = useRef(null);
  const timerRef = useRef(null);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get progress percentage for timer
  const getTimerProgress = () => {
    return ((TOTAL_DURATION - timeRemaining) / TOTAL_DURATION) * 100;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (sessionStarted && timeRemaining > 0 && !isQuitting) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Timer ended - stop session and redirect
            clearInterval(timerRef.current);
            handleSessionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionStarted, isQuitting]);

  // Quit countdown effect
  useEffect(() => {
    if (isQuitting && quitCountdown > 0) {
      const countdownTimer = setTimeout(() => {
        setQuitCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(countdownTimer);
    } else if (isQuitting && quitCountdown === 0) {
      redirectToRoadmap();
    }
  }, [isQuitting, quitCountdown]);

  const redirectToRoadmap = () => {
    if (packId) {
      router.push(`/roadmap?packId=${packId}`);
    } else {
      router.push('/dashboard');
    }
  };

  const handleSessionEnd = async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setIsActive(false);
    setIsSpeaking(false);
    
    // Mark discussion as complete and update state
    if (packId) {
      try {
        const response = await fetch('/api/complete-discussion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coursePackId: packId
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Discussion completed:', result);
        }
      } catch (error) {
        console.error('Error completing discussion:', error);
      }
    }
    
    // Redirect to topic page to continue with next step
    setTimeout(() => {
      if (topicId && packId) {
        router.push(`/topic/${topicId}?packId=${packId}`);
      } else {
        redirectToRoadmap();
      }
    }, 2000);
  };

  const handleQuit = async () => {
    // Stop the agent first
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setIsActive(false);
    setIsSpeaking(false);
    setIsQuitting(true);
    
    // Call API to generate final quiz based on weak subskills
    if (packId) {
      try {
        const response = await fetch('/api/complete-discussion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coursePackId: packId
          })
        });

        if (!response.ok) {
          console.error('Failed to complete discussion');
        } else {
          const result = await response.json();
          console.log('Discussion completed, final quiz ready:', result);
        }
      } catch (error) {
        console.error('Error completing discussion:', error);
      }
    }
  };

  // Build the agent prompt
  const buildAgentPrompt = useCallback(() => {
    const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English";
    
    return `You are a friendly educational discussion facilitator having a free-form voice conversation with a student about "${topicTitle}".

IMPORTANT: You MUST speak in ${languageName} at all times.

Your role:
- Engage the student in a natural discussion about the topic
- Ask thoughtful questions to assess their understanding
- Provide helpful explanations and guidance
- Be encouraging and supportive
- Keep the conversation flowing naturally

Rules:
- Speak clearly and at a moderate pace
- Keep responses conversational (2-4 sentences typically)
- Adapt to the student's level of understanding
- If they seem confused, simplify your explanations
- Encourage them to ask questions too`;
  }, [selectedLanguage, topicTitle]);

  const startDiscussion = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      const { Conversation } = await import("@elevenlabs/client");

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English";
      const systemPrompt = buildAgentPrompt();
      
      const firstMessage = selectedLanguage === "en" 
        ? `Hello! Let's discuss ${topicTitle}. Feel free to ask me anything or share what you already know about this topic.`
        : `Hello! Let's discuss ${topicTitle} in ${languageName}. Feel free to speak whenever you're ready.`;

      const sessionConfig = {
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
        overrides: {
          agent: {
            prompt: {
              prompt: systemPrompt,
            },
            firstMessage: firstMessage,
            language: selectedLanguage,
          },
        },
        onConnect: () => {
          console.log("Discussion agent connected");
          setIsActive(true);
          setIsConnecting(false);
          setSessionStarted(true);
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
      };

      const conversation = await Conversation.startSession(sessionConfig);
      conversationRef.current = conversation;
    } catch (err) {
      console.error("Failed to start discussion:", err);
      setError(err.message || "Failed to start discussion. Please check microphone permissions.");
      setIsConnecting(false);
    }
  }, [selectedLanguage, topicTitle, buildAgentPrompt]);

  // Handle navigation back to roadmap
  const handleBackToRoadmap = () => {
    if (packId) {
      router.push(`/roadmap?packId=${packId}`);
    } else {
      router.push('/dashboard');
    }
  };

  // Get the current language info
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);

  // Session ended screen
  if (timeRemaining === 0 && sessionStarted) {
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <Header />
        <main className="grow flex items-center justify-center px-4">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl shadow-xl p-8 text-center max-w-md w-full border border-[#e8e3d3] dark:border-[#4a4a4a]">
            <div className="text-6xl mb-6">✨</div>
            <h2 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
              Session Complete!
            </h2>
            <p className="text-[#5a5a5a] dark:text-[#b8b3a3] mb-6">
              Great discussion! You've completed your 3-minute practice session.
            </p>
            <div className="flex items-center justify-center gap-2 text-[#5a5a5a] dark:text-[#b8b3a3]">
              <div className="w-5 h-5 border-2 border-[#c09080] border-t-transparent rounded-full animate-spin" />
              <span>Redirecting to roadmap...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Quitting screen
  if (isQuitting) {
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <Header />
        <main className="grow flex items-center justify-center px-4">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl shadow-xl p-8 text-center max-w-md w-full border border-[#e8e3d3] dark:border-[#4a4a4a]">
            <div className="text-6xl mb-6">👋</div>
            <h2 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
              Leaving Session
            </h2>
            <p className="text-[#5a5a5a] dark:text-[#b8b3a3] mb-6">
              You're being redirected to the roadmap...
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#c09080]/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-[#c09080]">{quitCountdown}</span>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
      <Header />
      
      <main className="grow pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          {packId && !sessionStarted && (
            <button 
              onClick={handleBackToRoadmap}
              className="text-sm text-[#c09080] dark:text-[#d4c4dc] hover:underline mb-4 flex items-center gap-1"
            >
              <span>&larr;</span> Back to Roadmap
            </button>
          )}

          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-[#2d2d2d] dark:text-[#e8e3d3] tracking-tight mb-2">
              Voice Discussion
            </h1>
            <p className="text-[#5a5a5a] dark:text-[#b8b3a3]">
              {topicTitle !== 'Practice Session' ? (
                <>Discussing: <span className="font-medium text-[#c09080] dark:text-[#d4c4dc]">{topicTitle}</span></>
              ) : (
                'Practice with our AI voice assistant'
              )}
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl shadow-xl border border-[#e8e3d3] dark:border-[#4a4a4a] overflow-hidden">
            
            {/* Timer Section */}
            <div className="p-6 border-b border-[#e8e3d3] dark:border-[#4a4a4a]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[#5a5a5a] dark:text-[#b8b3a3]">
                  {sessionStarted ? 'Time Remaining' : 'Session Duration'}
                </span>
                <span className="text-2xl font-bold text-[#c09080] dark:text-[#d4c4dc] font-mono">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="w-full bg-[#e8e3d3] dark:bg-[#4a4a4a] rounded-full h-3">
                <div 
                  className="bg-linear-to-r from-[#c09080] to-[#d4c4dc] h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${getTimerProgress()}%` }}
                />
              </div>
              <p className="text-xs text-[#8a8a8a] dark:text-[#888378] mt-2 text-center">
                {sessionStarted 
                  ? 'The agent will keep talking with you until the timer ends' 
                  : '3-minute discussion session'}
              </p>
            </div>

            {/* Voice Agent Section */}
            <div className="p-6">
              {!sessionStarted ? (
                // Pre-session: Language selection and start
                <div className="space-y-6">
                  {/* Language Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-3">
                      🌍 {currentLang?.description}
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      disabled={isConnecting}
                      className="w-full px-4 py-3 rounded-xl border border-[#e8e3d3] dark:border-[#4a4a4a] bg-[#faf9f6] dark:bg-[#3a3a3a] text-[#2d2d2d] dark:text-[#e8e3d3] focus:ring-2 focus:ring-[#c09080] focus:border-[#c09080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Start Button */}
                  <button
                    onClick={startDiscussion}
                    disabled={isConnecting}
                    className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-linear-to-r from-[#c09080] to-[#d4c4dc] hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {isConnecting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                        Start 3-Minute Discussion
                      </>
                    )}
                  </button>

                  {/* Instructions */}
                  <div className="bg-[#f4f1e8] dark:bg-[#3a3a3a] rounded-xl p-4">
                    <h4 className="font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">💡 How it works</h4>
                    <ul className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3] space-y-1">
                      <li>• The AI will engage you in conversation for 3 minutes</li>
                      <li>• Speak naturally - ask questions or share your thoughts</li>
                      <li>• You can quit early at any time</li>
                    </ul>
                  </div>
                </div>
              ) : (
                // Active session
                <div className="space-y-6">
                  {/* Voice Status Indicator */}
                  <div className="flex flex-col items-center py-8">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
                      isSpeaking 
                        ? 'bg-[#d4c4dc]/30 ring-4 ring-[#d4c4dc] ring-offset-4' 
                        : 'bg-[#c09080]/20 ring-4 ring-[#c09080]/50'
                    }`}>
                      <div className="flex gap-1.5">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 rounded-full transition-all duration-300 ${
                              isSpeaking
                                ? "bg-[#d4c4dc]"
                                : "bg-[#c09080]"
                            }`}
                            style={{
                              animation: isActive ? `pulse 0.5s ease-in-out infinite` : 'none',
                              animationDelay: `${i * 100}ms`,
                              height: isSpeaking 
                                ? `${20 + Math.sin(Date.now() / 200 + i) * 15}px` 
                                : "24px",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-lg font-medium text-[#2d2d2d] dark:text-[#e8e3d3]">
                      {isSpeaking ? "Agent is speaking..." : "Listening..."}
                    </p>
                    <p className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3] mt-1">
                      Speaking in {currentLang?.name}
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Quit Button */}
                  <button
                    onClick={handleQuit}
                    className="w-full py-3 px-6 rounded-xl font-semibold text-[#c09080] bg-[#c09080]/10 hover:bg-[#c09080]/20 border border-[#c09080]/30 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Quit Discussion Early
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default function DiscussionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c09080]"></div>
      </div>
    }>
      <DiscussionContent />
    </Suspense>
  );
}
