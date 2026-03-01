import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';
import { createClient } from '@/lib/supabase/server';

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const { coursePackId, topicId } = await request.json();

    if (!coursePackId || !topicId) {
      return NextResponse.json(
        { error: 'Missing required parameters: coursePackId and topicId' },
        { status: 400 }
      );
    }

    console.log(`Building diagnostic for topic ${topicId} in course pack ${coursePackId}`);

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

    // Check if diagnostic already exists
    if (coursePack.topic_session.diagnostic?.questions?.length > 0) {
      console.log('Diagnostic already exists, returning existing data');
      return NextResponse.json({
        success: true,
        diagnostic: coursePack.topic_session.diagnostic,
        message: 'Diagnostic already exists'
      });
    }

    // Create temporary files for the Python script
    const tempDir = path.join(process.cwd(), 'temp', `diagnostic_${Date.now()}`);
    const fs = require('fs');
    await fs.promises.mkdir(tempDir, { recursive: true });

    const topicSessionPath = path.join(tempDir, 'topic_session.json');
    const chunksPath = path.join(tempDir, 'chunks.jsonl');

    // Write topic session to temp file
    await fs.promises.writeFile(
      topicSessionPath,
      JSON.stringify(coursePack, null, 2),
      'utf-8'
    );

    // Create a mock chunks file (in production, you'd have the actual chunks)
    // For now, we'll use mock data or check if chunks exist
    const outputDir = path.join(process.cwd(), 'src', 'testPy', 'out');
    const actualChunksPath = path.join(outputDir, `${coursePackId}_chunks.jsonl`);
    
    if (existsSync(actualChunksPath)) {
      // Copy existing chunks
      await fs.promises.copyFile(actualChunksPath, chunksPath);
      console.log('Using existing chunks file');
    } else {
      // Create empty chunks file as fallback
      await fs.promises.writeFile(chunksPath, '', 'utf-8');
      console.log('No chunks file found, using mock generation');
    }

    // Execute Python script to generate diagnostic
    const pythonScript = path.join(process.cwd(), 'src', 'testPy', 'generate_diagnostic.py');
    const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python3');
    const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';

    console.log('Running diagnostic generation...');
    console.log('Python command:', pythonCmd);
    console.log('Topic session path:', topicSessionPath);
    console.log('Chunks path:', chunksPath);

    let stdout, stderr;
    try {
      const result = await execAsync(
        `"${pythonCmd}" "${pythonScript}" "${topicSessionPath}" "${chunksPath}"`,
        { 
          maxBuffer: 10 * 1024 * 1024,
          timeout: 60000 // 60 second timeout
        }
      );
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      console.error('Python script execution error:', error);
      // Clean up temp files
      await fs.promises.rm(tempDir, { recursive: true, force: true });
      
      return NextResponse.json(
        { error: `Failed to generate diagnostic: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Python output:', stdout);
    if (stderr) {
      console.warn('Python stderr:', stderr);
    }

    // Read the generated diagnostic from the output file
    const outputPath = topicSessionPath.replace('.json', '_with_diagnostic.json');
    
    if (!existsSync(outputPath)) {
      // Clean up temp files
      await fs.promises.rm(tempDir, { recursive: true, force: true });
      
      return NextResponse.json(
        { error: 'Diagnostic generation failed - output file not found' },
        { status: 500 }
      );
    }

    const updatedContent = await fs.promises.readFile(outputPath, 'utf-8');
    const updatedSession = JSON.parse(updatedContent);

    // Update the course pack in Supabase with the new diagnostic
    const updatedCoursePacks = coursePackData.course_packs.map(pack => {
      if (pack.course_pack_id === coursePackId) {
        return updatedSession;
      }
      return pack;
    });

    const { error: updateError } = await supabase
      .from('course_packs')
      .update({
        course_packs: updatedCoursePacks
      })
      .eq('user_id', user.id);

    // Clean up temp files
    await fs.promises.rm(tempDir, { recursive: true, force: true });

    if (updateError) {
      console.error('Error updating Supabase:', updateError);
      return NextResponse.json(
        { error: 'Failed to save diagnostic to database' },
        { status: 500 }
      );
    }

    const numQuestions = updatedSession.topic_session.diagnostic?.questions?.length || 0;
    console.log(`Successfully generated ${numQuestions} diagnostic questions`);

    return NextResponse.json({
      success: true,
      diagnostic: updatedSession.topic_session.diagnostic,
      questionsGenerated: numQuestions,
      message: 'Diagnostic generated successfully'
    });

  } catch (error) {
    console.error('Error in build-diagnostic route:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
