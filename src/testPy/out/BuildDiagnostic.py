import os
import json
import re
from copy import deepcopy
from openai import OpenAI

# =========================
# CONFIG
# =========================
VLLM_BASE_URL = os.environ.get("VLLM_BASE_URL", "http://127.0.0.1:8000/v1")
VLLM_MODEL = os.environ.get("VLLM_MODEL", "Qwen/Qwen2.5-32B-Instruct")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "not-needed")

TOPIC_SESSION_PATH = "course_41297e14_topic_session.json"
CHUNKS_PATH = "course_41297e14_chunks.jsonl"
OUT_PATH = "course_41297e14_topic_session_with_diag.json"

client = OpenAI(base_url=VLLM_BASE_URL, api_key=OPENAI_API_KEY)

# Keep evidence bounded so prompts don't explode
MAX_CHUNKS_PER_SUBSKILL = 8
MAX_CHARS_PER_CHUNK = 700

# =========================
# JSON UTILITIES
# =========================
def _strip_trailing_commas(js: str) -> str:
    return re.sub(r",\s*([}\]])", r"\1", js)

def _scan_first_json_value(s: str):
    obj_i = s.find("{")
    arr_i = s.find("[")
    if obj_i == -1 and arr_i == -1:
        raise ValueError("No JSON found in model output.")

    start = obj_i if (obj_i != -1 and (arr_i == -1 or obj_i < arr_i)) else arr_i
    open_ch = s[start]
    close_ch = "}" if open_ch == "{" else "]"

    depth = 0
    for i in range(start, len(s)):
        if s[i] == open_ch:
            depth += 1
        elif s[i] == close_ch:
            depth -= 1
            if depth == 0:
                candidate = _strip_trailing_commas(s[start:i + 1])
                return json.loads(candidate)

    raise ValueError("Unclosed JSON in model output.")

def extract_json(s: str):
    s = (s or "").strip()

    # direct parse
    try:
        return json.loads(_strip_trailing_commas(s))
    except Exception:
        pass

    # fenced parse
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
                    return _scan_first_json_value(p)
                except Exception:
                    continue

    return _scan_first_json_value(s)

# =========================
# HELPERS
# =========================
def snippet(text: str, n: int) -> str:
    t = re.sub(r"\s+", " ", (text or "")).strip()
    return t[:n]

def load_chunks_jsonl(path: str) -> dict:
    chunk_map = {}
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            chunk_map[obj["chunk_id"]] = obj.get("text", "")
    return chunk_map

def ensure_schema_defaults(ts: dict) -> dict:
    ts = deepcopy(ts)
    t = ts.setdefault("topic_session", {})
    t.setdefault("subskills", [])
    t.setdefault("diagnostic", {"quiz_id": "", "questions": [], "submission": {}})
    t["diagnostic"].setdefault("quiz_id", "")
    t["diagnostic"].setdefault("questions", [])
    t["diagnostic"].setdefault("submission", {})
    t["diagnostic"]["submission"].setdefault("answers", [])
    t["diagnostic"]["submission"].setdefault("score", {"num_correct": 0, "num_total": 0, "percent": 0.0})
    t["diagnostic"]["submission"].setdefault("analysis", {"per_question": [], "weak_subskills": [], "suspected_prereq_topics": []})
    t.setdefault("state", "diagnostic")
    return ts

# =========================
# LLM CALL
# =========================
def llm_generate_json(system: str, user: str) -> dict:
    resp = client.chat.completions.create(
        model=VLLM_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.0,
        # Similar to your working script: helps prevent chatty prefixes
        stop=["```", "\nTo generate", "To generate", "Here is", "Here's", "Sure,"],
    )
    raw = (resp.choices[0].message.content or "").strip()
    try:
        return extract_json(raw)
    except Exception as e:
        print("\n[parse_error] Could not parse JSON. Raw output (first 2000 chars):\n")
        print(raw[:2000])
        print("\n[parse_error] Exception:", e)
        raise

