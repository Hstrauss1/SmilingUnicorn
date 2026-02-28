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


# LOAD
with open("topic_session_intro_c_pointers.json", "r") as f:
    topic_session = json.load(f)

# SIMULATED SUBMISSION
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

# CALL
updated = grade_diagnostic(topic_session, submitted_answers)

# SAVE
with open("topic_session_after_diag.json", "w") as f:
    json.dump(updated, f, indent=2)

print("Done.")