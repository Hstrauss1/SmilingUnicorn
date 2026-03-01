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

/**
 * Update course pack diagnostic for a specific topic session in the JSONB array
 */
export async function updateCoursePackDiagnostic(coursePackId, topicId, diagnostic) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  // Fetch current course_packs array
  const { data: currentData, error: fetchError } = await supabase
    .from('course_packs')
    .select('course_packs')
    .eq('user_id', user.id)
    .single();

  if (fetchError) throw fetchError;
  if (!currentData) throw new Error('No course packs found');

  // Update the specific course pack's diagnostic
  const updatedCoursePacks = currentData.course_packs.map(pack => {
    if (pack.course_pack_id === coursePackId) {
      const updatedTopicSession = {
        ...pack.topic_session,
        diagnostic: diagnostic,
        state: 'diagnostic'
      };
      
      return {
        ...pack,
        topic_session: updatedTopicSession
      };
    }
    return pack;
  });

  // Save back to Supabase
  const { error: updateError } = await supabase
    .from('course_packs')
    .update({ 
      course_packs: updatedCoursePacks
    })
    .eq('user_id', user.id);

  if (updateError) throw updateError;

  return { success: true };
}

/**
 * Update topic session state in the JSONB array
 */
export async function updateTopicSessionInCoursePack(coursePackId, topicId, updates) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  // Fetch current course_packs array
  const { data: currentData, error: fetchError } = await supabase
    .from('course_packs')
    .select('course_packs')
    .eq('user_id', user.id)
    .single();

  if (fetchError) throw fetchError;
  if (!currentData) throw new Error('No course packs found');

  // Update the specific course pack's topic session
  const updatedCoursePacks = currentData.course_packs.map(pack => {
    if (pack.course_pack_id === coursePackId) {
      return {
        ...pack,
        topic_session: {
          ...pack.topic_session,
          ...updates
        }
      };
    }
    return pack;
  });

  // Save back to Supabase
  const { error: updateError } = await supabase
    .from('course_packs')
    .update({ 
      course_packs: updatedCoursePacks
    })
    .eq('user_id', user.id);

  if (updateError) throw updateError;

  return { success: true };
}

/**
 * Get a specific course pack by ID from the JSONB array
 */
export async function getCoursePackByIdFromArray(coursePackId) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('course_packs')
    .select('course_packs')
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  if (!data || !data.course_packs) return null;

  // Find the specific course pack
  const coursePack = data.course_packs.find(
    pack => pack.course_pack_id === coursePackId
  );

  return coursePack || null;
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
 * Submit diagnostic answers and generate learning modules
 * Grades the diagnostic, updates mastery, and creates learning modules for weak subskills
 */
export async function submitDiagnosticAndGenerateLearning(coursePackId, answers) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  // Fetch current course_packs array
  const { data: currentData, error: fetchError } = await supabase
    .from('course_packs')
    .select('course_packs')
    .eq('user_id', user.id)
    .single();

  if (fetchError) throw fetchError;
  if (!currentData) throw new Error('No course packs found');

  // Find the specific course pack
  const coursePack = currentData.course_packs.find(
    pack => pack.course_pack_id === coursePackId
  );

  if (!coursePack) throw new Error('Course pack not found');

  // Grade diagnostic and update mastery
  const gradedPack = gradeDiagnosticAndUpdateMastery(coursePack, answers);

  // Generate learning modules
  const withLearning = generateLearningModules(gradedPack);

  // Update the course pack in the array
  const updatedCoursePacks = currentData.course_packs.map(pack => {
    if (pack.course_pack_id === coursePackId) {
      return withLearning;
    }
    return pack;
  });

  // Save back to Supabase
  const { error: updateError } = await supabase
    .from('course_packs')
    .update({ 
      course_packs: updatedCoursePacks,
    })
    .eq('user_id', user.id);

  if (updateError) throw updateError;

  return {
    success: true,
    score: withLearning.topic_session.diagnostic.submission.score,
    weakSubskills: withLearning.topic_session.diagnostic.submission.analysis.weak_subskills,
    learningModules: withLearning.topic_session.learning_session.active_modules,
    masteryUpdates: withLearning.topic_session.subskills
  };
}

/**
 * Grade diagnostic and update subskill mastery
 */