# =========================
# BUILD DIAGNOSTIC
# =========================
def build_diagnostic_quiz(topic_session_obj: dict, chunk_map: dict, questions_per_subskill: int = 2) -> dict:
    ts = ensure_schema_defaults(topic_session_obj)
    subskills = ts["topic_session"]["subskills"]

    system = (
        "Return ONLY valid JSON. No prose, no markdown, no code fences.\n"
        "The first character of the response must be '{'.\n\n"
        "Create diagnostic multiple-choice questions grounded in the evidence.\n"
        "Rules:\n"
        "- You are writing questions for EXACTLY ONE subskill.\n"
        f"- Return EXACTLY {questions_per_subskill} questions.\n"
        "- Exactly 4 choices per question.\n"
        "- correct_answer must be one of the choices.\n"
        "- Keep prompts short and unambiguous.\n\n"
        "Schema:\n"
        "{\n"
        '  "questions": [\n'
        '    {\n'
        '      "subskill_id": "string",\n'
        '      "type": "mcq",\n'
        '      "difficulty": 1,\n'
        '      "prompt": "string",\n'
        '      "choices": ["a","b","c","d"],\n'
        '      "correct_answer": "string",\n'
        '      "rubric": ["r1","r2"]\n'
        "    }\n"
        "  ]\n"
        "}\n"
    )

    questions_out = []
    q_index = 1

    for s in subskills:
        sid = s.get("subskill_id", "")
        sname = s.get("name", "")

        evidence = []
        for cid in (s.get("evidence_chunk_ids") or [])[:MAX_CHUNKS_PER_SUBSKILL]:
            txt = chunk_map.get(cid, "")
            if txt.strip():
                evidence.append({"chunk_id": cid, "text": snippet(txt, MAX_CHARS_PER_CHUNK)})

        user = json.dumps(
            {
                "subskill": {"subskill_id": sid, "subskill_name": sname},
                "questions_per_subskill": questions_per_subskill,
                "evidence": evidence,
            },
            indent=2,
        )

        # Retry a couple times if the model under-produces
        raw_qs = []
        for attempt in range(3):
            out = llm_generate_json(system, user)
            candidate = out.get("questions", [])
            if isinstance(candidate, list):
                raw_qs = candidate
            if len(raw_qs) >= questions_per_subskill:
                break

        # Validate and take exactly N
        kept = 0
        for rq in raw_qs:
            if kept >= questions_per_subskill:
                break
            if not isinstance(rq, dict):
                continue
            choices = rq.get("choices", [])
            ca = rq.get("correct_answer", "")
            if not isinstance(choices, list) or len(choices) != 4:
                continue
            if ca not in choices:
                continue
            # Force correct subskill_id in case the model messes it up
            questions_out.append(
                {
                    "question_id": f"d{q_index}",
                    "subskill_id": sid,
                    "type": "mcq",
                    "difficulty": int(rq.get("difficulty", 1) or 1),
                    "prompt": rq.get("prompt", ""),
                    "choices": choices,
                    "correct_answer": ca,
                    "rubric": rq.get("rubric", []),
                }
            )
            q_index += 1
            kept += 1

        # Hard fallback if still nothing usable for this subskill
        if kept == 0:
            questions_out.append(
                {
                    "question_id": f"d{q_index}",
                    "subskill_id": sid,
                    "type": "mcq",
                    "difficulty": 1,
                    "prompt": f"Diagnostic: {sname}",
                    "choices": ["A", "B", "C", "D"],
                    "correct_answer": "A",
                    "rubric": ["Concept check", "Avoid confusion"],
                }
            )
            q_index += 1

    ts["topic_session"]["diagnostic"] = {
        "quiz_id": "diag_llm_v1",
        "questions": questions_out,
        "submission": {
            "answers": [],
            "score": {"num_correct": 0, "num_total": len(questions_out), "percent": 0.0},
            "analysis": {"per_question": [], "weak_subskills": [], "suspected_prereq_topics": []},
        },
    }
    ts["topic_session"]["state"] = "diagnostic"
    return ts

