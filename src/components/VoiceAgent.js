"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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

export default function VoiceAgent({ agentId, topicContext }) {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const conversationRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession();
      }
    };
  }, []);

  const startConversation = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      // Dynamically import the ElevenLabs client
      const { Conversation } = await import("@elevenlabs/client");

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation session
      const conversation = await Conversation.startSession({
        agentId: agentId || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
        // Override agent settings to use selected language
        overrides: {
          agent: {
            language: selectedLanguage,
          },
        },
        // Pass context to the agent
        dynamicVariables: {
          languageName: SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English",
          topicContext: topicContext || "general learning assistance",
        },
        onConnect: () => {
          console.log("Voice agent connected");
          setIsActive(true);
          setIsConnecting(false);
        },
        onDisconnect: () => {
          console.log("Voice agent disconnected");
          setIsActive(false);
          setIsSpeaking(false);
        },
        onError: (err) => {
          console.error("Voice agent error:", err);
          setError(err.message || "Connection failed");
          setIsActive(false);
          setIsConnecting(false);
        },
        onModeChange: (mode) => {
          // mode.mode can be "speaking" or "listening"
          setIsSpeaking(mode.mode === "speaking");
        },
      });

      conversationRef.current = conversation;
    } catch (err) {
      console.error("Failed to start voice agent:", err);
      setError(err.message || "Failed to start voice agent. Please check microphone permissions.");
      setIsConnecting(false);
    }
  }, [agentId, selectedLanguage, topicContext]);

  const stopConversation = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setIsActive(false);
    setIsSpeaking(false);
  }, []);

  const handleToggle = () => {
    if (isActive) {
      stopConversation();
    } else {
      startConversation();
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-5 border border-blue-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🎙️</span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Voice Assistant
        </h3>
      </div>

      {/* Language Selector */}
      <div className="mb-4">
        <label 
          htmlFor="language-select" 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Speak in:
        </label>
        <select
          id="language-select"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          disabled={isActive || isConnecting}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {/* Voice Status Indicator */}
      {isActive && (
        <div className="mb-4 flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  isSpeaking
                    ? "bg-purple-500 animate-pulse h-6"
                    : "bg-blue-500 h-4"
                }`}
                style={{
                  animationDelay: `${i * 150}ms`,
                  height: isSpeaking ? `${12 + Math.random() * 12}px` : "16px",
                }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {isSpeaking ? "Agent is speaking..." : "Listening..."}
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Start/Stop Button */}
      <button
        onClick={handleToggle}
        disabled={isConnecting}
        className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 ${
          isActive
            ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-200 dark:shadow-red-900/30"
            : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-blue-200 dark:shadow-blue-900/30"
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
            Stop Conversation
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
              <path d="M10 6a1 1 0 011 1v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2H7a1 1 0 110-2h2V7a1 1 0 011-1z" />
            </svg>
            Start Conversation
          </>
        )}
      </button>

      <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400">
        Ask questions about this topic in {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || "your selected language"}
      </p>
    </div>
  );
}
