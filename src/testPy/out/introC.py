import json

CHUNKS_PATH = "course_41297e14_chunks.jsonl"
OUT_PATH = "topic_session_intro_c_pointers.json"

COURSE_PACK_ID = "course_41297e14"
DOC_NAME = "Class6&7-Pointers_pptx.pdf"

def load_chunks(path):
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                out.append(json.loads(line))
    return out

def chunk_id_for_page(chunks, page):
    for c in chunks:
        if c["doc_name"] == DOC_NAME and c["page"] == page:
            return c["chunk_id"]
    raise ValueError(f"Missing page {page} for {DOC_NAME}")

chunks = load_chunks(CHUNKS_PATH)

# Build new topic session
topic_session = {
  "course_pack_id": COURSE_PACK_ID,
  "topic_session": {
    "topic_id": "intro_c_pointers",
    "title": "Intro C: Pointers",
    "state": "diagnostic",
    "prereq_topic_ids": [],
    "subskills": [
      {
        "subskill_id": "c_ptr_address_of",
        "name": "Address-of operator (&) and why scanf needs it",
        "mastery": 0.0,
        "evidence_chunk_ids": [chunk_id_for_page(chunks, 4)]
      },
      {
        "subskill_id": "c_ptr_declare_types",
        "name": "Declaring typed pointers and common declaration pitfalls",
        "mastery": 0.0,
        "evidence_chunk_ids": [chunk_id_for_page(chunks, 6), chunk_id_for_page(chunks, 9)]
      },
      {
        "subskill_id": "c_ptr_assign_deref",
        "name": "Assigning addresses to pointers and dereferencing to read/write",
        "mastery": 0.0,
        "evidence_chunk_ids": [chunk_id_for_page(chunks, 5), chunk_id_for_page(chunks, 10)]
      },
      {
        "subskill_id": "c_ptr_arithmetic",
        "name": "Pointer arithmetic and type-scaled increments",
        "mastery": 0.0,
        "evidence_chunk_ids": [chunk_id_for_page(chunks, 15), chunk_id_for_page(chunks, 16)]
      }
    ],
    "diagnostic": {
      "quiz_id": "",
      "questions": [],
      "submission": {
        "answers": [],
        "score": {"num_correct": 0, "num_total": 0, "percent": 0.0},
        "analysis": {"per_question": [], "weak_subskills": [], "suspected_prereq_topics": []}
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

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(topic_session, f, indent=2)

print("Wrote", OUT_PATH)
