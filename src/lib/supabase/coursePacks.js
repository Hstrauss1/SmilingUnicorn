/**
 * Course Pack Database Operations
 * Based on the schema.json structure for topic sessions, diagnostics, and learning modules
 */

import { createClient } from './client';

// ============================================
// COURSE PACK OPERATIONS
// ============================================

/**
 * Create a new course pack
 */
export async function createCoursePack(coursePackData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('course_packs')
    .insert({
      user_id: user.id,
      title: coursePackData.title,
      document_name: coursePackData.document_name,
      document_url: coursePackData.document_url,
      learning_goal: coursePackData.learning_goal,
      status: 'in_progress',
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all course packs for the current user
 */
export async function getUserCoursePacks() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('course_packs')
    .select(`
      *,
      topic_sessions (
        *
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all course packs for the current user with formatted data
 * Reads from the course_packs JSONB array
 */
export async function getUserCoursePacksFormatted() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('course_packs')
    .select('course_packs')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No row exists yet for this user
      return [];
    }
    throw error;
  }
  
  if (!data || !data.course_packs) return [];

  // The course_packs column is already a JSONB array of course packs
  const coursePacksArray = data.course_packs;

  // Transform each course pack into dashboard format
  return coursePacksArray.map(pack => {
    const topicSession = pack.topic_session;
    
    if (!topicSession) {
      console.warn(`Course pack ${pack.course_pack_id} has no topic session`);
      return null;
    }

    // Create topic session object
    const topic = {
      id: topicSession.topic_id,
      title: topicSession.title,
      state: topicSession.state,
      completion_status: topicSession.completion?.status || "not_started",
      subskills: (topicSession.subskills || []).map(skill => ({
        id: skill.subskill_id,
        name: skill.name,
        mastery: skill.mastery || 0
      })),
      diagnostic: topicSession.diagnostic,
      learning_session: topicSession.learning_session,
      final_quiz: topicSession.final_quiz
    };

    // Return formatted course pack
    return {
      id: pack.course_pack_id,
      title: pack.title,
      document_name: pack.document_name,
      progress: pack.progress || 0,
      status: pack.status || 'in_progress',
      topic_sessions: [topic],
      created_at: pack.created_at,
      updated_at: pack.updated_at
    };
  }).filter(pack => pack !== null); // Remove any invalid packs
}

/**
 * Get a specific course pack by ID with all topic sessions
 */
export async function getCoursePackById(coursePackId) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('course_packs')
    .select(`
      *,
      topic_sessions (
        *,
        subskills (*),
        diagnostic_questions (*),
        learning_modules (*)
      )
    `)
    .eq('id', coursePackId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update course pack progress
 */
export async function updateCoursePackProgress(coursePackId, progress, status) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('course_packs')
    .update({ 
      progress, 
      status,
      updated_at: new Date().toISOString() 
    })
    .eq('id', coursePackId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// TOPIC SESSION OPERATIONS
// ============================================

/**
 * Create topic sessions for a course pack
 */
export async function createTopicSessions(coursePackId, topicSessionsData) {
  const supabase = createClient();
  
  const sessions = topicSessionsData.map((session, index) => ({
    course_pack_id: coursePackId,
    topic_id: session.topic_id,
    title: session.title,
    state: session.state || 'diagnostic',
    order_index: index,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('topic_sessions')
    .insert(sessions)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Get topic sessions for a course pack
 */
export async function getTopicSessions(coursePackId) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('topic_sessions')
    .select(`
      *,
      subskills (*),
      diagnostic_questions (*),
      learning_modules (*)
    `)
    .eq('course_pack_id', coursePackId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Update topic session state
 */
export async function updateTopicSessionState(sessionId, state, completion_status) {
  const supabase = createClient();
  
  const updates = {
    state,
    updated_at: new Date().toISOString()
  };

  if (completion_status) {
    updates.completion_status = completion_status;
    if (completion_status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('topic_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// SUBSKILL OPERATIONS
// ============================================

/**
 * Create subskills for a topic session
 */
export async function createSubskills(sessionId, subskillsData) {
  const supabase = createClient();
  
  const subskills = subskillsData.map(subskill => ({
    topic_session_id: sessionId,
    subskill_id: subskill.subskill_id,
    name: subskill.name,
    mastery: subskill.mastery || 0.0,
    evidence_chunk_ids: subskill.evidence_chunk_ids || []
  }));

  const { data, error } = await supabase
    .from('subskills')
    .insert(subskills)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Update subskill mastery
 */
export async function updateSubskillMastery(subskillId, mastery) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('subskills')
    .update({ mastery })
    .eq('id', subskillId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// DIAGNOSTIC OPERATIONS
// ============================================

/**
 * Create diagnostic questions for a topic session
 */
export async function createDiagnosticQuestions(sessionId, questionsData) {
  const supabase = createClient();
  
  const questions = questionsData.map(question => ({
    topic_session_id: sessionId,
    question_id: question.question_id,
    subskill_id: question.subskill_id,
    type: question.type,
    difficulty: question.difficulty,
    prompt: question.prompt,
    choices: question.choices || [],
    correct_answer: question.correct_answer,
    rubric: question.rubric || []
  }));

  const { data, error } = await supabase
    .from('diagnostic_questions')
    .insert(questions)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Submit diagnostic quiz answers
 */
export async function submitDiagnosticAnswers(sessionId, answers) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('diagnostic_submissions')
    .insert({
      topic_session_id: sessionId,
      answers: answers,
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// LEARNING MODULE OPERATIONS
// ============================================

/**
 * Create learning modules for a topic session
 */
export async function createLearningModules(sessionId, modulesData) {
  const supabase = createClient();
  
  const modules = modulesData.map((module, index) => ({
    topic_session_id: sessionId,
    module_id: module.module_id,
    subskill_id: module.subskill_id,
    title: module.title,
    explanation: module.explanation,
    worked_example: module.worked_example || {},
    quick_check: module.quick_check || {},
    evidence_chunk_ids: module.evidence_chunk_ids || [],
    order_index: index,
    status: 'locked',
    progress: 0
  }));

  const { data, error } = await supabase
    .from('learning_modules')
    .insert(modules)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Update learning module progress
 */
export async function updateLearningModuleProgress(moduleId, progress, status) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('learning_modules')
    .update({ 
      progress, 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', moduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// ACTIVITY LOG OPERATIONS
// ============================================

/**
 * Log user activity
 */
export async function logActivity(activityData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: user.id,
      action: activityData.action,
      item: activityData.item,
      course_pack_id: activityData.course_pack_id,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get recent activity for user
 */
export async function getRecentActivity(limit = 10) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================
// USER STATS OPERATIONS
// ============================================

/**
 * Calculate user statistics
 */
export async function getUserStats() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  // Get all course packs
  const { data: coursePacks } = await supabase
    .from('course_packs')
    .select('*, topic_sessions(*)')
    .eq('user_id', user.id);

  if (!coursePacks) return null;

  // Calculate stats
  const totalCoursePacks = coursePacks.length;
  const totalTopics = coursePacks.reduce((sum, pack) => sum + (pack.topic_sessions?.length || 0), 0);
  
  let completedTopics = 0;
  let totalProgress = 0;
  
  coursePacks.forEach(pack => {
    totalProgress += pack.progress || 0;
    pack.topic_sessions?.forEach(session => {
      if (session.completion_status === 'completed') {
        completedTopics++;
      }
    });
  });

  const averageProgress = totalCoursePacks > 0 ? totalProgress / totalCoursePacks : 0;

  // Get streak (mock for now - would need daily activity tracking)
  const { data: recentActivity } = await supabase
    .from('activity_logs')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  return {
    totalCoursePacks,
    totalTopics,
    completedTopics,
    averageProgress: Math.round(averageProgress),
    currentStreak: calculateStreak(recentActivity || [])
  };
}

/**
 * Helper function to calculate streak
 */
function calculateStreak(activities) {
  if (activities.length === 0) return 0;
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  const activityDates = activities.map(a => {
    const date = new Date(a.created_at);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  });
  
  const uniqueDates = [...new Set(activityDates)].sort((a, b) => b - a);
  
  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (uniqueDates[i] === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}
