"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCoursePackById, getTopicSessions, updateTopicSessionState } from "@/lib/supabase/coursePacks";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function RoadmapPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coursePack, setCoursePack] = useState(null);
  const [topicSessions, setTopicSessions] = useState([]);
  const [expandedTopic, setExpandedTopic] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Step 1: Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }
        
        setUser(user);
        
        // Step 2: Load roadmap data for this specific course pack
        await loadRoadmapData();
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/login');
      }
    };

    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadRoadmapData = async () => {
    try {
      setLoading(true);
      
      // Step 3: Fetch course pack data from Supabase using the course pack ID
      // This will automatically verify the user owns this course pack via RLS policies
      console.log('Fetching course pack:', params.id);
      const pack = await getCoursePackById(params.id);
      
      if (pack) {
        console.log('Loaded course pack from Supabase:', pack);
        setCoursePack(pack);
        // topic_sessions are included in the nested query
        setTopicSessions(pack.topic_sessions || []);
      } else {
        // Load mock data if no real data exists (for demonstration)
        console.log('No real data found, loading mock data');
        loadMockRoadmap();
      }
    } catch (error) {
      console.error("Error loading roadmap:", error);
      // If user doesn't have access or course pack doesn't exist, use mock data
      loadMockRoadmap();
    } finally {
      setLoading(false);
    }
  };

  const loadMockRoadmap = () => {
    const mockCoursePack = {
      id: params.id,
      title: "Machine Learning Fundamentals",
      document_name: "ml-textbook.pdf",
      learning_goal: "Master the fundamentals of machine learning and apply them to real-world problems",
      progress: 35,
      status: 'in_progress',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const mockTopics = [
      {
        id: "topic-1",
        topic_id: "ml-intro",
        title: "Introduction to Machine Learning",
        state: "completed",
        completion_status: "completed",
        order_index: 0,
        subskills: [
          { id: 1, subskill_id: "what-is-ml", name: "What is Machine Learning?", mastery: 0.95 },
          { id: 2, subskill_id: "types-of-ml", name: "Types of Machine Learning", mastery: 0.90 },
          { id: 3, subskill_id: "ml-applications", name: "Real-world Applications", mastery: 0.88 }
        ],
        diagnostic_questions: [],
        learning_modules: [
          {
            id: 1,
            module_id: "intro-module-1",
            title: "Understanding ML Basics",
            explanation: "Introduction to core ML concepts",
            status: "completed"
          }
        ]
      },
      {
        id: "topic-2",
        topic_id: "data-prep",
        title: "Data Preprocessing & Feature Engineering",
        state: "learning_session",
        completion_status: "in_progress",
        order_index: 1,
        subskills: [
          { id: 4, subskill_id: "data-cleaning", name: "Data Cleaning Techniques", mastery: 0.75 },
          { id: 5, subskill_id: "feature-scaling", name: "Feature Scaling & Normalization", mastery: 0.65 },
          { id: 6, subskill_id: "encoding", name: "Categorical Encoding", mastery: 0.50 },
          { id: 7, subskill_id: "feature-selection", name: "Feature Selection Methods", mastery: 0.40 }
        ],
        diagnostic_questions: [
          {
            question_id: "q1",
            prompt: "What is the purpose of feature scaling?",
            type: "mcq",
            difficulty: 2
          }
        ],
        learning_modules: [
          {
            id: 2,
            module_id: "data-module-1",
            title: "Data Cleaning Essentials",
            explanation: "Learn how to handle missing values and outliers",
            status: "completed"
          },
          {
            id: 3,
            module_id: "data-module-2",
            title: "Feature Scaling Methods",
            explanation: "Understand standardization and normalization",
            status: "in_progress"
          }
        ]
      },
      {
        id: "topic-3",
        topic_id: "supervised-learning",
        title: "Supervised Learning Algorithms",
        state: "final_quiz",
        completion_status: "in_progress",
        order_index: 2,
        subskills: [
          { id: 8, subskill_id: "linear-regression", name: "Linear Regression", mastery: 0.80 },
          { id: 9, subskill_id: "logistic-regression", name: "Logistic Regression", mastery: 0.75 },
          { id: 10, subskill_id: "decision-trees", name: "Decision Trees", mastery: 0.70 },
          { id: 11, subskill_id: "svm", name: "Support Vector Machines", mastery: 0.65 }
        ],
        diagnostic_questions: [],
        learning_modules: []
      },
      {
        id: "topic-4",
        topic_id: "unsupervised-learning",
        title: "Unsupervised Learning & Clustering",
        state: "diagnostic",
        completion_status: "not_started",
        order_index: 3,
        subskills: [
          { id: 12, subskill_id: "kmeans", name: "K-Means Clustering", mastery: 0 },
          { id: 13, subskill_id: "hierarchical", name: "Hierarchical Clustering", mastery: 0 },
          { id: 14, subskill_id: "pca", name: "Principal Component Analysis", mastery: 0 }
        ],
        diagnostic_questions: [
          {
            question_id: "q2",
            prompt: "What is the main difference between supervised and unsupervised learning?",
            type: "mcq",
            difficulty: 1
          }
        ],
        learning_modules: []
      },
      {
        id: "topic-5",
        topic_id: "neural-networks",
        title: "Neural Networks & Deep Learning",
        state: "diagnostic",
        completion_status: "not_started",
        order_index: 4,
        subskills: [
          { id: 15, subskill_id: "perceptron", name: "Perceptron Model", mastery: 0 },
          { id: 16, subskill_id: "backprop", name: "Backpropagation", mastery: 0 },
          { id: 17, subskill_id: "cnns", name: "Convolutional Neural Networks", mastery: 0 },
          { id: 18, subskill_id: "rnns", name: "Recurrent Neural Networks", mastery: 0 }
        ],
        diagnostic_questions: [],
        learning_modules: []
      },
      {
        id: "topic-6",
        topic_id: "model-evaluation",
        title: "Model Evaluation & Optimization",
        state: "diagnostic",
        completion_status: "not_started",
        order_index: 5,
        subskills: [
          { id: 19, subskill_id: "metrics", name: "Evaluation Metrics", mastery: 0 },
          { id: 20, subskill_id: "cross-validation", name: "Cross-Validation", mastery: 0 },
          { id: 21, subskill_id: "hyperparameter-tuning", name: "Hyperparameter Tuning", mastery: 0 }
        ],
        diagnostic_questions: [],
        learning_modules: []
      }
    ];

    setCoursePack(mockCoursePack);
    setTopicSessions(mockTopics);
  };

  const getStateIcon = (state, completionStatus) => {
    if (completionStatus === 'completed') {
      return "✅";
    }
    switch (state) {
      case 'diagnostic':
        return "📝";
      case 'learning_session':
        return "📚";
      case 'final_quiz':
        return "🎯";
      default:
        return "⭕";
    }
  };

  const getStateLabel = (state, completionStatus) => {
    if (completionStatus === 'completed') {
      return "Completed";
    }
    switch (state) {
      case 'diagnostic':
        return "Ready for Diagnostic";
      case 'learning_session':
        return "Learning in Progress";
      case 'final_quiz':
        return "Ready for Quiz";
      default:
        return "Not Started";
    }
  };

  const getStateBadgeColor = (state, completionStatus) => {
    if (completionStatus === 'completed') {
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
    switch (state) {
      case 'diagnostic':
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case 'learning_session':
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case 'final_quiz':
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getActionButton = (topic) => {
    if (topic.completion_status === 'completed') {
      return (
        <button
          onClick={() => handleReview(topic.id)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          Review Content
        </button>
      );
    }

    switch (topic.state) {
      case 'diagnostic':
        return (
          <button
            onClick={() => handleStartDiagnostic(topic.id)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all text-sm font-medium"
          >
            Take Diagnostic Quiz
          </button>
        );
      case 'learning_session':
        return (
          <button
            onClick={() => handleContinueLearning(topic.id)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all text-sm font-medium"
          >
            Continue Learning
          </button>
        );
      case 'final_quiz':
        return (
          <button
            onClick={() => handleTakeFinalQuiz(topic.id)}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all text-sm font-medium"
          >
            Take Final Quiz
          </button>
        );
      default:
        return (
          <button
            disabled
            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed text-sm font-medium"
          >
            Locked
          </button>
        );
    }
  };

  const handleStartDiagnostic = (topicId) => {
    router.push(`/diagnostic/${topicId}`);
  };

  const handleContinueLearning = (topicId) => {
    router.push(`/learn/${topicId}`);
  };

  const handleTakeFinalQuiz = (topicId) => {
    router.push(`/quiz/${topicId}`);
  };

  const handleReview = (topicId) => {
    router.push(`/review/${topicId}`);
  };

  const calculateTopicProgress = (topic) => {
    if (topic.completion_status === 'completed') return 100;
    if (!topic.subskills || topic.subskills.length === 0) return 0;
    
    const avgMastery = topic.subskills.reduce((sum, skill) => sum + skill.mastery, 0) / topic.subskills.length;
    return Math.round(avgMastery * 100);
  };

  const calculateOverallProgress = () => {
    if (!topicSessions || topicSessions.length === 0) return 0;
    
    const totalProgress = topicSessions.reduce((sum, topic) => {
      return sum + calculateTopicProgress(topic);
    }, 0);
    
    return Math.round(totalProgress / topicSessions.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your learning roadmap...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!coursePack) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Roadmap Not Found</h2>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();
  const completedTopics = topicSessions.filter(t => t.completion_status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="pt-24 pb-12 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header Section */}
          <div className="mb-8">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-4 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {coursePack.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                    {coursePack.learning_goal || "Master this topic through structured learning"}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-2">
                      📄 {coursePack.document_name}
                    </span>
                    <span className="flex items-center gap-2">
                      📊 {completedTopics} of {topicSessions.length} topics completed
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {overallProgress}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Overall Progress</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Learning Path */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="text-3xl">🗺️</span>
              Your Learning Path
            </h2>
            
            <div className="space-y-4">
              {topicSessions.map((topic, index) => (
                <div 
                  key={topic.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-xl"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getStateIcon(topic.state, topic.completion_status)}</span>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {index + 1}. {topic.title}
                            </h3>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getStateBadgeColor(topic.state, topic.completion_status)}`}>
                              {getStateLabel(topic.state, topic.completion_status)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress Bar for Topic */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <span>Topic Progress</span>
                            <span className="font-semibold">{calculateTopicProgress(topic)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${calculateTopicProgress(topic)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Subskills */}
                        {topic.subskills && topic.subskills.length > 0 && (
                          <div className="mt-4">
                            <button
                              onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              {expandedTopic === topic.id ? '▼' : '▶'} 
                              View {topic.subskills.length} subskills
                            </button>
                            
                            {expandedTopic === topic.id && (
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {topic.subskills.map((skill) => (
                                  <div 
                                    key={skill.id}
                                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {skill.name}
                                      </span>
                                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                        {Math.round(skill.mastery * 100)}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-1.5">
                                      <div 
                                        className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all"
                                        style={{ width: `${skill.mastery * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-6">
                        {getActionButton(topic)}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      {topic.diagnostic_questions && topic.diagnostic_questions.length > 0 && (
                        <span className="flex items-center gap-1">
                          📝 {topic.diagnostic_questions.length} questions
                        </span>
                      )}
                      {topic.learning_modules && topic.learning_modules.length > 0 && (
                        <span className="flex items-center gap-1">
                          📚 {topic.learning_modules.length} modules
                        </span>
                      )}
                      {topic.subskills && topic.subskills.length > 0 && (
                        <span className="flex items-center gap-1">
                          🎯 {topic.subskills.length} skills to master
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <span className="text-4xl">💡</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Learning Tips
                </h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                    <span><strong>Diagnostic First:</strong> Take the diagnostic quiz to identify your current knowledge level</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400 mt-1">•</span>
                    <span><strong>Learn at Your Pace:</strong> Spend as much time as you need on each module</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-600 dark:text-pink-400 mt-1">•</span>
                    <span><strong>Master the Basics:</strong> Ensure you understand each subskill before moving forward</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 dark:text-orange-400 mt-1">•</span>
                    <span><strong>Review Often:</strong> Revisit completed topics to reinforce your understanding</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
