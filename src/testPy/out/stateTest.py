VALID_STATES = {
    "diagnostic",
    "learning",
    "final",
    "completed",
}

import json
import re
from copy import deepcopy
from datetime import datetime
from openai import OpenAI

# =========================
# CONFIG
# =========================
VLLM_BASE_URL = "http://127.0.0.1:8000/v1"
VLLM_MODEL = "Qwen/Qwen2.5-32B-Instruct"

TOPIC_PATH = "topic_session_intro_c_pointers.json"
CHUNKS_PATH = "course_41297e14_chunks.jsonl"
OUT_PATH = "topic_session_after_learning.json"

ERROR_TYPE_DEFAULT = "reasoning_error"

client = OpenAI(base_url=VLLM_BASE_URL, api_key="not-needed")

# =========================
# JSON UTILITIES
# =========================

def _strip_trailing_commas(js: str) -> str:
    return re.sub(r",\s*([}\]])", r"\1", js)

def _scan_first_json_object(s: str) -> dict:
    start = s.find("{")
    if start == -1:
        raise ValueError("No JSON object found in model output.")

    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                candidate = s[start:i+1]
                candidate = _strip_trailing_commas(candidate)
                return json.loads(candidate)

    raise ValueError("Unclosed JSON object in model output.")

def extract_json_object(s: str) -> dict:
    s = (s or "").strip()

    try:
        return json.loads(_strip_trailing_commas(s))
    except Exception:
        pass

    if "```" in s:
        parts = [p.strip() for p in s.split("```") if p.strip()]
        for p in reversed(parts):
            first_line = p.split("\n", 1)[0].strip().lower()
            if first_line in ("json", "javascript"):
                p = p.split("\n", 1)[1] if "\n" in p else ""
            try:
                return json.loads(_strip_trailing_commas(p))
            except Exception:
                try:
                    return _scan_first_json_object(p)
                except Exception:
                    continue

    return _scan_first_json_object(s)

# =========================
# LLM CALL
# =========================

def llm_generate(system: str, user: str) -> dict:
    resp = client.chat.completions.create(
        model=VLLM_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.0,
        stop=["```", "\nTo generate", "To generate", "Here is", "Here's"],
    )

    raw = resp.choices[0].message.content or ""
    return extract_json_object(raw)

# =========================
# LOAD CHUNKS
# =========================

def load_chunks_jsonl(path: str) -> dict:
    chunk_map = {}
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            chunk_map[obj["chunk_id"]] = obj.get("text", "")
    return chunk_map

# =========================
# SCHEMA DEFAULTS
# =========================

def ensure_schema_defaults(ts: dict) -> dict:
    ts = deepcopy(ts)
    t = ts.setdefault("topic_session", {})
    t.setdefault("subskills", [])
    t.setdefault("diagnostic", {})
    t.setdefault("learning_session", {})
    t.setdefault("final_quiz", {})
    t.setdefault("completion", {})
    return ts

# =========================
# BUILD DIAGNOSTIC
# =========================

