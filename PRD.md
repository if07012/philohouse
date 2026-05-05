# Product Requirements Document (PRD)

## Project Overview

**Philihouse.id / remember.app** is a multi-tenant Next.js 16 web application serving multiple educational and commercial purposes. Built with Google Sheets as the backend, it provides a flexible, maintainable platform for:

- Cookie e-commerce ordering
- Exam/examination creation and delivery
- Kids' mystery reading program
- Vocabulary learning (English, Arabic, Indonesian)
- Translation training
- Quran Ayah memorization
- Daily todo tracking

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| UI Library | React 19.2.3 |
| Styling | Tailwind CSS 4.1.18 |
| Language | TypeScript (strict mode) |
| Backend | Google Sheets API (service account) |
| AI/LLM | Groq (cloud), Ollama (local), OpenAI |
| Notifications | Telegram Bot API |
| PDF Generation | @react-pdf/renderer |
| Captcha | reCAPTCHA v3 |
| Auth | Session-based (sessionStorage) |

---

## Modules

### 1. Philihouse Cookies (`/order`)
**Status**: Production

**Purpose**: Cookie e-commerce order form with inline product selection, order tracking, and fulfillment.

**Key Features**:
- Cookie selection with multiple sizes (400ml, 600ml, 800ml, Satuan)
- Single or hampers order types
- Customer info: name, WhatsApp, address, note
- Sales representative tracking
- Spin-the-wheel reward system (based on order total)
- Google Sheets storage (Orders, Cookie Details, Spin Rewards sheets)
- Telegram notifications for new orders
- Invoice generation with PDF support
- Order listing, editing, and management

