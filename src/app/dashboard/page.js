"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserCoursePacks, getUserStats, getUserCoursePacksFormatted } from "@/lib/supabase/coursePacks";
import { loadGeneratedCoursePacks } from "@/lib/loadDiagnostics";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Import generated JSON files from Python state machine
import generatedTopicSession from "@/testPy/out/topic_session_after_learning.json";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coursePacks, setCoursePacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const [stats, setStats] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load data from Python-generated JSON files
  const loadMockData = async () => {
    try {
      // Load all generated course packs with Python-generated diagnostics
      const generatedPacks = await loadGeneratedCoursePacks();
      
      if (generatedPacks.length > 0) {
        console.log(`Loaded ${generatedPacks.length} Python-generated course packs with diagnostics`);
        
        // Calculate stats from generated data
        const totalTopics = generatedPacks.reduce((sum, pack) => sum + pack.topic_sessions.length, 0);
        const completedTopics = generatedPacks.reduce((sum, pack) => 
          sum + pack.topic_sessions.filter(t => t.completion_status === 'completed').length, 0
        );
        
        const mockStats = {
          totalCoursePacks: generatedPacks.length,
          totalTopics: totalTopics,
          completedTopics: completedTopics,
          averageProgress: Math.round(generatedPacks.reduce((sum, pack) => sum + pack.progress, 0) / generatedPacks.length),
          currentStreak: 0
        };

        const mockActivity = generatedPacks.slice(0, 3).map(pack => ({
          action: "Generated", 
          item: pack.title, 
          created_at: new Date().toISOString() 
        }));
  // Load data from Python-generated JSON files
  const loadMockData = async () => {
    try {
      // Load all generated course packs with Python-generated diagnostics
      const generatedPacks = await loadGeneratedCoursePacks();
      
      if (generatedPacks.length > 0) {
        console.log(`Loaded ${generatedPacks.length} Python-generated course packs with diagnostics`);
        
        // Calculate stats from generated data
        const totalTopics = generatedPacks.reduce((sum, pack) => sum + pack.topic_sessions.length, 0);
        const completedTopics = generatedPacks.reduce((sum, pack) => 
          sum + pack.topic_sessions.filter(t => t.completion_status === 'completed').length, 0
        );
        
        const mockStats = {
          totalCoursePacks: generatedPacks.length,
          totalTopics: totalTopics,
          completedTopics: completedTopics,
          averageProgress: Math.round(generatedPacks.reduce((sum, pack) => sum + pack.progress, 0) / generatedPacks.length),
          currentStreak: 0
        };

        const mockActivity = generatedPacks.slice(0, 3).map(pack => ({
          action: "Generated", 
          item: pack.title, 
          created_at: new Date().toISOString() 
        }));

        setCoursePacks(generatedPacks);
        setSelectedPack(generatedPacks[0]);
        setStats(mockStats);
      } else {
        console.warn('No Python-generated course packs found, system needs PDF uploads');
        setCoursePacks([]);
        setSelectedPack(null);
        setStats({
          totalCoursePacks: 0,
          totalTopics: 0,
          completedTopics: 0,
          averageProgress: 0,
          currentStreak: 0
        });
      }
    } catch (error) {
      console.error('Error loading generated course packs:', error);
      setCoursePacks([]);
      setSelectedPack(null);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        try {
          // First try to fetch from Supabase (formatted with roadmap_json)
          console.log('Attempting to load course packs from Supabase...');
          const formattedPacks = await getUserCoursePacksFormatted();
          
          if (formattedPacks && formattedPacks.length > 0) {
            console.log(`Loaded ${formattedPacks.length} course packs from Supabase`);
            
            // Calculate stats from Supabase data
            const totalTopics = formattedPacks.reduce((sum, pack) => sum + pack.topic_sessions.length, 0);
            const completedTopics = formattedPacks.reduce((sum, pack) => 
              sum + pack.topic_sessions.filter(t => t.completion_status === 'completed').length, 0
            );
            
            const supabaseStats = {
              totalCoursePacks: formattedPacks.length,
              totalTopics: totalTopics,
              completedTopics: completedTopics,
              averageProgress: Math.round(formattedPacks.reduce((sum, pack) => sum + pack.progress, 0) / formattedPacks.length),
              currentStreak: 0
            };

            setCoursePacks(formattedPacks);
            setSelectedPack(formattedPacks[0]);
            setStats(supabaseStats);
          } else {
            // No Supabase data, fall back to generated files
            console.log('No course packs in Supabase, loading from generated files...');
            await loadMockData();
          }
        } catch (error) {
          console.error('Error loading from Supabase, falling back to generated files:', error);
          // Fallback to Python-generated files
          await loadMockData();
        }
      } else {
        // Not logged in, show login prompt
        console.log('User not authenticated');
      }
      
      setLoading(false);
    };
    
    initDashboard();
  }, [supabase]);

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const getTopicIcon = (state, completionStatus) => {
    if (completionStatus === 'completed') return "✅";
    if (state === 'learning_session') return "🔄";
    if (state === 'diagnostic') return "📝";
    if (state === 'final_quiz') return "🎯";
    return "🔒";
  };

  const getTopicStatus = (state, completionStatus) => {
    if (completionStatus === 'completed') return 'completed';
    if (state === 'learning_session' || state === 'diagnostic' || state === 'final' || state === 'final_quiz') return 'in-progress';
    return 'in-progress'; // No topics should be locked by default
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!selectedPack) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <Header />
        <main className="pt-32 pb-20 px-6 lg:px-8">
          <div className="mx-auto max-w-7xl text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                No Learning Roadmaps Yet
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Upload your first document to generate a personalized learning roadmap!
              </p>
              <Link
                href="/upload"
                className="inline-block px-8 py-4 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all"
              >
                Upload Document
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentStats = stats || {
    totalCoursePacks: coursePacks.length,
    totalTopics: selectedPack.topic_sessions?.length || 0,
    completedTopics: selectedPack.topic_sessions?.filter(t => t.completion_status === 'completed').length || 0,
    averageProgress: selectedPack.progress || 0,
    currentStreak: 3
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
      <Header />
      
      <main className="pt-32 pb-20 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
              My Learning Dashboard
            </h1>
            <p className="text-[#5a5a5a] dark:text-[#b8b3a3]">
              Welcome back, {user?.user_metadata?.name || user?.email?.split('@')[0]}! Continue your learning journey.
            </p>
          </div>

          {/* Course Pack Selector (if multiple packs) */}
          {coursePacks.length > 1 && (
            <div className="mb-6 relative w-full md:w-96" ref={dropdownRef}>
              <label className="block text-sm font-medium text-[#2d2d2d] dark:text-[#b8b3a3] mb-2">
                Select Learning Roadmap
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#faf9f6] dark:bg-[#2d2d2d] border border-[#e8e3d3] dark:border-[#4a4a4a] rounded-xl text-left shadow-sm hover:bg-[#f4f1e8] dark:hover:bg-[#3a3a3a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#c09080]"
                >
                  <div>
                    <span className="block text-sm font-semibold text-[#2d2d2d] dark:text-[#e8e3d3]">
                      {selectedPack?.title}
                    </span>
                    <span className="block text-xs text-[#5a5a5a] dark:text-[#b8b3a3]">
                      {selectedPack?.progress}% complete
                    </span>
                  </div>
                  <svg className={`shrink-0 w-5 h-5 text-[#5a5a5a] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-[#faf9f6] dark:bg-[#2d2d2d] border border-[#e8e3d3] dark:border-[#4a4a4a] rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {coursePacks.map((pack) => (
                      <button
                        key={pack.id}
                        onClick={() => {
                          setSelectedPack(pack);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-[#f4f1e8] dark:hover:bg-[#3a3a3a] transition-colors border-b last:border-0 border-[#e8e3d3] dark:border-[#4a4a4a] ${
                          selectedPack?.id === pack.id ? 'bg-[#f5d5cb] dark:bg-[#5a4a45]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`block text-sm font-semibold ${
                            selectedPack?.id === pack.id ? 'text-[#c09080] dark:text-[#d4c4dc]' : 'text-[#2d2d2d] dark:text-[#e8e3d3]'
                          }`}>
                            {pack.title}
                          </span>
                          {selectedPack?.id === pack.id && (
                            <svg className="shrink-0 w-4 h-4 text-[#c09080] dark:text-[#d4c4dc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#e8e3d3] dark:bg-[#4a4a4a] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#c09080] to-[#d4c4dc] rounded-full" 
                              style={{ width: `${pack.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#5a5a5a] dark:text-[#b8b3a3] w-8 text-right">
                            {pack.progress}%
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Roadmap Card */}
              <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl border border-[#e8e3d3] dark:border-[#4a4a4a] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#e8e3d3] dark:border-[#4a4a4a]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3]">
                        {selectedPack.title}
                      </h2>
                      <p className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3]">
                        📄 {selectedPack.document_name}
                      </p>
                    </div>
                    <Link
                      href={`/roadmap?packId=${selectedPack.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                    >
                      View Roadmap
                    </Link>
                  </div>
                  
                  {/* Overall Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#5a5a5a] dark:text-[#b8b3a3]">Overall Progress</span>
                      <span className="font-semibold text-[#2d2d2d] dark:text-[#e8e3d3]">
                        {selectedPack.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-[#e8e3d3] dark:bg-[#4a4a4a] rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-[#c09080] to-[#d4c4dc] h-3 rounded-full transition-all"
                        style={{ width: `${selectedPack.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Topic Sessions List */}
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
                    Learning Topics
                  </h3>
                  {selectedPack.topic_sessions && selectedPack.topic_sessions.length > 0 ? (
                    selectedPack.topic_sessions.map((topic) => {
                      const status = getTopicStatus(topic.state, topic.completion_status);
                      const isLocked = status === 'locked';
                      const isCompleted = status === 'completed';
                      const isInProgress = status === 'in-progress';

                      return (
                        <div
                          key={topic.id}
                          onClick={() => router.push(`/roadmap?packId=${selectedPack.id}`)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isCompleted
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                              : isInProgress
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 opacity-60 hover:opacity-80"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">
                                  {getTopicIcon(topic.state, topic.completion_status)}
                                </span>
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {topic.title}
                                  </h4>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    State: {topic.state.replace('_', ' ')}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Subskills */}
                              {topic.subskills && topic.subskills.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    Key Skills:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {topic.subskills.map((skill, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                                      >
                                        {skill.name} {skill.mastery > 0 && `(${Math.round(skill.mastery * 100)}%)`}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            {/* All topics are accessible - no locked topics */}
                            <Link
                              href={`/topic/${topic.id}?packId=${selectedPack.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`block w-full py-2 rounded-lg font-medium transition-colors text-sm text-center ${
                                isCompleted
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
                            >
                              {isCompleted ? "📖 Review" : topic.state === 'diagnostic' ? "📝 Take Diagnostic" : topic.state === 'learning_session' ? "🔄 Continue Learning" : topic.state === 'final' || topic.state === 'final_quiz' ? "🎯 Take Final Quiz" : "▶️ Start"}
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No topics available yet. AI will generate topics based on your document.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl p-6 border border-[#e8e3d3] dark:border-[#4a4a4a] shadow-sm">
                <h3 className="text-xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link
                    href="/upload"
                    className="flex items-center gap-3 p-3 bg-[#f5d5cb] dark:bg-[#5a4a45] rounded-lg hover:bg-[#f0c7b8] dark:hover:bg-[#6a5a55] transition-colors"
                  >
                    <span className="text-2xl">📤</span>
                    <span className="font-medium text-[#2d2d2d] dark:text-[#e8e3d3] text-sm">Upload New Document</span>
                  </Link>
                  <button className="w-full flex items-center gap-3 p-3 bg-[#e8e3d3] dark:bg-[#3a3a3a] rounded-lg hover:bg-[#f4f1e8] dark:hover:bg-[#4a4a4a] transition-colors">
                    <span className="text-2xl">📊</span>
                    <span className="font-medium text-[#2d2d2d] dark:text-[#e8e3d3] text-sm">View Analytics</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 bg-[#e8e3d3] dark:bg-[#3a3a3a] rounded-lg hover:bg-[#f4f1e8] dark:hover:bg-[#4a4a4a] transition-colors">
                    <span className="text-2xl">⚙️</span>
                    <span className="font-medium text-[#2d2d2d] dark:text-[#e8e3d3] text-sm">Settings</span>
                  </button>
                </div>
              </div>

              {/* Learning Tip */}
              <div className="bg-gradient-to-br from-[#f5d5cb] to-[#e8d5e8] dark:from-[#5a4a45] dark:to-[#5a4a60] rounded-2xl p-6 border border-[#d4c4dc] dark:border-[#6a5a70] shadow-sm">
                <h3 className="text-xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                  💡 Learning Tip
                </h3>
                <p className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3]">
                  Accessible tutoring means learning at your own pace. Take diagnostic quizzes to identify gaps, then focus on targeted learning modules. Everyone&apos;s journey is unique!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
