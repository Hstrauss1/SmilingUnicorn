import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const { coursePackId, topicSessionFile, chunksFile } = await request.json();

    if (!coursePackId || !topicSessionFile || !chunksFile) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const outputDir = path.join(process.cwd(), 'src', 'testPy', 'out');
    const topicPath = path.join(outputDir, topicSessionFile);
    const chunksPath = path.join(outputDir, chunksFile);
    const pythonScript = path.join(process.cwd(), 'src', 'testPy', 'generate_diagnostic.py');

    // Verify files exist
    if (!existsSync(topicPath)) {
      return NextResponse.json(
        { error: `Topic session file not found: ${topicSessionFile}` },
        { status: 404 }
      );
    }

    if (!existsSync(chunksPath)) {
      return NextResponse.json(
        { error: `Chunks file not found: ${chunksFile}` },
        { status: 404 }
      );
    }

    console.log('Generating diagnostic quiz...');
    console.log('Topic file:', topicPath);
    console.log('Chunks file:', chunksPath);

    // Execute Python script to generate diagnostic
    const { stdout, stderr } = await execAsync(
      `python3 "${pythonScript}" "${topicPath}" "${chunksPath}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    console.log('Python output:', stdout);
    if (stderr) {
      console.error('Python stderr:', stderr);
    }

    // Parse output to get the updated file path
    const lines = stdout.split('\n');
    let updatedFile = '';
    
    for (const line of lines) {
      if (line.includes('Updated topic session:')) {
        updatedFile = line.split(':')[1].trim();
        break;
      }
    }

    if (!updatedFile) {
      throw new Error('Failed to parse Python script output');
    }

    // Read the updated topic session
    const fs = require('fs');
    const updatedPath = path.join(outputDir, path.basename(updatedFile));
    
    if (!existsSync(updatedPath)) {
      throw new Error(`Updated file not found: ${updatedPath}`);
    }

    const updatedContent = fs.readFileSync(updatedPath, 'utf-8');
    const updatedSession = JSON.parse(updatedContent);

    return NextResponse.json({
      success: true,
      topicSession: updatedSession,
      updatedFile: path.basename(updatedFile)
    });

  } catch (error) {
    console.error('Error generating diagnostic:', error);
    return NextResponse.json(
      { error: 'Failed to generate diagnostic: ' + error.message },
      { status: 500 }
    );
  }
}
