#!/usr/bin/env python3
"""
Build Learning Modules for Weak Subskills
Generates targeted learning content based on diagnostic results
"""

import os
import sys
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

client = OpenAI(base_url=VLLM_BASE_URL, api_key=OPENAI_API_KEY)

MAX_CHUNKS_PER_SUBSKILL = 6
MAX_CHARS_PER_CHUNK = 800

# =========================
# JSON UTILITIES
# =========================
def _strip_trailing_commas(js: str) -> str:
    return re.sub(r",\s*([}\]])", r"\1", js)

def _scan_first_json_value(s: str):
    s = s.strip()
    obj_i = s.find("{")
    arr_i = s.find("[")
    
    if obj_i == -1 and arr_i == -1:
        raise ValueError("No JSON object or array found")
    
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
                return json.loads(_strip_trailing_commas(s[start:i+1]))
    
    raise ValueError("Unclosed JSON in model output")

def extract_json(s: str):
    s = (s or "").strip()
    
    try:
        return json.loads(s)
    except Exception:
        pass
    
    if "```" in s:
        parts = [p.strip() for p in s.split("```") if p.strip()]
        for p in reversed(parts):
            if p.startswith("json"):
                p = p[4:].strip()
            try:
                return json.loads(p)
            except Exception:
                pass
    
    return _scan_first_json_value(s)

# =========================
# CHUNK LOADING
# =========================
def load_chunks_jsonl(path: str) -> dict:
    """Load chunks from JSONL file into a dictionary"""
    chunk_map = {}
    if not os.path.exists(path):
        return chunk_map
    
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                chunk_map[obj["chunk_id"]] = obj.get("text", "")
            except json.JSONDecodeError:
                continue
    
    return chunk_map

def snippet(text: str, max_chars: int) -> str:
    """Get a snippet of text, cleaning whitespace"""
    t = re.sub(r"\s+", " ", (text or "")).strip()
    return t[:max_chars] if len(t) > max_chars else t

# =========================
# LLM GENERATION
# =========================
def llm_generate_json(system: str, user: str, temperature: float = 0.0) -> dict:
    """Call LLM and extract JSON response"""
    try:
        resp = client.chat.completions.create(
            model=VLLM_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            stop=["```", "\n\n\n"],
        )
        
        raw = resp.choices[0].message.content or ""
        return extract_json(raw)
    except Exception as e:
        print(f"LLM generation error: {e}", file=sys.stderr)
        raise

