#!/usr/bin/env node

/**
 * Diagnostic script to check the system setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('System Diagnostic Check');
console.log('========================================\n');

// Check Node.js version
console.log('1. Node.js version:');
try {
  const nodeVersion = process.version;
  console.log(`   ✓ ${nodeVersion}\n`);
} catch (e) {
  console.log(`   ✗ Error: ${e.message}\n`);
}

// Check Python version
console.log('2. Python version:');
try {
  const pythonVersion = execSync('python3 --version', { encoding: 'utf-8' }).trim();
  console.log(`   ✓ ${pythonVersion}\n`);
} catch (e) {
  console.log(`   ✗ Python3 not found\n`);
}

// Check required Python packages
console.log('3. Python packages:');
const requiredPackages = ['pdfplumber', 'openai'];
for (const pkg of requiredPackages) {
  try {
    execSync(`python3 -c "import ${pkg}"`, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`   ✓ ${pkg}`);
  } catch (e) {
    console.log(`   ✗ ${pkg} - NOT INSTALLED`);
  }
}
console.log('');

// Check directory structure
console.log('4. Directory structure:');
const dirs = [
  'src/testPy',
  'src/testPy/out',
  'src/testPy/PDF',
  'temp'
];

for (const dir of dirs) {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✓ ${dir}`);
  } else {
    console.log(`   ✗ ${dir} - MISSING`);
  }
}
console.log('');

// Check for key Python scripts
console.log('5. Python scripts:');
const scripts = [
  'src/testPy/plumb.py',
  'src/testPy/out/FinalTopicGen.py'
];

for (const script of scripts) {
  const fullPath = path.join(process.cwd(), script);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✓ ${script}`);
  } else {
    console.log(`   ✗ ${script} - MISSING`);
  }
}
console.log('');

// Check for PDF files
console.log('6. Test PDF files:');
const pdfDir = path.join(process.cwd(), 'src/testPy/PDF');
if (fs.existsSync(pdfDir)) {
  const pdfFiles = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));
  console.log(`   ✓ Found ${pdfFiles.length} PDF files`);
  pdfFiles.slice(0, 3).forEach(f => console.log(`     - ${f}`));
  if (pdfFiles.length > 3) {
    console.log(`     ... and ${pdfFiles.length - 3} more`);
  }
} else {
  console.log('   ✗ PDF directory not found');
}
console.log('');

// Check environment variables
console.log('7. Environment variables:');
const envVars = ['VLLM_BASE_URL', 'VLLM_MODEL', 'OPENAI_API_KEY'];
for (const envVar of envVars) {
  if (process.env[envVar]) {
    console.log(`   ✓ ${envVar} (set)`);
  } else {
    console.log(`   ℹ ${envVar} (not set - will use defaults)`);
  }
}
console.log('');

// Check output directory contents
console.log('8. Generated files in output directory:');
const outDir = path.join(process.cwd(), 'src/testPy/out');
if (fs.existsSync(outDir)) {
  const files = fs.readdirSync(outDir);
  const jsonlFiles = files.filter(f => f.endsWith('_chunks.jsonl'));
  const sessionFiles = files.filter(f => f.includes('_topic_session'));
  const spaceFiles = files.filter(f => f.includes('_topic_spaces'));
  
  console.log(`   Chunks files: ${jsonlFiles.length}`);
  console.log(`   Session files: ${sessionFiles.length}`);
  console.log(`   Space files: ${spaceFiles.length}`);
  
  if (sessionFiles.length > 0) {
    console.log(`   Latest session: ${sessionFiles[sessionFiles.length - 1]}`);
  }
} else {
  console.log('   ✗ Output directory not found');
}
console.log('');

console.log('========================================');
console.log('Diagnostic check complete!');
console.log('========================================');