def build_diagnostic_quiz_per_subskill(topic_session_obj: dict, chunk_map: dict, questions_per_subskill: int = 1) -> dict:
    ts = ensure_schema_defaults(topic_session_obj)
    subskills = ts["topic_session"]["subskills"]

    system = (
        "Return ONLY valid JSON. No prose, no markdown, no code fences.\n"
        "The first character must be '{'.\n"
        "You are given EXACTLY ONE subskill and its evidence.\n"
        f"Return EXACTLY {questions_per_subskill} questions for that subskill.\n"
        "Rules:\n"
        "- Each question must have exactly 4 choices\n"
        "- correct_answer must be one of the choices\n"
        "- Keep the prompt short (max 220 chars)\n"
        "- Do not include multi-line code blocks\n"
        "- If code is needed, keep it to ONE line only\n"
        "Schema:\n"
        "{\n"
        '  "questions": [\n'
        '    {\n'
        '      "subskill_id": "string",\n'
        '      "type": "mcq",\n'
        '      "difficulty": 1,\n'
        '      "prompt": "string",\n'
        '      "choices": ["a","b","c","d"],\n'
        '      "correct_answer": "string",\n'
        '      "rubric": ["r1","r2"]\n'
        "    }\n"
        "  ]\n"
        "}\n"
    )

    questions_out = []
    q_index = 1

    for s in subskills:
        sid = s.get("subskill_id", "")
        sname = s.get("name", "")

        evidence = []
        for cid in (s.get("evidence_chunk_ids") or [])[:MAX_CHUNKS_PER_SUBSKILL]:
            txt = chunk_map.get(cid, "")
            if txt.strip():
                evidence.append({"chunk_id": cid, "text": snippet(txt, MAX_CHARS_PER_CHUNK)})

        user = json.dumps(
            {
                "subskill": {"subskill_id": sid, "subskill_name": sname},
                "questions_per_subskill": questions_per_subskill,
                "evidence": evidence,
            },
            indent=2,
        )

        # One subskill per request keeps output small and avoids truncation.
        out = llm_generate_json(system, user)
        raw_qs = out.get("questions", [])
        if not isinstance(raw_qs, list):
            raw_qs = []

        kept = 0
        for rq in raw_qs:
            if kept >= questions_per_subskill:
                break
            if not isinstance(rq, dict):
                continue

            choices = rq.get("choices", [])
            ca = rq.get("correct_answer", "")
            if not isinstance(choices, list) or len(choices) != 4:
                continue
            if ca not in choices:
                continue

            questions_out.append(
                {
                    "question_id": f"d{q_index}",
                    "subskill_id": sid,  # force correct id
                    "type": "mcq",
                    "difficulty": int(rq.get("difficulty", 1) or 1),
                    "prompt": rq.get("prompt", ""),
                    "choices": choices,
                    "correct_answer": ca,
                    "rubric": rq.get("rubric", []),
                }
            )
            q_index += 1
            kept += 1

        # fallback if the model returns nothing usable for this subskill
        if kept == 0:
            questions_out.append(
                {
                    "question_id": f"d{q_index}",
                    "subskill_id": sid,
                    "type": "mcq",
                    "difficulty": 1,
                    "prompt": f"Diagnostic: {sname}",
                    "choices": ["A", "B", "C", "D"],
                    "correct_answer": "A",
                    "rubric": ["Concept check", "Avoid confusion"],
                }
            )
            q_index += 1

    ts["topic_session"]["diagnostic"] = {
        "quiz_id": "diag_llm_v1",
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

    with open(TOPIC_SESSION_PATH, "r", encoding="utf-8") as f:
        topic_session = json.load(f)

    topic_session = build_diagnostic_quiz_per_subskill(topic_session, chunk_map, questions_per_subskill=4)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(topic_session, f, indent=2)

    print("Wrote:", OUT_PATH)