**Environment Variables**:
- `NEXT_PUBLIC_GOOGLE_SHEET_ID` - Orders spreadsheet
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` - Notifications
- `REACT_APP_RECAPTCHA_SITE_KEY` - Form protection

---

### 2. Examination (`/examination`)
**Status**: Production

**Purpose**: AI-generated quiz/exam platform for grade 4 students with multiple question types.

**Key Features**:
- Learning materials management (Materials sheet)
- AI question generation from materials:
  - Single MCQ, Multi MCQ, Fill-in-blank, Essay
- LLM providers: Groq (cloud) or Ollama (local)
- Student quiz taking with step-by-step interface
- Answer history tracking per question
- Automatic Groq-based evaluation
- Result saving to ExamSubmissions sheet
- Telegram notifications for exam events

**Sheets Used**:
- `Materials` - Learning content
- `ExamQuestions` - Generated questions
- `Exams` - Exam metadata
- `ExamSubmissions` - Student submissions and results

**Environment Variables**:
- `GRADE4_EXAM_SPREADSHEET_ID` - Exams sheet
- `GROQ_API_KEY` or `OLLAMA_BASE_URL` + `OLLAMA_MODEL`
- `EXAM_LLM_PROVIDER=groq` or `ollama`

---

### 3. Mystery Reading (`/mystery-reading`)
**Status**: Production

**Purpose**: Kids' reading comprehension program with daily story generation, quizzes, and gamification.

**Key Features**:
- Daily story generation with AI (OpenAI)
- Quiz system (10 questions per story)
- Story categories: fact, inference, logic, sequence, moral
- Parent authentication with PIN
- Child profile management with:
  - XP/level progression
  - Daily streak tracking
  - Badge system
  - Rolling average score
- Parent dashboard with analytics
- Image generation for stories

**Sheets Used**:
- `MysteryDaily` - Story content
- `MysteryQuiz` - Quiz questions
- `MysteryFamilies` - Parent accounts
- `MysteryChildren` - Child profiles
- `MysteryAttempts` - Quiz attempts

**Environment Variables**:
- `MYSTERY_READING_SPREADSHEET_ID`
- `MYSTERY_SESSION_SECRET`
- `MYSTERY_CRON_SECRET`
- `NANOBANANA_API_KEY` - Image generation

---

### 4. Vocabulary (`/vocabulary`)
**Status**: Production

**Purpose**: Vocabulary learning platform with repetition-based testing and progress tracking.

**Key Features**:
- Multiple language support (English, Arabic, Indonesian)
- Level-based curriculum organization
- Text-to-speech for pronunciation
- 3-round test format
- Word-level performance tracking
- Pass/fail status (90% required to pass)
- Level summary reports saved to Google Sheets
- Detailed word performance dashboard

**Sheets Used**:
- Language-level sheets (e.g., `English-A1`, `English-A2`)
- `Vocabulary-Level-Summary` - Pass status tracking

**Environment Variables**:
- `QUESTIONS_SHEET_ID` - Main vocabulary spreadsheet

---

### 5. Translation Training (`/translation-training`)
**Status**: Production

**Purpose**: English-to-Indonesian translation practice with AI-assisted grading and feedback.

**Key Features**:
- English phrase selection
- Two input modes: full sentence or phrase-by-phrase
- AI sentence segmentation (via Groq/Ollama)
- Automatic evaluation with scoring
- Detailed feedback and suggestions
- Attempt history tracking
- Pass threshold: 80%

**Sheets Used**:
- `Translation-EN-ID` - Training items
- `TranslationAttempts` - User progress

**Environment Variables**:
- `TRANSLATION_TRAINING_SPREADSHEET_ID`
- `TRANSLATION_TRAINING_LLM_PROVIDER=groq` or `ollama`

---

### 6. Remember (`/remember`)
**Status**: Production

**Purpose**: Quran Ayah memorization tracking with quiz generation and audio playback.

**Key Features**:
- Ayah range selection by Surah and Ayah number
- Customizable question count
- "Next/Previous Ayah" question types
- Audio playback (Mishary Alafasy recitation)
- Local caching of Ayah API responses
- Telegram result reporting

**Storage**:
- `localStorage` for memorized ayah ranges
- In-memory + localStorage for Ayah API cache

**Environment Variables**:
- None specific (uses public API)

---

### 7. Todo (`/todo`)
**Status**: Production

**Purpose**: Daily checklist with Google Sheets sync.

**Key Features**:
- Item listing with order
- Check/uncheck completion status
- Daily reset
- Progress tracking

**Sheets Used**:
- `Todos` - Todo items
- `TodoStatus` - Daily completion status

**Environment Variables**:
- `TODO_SHEET_ID`

---

## Google Sheets Architecture

All modules use Google Sheets as a database with specific tab structures:

| Sheet Name | Purpose | Columns |
|------------|---------|---------|
| `Materials` | Exam content | material_id, title, content, image_url |
| `ExamQuestions` | Generated questions | exam_id, question_id, type, question_text, options_json, correct_answer, explanation |
| `Exams` | Exam metadata | exam_id, material_id, material_title, created_at |
| `ExamSubmissions` | Student answers | submission_id, answers_json, evaluation_json, flagged_question_ids |
| `MysteryDaily` | Story content | story_date, title, content_md, clues_json, image_url |
| `MysteryQuiz` | Quiz content | story_date, questions_json, created_at |
| `MysteryFamilies` | Parent accounts | family_id, parent_label, pin_hash, created_at |
| `MysteryChildren` | Child profiles | child_id, family_id, nickname, xp, level, badges_json |
| `MysteryAttempts` | Quiz attempts | attempt_id, child_id, answers_json, score_percent |
| `Translation-EN-ID` | Training items | id, english, indonesian, tags |
| `TranslationAttempts` | User progress | attempt_id, item_id, score_percent, feedback |
| `Vocabulary-Level-Summary` | Level pass status | Language, Level, IsPass, completedAt |

---

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Sheets auth | order-philihouse@...gserviceaccount.com |
| `GOOGLE_PRIVATE_KEY` | Sheets auth | -----BEGIN PRIVATE KEY-----... |
| `NEXT_PUBLIC_GOOGLE_SHEET_ID` | Orders sheet | 1OQ64g4j2ro8do27exnDby2rPKa... |
| `QUESTIONS_SHEET_ID` | Vocabulary/Questions | 1QPrVTfy9UhhZdEnAMwVkZ-... |
| `GRADE4_EXAM_SPREADSHEET_ID` | Exams | 1MFhi5EBlYEY6Tx8dvMEUNMpM... |
| `MYSTERY_READING_SPREADSHEET_ID` | Mystery reading | 1FeJaLDzzE1nv29es7j_3Qp-... |
| `TRANSLATION_TRAINING_SPREADSHEET_ID` | Translation | 1qqSYodWs4piYJjwbPTLOzbD... |
| `TODO_SHEET_ID` | Todo list | 1kCrEXxu8O8_flSvC56adUY0... |
| `GROQ_API_KEY` | Groq LLM | gsk_... |
| `OLLAMA_BASE_URL` | Ollama LLM | http://127.0.0.1:11434 |
| `OLLAMA_MODEL` | Ollama model | gpt-oss:20b-cloud |
| `OPENAI_API_KEY` | OpenAI | sk-proj-... |
| `TELEGRAM_BOT_TOKEN` | Telegram | 8535598436:AA... |
| `TELEGRAM_CHAT_ID` | Telegram chat | 5178445302 |
| `MYSTERY_SESSION_SECRET` | Auth secret | S3cr3t_S3ss10n_S3cr3t |
| `CACHE_ADMIN_TOKEN` | Cache clear | S3cr3t_C4ch3_A4dmin_T0k3n |

---

## Common Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

---

## Development Notes

- **Path Alias**: `@/*` resolves to `./*`
- **Timezone**: Jakarta (UTC+7) used for all date operations
- **Language**: Indonesian (Bahasa) used in UI text
- **Auth**: Session-based via `sessionStorage` (simple username/password)
- **Caching**: LocalStorage used for API responses and memorized content
- **No Tests**: No test suite configured yet

---

## Current State & Roadmap

### What's Working
- All 7 modules are production-ready
- Google Sheets integration stable
- Telegram notifications functional
- LLM generation working (Groq/Ollama)
- Parent/child auth for Mystery Reading

### Known Limitations
- No automated test coverage
- No pagination on list views
- Basic error handling (try/catch only)
- No refresh tokens (sessionStorage only)
- Hardcoded constants in some files
- No internationalization (Indonesian only)

### Potential Improvements
- Unit/integration tests
- Pagination for large datasets
- Better error boundaries
- JWT or token refresh system
- Config file for constants
- i18n for multi-language support
