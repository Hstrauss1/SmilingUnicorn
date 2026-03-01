import os
import json
import re
from copy import deepcopy
from datetime import datetime
from typing import Dict, List, Any, Tuple

from openai import OpenAI

# =========================
# CONFIG
# =========================
VLLM_BASE_URL = os.environ.get("VLLM_BASE_URL", "http://127.0.0.1:8000/v1")
VLLM_MODEL = os.environ.get("VLLM_MODEL", "Qwen/Qwen2.5-32B-Instruct")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "not-needed")

client = OpenAI(base_url=VLLM_BASE_URL, api_key=OPENAI_API_KEY)

VALID_STATES = {"diagnostic", "learning", "final", "completed"}
ERROR_TYPE_DEFAULT = "reasoning_error"

# Keep evidence short to fit context window
MAX_EVIDENCE_CHARS_PER_SUBSKILL = 2200
MAX_EVIDENCE_SNIPPET_PER_CHUNK = 700
MAX_CHUNKS_PER_SUBSKILL = 5
MAX_CHARS_PER_CHUNK = 700


# =========================
# JSON UTILITIES (robust)
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
                candidate = _strip_trailing_commas(s[start:i+1])
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

def llm_generate_json(system: str, user: str, temperature: float = 0.0) -> dict:
    resp = client.chat.completions.create(
        model=VLLM_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        # Stop tokens reduce rambling, but avoid cutting JSON too aggressively
        stop=["```"],
    )
    raw = (resp.choices[0].message.content or "").strip()
    return extract_json_object(raw)


# =========================
# LOAD CHUNKS
# =========================
def load_chunks_jsonl_map(path: str) -> Dict[str, str]:
    chunk_map: Dict[str, str] = {}
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            chunk_map[obj["chunk_id"]] = obj.get("text", "")
    return chunk_map

def _snippet(text: str, max_chars: int) -> str:
    t = re.sub(r"\s+", " ", (text or "")).strip()
    return t[:max_chars]

def _build_subskill_evidence(subskill: dict, chunk_map: Dict[str, str]) -> List[dict]:
    evidence = []
    used_chars = 0
    for cid in subskill.get("evidence_chunk_ids", []):
        txt = chunk_map.get(cid, "")
        if not txt.strip():
            continue
        snip = _snippet(txt, MAX_EVIDENCE_SNIPPET_PER_CHUNK)
        used_chars += len(snip)
        if used_chars > MAX_EVIDENCE_CHARS_PER_SUBSKILL:
            break
        evidence.append({"chunk_id": cid, "text": snip})
    return evidence


# =========================
# SCHEMA DEFAULTS
# =========================
def ensure_schema_defaults(ts: dict) -> dict:
    ts = deepcopy(ts)
    t = ts.setdefault("topic_session", {})
    t.setdefault("subskills", [])

    t.setdefault("diagnostic", {})
    t["diagnostic"].setdefault("quiz_id", "")
    t["diagnostic"].setdefault("questions", [])
    t["diagnostic"].setdefault("submission", {})
    t["diagnostic"]["submission"].setdefault("answers", [])
    t["diagnostic"]["submission"].setdefault("score", {"num_correct": 0, "num_total": 0, "percent": 0.0})
    t["diagnostic"]["submission"].setdefault("analysis", {})
    t["diagnostic"]["submission"]["analysis"].setdefault("per_question", [])
    t["diagnostic"]["submission"]["analysis"].setdefault("weak_subskills", [])
    t["diagnostic"]["submission"]["analysis"].setdefault("suspected_prereq_topics", [])

    t.setdefault("learning_session", {})
    t["learning_session"].setdefault("active_modules", [])

    t.setdefault("final_quiz", {})
    t["final_quiz"].setdefault("quiz_id", "")
    t["final_quiz"].setdefault("questions", [])
    t["final_quiz"].setdefault("submission", {})
    t["final_quiz"]["submission"].setdefault("answers", [])
    t["final_quiz"]["submission"].setdefault("score", {"num_correct": 0, "num_total": 0, "percent": 0.0})
    t["final_quiz"]["submission"].setdefault("passed", False)
    t["final_quiz"]["submission"].setdefault("weak_subskills", [])

    t.setdefault("completion", {})
    t["completion"].setdefault("status", "in_progress")
    t["completion"].setdefault("completed_at", "")

    t.setdefault("state", "diagnostic")
    return ts


# =========================
# LLM BUILDERS
# =========================