def build_diagnostic_quiz(topic_session_obj, chunk_map, questions_per_subskill=2):
    ts = ensure_schema_defaults(topic_session_obj)
    subskills = ts["topic_session"]["subskills"]

    payload = []
    for s in subskills:
        evidence = []
        for cid in s.get("evidence_chunk_ids", []):
            txt = chunk_map.get(cid, "")
            if txt.strip():
                evidence.append({"chunk_id": cid, "text": txt})
        payload.append({
            "subskill_id": s["subskill_id"],
            "subskill_name": s["name"],
            "evidence": evidence
        })

    system = (
        "Return ONLY JSON.\n"
        '{ "questions": [ { "subskill_id": "...", "type": "mcq", "difficulty": 1, '
        '"prompt": "...", "choices": ["a","b","c","d"], '
        '"correct_answer": "...", "rubric": ["r1","r2"] } ] }'
    )

    user = json.dumps({"subskills": payload}, indent=2)

    try:
        out = llm_generate(system, user)
        raw_qs = out.get("questions", [])
    except Exception as e:
        print("[diagnostic] failed:", e)
        raw_qs = []

    questions_out = []
    q_index = 1

    for rq in raw_qs:
        choices = rq.get("choices", [])
        if len(choices) != 4:
            continue
        if rq.get("correct_answer") not in choices:
            continue

        questions_out.append({
            "question_id": f"d{q_index}",
            "subskill_id": rq.get("subskill_id"),
            "type": "mcq",
            "difficulty": 1,
            "prompt": rq.get("prompt"),
            "choices": choices,
            "correct_answer": rq.get("correct_answer"),
            "rubric": rq.get("rubric", []),
        })
        q_index += 1

    if not questions_out:
        print("[diagnostic] fallback")
        for s in subskills:
            for _ in range(questions_per_subskill):
                questions_out.append({
                    "question_id": f"d{q_index}",
                    "subskill_id": s["subskill_id"],
                    "type": "mcq",
                    "difficulty": 1,
                    "prompt": f"Diagnostic: {s['name']}",
                    "choices": ["A", "B", "C", "D"],
                    "correct_answer": "A",
                    "rubric": ["Concept check", "Avoid confusion"],
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

def run_state_machine(topic_session: dict, chunk_map: dict, user_input=None):
    """
    user_input:
        - None
        - diagnostic_answers
        - quick_check_answers
        - final_answers
    """

    ts = topic_session
    state = ts["topic_session"]["state"]

    if state not in VALID_STATES:
        raise ValueError(f"Invalid state: {state}")

    # ----------------------
    # DIAGNOSTIC
    # ----------------------
    if state == "diagnostic":

        # If no questions yet → build them
        if not ts["topic_session"]["diagnostic"].get("questions"):
            ts = build_diagnostic_quiz(ts, chunk_map)
            return ts, "show_diagnostic"

        # If user submitted answers → grade
        if user_input:
            ts = grade_diagnostic(ts, user_input)

            weak = ts["topic_session"]["diagnostic"]["submission"]["analysis"]["weak_subskills"]

            if weak:
                ts["topic_session"]["state"] = "learning"
            else:
                ts["topic_session"]["state"] = "final"

            return ts, "diagnostic_graded"

        return ts, "awaiting_diagnostic_submission"

    # ----------------------
    # LEARNING
    # ----------------------
    if state == "learning":

        # If modules not built yet → build
        if not ts["topic_session"]["learning_session"].get("active_modules"):
            ts = build_learning_modules(ts, chunk_map)
            return ts, "show_learning"

        # If user submitted quick check answers
        if user_input:
            modules = ts["topic_session"]["learning_session"]["active_modules"]
            passed_subskills = []

            for module in modules:
                qid = module["quick_check"]["question_id"]
                correct = module["quick_check"]["correct_answer"]

                for ans in user_input:
                    if ans["question_id"] == qid:
                        if ans["answer"].strip() == correct.strip():
                            passed_subskills.append(module["subskill_id"])

            # Remove passed subskills
            remaining = [
                s for s in ts["topic_session"]["diagnostic"]["submission"]["analysis"]["weak_subskills"]
                if s not in passed_subskills
            ]

            ts["topic_session"]["diagnostic"]["submission"]["analysis"]["weak_subskills"] = remaining

            if not remaining:
                ts["topic_session"]["state"] = "final"
                ts["topic_session"]["learning_session"]["active_modules"] = []
                return ts, "learning_complete"

            # Still weak → rebuild modules
            ts["topic_session"]["learning_session"]["active_modules"] = []
            return ts, "learning_retry"

        return ts, "awaiting_learning_submission"

    # ----------------------
    # FINAL QUIZ
    # ----------------------
    if state == "final":

        if not ts["topic_session"]["final_quiz"].get("questions"):
            ts = build_final_quiz_from_weak_subskills(ts, chunk_map)
            return ts, "show_final"

        if user_input:
            questions = ts["topic_session"]["final_quiz"]["questions"]
            ans_map = {a["question_id"]: a["answer"] for a in user_input}

            num_correct = 0
            for q in questions:
                if ans_map.get(q["question_id"], "").strip() == q["correct_answer"].strip():
                    num_correct += 1

            percent = num_correct / len(questions)

            ts["topic_session"]["final_quiz"]["submission"] = {
                "answers": user_input,
                "score": {
                    "num_correct": num_correct,
                    "num_total": len(questions),
                    "percent": percent,
                },
                "passed": percent >= 0.8,
                "weak_subskills": [],
            }

            if percent >= 0.8:
                ts["topic_session"]["state"] = "completed"
                ts["topic_session"]["completion"]["status"] = "completed"
                ts["topic_session"]["completion"]["completed_at"] = datetime.utcnow().isoformat() + "Z"
                return ts, "completed"

            else:
                # failed → go back to learning
                ts["topic_session"]["state"] = "learning"
                ts["topic_session"]["learning_session"]["active_modules"] = []
                return ts, "final_failed"

        return ts, "awaiting_final_submission"

    # ----------------------
    # COMPLETED
    # ----------------------
    if state == "completed":
        return ts, "already_completed"