#!/usr/bin/env python3
"""
Test the learning module generation system
"""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import our grading function
from GradeAndLearn import grade_diagnostic_and_update_mastery, build_learning_modules_template

def create_test_topic_session():
    """Create a sample topic session for testing"""
    return {
        "course_pack_id": "test_course",
        "topic_session": {
            "topic_id": "test_topic",
            "title": "Test Topic: C Programming Basics",
            "state": "diagnostic",
            "subskills": [
                {
                    "subskill_id": "sk1",
                    "name": "Understanding pointers",
                    "mastery": 0.0,
                    "evidence_chunk_ids": ["chunk1", "chunk2"]
                },
                {
                    "subskill_id": "sk2",
                    "name": "Array manipulation",
                    "mastery": 0.0,
                    "evidence_chunk_ids": ["chunk3", "chunk4"]
                },
                {
                    "subskill_id": "sk3",
                    "name": "String handling",
                    "mastery": 0.0,
                    "evidence_chunk_ids": ["chunk5"]
                }
            ],
            "diagnostic": {
                "quiz_id": "test_quiz",
                "questions": [
                    {
                        "question_id": "q1",
                        "subskill_id": "sk1",
                        "type": "mcq",
                        "prompt": "What does * operator do?",
                        "choices": ["A", "B", "C", "D"],
                        "correct_answer": "B"
                    },
                    {
                        "question_id": "q2",
                        "subskill_id": "sk1",
                        "type": "mcq",
                        "prompt": "What is pointer arithmetic?",
                        "choices": ["A", "B", "C", "D"],
                        "correct_answer": "A"
                    },
                    {
                        "question_id": "q3",
                        "subskill_id": "sk2",
                        "type": "mcq",
                        "prompt": "How to access array element?",
                        "choices": ["A", "B", "C", "D"],
                        "correct_answer": "C"
                    },
                    {
                        "question_id": "q4",
                        "subskill_id": "sk3",
                        "type": "mcq",
                        "prompt": "What ends a string in C?",
                        "choices": ["A", "B", "C", "D"],
                        "correct_answer": "D"
                    }
                ],
                "submission": {
                    "answers": [],
                    "score": {"num_correct": 0, "num_total": 0, "percent": 0.0},
                    "analysis": {"per_question": [], "weak_subskills": []}
                }
            },
            "learning_session": {"active_modules": []},
            "final_quiz": {"quiz_id": "", "questions": []},
            "completion": {"status": "in_progress"}
        }
    }

def test_perfect_score():
    """Test when student gets all answers correct"""
    print("\n" + "="*60)
    print("TEST 1: Perfect Score (100%)")
    print("="*60)
    
    topic_session = create_test_topic_session()
    answers = [
        {"question_id": "q1", "answer": "B"},
        {"question_id": "q2", "answer": "A"},
        {"question_id": "q3", "answer": "C"},
        {"question_id": "q4", "answer": "D"}
    ]
    
    result = grade_diagnostic_and_update_mastery(topic_session, answers)
    result = build_learning_modules_template(result)
    
    score = result["topic_session"]["diagnostic"]["submission"]["score"]
    weak = result["topic_session"]["diagnostic"]["submission"]["analysis"]["weak_subskills"]
    modules = result["topic_session"]["learning_session"]["active_modules"]
    state = result["topic_session"]["state"]
    
    print(f"Score: {score['num_correct']}/{score['num_total']} ({score['percent']*100:.0f}%)")
    print(f"Weak subskills: {weak}")
    print(f"Learning modules created: {len(modules)}")
    print(f"State: {state}")
    
    # Verify
    assert score['num_correct'] == 4, "Should have 4 correct"
    assert score['percent'] == 1.0, "Should be 100%"
    assert len(weak) == 0, "Should have no weak subskills"
    assert len(modules) == 0, "Should have no learning modules"
    assert state == "final", "Should go to final state"
    
    # Check mastery
    for skill in result["topic_session"]["subskills"]:
        print(f"  {skill['name']}: {skill['mastery']*100:.0f}% mastery")
        assert skill['mastery'] == 1.0, f"Should have 100% mastery for {skill['name']}"
    
    print("✅ PASSED\n")