def build_diagnostic_quiz_llm(topic_session_obj: dict, chunk_map: Dict[str, str], questions_per_subskill: int = 2) -> dict:
    ts = ensure_schema_defaults(topic_session_obj)
    subskills = ts["topic_session"]["subskills"]

    payload = []
    for s in subskills:
        evidence = _build_subskill_evidence(s, chunk_map)
        payload.append({
            "subskill_id": s["subskill_id"],
            "subskill_name": s.get("name", ""),
            "evidence": evidence
        })

    system = (
        "You are an assessment writer. Return ONLY valid JSON.\n"
        "Create multiple choice diagnostic questions grounded in the evidence.\n"
        "Rules:\n"
        "- Use the provided evidence only\n"
        "- Do not include explanations outside JSON\n"
        "- Each question must have exactly 4 choices\n"
        "- correct_answer must be one of the choices\n"
        "- difficulty is 1 to 3 (diagnostic should mostly be 1 or 2)\n\n"
        "Schema:\n"
        "{\n"
        '  "questions": [\n'
        "    {\n"
        '      "subskill_id": "string",\n'
        '      "type": "mcq",\n'
        '      "difficulty": 1,\n'
        '      "prompt": "string",\n'
        '      "choices": ["A","B","C","D"],\n'
        '      "correct_answer": "one of choices",\n'
        '      "rubric": ["short bullet", "short bullet"]\n'
        "    }\n"
        "  ]\n"
        "}\n"
    )

    user = json.dumps({
        "questions_per_subskill": questions_per_subskill,
        "subskills": payload
    }, indent=2)

    out = llm_generate_json(system, user, temperature=0.0)
    raw_qs = out.get("questions", [])

    questions_out = []
    q_index = 1
    for rq in raw_qs:
        if not isinstance(rq, dict):
            continue
        choices = rq.get("choices", [])
        if not isinstance(choices, list) or len(choices) != 4:
            continue
        ca = rq.get("correct_answer", "")
        if ca not in choices:
            continue

        questions_out.append({
            "question_id": f"d{q_index}",
            "subskill_id": rq.get("subskill_id", ""),
            "type": "mcq",
            "difficulty": int(rq.get("difficulty", 1) or 1),
            "prompt": rq.get("prompt", ""),
            "choices": choices,
            "correct_answer": ca,
            "rubric": rq.get("rubric", []),
        })
        q_index += 1

    if not questions_out:
        raise RuntimeError("LLM returned no usable diagnostic questions.")

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


def build_learning_modules_llm(topic_session_obj: dict, chunk_map: Dict[str, str]) -> dict:
    ts = ensure_schema_defaults(topic_session_obj)

    weak = ts["topic_session"]["diagnostic"]["submission"]["analysis"].get("weak_subskills", [])
    if not weak:
        ts["topic_session"]["learning_session"]["active_modules"] = []
        ts["topic_session"]["state"] = "learning"
        return ts

    sub_by_id = {s["subskill_id"]: s for s in ts["topic_session"]["subskills"]}
    payload = []
    for sid in weak:
        s = sub_by_id.get(sid)
        if not s:
            continue
        evidence = _build_subskill_evidence(s, chunk_map)
        payload.append({
            "subskill_id": sid,
            "subskill_name": s.get("name", ""),
            "evidence": evidence
        })

    system = (
        "You are a tutor creating short learning modules. Return ONLY valid JSON.\n"
        "Each module must include:\n"
        "- title\n"
        "- explanation (short, clear)\n"
        "- worked_example (prompt + solution)\n"
        "- quick_check MCQ (4 choices, correct_answer in choices)\n"
        "Ground everything in the evidence.\n\n"
        "Schema:\n"
        "{\n"
        '  "modules": [\n'
        "    {\n"
        '      "subskill_id": "string",\n'
        '      "title": "string",\n'
        '      "explanation": "string",\n'
        '      "worked_example": {"prompt": "string", "solution": "string"},\n'
        '      "quick_check": {"type": "mcq", "prompt": "string", "choices": ["a","b","c","d"], "correct_answer": "string"}\n'
        "    }\n"
        "  ]\n"
        "}\n"
    )

    user = json.dumps({"weak_subskills": payload}, indent=2)
    out = llm_generate_json(system, user, temperature=0.0)
    raw_modules = out.get("modules", [])

    modules = []
    for m in raw_modules:
        if not isinstance(m, dict):
            continue
        sid = (m.get("subskill_id") or "").strip()
        if sid not in weak:
            continue
        qc = m.get("quick_check", {})
        choices = qc.get("choices", [])
        ca = qc.get("correct_answer", "")
        if not isinstance(choices, list) or len(choices) != 4 or ca not in choices:
            continue

        modules.append({
            "module_id": f"learn_{sid}",
            "subskill_id": sid,
            "title": (m.get("title") or "").strip(),
            "explanation": (m.get("explanation") or "").strip(),
            "worked_example": {
                "prompt": (m.get("worked_example", {}) or {}).get("prompt", ""),
                "solution": (m.get("worked_example", {}) or {}).get("solution", ""),
            },
            "quick_check": {
                "question_id": f"qc_{sid}",
                "type": "mcq",
                "prompt": (qc.get("prompt") or "").strip(),
                "choices": choices,
                "correct_answer": ca,
            },
            "evidence_chunk_ids": sub_by_id.get(sid, {}).get("evidence_chunk_ids", []),
        })

    if not modules:
        raise RuntimeError("LLM returned no usable learning modules.")

    ts["topic_session"]["learning_session"]["active_modules"] = modules
    ts["topic_session"]["state"] = "learning"
    return ts


