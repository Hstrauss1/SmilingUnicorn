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
    const outputDir = path.join(process.cwd(), 'src', 'testPy', 'out');
    
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    console.log('Running Python script:', pythonScript);
    console.log('Input directory:', tempDir);
    console.log('Output directory:', outputDir);
    console.log('Course name:', courseName);

    // Execute Python script with output directory parameter
    const { stdout, stderr } = await execAsync(
      `python3 "${pythonScript}" "${tempDir}" "${courseName}" "${outputDir}"`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for large outputs
    );

    console.log('Python script output:', stdout);
    if (stderr) {
      console.error('Python script stderr:', stderr);
    }

    // Parse the output to get the generated file names
    const lines = stdout.split('\n');
    let chunksFile = '';
    let sessionFile = '';
    
    for (const line of lines) {
      if (line.includes('_chunks.jsonl')) {
        const parts = line.split(':');
        if (parts.length > 1) {
          chunksFile = parts[1].trim();
        }
      } else if (line.includes('_topic_session.json')) {
        const parts = line.split(':');
        if (parts.length > 1) {
          sessionFile = parts[1].trim();
        }
      }
    }

    if (!chunksFile || !sessionFile) {
      throw new Error('Failed to parse Python script output. Expected file paths not found.');
    }

    // Read the generated JSON files
    const fs = require('fs');
    const chunksPath = path.join(outputDir, path.basename(chunksFile));
    const sessionPath = path.join(outputDir, path.basename(sessionFile));

    let chunksData = [];
    let sessionData = null;

    if (existsSync(chunksPath)) {
      const chunksContent = fs.readFileSync(chunksPath, 'utf-8');
      chunksData = chunksContent.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } else {
      throw new Error(`Chunks file not found: ${chunksPath}`);
    }

    if (existsSync(sessionPath)) {
      const sessionContent = fs.readFileSync(sessionPath, 'utf-8');
      sessionData = JSON.parse(sessionContent);
    } else {
      throw new Error(`Session file not found: ${sessionPath}`);
    }

    return NextResponse.json({
      success: true,
      chunks: chunksData,
      session: sessionData,
      chunksFile: path.basename(chunksFile),
      sessionFile: path.basename(sessionFile)
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
