#!/bin/bash

# Test the PDF processing pipeline
# Usage: ./test_pipeline.sh <pdf_directory> <course_name>

PDF_DIR="${1:-src/testPy/PDF}"
COURSE_NAME="${2:-Introduction to C Programming}"
OUTPUT_DIR="src/testPy/out"

echo "=========================================="
echo "Testing PDF Processing Pipeline"
echo "=========================================="
echo "PDF Directory: $PDF_DIR"
echo "Course Name: $COURSE_NAME"
echo "Output Directory: $OUTPUT_DIR"
echo ""

# Check if PDF directory exists
if [ ! -d "$PDF_DIR" ]; then
    echo "ERROR: PDF directory not found: $PDF_DIR"
    exit 1
fi

# Count PDFs
PDF_COUNT=$(find "$PDF_DIR" -name "*.pdf" | wc -l)
echo "Found $PDF_COUNT PDF files"
echo ""

# Step 1: Run plumb.py
echo "Step 1: Running plumb.py to extract chunks..."
python3 src/testPy/plumb.py "$PDF_DIR" "$COURSE_NAME" "$OUTPUT_DIR"

if [ $? -ne 0 ]; then
    echo "ERROR: plumb.py failed"
    exit 1
fi

echo ""
echo "Step 1 complete!"
echo ""

# Find the generated chunks file
CHUNKS_FILE=$(ls -t "$OUTPUT_DIR"/*_chunks.jsonl 2>/dev/null | head -1)

if [ -z "$CHUNKS_FILE" ]; then
    echo "ERROR: No chunks file found in $OUTPUT_DIR"
    exit 1
fi

COURSE_PACK_ID=$(basename "$CHUNKS_FILE" _chunks.jsonl)
echo "Course Pack ID: $COURSE_PACK_ID"
echo "Chunks file: $CHUNKS_FILE"

# Count chunks
CHUNK_COUNT=$(wc -l < "$CHUNKS_FILE")
echo "Generated $CHUNK_COUNT chunks"
echo ""

# Step 2: Run FinalTopicGen.py
echo "Step 2: Running FinalTopicGen.py to generate roadmap..."
cd "$OUTPUT_DIR" && python3 FinalTopicGen.py "$(basename $CHUNKS_FILE)" "$COURSE_NAME" "." --with-diagnostic

if [ $? -ne 0 ]; then
    echo "WARNING: FinalTopicGen.py failed (may need vLLM running)"
    echo "Checking for basic topic session file..."
fi

cd - > /dev/null

# Check for generated files
TOPIC_SESSION_FILE="$OUTPUT_DIR/${COURSE_PACK_ID}_topic_session.json"
TOPIC_SESSION_DIAG_FILE="$OUTPUT_DIR/${COURSE_PACK_ID}_topic_session_with_diag.json"
TOPIC_SPACES_FILE="$OUTPUT_DIR/${COURSE_PACK_ID}_topic_spaces.json"

echo ""
echo "=========================================="
echo "Generated Files:"
echo "=========================================="

if [ -f "$CHUNKS_FILE" ]; then
    echo "✓ Chunks: $CHUNKS_FILE ($CHUNK_COUNT lines)"
fi

if [ -f "$TOPIC_SPACES_FILE" ]; then
    echo "✓ Topic Spaces: $TOPIC_SPACES_FILE"
    TOPIC_COUNT=$(jq '.topic_spaces | length' "$TOPIC_SPACES_FILE" 2>/dev/null)
    echo "  Topics: $TOPIC_COUNT"
fi

if [ -f "$TOPIC_SESSION_DIAG_FILE" ]; then
    echo "✓ Topic Session (with diagnostic): $TOPIC_SESSION_DIAG_FILE"
    SUBSKILL_COUNT=$(jq '.topic_session.subskills | length' "$TOPIC_SESSION_DIAG_FILE" 2>/dev/null)
    DIAG_Q_COUNT=$(jq '.topic_session.diagnostic.questions | length' "$TOPIC_SESSION_DIAG_FILE" 2>/dev/null)
    echo "  Subskills: $SUBSKILL_COUNT"
    echo "  Diagnostic Questions: $DIAG_Q_COUNT"
elif [ -f "$TOPIC_SESSION_FILE" ]; then
    echo "✓ Topic Session (basic): $TOPIC_SESSION_FILE"
    SUBSKILL_COUNT=$(jq '.topic_session.subskills | length' "$TOPIC_SESSION_FILE" 2>/dev/null)
    echo "  Subskills: $SUBSKILL_COUNT"
else
    echo "✗ No topic session file found"
fi

echo ""
echo "=========================================="
echo "Pipeline test complete!"
echo "=========================================="
