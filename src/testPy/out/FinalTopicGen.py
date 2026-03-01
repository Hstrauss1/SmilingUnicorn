import os
import json
import re
from copy import deepcopy
from datetime import datetime, timezone
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

# Tune these based on your context window
MAX_TEXT_PER_CHUNK_SNIPPET = 450     # chars
BATCH_SIZE_FOR_TOPIC_MAP = 35        # chunks per batch for map stage
MAX_TOPIC_SPACES = 8                # global topic spaces across course pack
MIN_CHUNKS_PER_TOPIC = 8            # avoid tiny topics unless needed
MAX_CHUNKS_PER_TOPIC = 80           # cap evidence per topic space
SUBSKILLS_PER_TOPIC_MIN = 2
SUBSKILLS_PER_TOPIC_MAX = 4

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
        # Stop tokens reduce rambling
        stop=["```", "\nTo generate", "\nHere is", "\nHere's"],
    )
    raw = (resp.choices[0].message.content or "").strip()
    return extract_json_object(raw)

# =========================
# LOAD CHUNKS
# =========================

def load_chunks_jsonl(chunks_path: str) -> Tuple[str, List[dict], Dict[str, str]]:
    chunks: List[dict] = []
    chunk_map: Dict[str, str] = {}
    course_pack_id = None

    with open(chunks_path, "r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            chunks.append(obj)
            chunk_map[obj["chunk_id"]] = obj.get("text", "")
            course_pack_id = course_pack_id or obj.get("course_pack_id")

    if not course_pack_id:
        # fall back to parsing from chunk_id prefix if present
        if chunks and "__" in chunks[0]["chunk_id"]:
            course_pack_id = chunks[0]["chunk_id"].split("__", 1)[0]
        else:
            course_pack_id = "course_unknown"

    return course_pack_id, chunks, chunk_map

def sort_chunks(chunks: List[dict]) -> List[dict]:
    # Sort by doc_name then page when available, else stable order
    def key_fn(c):
        doc = c.get("doc_name", "")
        page = c.get("page", 10**9)
        return (doc, page, c.get("chunk_id", ""))
    return sorted(chunks, key=key_fn)

def chunk_snippet(text: str, max_chars: int = MAX_TEXT_PER_CHUNK_SNIPPET) -> str:
    t = re.sub(r"\s+", " ", (text or "")).strip()
    return t[:max_chars]

# =========================
# TOPIC SESSION SKELETON
# =========================

def build_topic_session_skeleton(course_pack_id: str, title: str) -> dict:
    return {
        "course_pack_id": course_pack_id,
        "topic_session": {
            "topic_id": "topic_001",
            "title": title,
            "state": "diagnostic",
            "prereq_topic_ids": [],
            "subskills": [],
            "diagnostic": {
                "quiz_id": "",
                "questions": [],
                "submission": {
                    "answers": [],
                    "score": {"num_correct": 0, "num_total": 0, "percent": 0.0},
                    "analysis": {
                        "per_question": [],
                        "weak_subskills": [],
                        "suspected_prereq_topics": []
                    }
                }
            },
            "learning_session": {"active_modules": []},
            "final_quiz": {
                "quiz_id": "",
                "questions": [],
                "submission": {
                    "answers": [],
                    "score": {"num_correct": 0, "num_total": 0, "percent": 0.0},
                    "passed": False,
                    "weak_subskills": []
                }
            },
            "completion": {"status": "in_progress", "completed_at": ""}
        }
    }

# =========================
# TOPIC SPACES (MAP -> REDUCE)
# =========================

def build_topic_spaces(course_title: str, chunks: List[dict], chunk_map: Dict[str, str]) -> List[dict]:
    """
    Returns:
    [
      {
        "topic_space_id": "ts_01",
        "name": "Arrays and indexing",
        "summary": "...",
        "chunk_ids": ["...","..."]
      },
      ...
    ]
    """
    chunks_sorted = sort_chunks(chunks)

    print(f"[MAP] Processing batch {i // BATCH_SIZE_FOR_TOPIC_MAP + 1}")
    print(f"  Batch size: {len(batch)}")
    # Build batches of lightweight items
    items = []
    for c in chunks_sorted:
        cid = c["chunk_id"]
        txt = chunk_snippet(chunk_map.get(cid, ""))
        if not txt:
            continue
        items.append({
            "chunk_id": cid,
            "doc_name": c.get("doc_name", ""),
            "source_type": c.get("source_type", ""),
            "page": c.get("page", None),
            "snippet": txt
        })

    if not items:
        return []

    # MAP: summarize each batch into provisional topics with chunk_id assignments
    map_system = (
        "You are a curriculum designer. Return ONLY valid JSON.\n"
        "Task: Given a batch of course chunk snippets, group them into 2-5 provisional topics.\n"
        "Each provisional topic must include a short name and a list of EXACT chunk_ids from the input.\n"
        "Do not invent chunk_ids.\n\n"
        "Return schema:\n"
        "{\n"
        '  "provisional_topics": [\n'
        '    {"name": "Topic name", "summary": "1-2 sentences", "chunk_ids": ["..."]}\n'
        "  ]\n"
        "}\n"
    )

    provisional: List[dict] = []
    for i in range(0, len(items), BATCH_SIZE_FOR_TOPIC_MAP):
        batch = items[i:i + BATCH_SIZE_FOR_TOPIC_MAP]
        user = json.dumps({
            "course_title": course_title,
            "batch": batch
        }, indent=2)

        try:
            out = llm_generate_json(map_system, user, temperature=0.0)
            pts = out.get("provisional_topics", [])
            for t in pts:
                if not isinstance(t, dict):
                    continue
                name = (t.get("name") or "").strip()
                chunk_ids = t.get("chunk_ids") or []
                if not name or not isinstance(chunk_ids, list) or not chunk_ids:
                    continue
                # Filter to only chunk_ids in this batch
                batch_ids = {b["chunk_id"] for b in batch}
                filtered = [cid for cid in chunk_ids if cid in batch_ids]
                if not filtered:
                    continue
                provisional.append({
                    "name": name[:80],
                    "summary": (t.get("summary") or "").strip()[:240],
                    "chunk_ids": filtered
                })
        except Exception as e:
            print(f"[topic_map] batch {i//BATCH_SIZE_FOR_TOPIC_MAP} failed: {e}")

    if not provisional:
        # Fallback: 1 topic space with everything
        return [{
            "topic_space_id": "ts_01",
            "name": course_title,
            "summary": "All course content (fallback topic space).",
            "chunk_ids": [it["chunk_id"] for it in items][:MAX_CHUNKS_PER_TOPIC]
        }]

    # REDUCE: merge provisional topics into global topic spaces (max MAX_TOPIC_SPACES)
    reduce_system = (
        "You are a curriculum designer. Return ONLY valid JSON.\n"
        "Task: Merge provisional topics into a small set of global topic spaces for the entire course.\n"
        f"Create between 4 and {MAX_TOPIC_SPACES} topic spaces.\n"
        "Each topic space must have: name, summary, and a list of EXACT chunk_ids.\n"
        "You may merge or split provisional topics, but you must use ONLY the provided chunk_ids.\n"
        "Ensure coverage across the whole course, not only one document.\n\n"
        "Return schema:\n"
        "{\n"
        '  "topic_spaces": [\n'
        '    {"name": "Topic space name", "summary": "1-2 sentences", "chunk_ids": ["..."]}\n'
        "  ]\n"
        "}\n"
    )

    # Provide a compact view of provisional topics to avoid huge prompts
    prov_compact = []
    for p in provisional:
        prov_compact.append({
            "name": p["name"],
            "summary": p["summary"],
            "chunk_ids": p["chunk_ids"][:40]
        })

    reduce_user = json.dumps({
        "course_title": course_title,
        "provisional_topics": prov_compact
    }, indent=2)

    try:
        reduced = llm_generate_json(reduce_system, reduce_user, temperature=0.0)
        topic_spaces = reduced.get("topic_spaces", [])
    except Exception as e:
        print("[topic_reduce] failed:", e)
        topic_spaces = []

    # Validate and post-process
    all_valid_ids = set(it["chunk_id"] for it in items)
    cleaned: List[dict] = []
    used: set = set()

    def doc_spread_score(chunk_ids: List[str]) -> int:
        docs = set()
        for cid in chunk_ids:
            # chunk_id format: course__type__doc__pNNN
            parts = cid.split("__")
            if len(parts) >= 3:
                docs.add(parts[2])
        return len(docs)

    if isinstance(topic_spaces, list):
        for idx, t in enumerate(topic_spaces, start=1):
            if not isinstance(t, dict):
                continue
            name = (t.get("name") or "").strip()
            cids = t.get("chunk_ids") or []
            if not name or not isinstance(cids, list):
                continue
            cids = [cid for cid in cids if cid in all_valid_ids]
            if not cids:
                continue

            # Avoid duplicates and cap size
            unique = []
            for cid in cids:
                if cid in used:
                    continue
                unique.append(cid)
                used.add(cid)

            if not unique:
                continue

            # Optional: keep some duplicates allowed across topics?
            # If you want overlaps, remove used tracking above.

            # Enforce minimum and maximum
            if len(unique) < MIN_CHUNKS_PER_TOPIC:
                continue
            unique = unique[:MAX_CHUNKS_PER_TOPIC]

            cleaned.append({
                "topic_space_id": f"ts_{idx:02d}",
                "name": name[:80],
                "summary": (t.get("summary") or "").strip()[:240],
                "chunk_ids": unique
            })

    # If reduce failed or too narrow, do a doc-level fallback merge
    if not cleaned:
        # Group by doc_name
        by_doc: Dict[str, List[str]] = {}
        for it in items:
            by_doc.setdefault(it["doc_name"] or "unknown", []).append(it["chunk_id"])
        out = []
        for idx, (doc, cids) in enumerate(by_doc.items(), start=1):
            out.append({
                "topic_space_id": f"ts_{idx:02d}",
                "name": f"{doc} (auto)",
                "summary": "Auto topic space per document (fallback).",
                "chunk_ids": cids[:MAX_CHUNKS_PER_TOPIC]
            })
        return out[:MAX_TOPIC_SPACES]

    # If coverage is missing, add leftover chunks into a "Misc" topic
    leftover = [it["chunk_id"] for it in items if it["chunk_id"] not in used]
    if leftover:
        cleaned.append({
            "topic_space_id": f"ts_{len(cleaned)+1:02d}",
            "name": "Additional material",
            "summary": "Remaining pages not covered by other topic spaces.",
            "chunk_ids": leftover[:MAX_CHUNKS_PER_TOPIC]
        })

    # Sort so multi-doc topics show earlier
    cleaned.sort(key=lambda x: (-doc_spread_score(x["chunk_ids"]), -len(x["chunk_ids"])))
    return cleaned[:MAX_TOPIC_SPACES]

# =========================
# SUBSKILLS PER TOPIC SPACE
# =========================

def generate_subskills_for_topic_space(topic_space: dict, chunk_map: Dict[str, str]) -> List[dict]:
    """
    topic_space: {topic_space_id, name, summary, chunk_ids}
    Returns list of subskills with evidence_chunk_ids.
    """
    # Build evidence list with short text for grounding
    evidence = []
    for cid in topic_space["chunk_ids"]:
        txt = chunk_map.get(cid, "")
        if txt.strip():
            evidence.append({"chunk_id": cid, "text": chunk_snippet(txt, 700)})

    system = (
        "You are a curriculum designer.\n"
        "Return ONLY valid JSON.\n\n"
        "{\n"
        '  "subskills": [\n'
        '    {\n'
        '      "subskill_id": "short_snake_case_id",\n'
        '      "name": "Readable subskill title",\n'
        '      "evidence_chunk_ids": ["chunk_id1", "chunk_id2"]\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        f"- Create between {SUBSKILLS_PER_TOPIC_MIN} and {SUBSKILLS_PER_TOPIC_MAX} subskills\n"
        "- Each subskill must be specific, instructional, and testable\n"
        "- Use ONLY chunk_ids provided in the input evidence\n"
        "- Distribute coverage across the evidence, not only the first few chunks\n"
        "- Keep evidence_chunk_ids per subskill between 4 and 18 when possible\n"
    )

    user = json.dumps({
        "topic_space": {
            "topic_space_id": topic_space["topic_space_id"],
            "name": topic_space["name"],
            "summary": topic_space.get("summary", "")
        },
        "evidence": evidence
    }, indent=2)

    out = llm_generate_json(system, user, temperature=0.0)
    raw = out.get("subskills", [])

    allowed = {e["chunk_id"] for e in evidence}
    subskills = []
    for s in raw:
        if not isinstance(s, dict):
            continue
        sid = (s.get("subskill_id") or "").strip()
        name = (s.get("name") or "").strip()
        cids = s.get("evidence_chunk_ids") or []
        if not sid or not name or not isinstance(cids, list):
            continue
        cids = [cid for cid in cids if cid in allowed]
        if len(cids) < 2:
            continue
        subskills.append({
            "subskill_id": sid[:40],
            "name": name[:120],
            "mastery": 0.0,
            "evidence_chunk_ids": cids
        })

    # Fallback if LLM gave nothing
    if not subskills:
        subskills.append({
            "subskill_id": f"{topic_space['topic_space_id']}_basics",
            "name": f"{topic_space['name']} basics",
            "mastery": 0.0,
            "evidence_chunk_ids": topic_space["chunk_ids"][:12]
        })

    return subskills

# =========================
# BUILD FINAL TOPIC_SESSION
# =========================

def build_topic_session_from_chunks(
    chunks_path: str,
    title: str,
    out_dir: str,
) -> Tuple[str, str]:
    course_pack_id, chunks, chunk_map = load_chunks_jsonl(chunks_path)

    session = build_topic_session_skeleton(course_pack_id, title)

    topic_spaces = build_topic_spaces(title, chunks, chunk_map)

    # Flatten topic spaces into subskills (prefix ids to avoid collisions)
    all_subskills: List[dict] = []
    for ts in topic_spaces:
        subs = generate_subskills_for_topic_space(ts, chunk_map)
        for s in subs:
            # make ids unique by prefixing topic space
            s["subskill_id"] = f"{ts['topic_space_id']}__{s['subskill_id']}"
            # optional: add topic label into name
            s["name"] = f"{ts['name']}: {s['name']}"
            all_subskills.append(s)

    session["topic_session"]["subskills"] = all_subskills

    # Save outputs
    os.makedirs(out_dir, exist_ok=True)
    topic_spaces_path = os.path.join(out_dir, f"{course_pack_id}_topic_spaces.json")
    session_path = os.path.join(out_dir, f"{course_pack_id}_topic_session.json")

    with open(topic_spaces_path, "w", encoding="utf-8") as f:
        json.dump({"course_pack_id": course_pack_id, "topic_spaces": topic_spaces}, f, indent=2)

    with open(session_path, "w", encoding="utf-8") as f:
        json.dump(session, f, indent=2)

    return topic_spaces_path, session_path

# =========================
# OPTIONAL: RUN ONE STATE MACHINE STEP
# =========================
def maybe_build_diagnostic(session_path: str, chunks_path: str, out_dir: str):
    """
    If you have your existing functions available in your environment:
      - load_chunks_jsonl(path) returning chunk_map
      - build_diagnostic_quiz(topic_session_obj, chunk_map)
    then this will create a diagnostic in the session and write it back out.
    """
    try:
        # import your functions here if they are in another module
        # from my_state_machine import build_diagnostic_quiz
        from my_state_machine import build_diagnostic_quiz  # change this import
    except Exception:
        print("[info] Skipping state machine step. Add my_state_machine.py with build_diagnostic_quiz.")
        return

    # load
    with open(session_path, "r", encoding="utf-8") as f:
        session = json.load(f)

    _, _, chunk_map = load_chunks_jsonl(chunks_path)

    session = build_diagnostic_quiz(session, chunk_map)

    updated_path = os.path.join(out_dir, os.path.basename(session_path).replace("_topic_session.json", "_topic_session_with_diag.json"))
    with open(updated_path, "w", encoding="utf-8") as f:
        json.dump(session, f, indent=2)

    print("Wrote:", updated_path)

# =========================
# CLI
# =========================

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 4:
        print("Usage: python build_topic_session.py <chunks_jsonl_path> <course_title> <out_dir> [--with-diagnostic]")
        raise SystemExit(1)

    chunks_path = sys.argv[1]
    title = sys.argv[2]
    out_dir = sys.argv[3]
    with_diag = ("--with-diagnostic" in sys.argv[4:])

    topic_spaces_path, session_path = build_topic_session_from_chunks(
        chunks_path=chunks_path,
        title=title,
        out_dir=out_dir
    )

    print("Wrote:", topic_spaces_path)
    print("Wrote:", session_path)

    if with_diag:
        maybe_build_diagnostic(session_path, chunks_path, out_dir)