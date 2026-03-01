#!/usr/bin/env python3
"""
Grade Diagnostic and Generate Learning Modules
Complete workflow: grade diagnostic -> update mastery -> generate learning modules
"""

import os
import sys
import json
from copy import deepcopy

def grade_diagnostic_and_update_mastery(topic_session_obj, submitted_answers):
    """
    Grade diagnostic quiz and update subskill mastery based on performance
    """
    ts = deepcopy(topic_session_obj)
    
    questions = ts["topic_session"]["diagnostic"]["questions"]
    
    # Create lookup maps
    question_by_id = {q["question_id"]: q for q in questions}
    answer_by_qid = {a["question_id"]: a["answer"] for a in submitted_answers}
    
    # Track results
    per_question = []
    num_correct = 0
    weak_subskills_set = set()
    
    # Track per-subskill performance
    subskill_correct = {}
    subskill_total = {}
    
    # Grade each question
    for q in questions:
        qid = q["question_id"]
        expected = q["correct_answer"]
        given = answer_by_qid.get(qid, "")
        subskill_id = q["subskill_id"]
        
        # Initialize counters
        if subskill_id not in subskill_correct:
            subskill_correct[subskill_id] = 0
            subskill_total[subskill_id] = 0
        
        is_correct = (given.strip() == expected.strip())
        
        if is_correct:
            num_correct += 1
            subskill_correct[subskill_id] += 1
        else:
            weak_subskills_set.add(subskill_id)
        
        subskill_total[subskill_id] += 1
        
        per_question.append({
            "question_id": qid,
            "is_correct": is_correct,
            "error_type": None if is_correct else "reasoning_error",
            "confidence": 1.0 if is_correct else 0.6,
            "notes": "Correct answer" if is_correct else "Incorrect answer"
        })
    
    num_total = len(questions)
    percent = num_correct / num_total if num_total else 0.0
    
    # Update submission
    ts["topic_session"]["diagnostic"]["submission"] = {
        "answers": submitted_answers,
        "score": {
            "num_correct": num_correct,
            "num_total": num_total,
            "percent": percent
        },
        "analysis": {
            "per_question": per_question,
            "weak_subskills": sorted(list(weak_subskills_set)),
            "suspected_prereq_topics": []
        }
    }
    
    # Update mastery for each subskill
    updated_subskills = []
    for s in ts["topic_session"]["subskills"]:
        sid = s["subskill_id"]
        correct = subskill_correct.get(sid, 0)
        total = subskill_total.get(sid, 0)
        
        mastery = correct / total if total > 0 else 0.0
        
        updated_subskills.append({
            **s,
            "mastery": mastery
        })
    
    ts["topic_session"]["subskills"] = updated_subskills
    
    # Update state
    if len(weak_subskills_set) == 0:
        ts["topic_session"]["state"] = "final"
    else:
        ts["topic_session"]["state"] = "learning_session"
    
    return ts

def build_learning_modules_template(topic_session_obj):
    """
    Build learning modules using templates for weak subskills
    """
    ts = deepcopy(topic_session_obj)
    
    weak_subskills = ts["topic_session"]["diagnostic"]["submission"]["analysis"].get("weak_subskills", [])
    
    if not weak_subskills:
        ts["topic_session"]["learning_session"]["active_modules"] = []
        ts["topic_session"]["state"] = "final"
        return ts
    
    # Create subskill lookup
    subskill_by_id = {s["subskill_id"]: s for s in ts["topic_session"]["subskills"]}
    
    modules = []
    for sid in weak_subskills:
        subskill = subskill_by_id.get(sid)
        if not subskill:
            continue
        
        name = subskill.get("name", "")
        
        modules.append({
            "module_id": f"learn_{sid}_v1",
            "subskill_id": sid,
            "title": f"Master: {name}",
            "explanation": (
                f"Let's review the key concepts for {name}.\n\n"
                f"This skill is essential for understanding the material. "
                f"Review the source material referenced in the evidence chunks "
                f"and pay attention to the fundamental principles.\n\n"
                f"Practice applying this concept in different contexts to build mastery."
            ),
            "worked_example": {
                "prompt": f"Here's a practical example demonstrating {name}:",
                "solution": (
                    f"Review the slides and lecture notes for detailed examples of {name}. "
                    f"Practice applying this concept step-by-step in your own problems."
                )
            },
            "quick_check": {
                "question_id": f"qc_{sid}_1",
                "type": "mcq",
                "prompt": f"Which approach best demonstrates understanding of {name}?",
                "choices": [
                    "Review the concept in course materials",
                    "Practice with multiple examples",
                    "Understand the fundamental principles",
                    "All of the above"
                ],
                "correct_answer": "All of the above"
            },
            "evidence_chunk_ids": subskill.get("evidence_chunk_ids", []),
            "completion_status": "not_started"
        })
    
    ts["topic_session"]["learning_session"]["active_modules"] = modules
    ts["topic_session"]["state"] = "learning_session"
    
    return ts

def main():
    if len(sys.argv) < 3:
        print("Usage: python GradeAndLearn.py <topic_session.json> <answers.json> [output.json]", file=sys.stderr)
        sys.exit(1)
    
    topic_session_path = sys.argv[1]
    answers_path = sys.argv[2]
    output_path = sys.argv[3] if len(sys.argv) > 3 else topic_session_path.replace(".json", "_graded.json")
    
    # Load inputs
    with open(topic_session_path, "r", encoding="utf-8") as f:
        topic_session = json.load(f)
    
    with open(answers_path, "r", encoding="utf-8") as f:
        submitted_answers = json.load(f)
    
    print(f"Grading {len(submitted_answers)} answers...", file=sys.stderr)
    
    # Grade and update mastery
    graded = grade_diagnostic_and_update_mastery(topic_session, submitted_answers)
    
    score = graded["topic_session"]["diagnostic"]["submission"]["score"]
    print(f"Score: {score['num_correct']}/{score['num_total']} ({score['percent']*100:.1f}%)", file=sys.stderr)
    
    weak = graded["topic_session"]["diagnostic"]["submission"]["analysis"]["weak_subskills"]
    print(f"Weak subskills: {len(weak)}", file=sys.stderr)
    
    # Generate learning modules
    with_learning = build_learning_modules_template(graded)
    
    num_modules = len(with_learning["topic_session"]["learning_session"]["active_modules"])
    print(f"Generated {num_modules} learning modules", file=sys.stderr)
    
    # Output mastery updates
    print("\nMastery Updates:", file=sys.stderr)
    for s in with_learning["topic_session"]["subskills"]:
        mastery_pct = s["mastery"] * 100
        status = "✓" if s["mastery"] == 1.0 else "✗" if s["mastery"] == 0.0 else "~"
        print(f"  {status} {s['name']}: {mastery_pct:.0f}%", file=sys.stderr)
    
    # Save output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(with_learning, f, indent=2)
    
    print(f"\nWrote results to {output_path}", file=sys.stderr)
    
    # Output summary as JSON for API consumption
    summary = {
        "success": True,
        "score": score,
        "weak_subskills": weak,
        "num_learning_modules": num_modules,
        "output_file": output_path
    }
    print(json.dumps(summary))

if __name__ == "__main__":
    main()
