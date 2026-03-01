"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VoiceAgent from "@/components/VoiceAgent";
import { createClient } from "@/lib/supabase/client";
import generatedTopicSession from "@/testPy/out/topic_session_after_learning.json";

function RoadmapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const packId = searchParams.get('packId') || 'mock-1'; // Default to mock-1 for now if not provided
  
  const [loading, setLoading] = useState(true);
  const [coursePack, setCoursePack] = useState(null);

  useEffect(() => {
    // In the future this will be fetched via:
    // const packData = await getCoursePackById(packId);
    
    // For now we simulate fetching the course pack based on ID
    const loadData = async () => {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        let mockData;

        if (packId === generatedTopicSession.course_pack_id) {
          const generatedTopic = {
            id: generatedTopicSession.topic_session.topic_id,
            title: generatedTopicSession.topic_session.title,
            state: generatedTopicSession.topic_session.state, // Use actual state from JSON
            completion_status: "in_progress",
            subskills: generatedTopicSession.topic_session.subskills.map(skill => ({
              name: skill.name,
              mastery: skill.mastery
            }))
          };

          mockData = {
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
          };
        } else if (packId === 'mock-2') {
          mockData = {
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
          };
        } else {
          mockData = {
            id: packId,
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
          };
        }
        
        setCoursePack(mockData);
        setLoading(false);
      }, 500);
    };

    loadData();
  }, [packId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f4f1e8] dark:bg-[#3a3a3a]">
        <Header />
        <main className="grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!coursePack) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f4f1e8] dark:bg-[#3a3a3a]">
        <Header />
        <main className="grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">Roadmap Not Found</h2>
            <p className="text-[#5a5a5a] dark:text-[#b8b3a3]">We couldn&apos;t find the learning roadmap you&apos;re looking for.</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f1e8] dark:bg-[#3a3a3a]">
      <Header />
      
      <main className="grow pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button 
                onClick={() => router.push('/dashboard')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 flex items-center gap-1"
              >
                <span>&larr;</span> Back to Dashboard
              </button>
              <h1 className="text-3xl font-extrabold text-[#2d2d2d] dark:text-[#e8e3d3] tracking-tight">
                Learning Roadmap
              </h1>
              <p className="text-lg text-[#5a5a5a] dark:text-[#b8b3a3] mt-2">
                {coursePack.title}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center min-w-30">
              <span className="block text-3xl font-bold text-blue-600 dark:text-blue-400">
                {coursePack.progress}%
              </span>
              <span className="text-xs text-[#8a8a8a] dark:text-[#888378] uppercase tracking-wider font-semibold mt-1">
                Complete
              </span>
            </div>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-8 top-8 bottom-8 w-1 bg-gray-200 dark:bg-gray-700 rounded-full hidden md:block" />

            {coursePack.topic_sessions.map((topic, index) => {
              const isCompleted = topic.completion_status === 'completed';
              const isInProgress = topic.completion_status === 'in_progress';
              // Topics should never be locked - all topics are accessible
              const isLocked = false;
              
              let statusColor = "bg-[#e8e3d3] dark:bg-[#4a4a4a] border-[#d4c4dc] dark:border-[#5a4a60]";
              let statusIcon = "�"; // Default icon for not started
              
              if (isCompleted) {
                statusColor = "bg-[#d4e5d4] dark:bg-[#4a5a4a] border-[#c8e6d0] dark:border-[#5a6a60] text-[#4a5a4a] dark:text-[#c8e6d0]";
                statusIcon = "✅";
              } else if (isInProgress) {
                statusColor = "bg-[#d4e8f0] dark:bg-[#455560] border-[#c8e6d0] dark:border-[#5a6a70] text-[#455560] dark:text-[#d4e8f0]";
                statusIcon = "▶️";
              }

              return (
                <div key={topic.id} className="relative flex items-start mb-8 md:ml-0">
                  {/* Timeline Dot */}
                  <div className={`hidden md:flex absolute left-4 w-9 h-9 -ml-4 rounded-full border-4 ${isCompleted ? 'border-[#c8e6d0] bg-[#faf9f6] dark:bg-[#2d2d2d]' : isInProgress ? 'border-[#d4c4dc] bg-[#faf9f6] dark:bg-[#2d2d2d]' : 'border-[#e8e3d3] dark:border-[#4a4a4a] bg-[#faf9f6] dark:bg-[#2d2d2d]'} z-10 items-center justify-center`}>
                    <span className="text-sm">{isCompleted ? '✓' : index + 1}</span>
                  </div>

                  <div className={`w-full md:ml-12 p-6 rounded-2xl border-2 transition-all ${isCompleted ? 'border-[#d4e5d4] dark:border-[#4a5a4a] bg-[#faf9f6] dark:bg-[#2d2d2d]' : isInProgress ? 'border-[#d4c4dc] dark:border-[#5a4a60] bg-[#faf9f6] dark:bg-[#2d2d2d] shadow-md transform scale-[1.02]' : 'border-[#e8e3d3] dark:border-[#4a4a4a] bg-[#f4f1e8] dark:bg-[#3a3a3a] opacity-80'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e3d3] dark:border-[#4a4a4a] pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">{statusIcon}</span>
                        <div>
                          <h3 className="text-xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3]">
                            Topic {index + 1}: {topic.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {topic.state.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* All topics are accessible - no locked topics */}
                      <button 
                        onClick={() => router.push(`/topic/${topic.id}?packId=${packId}`)}
                        className={`px-6 py-2 rounded-xl font-semibold transition-colors ${
                          isCompleted 
                            ? 'bg-[#e8e3d3] dark:bg-[#4a4a4a] text-[#5a5a5a] dark:text-[#b8b3a3] hover:bg-[#f4f1e8] dark:hover:bg-[#5a5a5a]' 
                            : 'bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white hover:shadow-lg shadow-sm'
                        }`}
                      >
                        {isCompleted ? 'Review' : topic.state === 'diagnostic' ? 'Start Diagnostic' : 'Continue'}
                      </button>
                    </div>

                    {topic.subskills && topic.subskills.length > 0 ? (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Key Subskills</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {topic.subskills.map((skill, sIdx) => {
                             const masteryPercent = Math.round((skill.mastery || 0) * 100);
                             let barColor = 'bg-blue-500';
                             if (skill.mastery >= 0.8) barColor = 'bg-green-500';
                             else if (skill.mastery >= 0.5) barColor = 'bg-yellow-500';
                             
                             return (
                              <div key={sIdx} className="bg-[#f4f1e8] dark:bg-[#3a3a3a] rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{skill.name}</span>
                                  <span className="text-xs text-[#8a8a8a] dark:text-[#888378]">{masteryPercent}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full ${barColor}`} 
                                    style={{ width: `${Math.max(masteryPercent, 5)}%` }}
                                  ></div>
                                </div>
                              </div>
                             );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#8a8a8a] dark:text-[#888378] italic mt-2">
                        Subskills will be revealed after taking the diagnostic assessment.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Voice Agent - Fixed position on desktop, inline on mobile */}
          <div className="fixed bottom-6 right-6 w-80 z-50 hidden lg:block">
            <VoiceAgent 
              topicContext={`Learning roadmap: ${coursePack.title}. Topics include: ${coursePack.topic_sessions.map(t => t.title).join(', ')}`} 
            />
          </div>
          
          {/* Mobile Voice Agent - Inline at bottom */}
          <div className="lg:hidden mt-8">
            <VoiceAgent 
              topicContext={`Learning roadmap: ${coursePack.title}. Topics include: ${coursePack.topic_sessions.map(t => t.title).join(', ')}`} 
            />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <RoadmapContent />
    </Suspense>
  );
}
