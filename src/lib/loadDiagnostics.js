/**
 * Utility functions to load Python-generated diagnostic quizzes
 * Updated to fetch from Supabase instead of static files
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Load all available course pack topic sessions from Supabase for the current user
 */
export async function loadGeneratedCoursePacks() {
  const supabase = createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('User not authenticated:', userError);
    return [];
  }
  
  // Fetch all course packs for this user
  const { data: coursePacksData, error: fetchError } = await supabase
    .from('course_packs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.error('Error fetching course packs:', fetchError);
    return [];
  }
  
  if (!coursePacksData || coursePacksData.length === 0) {
    console.debug('No course packs found for user');
    return [];
  }
  
  const coursePacks = [];
  
  for (const packData of coursePacksData) {
    try {
      const roadmapJson = packData.roadmap_json;
      
      if (!roadmapJson || !roadmapJson.topic_session) {
        console.debug(`Skipping ${packData.course_pack_id}: No topic session data`);
        continue;
      }
      
      // Skip course packs with placeholder subskills (incomplete generation)
      const hasPlaceholderSubskills = roadmapJson.topic_session.subskills.some(
        skill => skill.subskill_id === 'subskill_placeholder' || 
                 skill.name.includes('Placeholder') ||
                 !skill.name || skill.name.trim() === ''
      );
      
      if (hasPlaceholderSubskills) {
        console.debug(`Skipping ${packData.course_pack_id}: Has placeholder subskills (incomplete topic extraction)`);
        continue;
      }
      
      const topic = {
        id: roadmapJson.topic_session.topic_id,
        title: roadmapJson.topic_session.title,
        state: roadmapJson.topic_session.state,
        completion_status: roadmapJson.topic_session.completion?.status || "not_started",
        subskills: roadmapJson.topic_session.subskills.map(skill => ({
          id: skill.subskill_id,
          name: skill.name,
          mastery: skill.mastery
        })),
        diagnostic: roadmapJson.topic_session.diagnostic,
        learning_session: roadmapJson.topic_session.learning_session,
        final_quiz: roadmapJson.topic_session.final_quiz
      };
      
      // Create a course pack for this topic
      const coursePack = {
        id: packData.course_pack_id,
        title: packData.title,
        document_name: packData.document_name || "Generated from PDF",
        progress: packData.progress || 0,
        status: packData.status || 'in_progress',
        topic_sessions: [topic]
      };
      
      coursePacks.push(coursePack);
    } catch (error) {
      console.error(`Error processing course pack ${packData.course_pack_id}:`, error);
    }
  }
  
  return coursePacks;
}

/**
 * Load a specific topic session by ID from Supabase
 */
export async function loadTopicSessionById(topicId, packId) {
  const supabase = createClient();
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return null;
    }
    
    // Fetch the course pack by course_pack_id
    const { data: packData, error: fetchError } = await supabase
      .from('course_packs')
      .select('roadmap_json')
      .eq('course_pack_id', packId)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !packData) {
      console.error('Error fetching topic session:', fetchError);
      return null;
    }
    
    return packData.roadmap_json?.topic_session || null;
  } catch (error) {
    console.error('Error loading topic session:', error);
    return null;
  }
}

/**
 * Check if diagnostic quiz exists and has questions
 */
export function hasDiagnosticQuiz(topicSession) {
  return (
    topicSession &&
    topicSession.diagnostic &&
    topicSession.diagnostic.questions &&
    topicSession.diagnostic.questions.length > 0
  );
}

/**
 * Get quiz completion status
 */
export function getQuizCompletionStatus(topicSession) {
  if (!topicSession || !topicSession.diagnostic) {
    return 'not_started';
  }
  
  const answers = topicSession.diagnostic.submission?.answers || [];
  const questions = topicSession.diagnostic.questions || [];
  
  if (answers.length === 0) {
    return 'not_started';
  } else if (answers.length < questions.length) {
    return 'in_progress';
  } else {
    return 'completed';
  }
}