def build_final_quiz_llm(topic_session_obj: dict, chunk_map: Dict[str, str], questions_per_subskill: int = 1) -> dict:
    ts = ensure_schema_defaults(topic_session_obj)

    weak = ts["topic_session"]["diagnostic"]["submission"]["analysis"].get("weak_subskills", [])
    subskills = ts["topic_session"]["subskills"]
    sub_by_id = {s["subskill_id"]: s for s in subskills}

    system = (
        "Return ONLY valid JSON. No prose, no markdown, no code fences.\n"
        "The first character must be '{'.\n"
        "You are writing final quiz questions for EXACTLY ONE subskill.\n"
        f"Return EXACTLY {questions_per_subskill} questions.\n"
        "Rules:\n"
        "- difficulty should be 2\n"
        "- Exactly 4 choices\n"
        "- correct_answer must be one of the choices\n"
        "- Keep prompt short (max 220 chars)\n"
        "- Do not include multi-line code blocks; if code is needed, keep it to one line\n"
        "Schema:\n"
        "{\n"
        '  "questions": [\n'
        '    {"subskill_id":"string","type":"mcq","difficulty":2,"prompt":"string","choices":["a","b","c","d"],"correct_answer":"string"}\n'
        "  ]\n"
        "}\n"
    )

    questions = []
    q_index = 1

    for sid in weak:
        s = sub_by_id.get(sid)
        if not s:
            continue

        evidence = []
        for cid in (s.get("evidence_chunk_ids") or [])[:MAX_CHUNKS_PER_SUBSKILL]:
            txt = chunk_map.get(cid, "")
            if txt.strip():
                evidence.append({"chunk_id": cid, "text": _snippet(txt, MAX_CHARS_PER_CHUNK)})

        user = json.dumps(
            {"subskill": {"subskill_id": sid, "name": s.get("name", "")}, "evidence": evidence},
            indent=2,
        )

        out = llm_generate_json(system, user, temperature=0.0)
        raw_qs = out.get("questions", []) if isinstance(out, dict) else []
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
            if not isinstance(choices, list) or len(choices) != 4 or ca not in choices:
                continue

            questions.append(
                {
                    "question_id": f"f{q_index}",
                    "subskill_id": sid,
                    "type": "mcq",
                    "difficulty": 2,
                    "prompt": rq.get("prompt", ""),
                    "choices": choices,
                    "correct_answer": ca,
                }
            )
            q_index += 1
            kept += 1

        if kept == 0:
            questions.append(
                {
                    "question_id": f"f{q_index}",
                    "subskill_id": sid,
                    "type": "mcq",
                    "difficulty": 2,
                    "prompt": f"Final check: {s.get('name','')}",
                    "choices": ["A", "B", "C", "D"],
                    "correct_answer": "A",
                }
            )
            q_index += 1

    ts["topic_session"]["final_quiz"] = {
        "quiz_id": "final_llm_v1",
        "questions": questions,
        "submission": {"answers": [], "score": {"num_correct": 0, "num_total": len(questions), "percent": 0.0}, "passed": False, "weak_subskills": []},
    }
    ts["topic_session"]["state"] = "final"
    return ts


# =========================
# GRADERS
# =========================
def grade_mcq_quiz(questions: List[dict], submitted_answers: List[dict]) -> Tuple[int, int, float, List[dict], List[str]]:
    ans_map = {a["question_id"]: a["answer"] for a in submitted_answers}

    per_question = []
    weak_subskills = set()
    num_correct = 0

    for q in questions:
        qid = q["question_id"]
        correct = q.get("correct_answer", "")
        given = ans_map.get(qid, "")

        is_correct = given.strip() == correct.strip()
        if is_correct:
            num_correct += 1
        else:
            weak_subskills.add(q.get("subskill_id", ""))

        per_question.append({
            "question_id": qid,
            "is_correct": is_correct,
            "error_type": None if is_correct else ERROR_TYPE_DEFAULT,
            "confidence": 0.0 if is_correct else 0.6,
            "notes": "" if is_correct else "Missed question."
        })

    total = len(questions)
    percent = num_correct / total if total else 0.0
    return num_correct, total, percent, per_question, [s for s in weak_subskills if s]


