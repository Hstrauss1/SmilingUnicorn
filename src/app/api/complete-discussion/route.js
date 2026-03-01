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
    
    // Update state based on weak subskills
    if (weakSubskills.length > 0) {
      // Has weak subskills, go to learning session
      coursePack.topic_session.state = 'learning_session';
    } else {
      // No weak subskills, proceed to final quiz
      coursePack.topic_session.state = 'final_quiz';
    }

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

    console.log(`Discussion completed, transitioning to: ${coursePack.topic_session.state}`);

    return NextResponse.json({
      success: true,
      nextState: coursePack.topic_session.state,
      hasWeakSubskills: weakSubskills.length > 0,
      weakSubskillCount: weakSubskills.length,
      message: 'Discussion completed successfully'
    });

  } catch (error) {
    console.error('Error in complete-discussion route:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
