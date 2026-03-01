import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Submit diagnostic quiz answers, grade them, update mastery, and generate learning modules
 * POST /api/submit-diagnostic
 * Body: { coursePackId, answers: [{ question_id, answer }] }
 */
export async function POST(request) {
  try {
    const { coursePackId, answers, isRetake = false } = await request.json();

    if (!coursePackId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing required parameters: coursePackId and answers array' },
        { status: 400 }
      );
    }

    console.log(`Submitting ${isRetake ? 'retake ' : ''}diagnostic for course pack ${coursePackId}`);
    console.log(`Received ${answers.length} answers`);

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

    // Grade the diagnostic and update mastery
    const gradedResult = gradeDiagnosticAndUpdateMastery(coursePack, answers, isRetake);

    // Generate learning modules only if this is NOT a retake
    let withLearningModules;
    if (isRetake) {
      // For retakes, just update the mastery scores without generating new modules
      withLearningModules = gradedResult;
      withLearningModules.topic_session.state = 'completed';
      withLearningModules.topic_session.completion.status = 'completed';
      withLearningModules.topic_session.completion.completed_at = new Date().toISOString();
    } else {
      // For initial diagnostic, generate learning modules
      withLearningModules = await generateLearningModules(
        gradedResult, 
        coursePackId
      );
    }

    // Update the course pack in Supabase
    const updatedCoursePacks = coursePackData.course_packs.map(pack => {
      if (pack.course_pack_id === coursePackId) {
        return withLearningModules;
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

    const score = withLearningModules.topic_session.diagnostic.submission.score;
    const weakSubskills = withLearningModules.topic_session.diagnostic.submission.analysis.weak_subskills;
    const learningModules = withLearningModules.topic_session.learning_session.active_modules;

    console.log(`Diagnostic graded: ${score.num_correct}/${score.num_total} (${Math.round(score.percent * 100)}%)`);
    console.log(`Weak subskills identified: ${weakSubskills.length}`);
    console.log(`Learning modules: ${isRetake ? 'N/A (retake)' : learningModules.length}`);

    return NextResponse.json({
      success: true,
      score: score,
      weakSubskills: weakSubskills,
      learningModules: learningModules,
      isRetake: isRetake,
      masteryUpdates: withLearningModules.topic_session.subskills.map(s => ({
        subskill_id: s.subskill_id,
        name: s.name,
        mastery: s.mastery
      })),
      message: isRetake 
        ? 'Diagnostic retake submitted - mastery scores updated successfully' 
        : 'Diagnostic submitted and graded successfully'
    });

  } catch (error) {
    console.error('Error in submit-diagnostic route:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Grade diagnostic answers and update subskill mastery
 */
function gradeDiagnosticAndUpdateMastery(coursePack, submittedAnswers, isRetake = false) {
  const result = { ...coursePack };
  const questions = result.topic_session.diagnostic.questions;
  
  // Store the previous mastery scores if this is a retake
  const previousMastery = isRetake 
    ? result.topic_session.subskills.reduce((acc, skill) => {
        acc[skill.subskill_id] = skill.mastery || 0;
        return acc;
      }, {})
    : {};
  
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
  const subskillCorrectCount = {}; // Track correct answers per subskill
  const subskillTotalCount = {};   // Track total questions per subskill

  // Grade each question
  for (const question of questions) {
    const qid = question.question_id;
    const expected = question.correct_answer;
    const given = answerByQuestionId[qid] || '';
    const subskillId = question.subskill_id;

    // Initialize counters for this subskill
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

  // Update mastery for each subskill based on performance
  result.topic_session.subskills = result.topic_session.subskills.map(subskill => {
    const sid = subskill.subskill_id;
    const correct = subskillCorrectCount[sid] || 0;
    const total = subskillTotalCount[sid] || 0;
    
    // Calculate mastery as percentage correct (0.0 to 1.0)
    // If no questions for this subskill, keep mastery at 0
    const currentMastery = total > 0 ? correct / total : 0;
    
    // Calculate correction score if this is a retake
    let correctionScore = 0;
    if (isRetake && previousMastery[sid] !== undefined) {
      const improvement = currentMastery - previousMastery[sid];
      correctionScore = Math.max(0, improvement); // Only positive improvements
    }

    return {
      ...subskill,
      mastery: currentMastery,
      ...(isRetake && {
        previous_mastery: previousMastery[sid],
        correction_score: correctionScore,
        improvement_percent: previousMastery[sid] !== undefined 
          ? Math.round((currentMastery - previousMastery[sid]) * 100) 
          : 0
      })
    };
  });

  // Update state based on results
  if (isRetake) {
    // For retakes, mark as completed
    result.topic_session.state = 'completed';
  } else {
    // Always go to discussion after initial diagnostic
    result.topic_session.state = 'discussion';
  }

  return result;
}

/**
 * Generate learning modules for weak subskills
 */
async function generateLearningModules(coursePack, coursePackId) {
  const result = { ...coursePack };
  const weakSubskills = result.topic_session.diagnostic.submission.analysis.weak_subskills;

  if (weakSubskills.length === 0) {
    // No weak subskills, skip to final quiz
    result.topic_session.learning_session.active_modules = [];
    result.topic_session.state = 'final';
    return result;
  }

  // Create subskill lookup
  const subskillById = {};
  result.topic_session.subskills.forEach(s => {
    subskillById[s.subskill_id] = s;
  });

  // Check if we have chunk data available for LLM generation
  const outputDir = path.join(process.cwd(), 'src', 'testPy', 'out');
  const chunksPath = path.join(outputDir, `${coursePackId}_chunks.jsonl`);
  const hasChunks = existsSync(chunksPath);

  const modules = [];

  if (hasChunks) {
    // Try LLM-based generation with actual content
    console.log('Generating learning modules with LLM...');
    try {
      const llmModules = await generateModulesWithLLM(
        coursePack, 
        chunksPath, 
        weakSubskills
      );
      modules.push(...llmModules);
    } catch (error) {
      console.warn('LLM generation failed, falling back to template:', error.message);
      // Fall back to template-based generation
      modules.push(...generateTemplateModules(weakSubskills, subskillById));
    }
  } else {
    // Use template-based generation
    console.log('Generating learning modules with templates (no chunks available)...');
    modules.push(...generateTemplateModules(weakSubskills, subskillById));
  }

  result.topic_session.learning_session.active_modules = modules;
  result.topic_session.state = 'learning_session';

  return result;
}

/**
 * Generate learning modules using templates
 */
function generateTemplateModules(weakSubskills, subskillById) {
  return weakSubskills.map(subskillId => {
    const subskill = subskillById[subskillId];
    const name = subskill.name || 'Untitled Skill';
    
    // Create more detailed template based on skill name
    const explanation = createDetailedExplanation(name);
    const workedExample = createWorkedExample(name);
    const quickCheck = createQuickCheck(name, subskillId);
    
    return {
      module_id: `learn_${subskillId}_v1`,
      subskill_id: subskillId,
      title: `Master: ${name}`,
      explanation: explanation,
      worked_example: workedExample,
      quick_check: quickCheck,
      evidence_chunk_ids: subskill.evidence_chunk_ids || [],
      completion_status: 'not_started'
    };
  });
}

/**
 * Create detailed explanation for a skill
 */
function createDetailedExplanation(skillName) {
  return `Let's review the key concepts for: ${skillName}

This skill is fundamental to understanding the material. Focus on:

1. **Core Concept**: Understand the basic principles and definitions
2. **Common Patterns**: Learn how this concept is typically used
3. **Key Details**: Pay attention to edge cases and important nuances
4. **Practical Application**: See how this applies to real problems

Review the source materials in the evidence chunks carefully. Take notes on the main points and try to explain the concept in your own words. If something is unclear, review the relevant sections again and look for concrete examples.`;
}

/**
 * Create worked example for a skill
 */
function createWorkedExample(skillName) {
  return {
    prompt: `Let's work through a practical example of ${skillName}:`,
    solution: `Step-by-step approach:

1. **Identify the Problem**: Understand what needs to be solved
2. **Apply the Concept**: Use the principles of ${skillName}
3. **Work Through Details**: Handle each component carefully
4. **Verify**: Check that your solution is correct

Review the course materials for detailed examples and practice similar problems on your own. Focus on understanding WHY each step works, not just memorizing the process.`
  };
}

/**
 * Create quick check question for a skill
 */
function createQuickCheck(skillName, subskillId) {
  return {
    question_id: `qc_${subskillId}_1`,
    type: 'mcq',
    prompt: `To demonstrate understanding of ${skillName}, you should:`,
    choices: [
      'Memorize example code without understanding',
      'Understand core concepts and practice application',
      'Skip the fundamentals and jump to advanced topics',
      'Only read theory without practicing'
    ],
    correct_answer: 'Understand core concepts and practice application'
  };
}

/**
 * Generate learning modules using LLM via Python script
 */
async function generateModulesWithLLM(coursePack, chunksPath, weakSubskills) {
  const outputDir = path.join(process.cwd(), 'src', 'testPy', 'out');
  const tempInputPath = path.join(outputDir, 'temp_topic_session_for_learning.json');
  const tempOutputPath = path.join(outputDir, 'temp_topic_session_with_learning.json');
  
  try {
    // Write the current topic session to temp file
    await fs.writeFile(tempInputPath, JSON.stringify(coursePack, null, 2));
    
    // Call Python script to generate learning modules
    const pythonScript = path.join(process.cwd(), 'src', 'testPy', 'out', 'BuildLearningModules.py');
    const command = `python3 "${pythonScript}" "${tempInputPath}" "${chunksPath}" "${tempOutputPath}"`;
    
    console.log('Calling Python LLM script for learning modules...');
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 second timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (stderr) {
      console.log('Python stderr:', stderr);
    }
    
    // Read the generated result
    const resultData = await fs.readFile(tempOutputPath, 'utf-8');
    const result = JSON.parse(resultData);
    
    // Clean up temp files
    await fs.unlink(tempInputPath).catch(() => {});
    await fs.unlink(tempOutputPath).catch(() => {});
    
    const modules = result.topic_session?.learning_session?.active_modules || [];
    console.log(`Python script generated ${modules.length} learning modules`);
    
    return modules;
    
  } catch (error) {
    console.error('Error in Python LLM generation:', error);
    
    // Clean up temp files
    await fs.unlink(tempInputPath).catch(() => {});
    await fs.unlink(tempOutputPath).catch(() => {});
    
    // Fall back to templates
    const subskillById = {};
    coursePack.topic_session.subskills.forEach(s => {
      subskillById[s.subskill_id] = s;
    });
    
    return generateTemplateModules(weakSubskills, subskillById);
  }
}
