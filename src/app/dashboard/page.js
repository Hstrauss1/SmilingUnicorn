"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserCoursePacks, getUserStats, getRecentActivity } from "@/lib/supabase/coursePacks";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Import the generated JSON file
import generatedTopicSession from "@/testPy/out/topic_session_after_learning.json";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState("all");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coursePacks, setCoursePacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
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

  // Mock data for demonstration when database is not set up
  const loadMockData = () => {
    // Transform the imported JSON to match our frontend schema format
    const generatedTopic = {
      id: generatedTopicSession.topic_session.topic_id,
      title: generatedTopicSession.topic_session.title,
      state: "learning_session", // or whatever state fits the UI best
      completion_status: "in_progress",
      subskills: generatedTopicSession.topic_session.subskills.map(skill => ({
        name: skill.name,
        mastery: skill.mastery
      }))
    };

    const mockCoursePacks = [
      {
        id: generatedTopicSession.course_pack_id,
        title: "Introduction to C Programming",
        document_name: "Class6&7-Pointers_pptx.pdf",
        progress: 15,
        status: 'in_progress',
        topic_sessions: [
          generatedTopic,
          {
            id: 'mock-topic-1',
            title: "Control Structures",
            state: "completed",
            completion_status: "completed",
            subskills: [
              { name: "If/Else Statements", mastery: 0.9 },
              { name: "For/While Loops", mastery: 0.85 }
            ]
          },
          {
            id: 'mock-topic-2',
            title: "Arrays and Pointers",
            state: "diagnostic",
            completion_status: "not_started",
            subskills: []
          }
        ]
      },
      {
        id: 'mock-1',
        title: "Machine Learning Fundamentals",
        document_name: "ml-textbook.pdf",
        progress: 35,
        status: 'in_progress',
        topic_sessions: [
          {
            id: 1,
            title: "Introduction to Machine Learning",
            state: "completed",
            completion_status: "completed",
            subskills: [
              { name: "What is ML?", mastery: 0.9 },
              { name: "Types of ML", mastery: 0.85 },
              { name: "Applications", mastery: 0.95 }
            ]
          },
          {
            id: 2,
            title: "Data Preprocessing",
            state: "learning_session",
            completion_status: "in_progress",
            subskills: [
              { name: "Data Cleaning", mastery: 0.7 },
              { name: "Feature Scaling", mastery: 0.6 },
              { name: "Data Transformation", mastery: 0.5 }
            ]
          },
          {
            id: 3,
            title: "Supervised Learning",
            state: "diagnostic",
            completion_status: "not_started",
            subskills: [
              { name: "Linear Regression", mastery: 0 },
              { name: "Classification", mastery: 0 },
              { name: "Model Evaluation", mastery: 0 }
            ]
          },
          {
            id: 4,
            title: "Unsupervised Learning",
            state: "diagnostic",
            completion_status: "not_started",
            subskills: []
          },
          {
            id: 5,
            title: "Neural Networks",
            state: "diagnostic",
            completion_status: "not_started",
            subskills: []
          }
        ]
      },
      {
        id: 'mock-2',
        title: "Web Development Bootcamp",
        document_name: "web-dev-course.pdf",
        progress: 10,
        status: 'in_progress',
        topic_sessions: [
          {
            id: 6,
            title: "HTML & CSS Basics",
            state: "completed",
            completion_status: "completed",
            subskills: [
              { name: "HTML Tags", mastery: 0.9 },
              { name: "CSS Styling", mastery: 0.8 },
              { name: "Flexbox", mastery: 0.85 }
            ]
          },
          {
            id: 7,
            title: "JavaScript Fundamentals",
            state: "learning_session",
            completion_status: "in_progress",
            subskills: [
              { name: "Variables & Types", mastery: 0.6 },
              { name: "Functions", mastery: 0.5 },
              { name: "DOM Manipulation", mastery: 0.3 }
            ]
          },
          {
            id: 8,
            title: "React JS",
            state: "diagnostic",
            completion_status: "not_started",
            subskills: []
          }
        ]
      }
    ];

    const mockStats = {
      totalCoursePacks: 3,
      totalTopics: 11,
      completedTopics: 3,
      averageProgress: 22,
      currentStreak: 3
    };

    const mockActivity = [
      { action: "Completed", item: "Introduction to Machine Learning", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { action: "Started", item: "Data Preprocessing module", created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      { action: "Uploaded", item: "ml-textbook.pdf", created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    setCoursePacks(mockCoursePacks);
    setSelectedPack(mockCoursePacks[0]);
    setStats(mockStats);
    setRecentActivity(mockActivity);
  };

  useEffect(() => {
    const initDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        try {
          // Fetch real data from Supabase
          const [packs, userStats, activity] = await Promise.all([
            getUserCoursePacks(),
            getUserStats(),
            getRecentActivity(5)
          ]);
          
          // If no data exists yet, use mock data
          if (!packs || packs.length === 0) {
            loadMockData();
          } else {
            setCoursePacks(packs);
            setStats(userStats);
            setRecentActivity(activity);
            setSelectedPack(packs[0]);
          }
        } catch (error) {
          /****
           * Remove this later! - Raph
           */
          loadMockData();
        }
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
    if (state === 'learning_session' || state === 'diagnostic') return 'in-progress';
    return 'locked';
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
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="pt-32 pb-20 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              My Learning Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Welcome back, {user?.user_metadata?.name || user?.email?.split('@')[0]}! Continue your learning journey.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">📊</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentStats.averageProgress}%
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Overall Progress</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">📚</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentStats.totalCoursePacks}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Roadmaps</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">✅</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentStats.completedTopics}/{currentStats.totalTopics}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Topics Completed</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">🔥</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentStats.currentStreak}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Day Streak</p>
            </div>
          </div>

          {/* Course Pack Selector (if multiple packs) */}
          {coursePacks.length > 1 && (
            <div className="mb-6 relative w-full md:w-96" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Learning Roadmap
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-left shadow-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedPack?.title}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {selectedPack?.progress}% complete
                    </span>
                  </div>
                  <svg className={`shrink-0 w-5 h-5 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {coursePacks.map((pack) => (
                      <button
                        key={pack.id}
                        onClick={() => {
                          setSelectedPack(pack);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b last:border-0 border-gray-100 dark:border-gray-700/50 ${
                          selectedPack?.id === pack.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`block text-sm font-semibold ${
                            selectedPack?.id === pack.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                          }`}>
                            {pack.title}
                          </span>
                          {selectedPack?.id === pack.id && (
                            <svg className="shrink-0 w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-linear-to-r from-blue-600 to-purple-600 rounded-full" 
                              style={{ width: `${pack.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedPack.title}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📄 {selectedPack.document_name}
                      </p>
                    </div>
                    <Link
                      href="/upload"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      + New Roadmap
                    </Link>
                  </div>
                  
                  {/* Overall Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Overall Progress</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {selectedPack.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-linear-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all"
                        style={{ width: `${selectedPack.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Topic Sessions List */}
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
                          className={`p-4 rounded-xl border-2 transition-all ${
                            isCompleted
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : isInProgress
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 opacity-60"
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
                            {isLocked ? (
                              <button
                                disabled
                                className="w-full py-2 rounded-lg font-medium transition-colors text-sm bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                              >
                                🔒 Locked
                              </button>
                            ) : (
                              <Link
                                href={`/roadmap?packId=${selectedPack.id}`}
                                className={`block w-full py-2 rounded-lg font-medium transition-colors text-sm text-center ${
                                  isCompleted
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                              >
                                {isCompleted ? "📖 Review" : topic.state === 'diagnostic' ? "📝 Take Diagnostic" : "▶️ Continue Learning"}
                              </Link>
                            )}
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
              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {recentActivity && recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">
                            <span className="font-semibold">{activity.action}</span> {activity.item}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {getTimeAgo(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No recent activity
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link
                    href="/upload"
                    className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <span className="text-2xl">📤</span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">Upload New Document</span>
                  </Link>
                  <button className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors">
                    <span className="text-2xl">📊</span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">View Analytics</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors">
                    <span className="text-2xl">⚙️</span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">Settings</span>
                  </button>
                </div>
              </div>

              {/* Learning Tip */}
              <div className="bg-linear-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  💡 Learning Tip
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Accessible education means learning at your own pace. Take diagnostic quizzes to identify gaps, then focus on targeted learning modules. Everyone&apos;s journey is unique!
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
