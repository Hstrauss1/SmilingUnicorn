# 🗺️ Roadmap Page Flow Documentation

## Overview
The roadmap system uses **one dynamic page** that renders different course content based on the course pack ID passed through the URL.

## File Structure
```
src/app/roadmap/[id]/page.js  ← Single dynamic roadmap page
```

## Data Flow

### 1. **Dashboard → Roadmap**
```javascript
// Dashboard (src/app/dashboard/page.js)
<Link href={`/roadmap/${selectedPack.id}`}>
  Continue Learning
</Link>
```
When a user clicks on any course topic, they're directed to `/roadmap/COURSE_PACK_ID`

### 2. **Roadmap Page Loads Data**
```javascript
// Roadmap page (src/app/roadmap/[id]/page.js)
const params = useParams();  // Gets { id: "COURSE_PACK_ID" }

// Fetch data from Supabase using the ID
const pack = await getCoursePackById(params.id);
```

### 3. **Data Structure (from schema.json)**
```json
{
  "course_pack_id": "string",
  "topic_session": {
    "topic_id": "string",
    "title": "string",
    "state": "diagnostic|learning_session|final_quiz|completed",
    "subskills": [...],
    "diagnostic": {...},
    "learning_session": {...},
    "final_quiz": {...},
    "completion": {...}
  }
}
```

### 4. **Dynamic Rendering**
The same roadmap page renders:
- ✅ Completed topics with review option
- 📝 Diagnostic quizzes
- 📚 Learning sessions in progress
- 🎯 Final quizzes
- 🔒 Locked topics

## Supabase Integration

### Expected Tables
1. **course_packs** - Stores course pack metadata
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key to auth.users)
   - `title` (text)
   - `document_name` (text)
   - `learning_goal` (text)
   - `progress` (integer)
   - `status` (text)
   - `created_at` (timestamp)

2. **topic_sessions** - Stores individual topic data
   - `id` (UUID, Primary Key)
   - `course_pack_id` (UUID, Foreign Key to course_packs)
   - `topic_id` (text)
   - `title` (text)
   - `state` (text)
   - `completion_status` (text)
   - `order_index` (integer)

3. **subskills** - Stores subskill mastery data
   - `id` (UUID, Primary Key)
   - `topic_session_id` (UUID, Foreign Key)
   - `subskill_id` (text)
   - `name` (text)
   - `mastery` (float)

### RLS Policies
The Row Level Security (RLS) policies ensure users can only access their own course packs:
```sql
-- Enable RLS
ALTER TABLE course_packs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own course packs
CREATE POLICY "Users can view their own course packs"
  ON course_packs FOR SELECT
  USING (auth.uid() = user_id);
```

## Mock Data
If no real data exists in Supabase, the roadmap page automatically loads mock data for demonstration purposes. This allows you to develop and test the UI before connecting to real data.

## URL Examples
- `/roadmap/abc123` - Loads course pack with ID "abc123"
- `/roadmap/xyz789` - Loads course pack with ID "xyz789"

Same page, different data! 🎉

## Key Functions

### `getCoursePackById(id)`
Fetches a specific course pack from Supabase including all nested topic sessions and subskills.

### `loadRoadmapData()`
Loads the course pack data and falls back to mock data if needed.

### `calculateTopicProgress(topic)`
Calculates progress percentage based on subskill mastery levels.

### `getActionButton(topic)`
Dynamically renders the appropriate button (Take Diagnostic, Continue Learning, Review, etc.) based on topic state.

## Next Steps
1. Set up Supabase tables according to schema.json
2. Implement `getCoursePackById()` in `/lib/supabase/coursePacks.js`
3. Upload a document to generate real course pack data
4. The same roadmap page will automatically render the real data!
