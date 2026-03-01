import { NextResponse } from 'next/server';
import { writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request) {
  let tempDir = null;
  
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');
    const courseName = formData.get('courseName');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (!courseName) {
      return NextResponse.json(
        { error: 'No course name provided' },
        { status: 400 }
      );
    }

    // Create temporary directory for PDFs
    tempDir = path.join(process.cwd(), 'temp', `upload_${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Save uploaded PDFs to temp directory
    const pdfPaths = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filePath = path.join(tempDir, file.name);
      await writeFile(filePath, buffer);
      pdfPaths.push(filePath);
    }

    // Run the Python script to process PDFs
    const pythonScript = path.join(process.cwd(), 'src', 'testPy', 'plumb.py');
    const finalTopicGenScript = path.join(process.cwd(), 'src', 'testPy', 'out', 'FinalTopicGen.py');
    const outputDir = path.join(process.cwd(), 'src', 'testPy', 'out');
    const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python3');
    
    // Check if venv python exists, otherwise use system python3
    const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';
    
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    console.log('Step 1: Running plumb.py to extract PDF chunks...');
    console.log('Input directory:', tempDir);
    console.log('Output directory:', outputDir);
    console.log('Course name:', courseName);
    console.log('Python command:', pythonCmd);

    // Step 1: Execute plumb.py to create chunks
    let plumbStdout, plumbStderr;
    try {
      const plumbResult = await execAsync(
        `"${pythonCmd}" "${pythonScript}" "${tempDir}" "${courseName}" "${outputDir}"`,
        { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for large outputs
      );
      plumbStdout = plumbResult.stdout;
      plumbStderr = plumbResult.stderr;
    } catch (error) {
      console.error('Error executing plumb.py:', error);
      throw new Error(`Failed to extract PDF chunks: ${error.message}`);
    }

    console.log('Plumb.py output:', plumbStdout);
    if (plumbStderr) {
      console.error('Plumb.py stderr:', plumbStderr);
    }

    // Parse the output to get the generated file names
    const lines = plumbStdout.split('\n');
    let chunksFile = '';
    let coursePackId = '';
    
    for (const line of lines) {
      if (line.includes('CHUNKS_FILE:')) {
        const match = line.match(/CHUNKS_FILE:\s*(.+)/);
        if (match) {
          chunksFile = path.basename(match[1].trim());
        }
      }
      if (line.includes('COURSE_PACK_ID:')) {
        const match = line.match(/COURSE_PACK_ID:\s*(.+)/);
        if (match) {
          coursePackId = match[1].trim();
        }
      }
    }

    // Fallback: parse from output if structured output not found
    if (!chunksFile || !coursePackId) {
      for (const line of lines) {
        if (line.includes('_chunks.jsonl')) {
          const match = line.match(/course_[a-f0-9]+_chunks\.jsonl/);
          if (match) {
            chunksFile = match[0];
            coursePackId = chunksFile.split('_chunks.jsonl')[0];
          }
        }
      }
    }

    if (!chunksFile || !coursePackId) {
      throw new Error('Failed to parse plumb.py output. Expected chunks file not found.');
    }

    const chunksPath = path.join(outputDir, chunksFile);
    
    if (!existsSync(chunksPath)) {
      throw new Error(`Chunks file not found: ${chunksPath}`);
    }

    console.log('Step 2: Running FinalTopicGen.py to generate roadmap...');
    console.log('Chunks file:', chunksFile);
    
    // Step 2: Execute FinalTopicGen.py to create full roadmap with topics and subskills
    // Usage: python build_topic_session.py <chunks_jsonl_path> <course_title> <out_dir> [--with-diagnostic]
    let topicGenStdout, topicGenStderr;
    try {
      const topicGenResult = await execAsync(
        `cd "${outputDir}" && "${pythonCmd}" FinalTopicGen.py "${chunksFile}" "${courseName}" "." --with-diagnostic`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      topicGenStdout = topicGenResult.stdout;
      topicGenStderr = topicGenResult.stderr;
    } catch (error) {
      console.error('Error executing FinalTopicGen.py:', error);
      // FinalTopicGen might fail if vLLM is not running, but we can still use basic chunks
      console.log('Falling back to basic topic session without AI-generated content');
      topicGenStdout = '';
      topicGenStderr = error.message;
    }

    console.log('FinalTopicGen.py output:', topicGenStdout);
    if (topicGenStderr) {
      console.error('FinalTopicGen.py stderr:', topicGenStderr);
    }

    // Parse output to find the diagnostic file
    const topicLines = topicGenStdout.split('\n');
    let finalTopicFile = '';
    
    for (const line of topicLines) {
      if (line.includes('DIAGNOSTIC_FILE:') || line.includes('SESSION_FILE:')) {
        const match = line.match(/(DIAGNOSTIC_FILE|SESSION_FILE):\s*(.+)/);
        if (match) {
          finalTopicFile = path.basename(match[2].trim());
        }
      }
    }
    
    // The output should be course_*_topic_session.json (or _topic_session_with_diag.json if diagnostic was generated)
    if (!finalTopicFile) {
      // Try both with and without diagnostic suffix
      const diagFile = `${coursePackId}_topic_session_with_diag.json`;
      const basicFile = `${coursePackId}_topic_session.json`;
      
      if (existsSync(path.join(outputDir, diagFile))) {
        finalTopicFile = diagFile;
      } else if (existsSync(path.join(outputDir, basicFile))) {
        finalTopicFile = basicFile;
      } else {
        throw new Error(`No topic session file found. Expected ${diagFile} or ${basicFile}`);
      }
    }
    
    let finalTopicPath = path.join(outputDir, finalTopicFile);
    
    if (!existsSync(finalTopicPath)) {
      throw new Error(`Final topic file not found: ${finalTopicPath}`);
    }

    // Read the generated JSON files
    const fs = require('fs');
    
    let chunksData = [];
    if (existsSync(chunksPath)) {
      const chunksContent = fs.readFileSync(chunksPath, 'utf-8');
      chunksData = chunksContent.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
      console.log(`Loaded ${chunksData.length} chunks from ${chunksPath}`);
    } else {
      throw new Error(`Chunks file not found: ${chunksPath}`);
    }

    let roadmapData = null;
    if (existsSync(finalTopicPath)) {
      const roadmapContent = fs.readFileSync(finalTopicPath, 'utf-8');
      roadmapData = JSON.parse(roadmapContent);
      console.log('Loaded roadmap data from:', finalTopicPath);
      console.log('Roadmap structure:', {
        hasCoursePackId: !!roadmapData.course_pack_id,
        hasTopicSession: !!roadmapData.topic_session,
        topicTitle: roadmapData?.topic_session?.title,
        subskillCount: roadmapData?.topic_session?.subskills?.length || 0,
        diagnosticQuestions: roadmapData?.topic_session?.diagnostic?.questions?.length || 0
      });
    } else {
      throw new Error(`Roadmap file not found: ${finalTopicPath}`);
    }

    console.log('Step 3: Storing in Supabase...');

    // Step 3: Store in Supabase
    const { createClient: createSupabaseClient } = await import('@/lib/supabase/server');
    const supabase = await createSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('User not authenticated: ' + (authError?.message || 'No user found'));
    }

    console.log('Authenticated user:', user.id);

    // Validate roadmap data structure
    if (!roadmapData || !roadmapData.topic_session) {
      throw new Error('Invalid roadmap data structure: missing topic_session');
    }

    // Create course pack object to add to the array
    const newCoursePack = {
      course_pack_id: coursePackId,
      title: courseName,
      document_name: files.map(f => f.name).join(', '),
      progress: 0,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      ...roadmapData  // This includes course_pack_id and topic_session
    };

    // Get or create user's course_packs row
    const { data: existingRow, error: fetchError } = await supabase
      .from('course_packs')
      .select('id, course_packs')
      .eq('user_id', user.id)
      .single();

    let userRowId;
    let updatedCoursePacks;

    if (fetchError && fetchError.code === 'PGRST116') {
      // Row doesn't exist, create it with first course pack
      console.log('Creating new user row with first course pack');
      const { data: newRow, error: insertError } = await supabase
        .from('course_packs')
        .insert({
          user_id: user.id,
          course_packs: [newCoursePack]
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(`Failed to create user row: ${insertError.message}`);
      }

      userRowId = newRow.id;
      updatedCoursePacks = newRow.course_packs;
      console.log('Created new user row:', userRowId);
    } else if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      throw new Error(`Failed to fetch user row: ${fetchError.message}`);
    } else {
      // Row exists, append new course pack to array
      console.log('Appending to existing user row:', existingRow.id);
      const currentPacks = existingRow.course_packs || [];
      
      // Check if course pack with same ID already exists and update it, otherwise append
      const existingIndex = currentPacks.findIndex(p => p.course_pack_id === coursePackId);
      if (existingIndex >= 0) {
        console.log('Updating existing course pack:', coursePackId);
        currentPacks[existingIndex] = newCoursePack;
        updatedCoursePacks = currentPacks;
      } else {
        console.log('Appending new course pack:', coursePackId);
        updatedCoursePacks = [...currentPacks, newCoursePack];
      }

      const { data: updatedRow, error: updateError } = await supabase
        .from('course_packs')
        .update({
          course_packs: updatedCoursePacks,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRow.id)
        .select()
        .single();

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw new Error(`Failed to update course packs: ${updateError.message}`);
      }

      userRowId = updatedRow.id;
      console.log('Updated user row:', userRowId);
    }

    // Extract counts from the roadmap data
    const subskillsCount = roadmapData?.topic_session?.subskills?.length || 0;
    const diagnosticQuestionsCount = roadmapData?.topic_session?.diagnostic?.questions?.length || 0;
    const learningModulesCount = roadmapData?.topic_session?.learning_session?.active_modules?.length || 0;

    console.log('Successfully processed and stored course pack');
    console.log(`- Course Pack ID: ${coursePackId}`);
    console.log(`- User Row ID: ${userRowId}`);
    console.log(`- Total Course Packs: ${updatedCoursePacks.length}`);
    console.log(`- Chunks: ${chunksData.length}`);
    console.log(`- Subskills: ${subskillsCount}`);
    console.log(`- Diagnostic Questions: ${diagnosticQuestionsCount}`);
    console.log(`- Learning Modules: ${learningModulesCount}`);

    return NextResponse.json({
      success: true,
      coursePackId: coursePackId,
      userRowId: userRowId,
      totalCoursePacks: updatedCoursePacks.length,
      message: 'Successfully processed and stored in database',
      stats: {
        chunksCount: chunksData.length,
        subskillsCount: subskillsCount,
        diagnosticQuestionsCount: diagnosticQuestionsCount,
        learningModulesCount: learningModulesCount,
        topicTitle: roadmapData?.topic_session?.title || courseName
      }
    });

  } catch (error) {
    console.error('Error processing PDFs:', error);
    return NextResponse.json(
      { error: 'Failed to process PDFs: ' + error.message },
      { status: 500 }
    );
  } finally {
    // Clean up temp directory
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Error cleaning up temp directory:', cleanupError);
      }
    }
  }
}
