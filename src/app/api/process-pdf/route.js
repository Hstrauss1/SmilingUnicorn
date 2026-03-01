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
    
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    console.log('Step 1: Running plumb.py to extract PDF chunks...');
    console.log('Input directory:', tempDir);
    console.log('Output directory:', outputDir);
    console.log('Course name:', courseName);

    // Step 1: Execute plumb.py to create chunks
    const { stdout: plumbStdout, stderr: plumbStderr } = await execAsync(
      `python3 "${pythonScript}" "${tempDir}" "${courseName}" "${outputDir}"`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for large outputs
    );

    console.log('Plumb.py output:', plumbStdout);
    if (plumbStderr) {
      console.error('Plumb.py stderr:', plumbStderr);
    }

    // Parse the output to get the generated file names
    const lines = plumbStdout.split('\n');
    let chunksFile = '';
    let coursePackId = '';
    
    for (const line of lines) {
      if (line.includes('_chunks.jsonl')) {
        const match = line.match(/course_[a-f0-9]+_chunks\.jsonl/);
        if (match) {
          chunksFile = match[0];
          coursePackId = chunksFile.split('_chunks.jsonl')[0];
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
    
    // Step 2: Execute FinalTopicGen.py to create full roadmap with topics and subskills
    // Usage: python build_topic_session.py <chunks_jsonl_path> <course_title> <out_dir> [--with-diagnostic]
    const { stdout: topicGenStdout, stderr: topicGenStderr } = await execAsync(
      `cd "${outputDir}" && python3 FinalTopicGen.py "${chunksFile}" "${courseName}" "." --with-diagnostic`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    console.log('FinalTopicGen.py output:', topicGenStdout);
    if (topicGenStderr) {
      console.error('FinalTopicGen.py stderr:', topicGenStderr);
    }

    // The output should be course_*_topic_session.json (or _topic_session_with_diag.json if diagnostic was generated)
    let finalTopicFile = `${coursePackId}_topic_session_with_diag.json`;
    let finalTopicPath = path.join(outputDir, finalTopicFile);
    
    // Fallback to non-diagnostic version if with-diagnostic failed
    if (!existsSync(finalTopicPath)) {
      finalTopicFile = `${coursePackId}_topic_session.json`;
      finalTopicPath = path.join(outputDir, finalTopicFile);
    }

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
    }

    let roadmapData = null;
    if (existsSync(finalTopicPath)) {
      const roadmapContent = fs.readFileSync(finalTopicPath, 'utf-8');
      roadmapData = JSON.parse(roadmapContent);
    } else {
      throw new Error(`Roadmap file not found: ${finalTopicPath}`);
    }

    console.log('Step 3: Storing in Supabase...');

    // Step 3: Store in Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for server-side
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user's session from cookies
    const { cookies } = require('next/headers');
    const cookieStore = cookies();
    const authToken = cookieStore.get('sb-access-token')?.value;
    
    if (!authToken) {
      throw new Error('User not authenticated - no auth token found');
    }

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('User not authenticated: ' + (authError?.message || 'No user found'));
    }

    console.log('Authenticated user:', user.id);

    // Check if course pack already exists for this user
    const { data: existingPack } = await supabase
      .from('course_packs')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_pack_id', coursePackId)
      .single();

    let insertedCoursePack;

    if (existingPack) {
      // Update existing course pack
      const { data: updatedPack, error: updateError } = await supabase
        .from('course_packs')
        .update({
          title: courseName,
          document_name: files.map(f => f.name).join(', '),
          roadmap_json: roadmapData,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPack.id)
        .select()
        .single();

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw new Error(`Failed to update in Supabase: ${updateError.message}`);
      }

      insertedCoursePack = updatedPack;
      console.log('Updated existing course pack in Supabase:', insertedCoursePack.id);
    } else {
      // Insert new course pack
      const { data: newPack, error: insertError } = await supabase
        .from('course_packs')
        .insert({
          user_id: user.id,
          course_pack_id: coursePackId,
          title: courseName,
          document_name: files.map(f => f.name).join(', '),
          roadmap_json: roadmapData,
          status: 'in_progress',
          progress: 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(`Failed to store in Supabase: ${insertError.message}`);
      }

      insertedCoursePack = newPack;
      console.log('Inserted new course pack in Supabase:', insertedCoursePack.id);
    }

    // Extract counts from the roadmap data
    const subskillsCount = roadmapData?.topic_session?.subskills?.length || 0;
    const diagnosticQuestionsCount = roadmapData?.topic_session?.diagnostic?.questions?.length || 0;
    const learningModulesCount = roadmapData?.topic_session?.learning_session?.active_modules?.length || 0;

    return NextResponse.json({
      success: true,
      coursePackId: coursePackId,
      coursePack: insertedCoursePack,
      roadmap: roadmapData,
      stats: {
        chunksCount: chunksData.length,
        subskillsCount: subskillsCount,
        diagnosticQuestionsCount: diagnosticQuestionsCount,
        learningModulesCount: learningModulesCount
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