# =========================
# STATE MACHINE
# =========================
def run_state_machine(ts: dict, chunk_map: Dict[str, str], user_input: List[dict] | None = None) -> Tuple[dict, str]:
    ts = ensure_schema_defaults(ts)
    state = ts["topic_session"]["state"]

    if state not in VALID_STATES:
        raise ValueError(f"Invalid state: {state}")

    # DIAGNOSTIC
    if state == "diagnostic":
        if not ts["topic_session"]["diagnostic"].get("questions"):
            ts = build_diagnostic_quiz_llm(ts, chunk_map)
            return ts, "show_diagnostic"

        if user_input:
            questions = ts["topic_session"]["diagnostic"]["questions"]
            nc, nt, pct, per_q, weak = grade_mcq_quiz(questions, user_input)

            ts["topic_session"]["diagnostic"]["submission"] = {
                "answers": user_input,
                "score": {"num_correct": nc, "num_total": nt, "percent": pct},
                "analysis": {"per_question": per_q, "weak_subskills": weak, "suspected_prereq_topics": []}
            }

            ts["topic_session"]["state"] = "learning" if weak else "final"
            return ts, "diagnostic_graded"

        return ts, "awaiting_diagnostic_submission"

    # LEARNING
    if state == "learning":
        if not ts["topic_session"]["learning_session"].get("active_modules"):
            ts = build_learning_modules_llm(ts, chunk_map)
            return ts, "show_learning"

        if user_input:
            modules = ts["topic_session"]["learning_session"]["active_modules"]
            passed_subskills = set()

            for module in modules:
                qid = module["quick_check"]["question_id"]
                correct = module["quick_check"]["correct_answer"]
                for ans in user_input:
                    if ans.get("question_id") == qid and (ans.get("answer", "").strip() == correct.strip()):
                        passed_subskills.add(module["subskill_id"])

            weak = ts["topic_session"]["diagnostic"]["submission"]["analysis"].get("weak_subskills", [])
            remaining = [s for s in weak if s not in passed_subskills]
            ts["topic_session"]["diagnostic"]["submission"]["analysis"]["weak_subskills"] = remaining

            if not remaining:
                ts["topic_session"]["state"] = "final"
                ts["topic_session"]["learning_session"]["active_modules"] = []
                return ts, "learning_complete"

            ts["topic_session"]["learning_session"]["active_modules"] = []
            return ts, "learning_retry"

        return ts, "awaiting_learning_submission"

    # FINAL
    if state == "final":
        if not ts["topic_session"]["final_quiz"].get("questions"):
            ts = build_final_quiz_llm(ts, chunk_map)
            return ts, "show_final"

        if user_input:
            questions = ts["topic_session"]["final_quiz"]["questions"]
            nc, nt, pct, _, _ = grade_mcq_quiz(questions, user_input)

            ts["topic_session"]["final_quiz"]["submission"] = {
                "answers": user_input,
                "score": {"num_correct": nc, "num_total": nt, "percent": pct},
                "passed": pct >= 0.8,
                "weak_subskills": [],
            }

            if pct >= 0.8:
                ts["topic_session"]["state"] = "completed"
                ts["topic_session"]["completion"]["status"] = "completed"
                ts["topic_session"]["completion"]["completed_at"] = datetime.utcnow().isoformat() + "Z"
                return ts, "completed"

            ts["topic_session"]["state"] = "learning"
            ts["topic_session"]["learning_session"]["active_modules"] = []
            # Mark all subskills from missed final questions as weak, so learning focuses
            # This is optional. You can keep existing weak_subskills instead.
            missed_subskills = []
            ans_map = {a["question_id"]: a.get("answer", "") for a in user_input}
            for q in questions:
                if ans_map.get(q["question_id"], "").strip() != q["correct_answer"].strip():
                    missed_subskills.append(q.get("subskill_id", ""))
            ts["topic_session"]["diagnostic"]["submission"]["analysis"]["weak_subskills"] = sorted({s for s in missed_subskills if s})
            return ts, "final_failed"

        return ts, "awaiting_final_submission"

    return ts, "already_completed"