# =========================
# LEARNING MODULE BUILDER
# =========================
def build_learning_modules_llm(topic_session_obj: dict, chunk_map: dict) -> dict:
    """
    Build learning modules using LLM for weak subskills
    Returns updated topic session with learning modules
    """
    ts = deepcopy(topic_session_obj)
    
    # Get weak subskills from diagnostic analysis
    weak_subskills = ts["topic_session"]["diagnostic"]["submission"]["analysis"].get("weak_subskills", [])
    
    if not weak_subskills:
        print("No weak subskills found, ready for final quiz", file=sys.stderr)
        ts["topic_session"]["learning_session"]["active_modules"] = []
        ts["topic_session"]["state"] = "final"
        return ts
    
    print(f"Building learning modules for {len(weak_subskills)} weak subskills", file=sys.stderr)
    
    # Create subskill lookup
    subskill_by_id = {s["subskill_id"]: s for s in ts["topic_session"]["subskills"]}
    
    # Prepare payload for LLM
    payload = []
    for sid in weak_subskills:
        subskill = subskill_by_id.get(sid)
        if not subskill:
            continue
        
        # Gather evidence chunks
        evidence = []
        chunk_ids = subskill.get("evidence_chunk_ids", [])[:MAX_CHUNKS_PER_SUBSKILL]
        
        for cid in chunk_ids:
            text = chunk_map.get(cid, "")
            if text:
                evidence.append({
                    "chunk_id": cid,
                    "text": snippet(text, MAX_CHARS_PER_CHUNK)
                })
        
        payload.append({
            "subskill_id": sid,
            "subskill_name": subskill.get("name", ""),
            "evidence": evidence
        })
    
    # Build system prompt
    system = (
        "You are an expert tutor creating learning modules for students.\n"
        "Return ONLY valid JSON. No prose, no markdown, no code fences.\n"
        "The first character must be '{'.\n\n"
        "For each weak subskill, create a learning module with:\n"
        "1. title: Clear, engaging title\n"
        "2. explanation: 2-3 paragraph explanation of the concept (use evidence)\n"
        "3. worked_example: A concrete example with prompt and step-by-step solution\n"
        "4. quick_check: An MCQ to verify understanding (4 choices, one correct)\n\n"
        "Rules:\n"
        "- Ground all content in the provided evidence chunks\n"
        "- Explanation should be clear and pedagogical\n"
        "- Worked example should be practical and detailed\n"
        "- Quick check must have exactly 4 choices\n"
        "- correct_answer must be one of the 4 choices (exact match)\n"
        "- Keep code snippets short (max 3 lines)\n\n"
        "Schema:\n"
        "{\n"
        '  "modules": [\n'
        "    {\n"
        '      "subskill_id": "string",\n'
        '      "title": "string",\n'
        '      "explanation": "string (2-3 paragraphs)",\n'
        '      "worked_example": {\n'
        '        "prompt": "string",\n'
        '        "solution": "string (step-by-step)"\n'
        "      },\n"
        '      "quick_check": {\n'
        '        "type": "mcq",\n'
        '        "prompt": "string",\n'
        '        "choices": ["a", "b", "c", "d"],\n'
        '        "correct_answer": "string (must be in choices)"\n'
        "      }\n"
        "    }\n"
        "  ]\n"
        "}\n"
    )
    
    user = json.dumps({"weak_subskills": payload}, indent=2)
    
    # Call LLM
    try:
        out = llm_generate_json(system, user, temperature=0.0)
    except Exception as e:
        print(f"LLM call failed: {e}", file=sys.stderr)
        # Fall back to template-based generation
        return build_learning_modules_template(ts, subskill_by_id, weak_subskills)
    
    raw_modules = out.get("modules", [])
    
    # Validate and format modules
    modules = []
    for m in raw_modules:
        if not isinstance(m, dict):
            continue
        
        sid = (m.get("subskill_id") or "").strip()
        if sid not in weak_subskills:
            continue
        
        # Validate quick_check
        qc = m.get("quick_check", {})
        choices = qc.get("choices", [])
        correct = qc.get("correct_answer", "")
        
        if not isinstance(choices, list) or len(choices) != 4:
            print(f"Warning: Invalid choices for {sid}, skipping", file=sys.stderr)
            continue
        
        if correct not in choices:
            print(f"Warning: correct_answer not in choices for {sid}, skipping", file=sys.stderr)
            continue
        
        subskill = subskill_by_id.get(sid, {})
        
        modules.append({
            "module_id": f"learn_{sid}_v1",
            "subskill_id": sid,
            "title": (m.get("title") or "").strip(),
            "explanation": (m.get("explanation") or "").strip(),
            "worked_example": {
                "prompt": (m.get("worked_example", {}) or {}).get("prompt", ""),
                "solution": (m.get("worked_example", {}) or {}).get("solution", ""),
            },
            "quick_check": {
                "question_id": f"qc_{sid}_1",
                "type": "mcq",
                "prompt": (qc.get("prompt") or "").strip(),
                "choices": choices,
                "correct_answer": correct,
            },
            "evidence_chunk_ids": subskill.get("evidence_chunk_ids", []),
            "completion_status": "not_started"
        })
    
    if not modules:
        print("Warning: No valid modules generated by LLM, using templates", file=sys.stderr)
        return build_learning_modules_template(ts, subskill_by_id, weak_subskills)
    
    ts["topic_session"]["learning_session"]["active_modules"] = modules
    ts["topic_session"]["state"] = "learning_session"
    
    print(f"Successfully generated {len(modules)} learning modules", file=sys.stderr)
    return ts

def build_learning_modules_template(ts: dict, subskill_by_id: dict, weak_subskills: list) -> dict:
    """
    Build learning modules using templates (fallback when LLM unavailable)
    """
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

# =========================
# MAIN
# =========================
def main():
    if len(sys.argv) < 3:
        print("Usage: python BuildLearningModules.py <topic_session.json> <chunks.jsonl> [output.json]")
        sys.exit(1)
    
    topic_session_path = sys.argv[1]
    chunks_path = sys.argv[2]
    output_path = sys.argv[3] if len(sys.argv) > 3 else topic_session_path.replace(".json", "_with_learning.json")
    
    # Load inputs
    with open(topic_session_path, "r", encoding="utf-8") as f:
        topic_session = json.load(f)
    
    chunk_map = load_chunks_jsonl(chunks_path)
    
    print(f"Loaded {len(chunk_map)} chunks from {chunks_path}", file=sys.stderr)
    
    # Build learning modules
    updated = build_learning_modules_llm(topic_session, chunk_map)
    
    # Save output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(updated, f, indent=2)
    
    num_modules = len(updated["topic_session"]["learning_session"]["active_modules"])
    print(f"Wrote {num_modules} learning modules to {output_path}", file=sys.stderr)
    print(output_path)

if __name__ == "__main__":
    main()
