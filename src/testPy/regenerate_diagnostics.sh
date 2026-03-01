#!/bin/bash

# Diagnostic Quiz Regeneration Script
# This script regenerates all diagnostic quizzes using the Python state machine

echo "🧠 SmilingUnicorn - Diagnostic Quiz Generator"
echo "=============================================="
echo ""

# Change to the testPy directory
cd "$(dirname "$0")"

# Check if stateTest.py exists
if [ ! -f "out/stateTest.py" ]; then
    echo "❌ Error: stateTest.py not found in out/ directory"
    exit 1
fi

# Check if there are topic session files
TOPIC_FILES=$(ls out/course_*_topic_session.json 2>/dev/null | wc -l)
if [ "$TOPIC_FILES" -eq 0 ]; then
    echo "❌ Error: No topic session files found"
    echo "   Please run plumb.py first to process PDFs"
    exit 1
fi

echo "Found $TOPIC_FILES topic session file(s)"
echo ""

# Check if vLLM is running (optional)
if curl -s http://localhost:8000/v1/models > /dev/null 2>&1; then
    echo "✅ vLLM server is running - will use AI-powered generation"
    VLLM_STATUS="available"
else
    echo "⚠️  vLLM server not detected - will use enhanced mock generation"
    echo "   (To use AI generation, start vLLM server on port 8000)"
    VLLM_STATUS="unavailable"
fi

echo ""
echo "Starting diagnostic generation..."
echo "================================="
echo ""

# Run the diagnostic generation script
python3 generate_all_diagnostics.py

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "================================="
    echo "✅ Diagnostic generation complete!"
    echo ""
    echo "Generated files are in: out/"
    echo "  - course_*_topic_session_with_diagnostic.json"
    echo ""
    
    # Count generated files
    DIAG_FILES=$(ls out/course_*_topic_session_with_diagnostic.json 2>/dev/null | wc -l)
    echo "Total diagnostic files: $DIAG_FILES"
    echo ""
    
    if [ "$VLLM_STATUS" = "available" ]; then
        echo "Questions generated using: AI-powered (vLLM)"
    else
        echo "Questions generated using: Enhanced mock generation"
        echo ""
        echo "💡 Tip: For better question quality, start vLLM server:"
        echo "   python -m vllm.entrypoints.openai.api_server \\"
        echo "     --model Qwen/Qwen2.5-32B-Instruct --port 8000"
    fi
    echo ""
    echo "Next steps:"
    echo "  1. Start the Next.js dev server: npm run dev"
    echo "  2. Navigate to /dashboard to see your course packs"
    echo "  3. Click on a topic to take the diagnostic quiz"
else
    echo ""
    echo "================================="
    echo "❌ Diagnostic generation failed with exit code: $EXIT_CODE"
    echo "   Check the error messages above for details"
    exit $EXIT_CODE
fi
