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