#!/usr/bin/env python3
"""
Generate diagnostic quizzes for all available topic sessions.
This script processes all course pack topic sessions in the out/ directory.
"""

import json
import os
import sys
import glob

# Add the parent directory to the path to import stateTest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'out'))

def build_mock_diagnostic_quiz(topic_session, questions_per_subskill=2):
    """
    Build a diagnostic quiz without requiring vLLM.
    Uses the state machine's build_diagnostic_quiz function with better question generation.
    """
    from copy import deepcopy
    
    ts = deepcopy(topic_session)
    subskills = ts.get('topic_session', {}).get('subskills', [])
    
    if not subskills:
        print("  WARNING: No subskills found, skipping diagnostic generation")
        return ts
    
    questions_out = []
    q_index = 1
    
    # Generate more meaningful questions based on subskill names
    for s in subskills:
        subskill_name = s['name']
        subskill_id = s['subskill_id']
        
        for i in range(questions_per_subskill):
            # Create contextual question prompts based on subskill
            if 'pointer' in subskill_name.lower():
                prompt = f"What is the key concept behind: {subskill_name}?"
                choices = [
                    "Understanding memory addresses and indirection",
                    "Using loops and conditionals",
                    "Declaring basic variables",
                    "Printing output to console"
                ]
                correct = "Understanding memory addresses and indirection"
            elif 'array' in subskill_name.lower():
                prompt = f"Which statement correctly describes: {subskill_name}?"
                choices = [
                    "Arrays store multiple values of the same type in contiguous memory",
                    "Arrays can hold different data types",
                    "Arrays are the same as pointers",
                    "Arrays don't need size specification"
                ]
                correct = "Arrays store multiple values of the same type in contiguous memory"
            elif 'string' in subskill_name.lower():
                prompt = f"How does C handle: {subskill_name}?"
                choices = [
                    "Strings are null-terminated character arrays",
                    "Strings are a primitive data type",
                    "Strings don't need memory allocation",
                    "Strings can't be modified"
                ]
                correct = "Strings are null-terminated character arrays"
            else:
                # Generic question format
                prompt = f"Demonstrate understanding of: {subskill_name}"
                choices = [
                    f"Correct application of {subskill_name}",
                    "Partially related concept",
                    "Common misconception",
                    "Unrelated concept"
                ]
                correct = f"Correct application of {subskill_name}"
            
            questions_out.append({
                "question_id": f"d{q_index}",
                "subskill_id": subskill_id,
                "type": "mcq",
                "difficulty": 1 + (i % 3),  # Vary difficulty 1-3
                "prompt": prompt,
                "choices": choices,
                "correct_answer": correct,
                "rubric": [
                    f"Understanding of {subskill_name}",
                    "Application of concept in problem-solving"
                ],
            })
            q_index += 1
    
    ts["topic_session"]["diagnostic"] = {
        "quiz_id": "diag_v1",
        "questions": questions_out,
        "submission": {
            "answers": [],
            "score": {"num_correct": 0, "num_total": len(questions_out), "percent": 0.0},
            "analysis": {"per_question": [], "weak_subskills": [], "suspected_prereq_topics": []},
        },
    }
    
    ts["topic_session"]["state"] = "diagnostic"
    return ts

def generate_diagnostic_for_file(topic_session_path, chunks_path):
    """
    Generate diagnostic quiz for a single topic session file.
    Prioritizes vLLM-based generation via state machine, falls back to enhanced mock questions.
    """
    print(f"\nProcessing: {os.path.basename(topic_session_path)}")
    
    # Load the topic session
    with open(topic_session_path, 'r', encoding='utf-8') as f:
        topic_session = json.load(f)
    
    title = topic_session.get('topic_session', {}).get('title', 'Unknown')
    print(f"  Topic: {title}")
    
    # Check if already has diagnostic questions
    existing_questions = topic_session.get('topic_session', {}).get('diagnostic', {}).get('questions', [])
    if existing_questions:
        print(f"  ✓ Already has {len(existing_questions)} diagnostic questions, skipping")
        return True
    
    # Ensure the topic session has subskills
    subskills = topic_session.get('topic_session', {}).get('subskills', [])
    if not subskills:
        print("  ⚠ No subskills found, cannot generate diagnostic")
        return False
    
    print(f"  Found {len(subskills)} subskills")
    
    updated_session = None
    generation_method = None
    
    # Try to use the state machine's build_diagnostic_quiz with vLLM
    try:
        from stateTest import load_chunks_jsonl, build_diagnostic_quiz
        
        if os.path.exists(chunks_path):
            # Load the chunks
            chunk_map = load_chunks_jsonl(chunks_path)
            print(f"  Loaded {len(chunk_map)} chunks from course material")
            
            # Try vLLM-based generation via state machine
            print("  🧠 Attempting AI-powered quiz generation via state machine...")
            updated_session = build_diagnostic_quiz(topic_session, chunk_map, questions_per_subskill=2)
            generation_method = "state_machine_vllm"
            print("  ✓ Successfully generated quiz using state machine with vLLM")
        else:
            print(f"  ⚠ Chunks file not found: {chunks_path}")
            raise FileNotFoundError("Chunks file required for vLLM generation")
        
    except ImportError as e:
        print(f"  ⚠ Could not import stateTest module: {e}")
        print("  📝 Falling back to enhanced mock quiz generation")
        
    except Exception as e:
        print(f"  ⚠ vLLM generation failed: {e}")
        print("  📝 Falling back to enhanced mock quiz generation")
    
    # If vLLM generation didn't work, use enhanced mock generation
    if updated_session is None:
        updated_session = build_mock_diagnostic_quiz(topic_session, questions_per_subskill=2)
        generation_method = "mock_enhanced"
    
    # Save the updated session
    output_path = topic_session_path.replace('.json', '_with_diagnostic.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(updated_session, f, indent=2)
    
    num_questions = len(updated_session['topic_session']['diagnostic']['questions'])
    print(f"  ✓ Generated {num_questions} diagnostic questions (method: {generation_method})")
    print(f"  💾 Saved to: {os.path.basename(output_path)}")
    
    return True

def main():
    """
    Find all topic session files and generate diagnostics for them.
    """
    out_dir = os.path.join(os.path.dirname(__file__), 'out')
    
    # Find all topic session files (excluding those with diagnostic already)
    pattern = os.path.join(out_dir, 'course_*_topic_session.json')
    topic_files = glob.glob(pattern)
    
    if not topic_files:
        print("No topic session files found in out/ directory")
        print(f"Looking for pattern: {pattern}")
        return 1
    
    print(f"Found {len(topic_files)} topic session files")
    print("=" * 60)
    
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    for topic_file in topic_files:
        # Find corresponding chunks file
        course_id = os.path.basename(topic_file).replace('_topic_session.json', '')
        chunks_file = os.path.join(out_dir, f'{course_id}_chunks.jsonl')
        
        try:
            if generate_diagnostic_for_file(topic_file, chunks_file):
                success_count += 1
            else:
                skip_count += 1
        except Exception as e:
            print(f"  ✗ Error processing {topic_file}: {e}")
            fail_count += 1
    
    print("\n" + "=" * 60)
    print(f"Summary:")
    print(f"  ✓ Successfully generated: {success_count}")
    print(f"  ⚠ Skipped (already had questions): {skip_count}")
    print(f"  ✗ Failed: {fail_count}")
    print(f"  Total processed: {len(topic_files)}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
