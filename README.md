# Philihouse.id — Multi-Feature Next.js Application

A modern Next.js 16 application built with React 19, TypeScript, and Tailwind CSS v4. This platform combines an e-commerce cookie ordering system with educational examination tools and vocabulary learning features.

## 🍪 Features

### 1. Cookie Order System (`/order`)
A complete e-commerce solution for ordering handmade cookies:
- **Product Catalog**: Browse cookies with image gallery and search functionality
- **Size Options**: Multiple size options (Satuan, 400ml, 500ml, 700ml, 1 Liter)
- **Order Types**: Single items or hampers
- **Customer Form**: Name, WhatsApp (Indonesian phone validation), shipping address, notes
- **Sales Tracking**: Support for sales agent tracking via query parameters
- **Spin Wheel Game**: Gamified rewards system based on order total
  - Orders ≥250k: 1 spin
  - Orders ≥500k: 2 spins
  - Orders ≥750k: 3 spins
  - Prizes include free cookies and discounts
- **Order Summary**: Real-time price calculation
- **Data Storage**: Orders saved to Google Sheets (Orders & Cookie Details sheets)
- **Notifications**: Telegram notifications for new orders
- **Invoice Generation**: PDF invoice generation with QR codes
- **Order Management**: View order list, edit orders, track invoice status

### 2. Examination System (`/examination`)
AI-powered exam generation and assessment platform for Grade 4 students:
- **Learning Materials**: Manage educational materials from Google Sheets
- **AI Exam Generation**: Generate exams using LLM providers:
  - **Groq** (cloud-based)
  - **Ollama** (local deployment)
- **Question Types** (per exam):
  - 10 single-choice MCQs
  - 5 multi-choice MCQs
  - 5 fill-in-the-blank questions
  - 3 essay questions
- **Exam Modes**:
  - Preview mode for instructors
  - Take exam mode for students
  - Review mode for checking answers
  - Results view with scoring
- **Answer Evaluation**: AI-powered answer checking
- **Session Management**: Persistent exam session storage
- **Score Tracking**: Comprehensive scoring and summary reports
- **Telegram Notifications**: Notify instructors about submissions
- **Data Storage**: All exam data stored in Google Sheets

### 3. Vocabulary Learning (`/vocabulary`)
Language learning module with structured vocabulary practice:
- **Language Categories**: Organized by language (English, etc.)
- **Level-based Learning**: Structured proficiency levels (A1, A2, B1, B2, C1, C2)
- **Learn Mode**: Interactive vocabulary practice
- **Progress Tracking**: Level summaries and reports

### 4. Additional Features
- **Todo App** (`/todo`): Simple task management
- **Remember Page** (`/remember`): Memory/flashcard feature
- **Rules Page** (`/rules`): Terms and conditions
- **Authentication** (`/api/auth/login`): Login system with reCAPTCHA v3

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **React**: 19.2.3
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS v4.1.18
- **Fonts**: Geist Sans & Geist Mono
- **PDF Generation**: @react-pdf/renderer
- **HTTP Client**: Axios
- **Markdown**: react-markdown with remark-gfm

### Integrations
- **Google Sheets**: Data persistence using `google-spreadsheet` and `google-auth-library`
- **Telegram Bot**: Notifications via Telegram API
- **reCAPTCHA v3**: Spam protection
- **LLM Providers**: Groq API and Ollama for AI-powered features

## 📁 Project Structure

```
/workspace
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/               # Authentication endpoints
│   │   ├── examination/        # Exam-related APIs
│   │   ├── invoice/            # Invoice generation APIs
│   │   ├── orders/             # Order management APIs
│   │   ├── sheet/              # Google Sheets CRUD APIs
│   │   ├── telegram/           # Telegram notification APIs
│   │   ├── todo/               # Todo APIs
│   │   └── vocabulary/         # Vocabulary APIs
│   ├── examination/            # Examination feature
│   │   ├── [examId]/           # Dynamic exam routes
│   │   ├── components/         # Exam UI components
│   │   ├── hooks/              # Custom React hooks
│   │   └── lib/                # Exam business logic
│   ├── order/                  # Cookie ordering feature
│   │   ├── components/         # Order form components
│   │   ├── data/               # Product data & helpers
│   │   ├── edit/               # Order editing
│   │   ├── lib/                # Invoice server logic
│   │   ├── list/               # Order list views
│   │   ├── spin/               # Spin wheel game
│   │   └── thanks/             # Order confirmation
│   ├── vocabulary/             # Vocabulary learning
│   │   └── [language]/         # Language-specific routes
│   ├── lib/                    # Shared utilities
│   │   ├── googleSheets.ts     # Google Sheets integration
│   │   └── telegramSend.ts     # Telegram messaging
│   ├── todo/                   # Todo application
│   ├── hello/, remember/, rules/  # Additional pages
│   ├── page.tsx                # Home page (cookie showcase)
│   └── layout.tsx              # Root layout
├── public/                     # Static assets
├── package.json
├── next.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ 
- npm, yarn, pnpm, or bun
- Google Cloud credentials (for Google Sheets)
- Telegram Bot Token (for notifications)
- Groq API key or Ollama setup (for exam generation)
- reCAPTCHA v3 site key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd <project-directory>

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Environment Variables

Create a `.env.local` file with the following:

```env
# Google Sheets Integration
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=chat-id-1,chat-id-2

# reCAPTCHA v3
REACT_APP_RECAPTCHA_SITE_KEY=your-recaptcha-site-key

# LLM Providers (optional)
GROQ_API_KEY=your-groq-api-key
OLLAMA_BASE_URL=http://localhost:11434

# Sheet IDs
EXAM_SPREADSHEET_ID=your-exam-sheet-id
ORDER_SPREADSHEET_ID=your-order-sheet-id
```

## 📄 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🔌 API Endpoints

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/[orderId]` - Get order details
- `POST /api/invoice/save` - Save invoice
- `GET /api/invoice/[orderId]` - Get invoice

### Examination
- `GET /api/examination/materials` - List learning materials
- `POST /api/examination/generate` - Generate new exam
- `GET /api/examination/exams` - List user's exams
- `POST /api/examination/check-answer` - Validate answer
- `POST /api/examination/evaluate` - Evaluate exam submission
- `GET /api/examination/session/[examId]` - Get exam session

### Google Sheets
- `POST /api/sheets/write` - Append data to sheet
- `GET /api/sheets/read` - Read data from sheet
- `POST /api/sheets/update` - Update sheet data

### Telegram
- `POST /api/telegram/send` - Send notification message

### Vocabulary
- `GET /api/vocabulary/level-summary` - Get learning progress
- `POST /api/vocabulary/report` - Submit practice report

## 🎨 Design Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Custom Color Palette**: Calm teals, soft pinks, and warm neutrals
- **Animations**: Smooth transitions, fade-ins, and carousel effects
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
- **Image Optimization**: Next.js Image component with lazy loading

## 📊 Data Flow

1. **User Input** → React Components → API Routes
2. **API Routes** → Business Logic → External Services
3. **External Services**:
   - Google Sheets (primary database)
   - Telegram (notifications)
   - Groq/Ollama (AI processing)
4. **Response** → Client State Updates → UI Re-render

## 🔐 Security

- **reCAPTCHA v3**: Prevents automated spam submissions
- **Server-side Validation**: All inputs validated on API routes
- **Environment Variables**: Sensitive credentials stored securely
- **JWT Authentication**: Service account authentication for Google APIs

## 📝 License

This project is private and proprietary.

## 👥 Support

For issues or questions, please contact the development team.
