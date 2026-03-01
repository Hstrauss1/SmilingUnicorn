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

# =========================
# MAIN
# =========================

if __name__ == "__main__":
    chunk_map = load_chunks_jsonl(CHUNKS_PATH)

    with open(TOPIC_PATH, "r", encoding="utf-8") as f:
        topic_session = json.load(f)

    topic_session = build_diagnostic_quiz(topic_session, chunk_map)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(topic_session, f, indent=2)

    print("Wrote:", OUT_PATH)