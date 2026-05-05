# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js 16** application with multiple educational and commercial features:

### Main Modules

1. **Philihouse Cookies** (`/order`) - E-commerce order form with:
   - Cookie selection with multiple sizes
   - Google Sheets integration for order storage
   - Telegram notifications for new orders
   - Spin-the-wheel reward system
   - Invoice generation with PDF support

2. **Examination System** (`/examination`) - Test/exam platform with:
   - AI-generated questions from materials (MCQ, multi MCQ, fill-in, essay)
   - LLM providers: Groq (cloud) and Ollama (local)
   - Student submission tracking
   - Google Sheet integration for results
   - Telegram notifications for exam events

3. **Mystery Reading** (`/mystery-reading`) - Kids' reading program with:
   - Story library with daily content
   - Quiz system (10 questions per story)
   - Child profile management with XP/level system
   - Parent authentication
   - Daily streak and badge tracking

4. **Vocabulary** (`/vocabulary`) - English vocabulary learning

5. **Translation Training** (`/translation-training`) - Translation practice

6. **Remember** (`/remember`) - General memorization feature

### Tech Stack

- **Framework**: Next.js 16.1.6 with App Router
- **React**: 19.2.3
- **Styling**: Tailwind CSS 4.1.18 (postcss)
- **TypeScript**: Strict mode enabled
- **LLM Integration**: OpenAI SDK, Anthropic Claude Code SDK
- **Google Sheets**: `google-spreadsheet` and custom sheet helpers
- **PDF**: `@react-pdf/renderer`
- **Authentication**: Custom auth with session management
- **Captcha**: reCAPTCHA v3

### Architecture

- **API Routes**: `/app/api/` contains REST endpoints for Sheets, Exams, Mystery Reading, Translation Training, Orders, Telegram
- **Server Actions**: Many features use direct API calls from server components
- **Shared Libraries**: `/lib/` contains reusable utilities (googleSheets, telegramSend)
- **Feature Libraries**: Each major module has its own lib directory (e.g., `/examination/lib/`) for domain-specific helpers

### Environment Variables

Key env vars (from code analysis):
- `GOOGLE_SHEET_ID` / `QUESTIONS_SHEET_ID` - Sheet for orders/questions
- `REACT_APP_RECAPTCHA_SITE_KEY` - reCAPTCHA key
- `TELEGRAM_BOT_TOKEN` - Telegram notifications
- Groq/Ollama endpoints for AI generation
- Mystery Reading auth credentials

## Common Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
```

## Development Notes

- Path alias `@/*` resolves to `./*`
- Project uses modern React patterns (Server Components, Suspense, hooks)
- TypeScript strict mode enabled
- Indonesian language used in UI text (Bahasa Indonesia)
- Jakarta timezone used for date operations (see `mystery-reading/lib/dateJakarta.ts`)
