import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Mark discussion as complete and transition to final quiz
 * POST /api/complete-discussion
 * Body: { coursePackId }
 */
export async function POST(request) {
  try {
    const { coursePackId } = await request.json();

    if (!coursePackId) {
      return NextResponse.json(
        { error: 'Missing required parameter: coursePackId' },
        { status: 400 }
      );
    }

    console.log(`Completing discussion for course pack ${coursePackId}`);

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Fetch the course pack from Supabase
    const { data: coursePackData, error: fetchError } = await supabase
      .from('course_packs')
      .select('course_packs')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !coursePackData) {
      return NextResponse.json(
        { error: 'Course pack not found' },
        { status: 404 }
      );
    }

    // Find the specific course pack in the array
    const coursePack = coursePackData.course_packs.find(
      pack => pack.course_pack_id === coursePackId
    );

    if (!coursePack || !coursePack.topic_session) {
      return NextResponse.json(
        { error: 'Topic session not found in course pack' },
        { status: 404 }
      );
    }

    // Check if there are weak subskills
    const weakSubskills = coursePack.topic_session.diagnostic?.submission?.analysis?.weak_subskills || [];
    
    // Generate final quiz based on weak subskills
    const finalQuiz = generateFinalQuiz(coursePack, weakSubskills);
    coursePack.topic_session.final_quiz = finalQuiz;
    coursePack.topic_session.state = 'final_quiz';

    // Update the course pack in Supabase
    const updatedCoursePacks = coursePackData.course_packs.map(pack => {
      if (pack.course_pack_id === coursePackId) {
        return coursePack;
      }
      return pack;
    });

    const { error: updateError } = await supabase
      .from('course_packs')
      .update({
        course_packs: updatedCoursePacks
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating Supabase:', updateError);
      return NextResponse.json(
        { error: 'Failed to save results to database' },
        { status: 500 }
      );
    }

    console.log(`Discussion completed, final quiz generated with ${coursePack.topic_session.final_quiz.questions.length} questions`);

    return NextResponse.json({
      success: true,
      nextState: coursePack.topic_session.state,
      finalQuiz: coursePack.topic_session.final_quiz,
      hasWeakSubskills: weakSubskills.length > 0,
      weakSubskillCount: weakSubskills.length,
      message: 'Discussion completed, final quiz ready'
    });

  } catch (error) {
    console.error('Error in complete-discussion route:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate final quiz based on weak subskills
 * Only tests weak subskills identified from diagnostic
 */
function generateFinalQuiz(coursePack, weakSubskills) {
  // Only test weak subskills - if none, skip final quiz
  if (weakSubskills.length === 0) {
    return {
      quiz_id: `final_v1_${Date.now()}`,
      questions: [],
      submission: {
        answers: [],
        score: {
          num_correct: 0,
          num_total: 0,
          percent: 0.0
        },
        passed: true,
        weak_subskills: []
      }
    };
  }

  // Create subskill lookup
  const subskillById = {};
  coursePack.topic_session.subskills.forEach(s => {
    subskillById[s.subskill_id] = s;
  });

  const questions = [];
  let qIndex = 1;
  const questionsPerSubskill = 2;

  // Generate questions ONLY for weak subskills
  for (const sid of weakSubskills) {
    const subskill = subskillById[sid];
    if (!subskill) continue;

    const name = subskill.name || 'Untitled Skill';

    // Generate exactly 2 questions per weak subskill
    for (let i = 0; i < questionsPerSubskill; i++) {
      questions.push({
        question_id: `fq${qIndex}`,
        subskill_id: sid,
        type: 'mcq',
        difficulty: 2,
        prompt: `Final check for ${name}: Question ${i + 1}`,
        choices: [
          'Option A',
          'Option B',
          'Option C',
          'Option D'
        ],
        correct_answer: 'Option B'
      });
      qIndex++;
    }
  }

  return {
    quiz_id: `final_v1_${Date.now()}`,
    questions: questions,
    submission: {
      answers: [],
      score: {
        num_correct: 0,
        num_total: questions.length,
        percent: 0.0
      },
      passed: false,
      weak_subskills: []
    }
  };
}
