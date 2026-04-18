# OpenEducation - Adaptive Learning Platform

An AI-powered tutoring platform built with Next.js and Supabase that generates personalized learning experiences from PDF course materials.

## Overview

OpenEducation is an intelligent tutoring system that:
- Processes PDF course materials to generate diagnostic quizzes
- Uses AI to generate personalized learning modules and discussions
- Provides voice-enabled AI tutoring via ElevenLabs integration
- Tracks mastery and completion status for each learning module

## Key Features

### Adaptive Module Completion Logic
The platform implements intelligent module progression:
- **Ace the Diagnostic (100%)**: Module is immediately completed - skip all learning activities
- **Fail the Diagnostic (<100%)**: Generate personalized learning modules based on weak areas, then require final quiz
- **Final Quiz**: Must achieve 100% to complete the module
- **Retake Until Success**: If final quiz is failed, user must retake until 100% is achieved

### AI-Powered Content Generation
- **Diagnostic Quizzes**: Auto-generated from PDF course content using OpenAI
- **Learning Modules**: Dynamically created based on mastery gaps
- **Discussion Topics**: AI-generated contextual discussions for deeper understanding
- **Voice Tutoring**: Interactive voice agent for real-time Q&A

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TailwindCSS 4** - Styling
- **Supabase Client** - Authentication and real-time data

### Backend
- **Supabase** - PostgreSQL database, authentication, and storage
- **Next.js API Routes** - Serverless API endpoints
- **Python** - PDF processing and AI content generation
  - `pdfplumber` - PDF text extraction
  - `openai` - GPT-4 integration for quiz/module generation

### AI & Voice
- **OpenAI API** - Content generation (GPT-4)
- **ElevenLabs** - Voice synthesis for AI tutor

## Project Structure

```
/src
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── build-diagnostic/     # Generate diagnostic quizzes
│   │   ├── complete-discussion/  # Mark discussions complete
│   │   ├── generate-diagnostic/  # Initial diagnostic generation
│   │   ├── process-pdf/          # Upload and process PDFs
│   │   └── submit-diagnostic/    # Grade quizzes, manage state transitions
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # User dashboard with course packs
│   ├── discussion/               # AI discussion interface
│   ├── login/                    # Login page
│   ├── roadmap/                  # Learning roadmap view
│   ├── topic/[topicId]/          # Quiz and learning module UI
│   └── upload/                   # PDF upload interface
├── components/                   # React components
│   ├── Features.js               # Landing page features
│   ├── Footer.js                 # Site footer
│   ├── Header.js                 # Navigation header
│   ├── Hero.js                   # Landing page hero
│   ├── HowItWorks.js            # Feature explanation
│   └── VoiceAgent.js            # AI voice tutor component
├── contexts/
│   └── AuthContext.js           # Authentication state management
├── db/
│   ├── csen.json                # Sample course data
│   └── schema.json              # Database schema reference
├── lib/
│   ├── loadDiagnostics.js       # Load diagnostic data
│   └── supabase/                # Supabase utilities
│       ├── client.js            # Client-side Supabase
│       ├── server.js            # Server-side Supabase
│       ├── middleware.js        # Auth middleware
│       ├── coursePacks.js       # Course pack utilities
│       └── database.js          # Database helpers
└── testPy/                      # Python AI generation scripts
    ├── generate_diagnostic.py   # Diagnostic quiz generation
    ├── plumb.py                 # PDF processing utilities
    └── PDF/                     # Sample course PDFs
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.12+
- Supabase account
- OpenAI API key
- ElevenLabs API key (for voice features)

### Environment Setup

Create a `.env.local` file:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# ElevenLabs (optional)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### Installation

1. Install JavaScript dependencies:
```bash
npm install
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up Supabase database:
```bash
# Run migration scripts
psql your_database < supabase_migration.sql
psql your_database < supabase_add_course_pack_id.sql
psql your_database < supabase_add_roadmap_json.sql
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Database Schema

### `course_packs` Table
Stores user learning data with JSONB structure:
- `user_id`: User identifier
- `course_packs`: Array of course pack objects containing:
  - `course_pack_id`: Unique pack identifier
  - `title`: Course pack name
  - `topic_session`: Learning session data
    - `state`: Current state (diagnostic, learning_session, final_quiz, completed)
    - `diagnostic`: Quiz questions and submission
    - `learning_session`: Active learning modules
    - `completion`: Completion status and timestamp
    - `mastery`: Subject mastery levels

## API Endpoints

### `/api/process-pdf`
Upload and process PDF course materials
- **Method**: POST
- **Body**: FormData with PDF file and metadata
- **Returns**: Course pack with initial structure

### `/api/generate-diagnostic`
Generate initial diagnostic quiz from course content
- **Method**: POST
- **Body**: `{ coursePackId }`
- **Returns**: Diagnostic quiz questions

### `/api/submit-diagnostic`
Submit quiz answers and transition state
- **Method**: POST
- **Body**: `{ coursePackId, answers, isFinalQuiz }`
- **Returns**: Graded results, next state
- **Logic**:
  - If score = 100% on diagnostic → complete module
  - If score < 100% on diagnostic → generate learning modules
  - If score = 100% on final quiz → complete module
  - If score < 100% on final quiz → retake required

### `/api/complete-discussion`
Mark discussion module as complete
- **Method**: POST
- **Body**: `{ coursePackId }`
- **Returns**: Updated state

## Learning Flow

1. **Upload**: User uploads PDF course material
2. **Diagnostic Generation**: AI analyzes PDF and creates diagnostic quiz
3. **Take Diagnostic**: User completes diagnostic quiz
4. **Adaptive Branching**:
   - **100% Score**: Module completed ✓
   - **<100% Score**: Generate learning modules based on weak areas
5. **Learning Modules**: User studies personalized content
6. **AI Discussion**: Optional discussion for deeper understanding
7. **Final Quiz**: Retake diagnostic as final assessment
8. **Completion Check**:
   - **100% on Final**: Module completed ✓
   - **<100% on Final**: Retake required (loop to step 7)

## Development

### Run Development Server
```bash
npm run dev
```

### Run Linter
```bash
npm run lint
```

### Build for Production
```bash
npm run build
npm start
```

## Scripts

- `setup.sh` - Initial project setup
- `test_pipeline.sh` - Test the quiz generation pipeline
- `verify_integration.sh` - Verify Supabase integration
- `verify_schema.js` - Validate database schema

## License

See `LICENSE` file for details.
