import os, json, re
import pdfplumber
from uuid import uuid4
from datetime import datetime

def clean_text(s: str) -> str:
    if not s:
        return ""
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def extract_pdf_chunks(pdf_path: str, course_pack_id: str, source_type: str):
    """
    Returns list of chunk dicts:
    {chunk_id, course_pack_id, source_type, doc_name, page, text}
    """
    doc_name = os.path.basename(pdf_path)
    chunks = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = clean_text(page.extract_text() or "")
            if not text:
                continue
            chunk_id = f"{course_pack_id}__{source_type}__{doc_name}__p{i:03d}"
            chunks.append({
                "chunk_id": chunk_id,
                "course_pack_id": course_pack_id,
                "source_type": source_type,
                "doc_name": doc_name,
                "page": i,
                "text": text
            })
    return chunks

def build_topic_session_skeleton(course_pack_id: str, title: str):
    # Use ISO format with Z suffix for UTC time (compatible with Python 3.8+)
    now = datetime.utcnow().isoformat() + "Z"
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

def main(pdf_dir: str, title: str, output_dir: str = None):
    course_pack_id = f"course_{uuid4().hex[:8]}"
    all_chunks = []

    # Heuristic: decide if a pdf is slides vs labs by filename
    for fname in os.listdir(pdf_dir):
        if not fname.lower().endswith(".pdf"):
            continue
        path = os.path.join(pdf_dir, fname)
        lower = fname.lower()
        source_type = "labs" if ("lab" in lower or "assignment" in lower) else "slides"
        all_chunks.extend(extract_pdf_chunks(path, course_pack_id, source_type))

    # Use provided output_dir or default to "out" in current directory
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
    
    # Write chunks jsonl
    os.makedirs(output_dir, exist_ok=True)
    chunks_path = os.path.join(output_dir, f"{course_pack_id}_chunks.jsonl")
    with open(chunks_path, "w", encoding="utf-8") as f:
        for c in all_chunks:
            f.write(json.dumps(c) + "\n")

    # Build skeleton topic session
    session = build_topic_session_skeleton(course_pack_id, title)

    # Optional: attach all chunk ids to a placeholder subskill so you can demo citations now
    # You can delete this once you generate real subskills.
    session["topic_session"]["subskills"] = [{
        "subskill_id": "subskill_placeholder",
        "name": "Placeholder (replace after topic extraction)",
        "mastery": 0.0,
        "evidence_chunk_ids": [c["chunk_id"] for c in all_chunks[:20]]  # cap for size
    }]

    session_path = os.path.join(output_dir, f"{course_pack_id}_topic_session.json")
    with open(session_path, "w", encoding="utf-8") as f:
        json.dump(session, f, indent=2)

    print(f"SUCCESS: Generated {len(all_chunks)} chunks from {len([f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')])} PDF files")
    print(f"CHUNKS_FILE: {chunks_path}")
    print(f"SESSION_FILE: {session_path}")
    print(f"COURSE_PACK_ID: {course_pack_id}")

if __name__ == "__main__":
    # Example usage:
    # main("./my_course_pdfs", "Embedded Systems Midterm: Stack + Calling Convention")
    import sys
    if len(sys.argv) < 3:
        print("Usage: python parse_course.py <pdf_dir> <title> [output_dir]")
        raise SystemExit(1)
    output_dir = sys.argv[3] if len(sys.argv) > 3 else None
    main(sys.argv[1], sys.argv[2], output_dir)