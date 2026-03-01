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
  
  // Fetch user's course_packs row
  const { data, error: fetchError } = await supabase
    .from('course_packs')
    .select('course_packs')
    .eq('user_id', user.id)
    .single();
  
  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      // No row exists yet
      console.debug('No course packs found for user');
      return [];
    }
    console.error('Error fetching course packs:', fetchError);
    return [];
  }
  
  if (!data || !data.course_packs || data.course_packs.length === 0) {
    console.debug('No course packs in array');
    return [];
  }
  
  const coursePacks = [];
  
  for (const pack of data.course_packs) {
    try {
      if (!pack.topic_session) {
        console.debug(`Skipping ${pack.course_pack_id}: No topic session data`);
        continue;
      }
      
      // Skip course packs with placeholder subskills (incomplete generation)
      const hasPlaceholderSubskills = pack.topic_session.subskills.some(
        skill => skill.subskill_id === 'subskill_placeholder' || 
                 skill.name.includes('Placeholder') ||
                 !skill.name || skill.name.trim() === ''
      );
      
      if (hasPlaceholderSubskills) {
        console.debug(`Skipping ${pack.course_pack_id}: Has placeholder subskills (incomplete topic extraction)`);
        continue;
      }
      
      const topic = {
        id: pack.topic_session.topic_id,
        title: pack.topic_session.title,
        state: pack.topic_session.state,
        completion_status: pack.topic_session.completion?.status || "not_started",
        subskills: pack.topic_session.subskills.map(skill => ({
          id: skill.subskill_id,
          name: skill.name,
          mastery: skill.mastery
        })),
        diagnostic: pack.topic_session.diagnostic,
        learning_session: pack.topic_session.learning_session,
        final_quiz: pack.topic_session.final_quiz
      };
      
      // Create a course pack for this topic
      const coursePack = {
        id: pack.course_pack_id,
        title: pack.title,
        document_name: pack.document_name || "Generated from PDF",
        progress: pack.progress || 0,
        status: pack.status || 'in_progress',
        topic_sessions: [topic]
      };
      
      coursePacks.push(coursePack);
    } catch (error) {
      console.error(`Error processing course pack ${pack.course_pack_id}:`, error);
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
    
    // Fetch user's course_packs row
    const { data, error: fetchError } = await supabase
      .from('course_packs')
      .select('course_packs')
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !data) {
      console.error('Error fetching topic session:', fetchError);
      return null;
    }
    
    // Find the course pack with matching course_pack_id
    const pack = data.course_packs.find(p => p.course_pack_id === packId);
    
    return pack?.topic_session || null;
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
