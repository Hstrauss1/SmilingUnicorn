/**
 * Utility functions to load Python-generated diagnostic quizzes
 */

/**
 * Load all available course pack topic sessions from the out directory
 * This will attempt to load all course_*_topic_session_with_diagnostic.json files
 */
export async function loadGeneratedCoursePacks() {
  const coursePacks = [];
  
  // List of known course IDs (you can expand this list as you generate more)
  const knownCourseIds = [
    'course_8deddc76',
    'course_41297e14', 
    'course_5890e04c',
    'course_ee67b8ac'
  ];
  
  for (const courseId of knownCourseIds) {
    try {
      // Try to load the diagnostic version first
      let topicSession;
      try {
        const diagnosticModule = await import(`@/testPy/out/${courseId}_topic_session_with_diagnostic.json`);
        topicSession = diagnosticModule.default;
      } catch (e) {
        // Fall back to the version without diagnostic
        const normalModule = await import(`@/testPy/out/${courseId}_topic_session.json`);
        topicSession = normalModule.default;
      }
      
      if (topicSession && topicSession.topic_session) {
        // Skip course packs with placeholder subskills (incomplete generation)
        const hasPlaceholderSubskills = topicSession.topic_session.subskills.some(
          skill => skill.subskill_id === 'subskill_placeholder' || 
                   skill.name.includes('Placeholder')
        );
        
        if (hasPlaceholderSubskills) {
          console.debug(`Skipping ${courseId}: Has placeholder subskills (incomplete topic extraction)`);
          continue;
        }
        
        const topic = {
          id: topicSession.topic_session.topic_id,
          title: topicSession.topic_session.title,
          state: topicSession.topic_session.state,
          completion_status: "not_started",
          subskills: topicSession.topic_session.subskills.map(skill => ({
            id: skill.subskill_id,
            name: skill.name,
            mastery: skill.mastery
          })),
          diagnostic: topicSession.topic_session.diagnostic,
          learning_session: topicSession.topic_session.learning_session,
          final_quiz: topicSession.topic_session.final_quiz
        };
        
        // Create a course pack for this topic
        const coursePack = {
          id: topicSession.course_pack_id,
          title: topicSession.topic_session.title,
          document_name: "Generated from PDF",
          progress: 0,
          status: 'in_progress',
          topic_sessions: [topic]
        };
        
        coursePacks.push(coursePack);
      }
    } catch (error) {
      // Course pack doesn't exist or can't be loaded, skip it
      console.debug(`Could not load course pack ${courseId}:`, error.message);
    }
  }
  
  return coursePacks;
}

/**
 * Load a specific topic session by ID
 */
export async function loadTopicSessionById(topicId, packId) {
  try {
    // Try different file naming patterns
    const patterns = [
      `@/testPy/out/topic_session_${topicId}.json`,
      `@/testPy/out/course_${packId}_topic_session_with_diagnostic.json`,
      `@/testPy/out/course_${packId}_topic_session.json`
    ];
    
    for (const pattern of patterns) {
      try {
        const topicModule = await import(pattern);
        return topicModule.default.topic_session;
      } catch (e) {
        // Try next pattern
        continue;
      }
    }
    
    return null;
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
