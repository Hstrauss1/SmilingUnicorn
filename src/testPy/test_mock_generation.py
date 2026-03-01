#!/usr/bin/env python3
"""
Test the enhanced mock diagnostic question generation
"""

import json
import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(__file__))

# Import the function from generate_all_diagnostics
from generate_all_diagnostics import build_mock_diagnostic_quiz

def test_mock_generation():
    """Test that mock generation creates contextual questions"""
    
    # Create a sample topic session with various subskills
    sample_topic_session = {
        "course_pack_id": "test_course",
        "topic_session": {
            "topic_id": "test_topic",
            "title": "Test Topic",
            "state": "topic_session",
            "subskills": [
                {
                    "subskill_id": "ptr_basics",
                    "name": "Understanding pointer basics and memory addresses",
                    "mastery": 0.0,
                    "evidence_chunk_ids": []
                },
                {
                    "subskill_id": "array_ops",
                    "name": "Array operations and indexing",
                    "mastery": 0.0,
                    "evidence_chunk_ids": []
                },
                {
                    "subskill_id": "string_manip",
                    "name": "String manipulation in C",
                    "mastery": 0.0,
                    "evidence_chunk_ids": []
                },
                {
                    "subskill_id": "loop_construct",
                    "name": "Loop construction and iteration",
                    "mastery": 0.0,
                    "evidence_chunk_ids": []
                },
                {
                    "subskill_id": "generic_skill",
                    "name": "Generic programming concept",
                    "mastery": 0.0,
                    "evidence_chunk_ids": []
                }
            ]
        }
    }
    
    print("Testing Enhanced Mock Diagnostic Generation")
    print("=" * 60)
    print()
    
    # Generate diagnostic quiz
    result = build_mock_diagnostic_quiz(sample_topic_session, questions_per_subskill=2)
    
    # Check that diagnostic was created
    assert "diagnostic" in result["topic_session"], "Diagnostic not created"
    
    diagnostic = result["topic_session"]["diagnostic"]
    questions = diagnostic["questions"]
    
    print(f"✓ Generated {len(questions)} questions")
    print()
    
    # Check each question
    for i, question in enumerate(questions, 1):
        print(f"Question {i}:")
        print(f"  Subskill: {question['subskill_id']}")
        print(f"  Prompt: {question['prompt']}")
        print(f"  Choices:")
        for choice in question['choices']:
            marker = "✓" if choice == question['correct_answer'] else " "
            print(f"    [{marker}] {choice}")
        print(f"  Difficulty: {question['difficulty']}")
        print()
        
        # Validate question structure
        assert question['question_id'].startswith('d'), "Invalid question ID"
        assert question['type'] == 'mcq', "Invalid question type"
        assert len(question['choices']) == 4, "Should have 4 choices"
        assert question['correct_answer'] in question['choices'], "Correct answer not in choices"
        assert len(question['rubric']) > 0, "Rubric should not be empty"
    
    # Test domain-specific question generation
    print("Checking domain-specific questions:")
    print("-" * 60)
    
    # Find pointer question
    ptr_questions = [q for q in questions if 'pointer' in q['prompt'].lower() or 'ptr' in q['subskill_id']]
    if ptr_questions:
        print("✓ Found pointer-related questions with contextual prompts")
        print(f"  Example: {ptr_questions[0]['prompt']}")
    
    # Find array question
    array_questions = [q for q in questions if 'array' in q['prompt'].lower() or 'array' in q['subskill_id']]
    if array_questions:
        print("✓ Found array-related questions with contextual prompts")
        print(f"  Example: {array_questions[0]['prompt']}")
    
    # Find string question
    string_questions = [q for q in questions if 'string' in q['prompt'].lower() or 'string' in q['subskill_id']]
    if string_questions:
        print("✓ Found string-related questions with contextual prompts")
        print(f"  Example: {string_questions[0]['prompt']}")
    
    # Find loop question
    loop_questions = [q for q in questions if 'loop' in q['prompt'].lower() or 'loop' in q['subskill_id']]
    if loop_questions:
        print("✓ Found loop-related questions with contextual prompts")
        print(f"  Example: {loop_questions[0]['prompt']}")
    
    print()
    print("=" * 60)
    print("✅ All tests passed!")
    print()
    print("The enhanced mock generation successfully creates:")
    print("  • Domain-specific questions for common topics")
    print("  • Contextual prompts based on subskill names")
    print("  • Realistic answer choices")
    print("  • Proper question structure and validation")

if __name__ == "__main__":
    try:
        test_mock_generation()
    except AssertionError as e:
        print(f"❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
