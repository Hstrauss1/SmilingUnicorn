
import json
from copy import deepcopy

ERROR_TYPE_DEFAULT = "reasoning_error"

def grade_diagnostic(topic_session_obj, submitted_answers):
    ts = deepcopy(topic_session_obj)

    questions = ts["topic_session"]["diagnostic"]["questions"]
    q_by_id = {q["question_id"]: q for q in questions}
    ans_by_qid = {a["question_id"]: a["answer"] for a in submitted_answers}

    per_question = []
    num_correct = 0
    weak_subskills_set = set()

    for q in questions:
        qid = q["question_id"]
        expected = q["correct_answer"]
        given = ans_by_qid.get(qid, "")

        is_correct = (given.strip() == expected.strip())

        if is_correct:
            num_correct += 1
        else:
            weak_subskills_set.add(q["subskill_id"])

        per_question.append({
            "question_id": qid,
            "is_correct": is_correct,
            "error_type": None if is_correct else ERROR_TYPE_DEFAULT,
            "confidence": 0.0 if is_correct else 0.6,
            "notes": "" if is_correct else "Missed diagnostic question."
        })

    num_total = len(questions)
    percent = num_correct / num_total if num_total else 0.0

    ts["topic_session"]["diagnostic"]["submission"]["answers"] = submitted_answers
    ts["topic_session"]["diagnostic"]["submission"]["score"] = {
        "num_correct": num_correct,
        "num_total": num_total,
        "percent": percent
    }
    ts["topic_session"]["diagnostic"]["submission"]["analysis"] = {
        "per_question": per_question,
        "weak_subskills": sorted(list(weak_subskills_set)),
        "suspected_prereq_topics": []
    }

    return ts






def build_learning_modules(topic_session_obj: dict) -> dict:
    ts = deepcopy(topic_session_obj)

    weak_subskills = set(ts["topic_session"]["diagnostic"]["submission"]["analysis"]["weak_subskills"])
    if not weak_subskills:
        # no weaknesses, ready for final quiz directly
        ts["topic_session"]["state"] = "final"
        return ts

    subskills = ts["topic_session"]["subskills"]
    sub_by_id = {s["subskill_id"]: s for s in subskills}

    modules = []
    for sid in weak_subskills:
        s = sub_by_id[sid]
        modules.append({
            "module_id": f"learn_{sid}_v1",
            "subskill_id": sid,
            "title": f"Fix: {s['name']}",
            "explanation": f"Review the key idea for: {s['name']}. Use the cited slide pages as your source of truth.",
            "worked_example": {"prompt": "", "solution": ""},
            "quick_check": {
                "question_id": f"qc_{sid}_1",
                "type": "mcq",
                "prompt": f"Quick check for {s['name']}: choose the best answer.",
                "choices": ["A", "B", "C", "D"],
                "correct_answer": "B"
            },
            "evidence_chunk_ids": s["evidence_chunk_ids"]
        })

    ts["topic_session"]["learning_session"]["active_modules"] = modules
    ts["topic_session"]["state"] = "learning"
    return ts



from copy import deepcopy
from datetime import datetime

def build_final_quiz_from_weak_subskills(topic_session_obj: dict, questions_per_subskill: int = 2) -> dict:
    ts = deepcopy(topic_session_obj)

    analysis = ts["topic_session"]["diagnostic"]["submission"]["analysis"]
    weak = analysis.get("weak_subskills", [])

    # If none weak, you can either skip final or make a short mixed final.
    if not weak:
        ts["topic_session"]["state"] = "completed"
        ts["topic_session"]["completion"]["status"] = "completed"
        ts["topic_session"]["completion"]["completed_at"] = datetime.utcnow().isoformat() + "Z"
        return ts

    # Map subskill_id -> evidence_chunk_ids
    subskills = ts["topic_session"]["subskills"]
    evidence_by_subskill = {s["subskill_id"]: s.get("evidence_chunk_ids", []) for s in subskills}

    questions_out = []
    q_index = 1

    for subskill_id in weak:
        bank = FINAL_QUIZ_BANK.get(subskill_id, [])
        if not bank:
            # if no templates exist, skip gracefully
            continue

        # pick the first N templates (later you can randomize)
        picked = bank[:questions_per_subskill]

        for template in picked:
            questions_out.append({
                "question_id": f"f{q_index}",
                "subskill_id": subskill_id,
                "type": template["type"],
                "difficulty": template["difficulty"],
                "prompt": template["prompt"],
                "choices": template.get("choices", []),
                "correct_answer": template["correct_answer"],
                # optional grounding
                "source_evidence": evidence_by_subskill.get(subskill_id, [])
            })
            q_index += 1

    ts["topic_session"]["final_quiz"]["quiz_id"] = f"final_{ts['topic_session']['topic_id']}_v1"
    ts["topic_session"]["final_quiz"]["questions"] = questions_out
    ts["topic_session"]["final_quiz"]["submission"] = {
        "answers": [],
        "score": {"num_correct": 0, "num_total": len(questions_out), "percent": 0.0},
        "passed": False,
        "weak_subskills": []
    }

    ts["topic_session"]["state"] = "final"
    return ts