function gradeDiagnosticAndUpdateMastery(coursePack, submittedAnswers) {
  const result = { ...coursePack };
  const questions = result.topic_session.diagnostic.questions;
  
  // Create lookup maps
  const questionById = {};
  questions.forEach(q => {
    questionById[q.question_id] = q;
  });

  const answerByQuestionId = {};
  submittedAnswers.forEach(a => {
    answerByQuestionId[a.question_id] = a.answer;
  });

  // Track results
  const perQuestion = [];
  let numCorrect = 0;
  const weakSubskillsSet = new Set();
  const subskillCorrectCount = {};
  const subskillTotalCount = {};

  // Grade each question
  for (const question of questions) {
    const qid = question.question_id;
    const expected = question.correct_answer;
    const given = answerByQuestionId[qid] || '';
    const subskillId = question.subskill_id;

    if (!subskillCorrectCount[subskillId]) {
      subskillCorrectCount[subskillId] = 0;
      subskillTotalCount[subskillId] = 0;
    }

    const isCorrect = given.trim() === expected.trim();

    if (isCorrect) {
      numCorrect++;
      subskillCorrectCount[subskillId]++;
    } else {
      weakSubskillsSet.add(subskillId);
    }

    subskillTotalCount[subskillId]++;

    perQuestion.push({
      question_id: qid,
      is_correct: isCorrect,
      error_type: isCorrect ? null : 'reasoning_error',
      confidence: isCorrect ? 1.0 : 0.6,
      notes: isCorrect ? 'Correct answer' : 'Incorrect answer'
    });
  }

  const numTotal = questions.length;
  const percent = numTotal > 0 ? numCorrect / numTotal : 0;

  // Update diagnostic submission
  result.topic_session.diagnostic.submission = {
    answers: submittedAnswers,
    score: {
      num_correct: numCorrect,
      num_total: numTotal,
      percent: percent
    },
    analysis: {
      per_question: perQuestion,
      weak_subskills: Array.from(weakSubskillsSet).sort(),
      suspected_prereq_topics: []
    }
  };

  // Update mastery for each subskill
  result.topic_session.subskills = result.topic_session.subskills.map(subskill => {
    const sid = subskill.subskill_id;
    const correct = subskillCorrectCount[sid] || 0;
    const total = subskillTotalCount[sid] || 0;
    
    const mastery = total > 0 ? correct / total : 0;

    return {
      ...subskill,
      mastery: mastery
    };
  });

  // Update state
  if (weakSubskillsSet.size === 0) {
    result.topic_session.state = 'final';
  } else {
    result.topic_session.state = 'learning_session';
  }

  return result;
}

/**
 * Generate learning modules for weak subskills
 */
function generateLearningModules(coursePack) {
  const result = { ...coursePack };
  const weakSubskills = result.topic_session.diagnostic.submission.analysis.weak_subskills;

  if (weakSubskills.length === 0) {
    result.topic_session.learning_session.active_modules = [];
    result.topic_session.state = 'final';
    return result;
  }

  const subskillById = {};
  result.topic_session.subskills.forEach(s => {
    subskillById[s.subskill_id] = s;
  });

  const modules = weakSubskills.map(subskillId => {
    const subskill = subskillById[subskillId];
    
    return {
      module_id: `learn_${subskillId}_v1`,
      subskill_id: subskillId,
      title: `Master: ${subskill.name}`,
      explanation: `Let's review the key concepts for: ${subskill.name}.\n\nThis skill is essential for understanding the material. Review the source material referenced in the evidence chunks and pay attention to the fundamental principles.`,
      worked_example: {
        prompt: `Here's a practical example demonstrating ${subskill.name}:`,
        solution: `Review the slides and lecture notes for detailed examples of ${subskill.name}. Practice applying this concept in different contexts.`
      },
      quick_check: {
        question_id: `qc_${subskillId}_1`,
        type: 'mcq',
        prompt: `Quick check: Which statement best describes ${subskill.name}?`,
        choices: [
          'Review the concept in your materials',
          'Practice with examples',
          'Understand the fundamentals',
          'All of the above'
        ],
        correct_answer: 'All of the above'
      },
      evidence_chunk_ids: subskill.evidence_chunk_ids || [],
      completion_status: 'not_started'
    };
  });

  result.topic_session.learning_session.active_modules = modules;
  result.topic_session.state = 'learning_session';

  return result;
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
