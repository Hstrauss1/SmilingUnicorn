#!/usr/bin/env python3
"""
Generate diagnostic quiz for a topic session using the state machine.
This script is called by the Next.js API to create quizzes.
"""

import json
import sys
import os

# Add the parent directory to the path to import stateTest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'out'))

def build_mock_diagnostic_quiz(topic_session, questions_per_subskill=2):
    """
    Build a diagnostic quiz without requiring vLLM.
    Uses enhanced question generation based on subskill analysis.
    """
    from copy import deepcopy
    
    ts = deepcopy(topic_session)
    subskills = ts.get('topic_session', {}).get('subskills', [])
    
    if not subskills:
        print("WARNING: No subskills found, skipping diagnostic generation")
        return ts
    
    questions_out = []
    q_index = 1
    
    # Generate contextual questions based on subskill names
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
            elif 'loop' in subskill_name.lower() or 'iteration' in subskill_name.lower():
                prompt = f"What is essential for: {subskill_name}?"
                choices = [
                    "Initialization, condition, and increment/decrement",
                    "Only a condition is needed",
                    "Loops don't need conditions",
                    "Only initialization is required"
                ]
                correct = "Initialization, condition, and increment/decrement"
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

def main(topic_session_path: str, chunks_path: str):
    """
    Load topic session and chunks, generate diagnostic quiz.
    
    Args:
        topic_session_path: Path to the topic session JSON file
        chunks_path: Path to the chunks JSONL file
    """
    
    # Load the topic session
    with open(topic_session_path, 'r', encoding='utf-8') as f:
        topic_session = json.load(f)
    
    print(f"Loaded topic session: {topic_session['topic_session']['title']}")
    
    # Ensure the topic session has subskills
    if not topic_session.get('topic_session', {}).get('subskills'):
        print("ERROR: No subskills found in topic session. Cannot generate diagnostic.")
        sys.exit(1)
    
    print(f"Found {len(topic_session['topic_session']['subskills'])} subskills")
    
    # Try to use vLLM-based generation, fallback to mock
    try:
        from stateTest import load_chunks_jsonl, build_diagnostic_quiz
        
        # Load the chunks
        chunk_map = load_chunks_jsonl(chunks_path)
        print(f"Loaded {len(chunk_map)} chunks")
        
        # Try vLLM-based generation
        print("Attempting vLLM-based quiz generation...")
        updated_session = build_diagnostic_quiz(topic_session, chunk_map, questions_per_subskill=2)
        print("Successfully generated quiz with vLLM")
        
    except ImportError as e:
        print(f"Warning: Could not import stateTest module: {e}")
        print("Using mock quiz generation (vLLM not available)")
        updated_session = build_mock_diagnostic_quiz(topic_session, questions_per_subskill=2)
        
    except Exception as e:
        print(f"Warning: vLLM generation failed: {e}")
        print("Falling back to mock quiz generation")
        updated_session = build_mock_diagnostic_quiz(topic_session, questions_per_subskill=2)
    
    try:
        # Save the updated session
        output_path = topic_session_path.replace('.json', '_with_diagnostic.json')
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(updated_session, f, indent=2)
        
        num_questions = len(updated_session['topic_session']['diagnostic']['questions'])
        print(f"Generated {num_questions} diagnostic questions")
        print(f"Updated topic session: {output_path}")
        
        return 0
        
    except Exception as e:
        print(f"ERROR saving diagnostic: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_diagnostic.py <topic_session_path> <chunks_path>")
        sys.exit(1)
    
    topic_path = sys.argv[1]
    chunks_path = sys.argv[2]
    
    if not os.path.exists(topic_path):
        print(f"ERROR: Topic session file not found: {topic_path}")
        sys.exit(1)
    
    if not os.path.exists(chunks_path):
        print(f"ERROR: Chunks file not found: {chunks_path}")
        sys.exit(1)
    
    sys.exit(main(topic_path, chunks_path))

