"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { loadGeneratedCoursePacks } from "@/lib/loadDiagnostics";
import { getUserCoursePacksFormatted } from "@/lib/supabase/coursePacks";

function RoadmapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const packId = searchParams.get('packId');
  
  const [loading, setLoading] = useState(true);
  const [coursePack, setCoursePack] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // First try to load from Supabase
        console.log('Loading roadmap from Supabase for packId:', packId);
        const supabasePacks = await getUserCoursePacksFormatted();
        
        // Find the course pack matching the packId
        let pack = supabasePacks.find(p => p.id === packId);
        
        if (pack) {
          console.log('Found course pack in Supabase:', pack.title);
          setCoursePack(pack);
        } else {
          // Fall back to generated files
          console.log('Course pack not in Supabase, checking generated files...');
          const generatedPacks = await loadGeneratedCoursePacks();
          pack = generatedPacks.find(p => p.id === packId);
          
          if (pack) {
            console.log('Found course pack in generated files:', pack.title);
            setCoursePack(pack);
          } else {
            console.error('Course pack not found:', packId);
            setCoursePack(null);
          }
        }
      } catch (error) {
        console.error('Error loading course pack:', error);
        // Try fallback to generated files
        try {
          const generatedPacks = await loadGeneratedCoursePacks();
          const pack = generatedPacks.find(p => p.id === packId);
          if (pack) {
            setCoursePack(pack);
          } else {
            setCoursePack(null);
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          setCoursePack(null);
        }
      } finally {
        setLoading(false);
      }
    };

    if (packId) {
      loadData();
    } else {
      setLoading(false);
      setCoursePack(null);
    }
    if (packId) {
      loadData();
    } else {
      setLoading(false);
      setCoursePack(null);
    }
  }, [packId]);

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

  if (!coursePack) {
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
        <Header />
        <main className="grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">Roadmap Not Found</h2>
            <p className="text-[#5a5a5a] dark:text-[#b8b3a3]">We couldn&apos;t find the learning roadmap you&apos;re looking for.</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-4 py-2 bg-linear-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-lg hover:shadow-lg"
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
    <div className="min-h-screen flex flex-col bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
      <Header />
      
      <main className="grow pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button 
                onClick={() => router.push('/dashboard')}
                className="text-sm text-[#c09080] dark:text-[#d4c4dc] hover:underline mb-2 flex items-center gap-1"
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
            <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] p-4 rounded-xl shadow-sm border border-[#e8e3d3] dark:border-[#4a4a4a] flex flex-col items-center justify-center min-w-30">
              <span className="block text-3xl font-bold text-[#c09080] dark:text-[#d4c4dc]">
                {coursePack.progress}%
              </span>
              <span className="text-xs text-[#8a8a8a] dark:text-[#888378] uppercase tracking-wider font-semibold mt-1">
                Complete
              </span>
            </div>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-8 top-8 bottom-8 w-1 bg-[#e8e3d3] dark:bg-[#4a4a4a] rounded-full hidden md:block" />

            {coursePack.topic_sessions.map((topic, index) => {
              const isCompleted = topic.completion_status === 'completed';
              const isInProgress = topic.completion_status === 'in_progress';
              // Topics should never be locked - all topics are accessible
              const isLocked = false;
              
              let statusColor = "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600";
              let statusIcon = "🔔"; // Default icon for not started
              
              if (isCompleted) {
                statusColor = "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400";
                statusIcon = "✅";
              } else if (isInProgress) {
                statusColor = "bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400";
                statusIcon = "▶️";
              }

              return (
                <div key={topic.id} className="relative flex items-start mb-8 md:ml-0">
                  {/* Timeline Dot */}
                  <div className={`hidden md:flex absolute left-4 w-9 h-9 -ml-4 rounded-full border-4 ${isCompleted ? 'border-green-500 bg-white dark:bg-gray-900' : isInProgress ? 'border-blue-500 bg-white dark:bg-gray-900' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'} z-10 items-center justify-center`}>
                    <span className="text-sm">{isCompleted ? '✓' : index + 1}</span>
                  </div>

                  <div className={`w-full md:ml-12 p-6 rounded-2xl border-2 transition-all ${isCompleted ? 'border-green-200 dark:border-green-900/50 bg-white dark:bg-gray-800' : isInProgress ? 'border-blue-400 dark:border-blue-600 bg-white dark:bg-gray-800 shadow-md transform scale-[1.02]' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-80'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">{statusIcon}</span>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
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
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
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
                             let barColor = 'bg-[#c09080]';
                             if (skill.mastery >= 0.8) barColor = 'bg-green-500';
                             else if (skill.mastery >= 0.5) barColor = 'bg-yellow-500';
                             
                             return (
                              <div key={sIdx} className="bg-[#e8e3d3] dark:bg-[#3a3a3a] rounded-lg p-3 border border-[#d4c4dc] dark:border-[#4a4a4a]">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium text-[#2d2d2d] dark:text-[#e8e3d3]">{skill.name}</span>
                                  <span className="text-xs text-[#5a5a5a] dark:text-[#b8b3a3]">{masteryPercent}%</span>
                                </div>
                                <div className="w-full bg-[#faf9f6] dark:bg-[#4a4a4a] rounded-full h-1.5">
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
                      <p className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3] italic mt-2">
                        Subskills will be revealed after taking the diagnostic assessment.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c09080]"></div></div>}>
      <RoadmapContent />
    </Suspense>
  );
}