with open("topic_session_intro_c_pointers.json", "r") as f:
    topic_session = json.load(f)


#USER INPUT
submitted_answers = [
    {"question_id": "d1", "answer": "The address of x"},
    {"question_id": "d2", "answer": "scanf converts x into an integer"},
    {"question_id": "d3", "answer": "p: int*, q: int*"},
    {"question_id": "d4", "answer": "int *p, *q;"},
    {"question_id": "d5", "answer": "The value of x"},
    {"question_id": "d6", "answer": "10"},
    {"question_id": "d7", "answer": "1001"},
    {"question_id": "d8", "answer": "p++ always adds 1 byte"}
]

#AI GEN
FINAL_QUIZ_BANK = {
  "c_ptr_address_of": [
    {
      "type": "mcq",
      "difficulty": 2,
      "prompt": "What does `&x` evaluate to?",
      "choices": ["The value stored in x", "The address of x", "A copy of x", "The size of x"],
      "correct_answer": "The address of x"
    },
    {
      "type": "mcq",
      "difficulty": 2,
      "prompt": "Which call correctly reads an int into x using scanf?",
      "choices": ["scanf(\"%d\", x)", "scanf(\"%d\", &x)", "scanf(\"%d\", *x)", "scanf(\"%d\", &&x)"],
      "correct_answer": "scanf(\"%d\", &x)"
    }
  ],
  "c_ptr_declare_types": [
    {
      "type": "mcq",
      "difficulty": 2,
      "prompt": "In `int *p, q;` what are the types of p and q?",
      "choices": ["p: int, q: int", "p: int*, q: int", "p: int, q: int*", "p: int*, q: int*"],
      "correct_answer": "p: int*, q: int"
    },
    {
      "type": "mcq",
      "difficulty": 2,
      "prompt": "Which correctly declares both p and q as pointers to int?",
      "choices": ["int *p, q;", "int *p, *q;", "int p*, q*;", "int *(p, q);"],
      "correct_answer": "int *p, *q;"
    }
  ],
  "c_ptr_assign_deref": [
    {
      "type": "mcq",
      "difficulty": 2,
      "prompt": "Given `int x=5; int *p=&x;` what is `*p`?",
      "choices": ["Address of x", "Value of x", "Size of x", "Undefined"],
      "correct_answer": "Value of x"
    },
    {
      "type": "mcq",
      "difficulty": 3,
      "prompt": "Given `int x=5; int *p=&x; *p=10;` what is x after?",
      "choices": ["5", "10", "Undefined", "&x"],
      "correct_answer": "10"
    }
  ],
  "c_ptr_arithmetic": [
    {
      "type": "mcq",
      "difficulty": 3,
      "prompt": "Assume sizeof(int)=4. If `int *p` holds address 1000, what address after `p++`?",
      "choices": ["1001", "1002", "1004", "1016"],
      "correct_answer": "1004"
    },
    {
      "type": "mcq",
      "difficulty": 3,
      "prompt": "Which statement about pointer arithmetic is correct?",
      "choices": [
        "p++ always adds 1 byte",
        "p++ adds sizeof(*p) bytes",
        "p++ changes the value stored at *p",
        "p++ is only valid for char*"
      ],
      "correct_answer": "p++ adds sizeof(*p) bytes"
    }
  ]





# Step 1: grade
updated = grade_diagnostic(topic_session, submitted_answers) #need to call AI

# Step 2: build learning modules
updated = build_learning_modules(updated) #need to call AI

#step 3 quiz
updated = build_final_quiz_from_weak_subskills(updated, questions_per_subskill=2)#need to call AI

# Step 4: save
with open("topic_session_after_learning.json", "w") as f:
    json.dump(updated, f, indent=2)

print("Diagnostic graded and learning session created.")