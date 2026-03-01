#!/usr/bin/env python3
"""
Complete Workflow Example: Diagnostic → Grading → Mastery Update → Learning Modules

This demonstrates the full pipeline:
1. Student takes diagnostic quiz
2. System grades answers and calculates mastery per subskill
3. System identifies weak subskills (< 100% mastery)
4. System generates targeted learning modules for weak areas
5. System updates state machine (diagnostic → learning_session or final)
"""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from GradeAndLearn import grade_diagnostic_and_update_mastery, build_learning_modules_template

def demonstrate_workflow():
    """
    Complete workflow demonstration with real-world example
    """
    print("=" * 80)
    print("COMPLETE DIAGNOSTIC WORKFLOW DEMONSTRATION")
    print("=" * 80)
    
    # Sample roadmap data (like what's shown in the user's JSON)
    topic_session = {
        "course_pack_id": "course_df510f5f",
        "topic_session": {
            "topic_id": "topic_001",
            "title": "Introduction to C Programming",
            "state": "diagnostic",
            "prereq_topic_ids": [],
            "subskills": [
                {
                    "subskill_id": "ts_01__char_representation",
                    "name": "Basics of Characters and Strings: Understand Character Representation in C",
                    "mastery": 0.0,
                    "evidence_chunk_ids": [
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p002",
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p003"
                    ]
                },
                {
                    "subskill_id": "ts_01__string_declaration",
                    "name": "Basics of Characters and Strings: Declare and Initialize Character Arrays and Strings",
                    "mastery": 0.0,
                    "evidence_chunk_ids": [
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p007",
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p008"
                    ]
                },
                {
                    "subskill_id": "ts_01__string_manipulation",
                    "name": "Basics of Characters and Strings: Manipulate and Access Elements of Character Arrays",
                    "mastery": 0.0,
                    "evidence_chunk_ids": [
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p009",
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p004"
                    ]
                },
                {
                    "subskill_id": "ts_02__advanced_string_length",
                    "name": "Advanced String Manipulation: Calculate and Understand String Lengths",
                    "mastery": 0.0,
                    "evidence_chunk_ids": [
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p012",
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p013"
                    ]
                },
                {
                    "subskill_id": "ts_02__string_copy_and_concat",
                    "name": "Advanced String Manipulation: Copy and Concatenate Strings Safely",
                    "mastery": 0.0,
                    "evidence_chunk_ids": [
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p014",
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p015"
                    ]
                },
                {
                    "subskill_id": "ts_02__string_comparison",
                    "name": "Advanced String Manipulation: Compare Strings Using strcmp and Understand Lexicographical Order",
                    "mastery": 0.0,
                    "evidence_chunk_ids": [
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p016",
                        "course_df510f5f__slides__Class5-Strings_pptx.pdf__p017"
                    ]
                }
            ],
            "diagnostic": {
                "quiz_id": "diag_v1",
                "questions": [
                    {
                        "question_id": "d1",
                        "subskill_id": "ts_01__char_representation",
                        "type": "mcq",
                        "difficulty": 1,
                        "prompt": "What is stored in memory when you declare a char variable with the value 'A' in C?",
                        "choices": [
                            "The letter 'A'",
                            "The ASCII value of 'A'",
                            "The hexadecimal value of 'A'",
                            "None of the above"
                        ],
                        "correct_answer": "The ASCII value of 'A'",
                        "rubric": [
                            "Understand that a char in C stores the ASCII value of the character.",
                            "Recognize that 'A' in C is stored as its ASCII value, which is 65."
                        ]
                    },
                    {
                        "question_id": "d2",
                        "subskill_id": "ts_01__string_declaration",
                        "type": "mcq",
                        "difficulty": 1,
                        "prompt": "How many bytes are allocated for the string \"Hi Mom\" including the null terminator in C?",
                        "choices": ["6", "7", "8", "9"],
                        "correct_answer": "7",
                        "rubric": [
                            "Understand that each character in a string takes 1 byte.",
                            "Remember that a null terminator '\\0' is added at the end of a string."
                        ]
                    },
                    {
                        "question_id": "d3",
                        "subskill_id": "ts_01__string_manipulation",
                        "type": "mcq",
                        "difficulty": 1,
                        "prompt": "What happens if you overwrite the null terminator '\\0' in a C string?",
                        "choices": [
                            "The string becomes invalid.",
                            "The string length increases.",
                            "The string remains unchanged.",
                            "The string is automatically terminated."
                        ],
                        "correct_answer": "The string becomes invalid.",
                        "rubric": [
                            "Understand that the null terminator marks the end of a string.",
                            "Recognize that overwriting '\\0' can cause undefined behavior."
                        ]
                    },
                    {
                        "question_id": "d4",
                        "subskill_id": "ts_02__advanced_string_length",
                        "type": "mcq",
                        "difficulty": 1,
                        "prompt": "Which function returns the length of a string without counting the null terminator in C?",
                        "choices": ["strlen()", "sizeof()", "strcmp()", "strncpy()"],
                        "correct_answer": "strlen()",
                        "rubric": [
                            "Identify the correct function to get the length of a string.",
                            "Understand that strlen() does not count the null terminator."
                        ]
                    },
                    {
                        "question_id": "d5",
                        "subskill_id": "ts_02__string_copy_and_concat",
                        "type": "mcq",
                        "difficulty": 1,
                        "prompt": "Which function should you use to safely copy a portion of a string in C?",
                        "choices": ["strcpy()", "strncpy()", "strcat()", "strcmp()"],
                        "correct_answer": "strncpy()",
                        "rubric": [
                            "Understand the difference between strcpy() and strncpy().",
                            "Recognize that strncpy() allows specifying the number of characters to copy."
                        ]
                    },
                    {
                        "question_id": "d6",
                        "subskill_id": "ts_02__string_comparison",
                        "type": "mcq",
                        "difficulty": 1,
                        "prompt": "What does strcmp(\"abc\", \"abcd\") return in C?",
                        "choices": ["0", "-1", "1", "2"],
                        "correct_answer": "-1",
                        "rubric": [
                            "Understand that strcmp() compares strings lexicographically.",
                            "Recognize that shorter string comes before longer string if all characters match."
                        ]
                    }
                ],
                "submission": {
                    "answers": [],
                    "score": {
                        "num_correct": 0,
                        "num_total": 6,
                        "percent": 0.0
                    },
                    "analysis": {
                        "per_question": [],
                        "weak_subskills": [],
                        "suspected_prereq_topics": []
                    }
                }
            },
            "learning_session": {
                "active_modules": []
            },
            "final_quiz": {
                "quiz_id": "",
                "questions": [],
                "submission": {
                    "answers": [],
                    "score": {
                        "num_correct": 0,
                        "num_total": 0,
                        "percent": 0.0
                    },
                    "passed": False,
                    "weak_subskills": []
                }
            },
            "completion": {
                "status": "in_progress",
                "completed_at": ""
            }
        }
    }
    
    print("\n📚 INITIAL STATE")
    print("-" * 80)
    print(f"Topic: {topic_session['topic_session']['title']}")
    print(f"State: {topic_session['topic_session']['state']}")
    print(f"Number of subskills: {len(topic_session['topic_session']['subskills'])}")
    print(f"Diagnostic questions: {len(topic_session['topic_session']['diagnostic']['questions'])}")
    
    print("\n📝 STUDENT SUBMITS DIAGNOSTIC ANSWERS")
    print("-" * 80)
    
    # Simulate a student who gets some right and some wrong
    # Let's say they get 3 out of 6 correct (50%)
    student_answers = [
        {"question_id": "d1", "answer": "The ASCII value of 'A'"},  # CORRECT
        {"question_id": "d2", "answer": "6"},  # WRONG (correct is 7)
        {"question_id": "d3", "answer": "The string becomes invalid."},  # CORRECT
        {"question_id": "d4", "answer": "sizeof()"},  # WRONG (correct is strlen())
        {"question_id": "d5", "answer": "strncpy()"},  # CORRECT
        {"question_id": "d6", "answer": "0"}  # WRONG (correct is -1)
    ]
    
    for ans in student_answers:
        q = next(q for q in topic_session['topic_session']['diagnostic']['questions'] if q['question_id'] == ans['question_id'])
        is_correct = ans['answer'] == q['correct_answer']
        status = "✓ CORRECT" if is_correct else "✗ WRONG"
        print(f"  Q{ans['question_id']}: {status}")
        print(f"    Subskill: {q['subskill_id']}")
        print(f"    Student answered: {ans['answer']}")
        if not is_correct:
            print(f"    Correct answer: {q['correct_answer']}")
    
    print("\n⚙️  STEP 1: GRADING AND MASTERY CALCULATION")
    print("-" * 80)
    
    # Grade the diagnostic and update mastery
    graded_result = grade_diagnostic_and_update_mastery(topic_session, student_answers)
    
    score = graded_result['topic_session']['diagnostic']['submission']['score']
    print(f"Score: {score['num_correct']}/{score['num_total']} ({score['percent']*100:.1f}%)")
    
    weak_subskills = graded_result['topic_session']['diagnostic']['submission']['analysis']['weak_subskills']
    print(f"\nWeak subskills identified: {len(weak_subskills)}")
    
    print("\n📊 MASTERY SCORES BY SUBSKILL")
    print("-" * 80)
    for subskill in graded_result['topic_session']['subskills']:
        mastery_pct = subskill['mastery'] * 100
        status = "🟢" if mastery_pct == 100 else "🟡" if mastery_pct >= 50 else "🔴"
        is_weak = subskill['subskill_id'] in weak_subskills
        weak_indicator = " [NEEDS LEARNING MODULE]" if is_weak else ""
        
        print(f"{status} {mastery_pct:5.1f}% - {subskill['name']}{weak_indicator}")
    
    print(f"\nNew State: {graded_result['topic_session']['state']}")
    
    print("\n⚙️  STEP 2: GENERATING LEARNING MODULES")
    print("-" * 80)
    
    # Generate learning modules for weak subskills
    final_result = build_learning_modules_template(graded_result)
    
    modules = final_result['topic_session']['learning_session']['active_modules']
    print(f"Generated {len(modules)} learning modules")
    
    print("\n📖 LEARNING MODULES CREATED")
    print("-" * 80)
    for i, module in enumerate(modules, 1):
        print(f"\nModule {i}: {module['title']}")
        print(f"  Subskill ID: {module['subskill_id']}")
        print(f"  Module ID: {module['module_id']}")
        print(f"  Status: {module['completion_status']}")
        print(f"  Evidence chunks: {len(module['evidence_chunk_ids'])}")
        print(f"  Has explanation: {'✓' if module['explanation'] else '✗'}")
        print(f"  Has worked example: {'✓' if module['worked_example'] else '✗'}")
        print(f"  Has quick check: {'✓' if module['quick_check'] else '✗'}")
    
    print("\n" + "=" * 80)
    print("✅ WORKFLOW COMPLETE")
    print("=" * 80)
    print(f"Final State: {final_result['topic_session']['state']}")
    print(f"Student now has {len(modules)} learning modules to complete")
    print(f"Once completed, student can proceed to final quiz")
    
    # Save the result for inspection
    output_path = Path(__file__).parent / "workflow_example_output.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_result, f, indent=2)
    
    print(f"\n📁 Full result saved to: {output_path}")
    
    return final_result

if __name__ == "__main__":
    demonstrate_workflow()