def test_partial_score():
    """Test when student gets some answers wrong"""
    print("="*60)
    print("TEST 2: Partial Score (50%)")
    print("="*60)
    
    topic_session = create_test_topic_session()
    answers = [
        {"question_id": "q1", "answer": "B"},  # Correct (sk1)
        {"question_id": "q2", "answer": "WRONG"},  # Wrong (sk1)
        {"question_id": "q3", "answer": "WRONG"},  # Wrong (sk2)
        {"question_id": "q4", "answer": "D"}  # Correct (sk3)
    ]
    
    result = grade_diagnostic_and_update_mastery(topic_session, answers)
    result = build_learning_modules_template(result)
    
    score = result["topic_session"]["diagnostic"]["submission"]["score"]
    weak = result["topic_session"]["diagnostic"]["submission"]["analysis"]["weak_subskills"]
    modules = result["topic_session"]["learning_session"]["active_modules"]
    state = result["topic_session"]["state"]
    
    print(f"Score: {score['num_correct']}/{score['num_total']} ({score['percent']*100:.0f}%)")
    print(f"Weak subskills: {weak}")
    print(f"Learning modules created: {len(modules)}")
    print(f"State: {state}")
    
    # Verify
    assert score['num_correct'] == 2, "Should have 2 correct"
    assert score['percent'] == 0.5, "Should be 50%"
    assert len(weak) == 2, "Should have 2 weak subskills"
    assert "sk1" in weak, "sk1 should be weak"
    assert "sk2" in weak, "sk2 should be weak"
    assert len(modules) == 2, "Should have 2 learning modules"
    assert state == "learning_session", "Should go to learning_session state"
    
    # Check mastery
    print("\nMastery Scores:")
    for skill in result["topic_session"]["subskills"]:
        print(f"  {skill['name']}: {skill['mastery']*100:.0f}% mastery")
        if skill['subskill_id'] == 'sk1':
            assert skill['mastery'] == 0.5, "sk1 should have 50% mastery"
        elif skill['subskill_id'] == 'sk2':
            assert skill['mastery'] == 0.0, "sk2 should have 0% mastery"
        elif skill['subskill_id'] == 'sk3':
            assert skill['mastery'] == 1.0, "sk3 should have 100% mastery"
    
    # Verify learning modules
    print("\nLearning Modules:")
    for module in modules:
        print(f"  - {module['title']}")
        assert 'explanation' in module, "Module should have explanation"
        assert 'worked_example' in module, "Module should have worked example"
        assert 'quick_check' in module, "Module should have quick check"
        assert len(module['quick_check']['choices']) == 4, "Quick check should have 4 choices"
    
    print("✅ PASSED\n")

def test_all_wrong():
    """Test when student gets all answers wrong"""
    print("="*60)
    print("TEST 3: All Wrong (0%)")
    print("="*60)
    
    topic_session = create_test_topic_session()
    answers = [
        {"question_id": "q1", "answer": "WRONG"},
        {"question_id": "q2", "answer": "WRONG"},
        {"question_id": "q3", "answer": "WRONG"},
        {"question_id": "q4", "answer": "WRONG"}
    ]
    
    result = grade_diagnostic_and_update_mastery(topic_session, answers)
    result = build_learning_modules_template(result)
    
    score = result["topic_session"]["diagnostic"]["submission"]["score"]
    weak = result["topic_session"]["diagnostic"]["submission"]["analysis"]["weak_subskills"]
    modules = result["topic_session"]["learning_session"]["active_modules"]
    
    print(f"Score: {score['num_correct']}/{score['num_total']} ({score['percent']*100:.0f}%)")
    print(f"Weak subskills: {weak}")
    print(f"Learning modules created: {len(modules)}")
    
    # Verify
    assert score['num_correct'] == 0, "Should have 0 correct"
    assert len(weak) == 3, "Should have all 3 subskills as weak"
    assert len(modules) == 3, "Should have 3 learning modules"
    
    print("✅ PASSED\n")

def main():
    print("\n" + "="*60)
    print("LEARNING MODULE SYSTEM TEST SUITE")
    print("="*60)
    
    try:
        test_perfect_score()
        test_partial_score()
        test_all_wrong()
        
        print("="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\nThe learning module system is working correctly:")
        print("  ✓ Grading logic working")
        print("  ✓ Mastery calculation accurate")
        print("  ✓ Weak subskill identification correct")
        print("  ✓ Learning modules generated properly")
        print("  ✓ State transitions working")
        print()
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
