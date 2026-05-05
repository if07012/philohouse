# Discipline Tracker for Kids

Aplikasi berbasis web untuk membantu orang tua memonitor kedisiplinan anak dalam menyelesaikan tugas harian.

## Features

- **Daily Task Checklist** - Menampilkan daftar tugas harian dari Google Sheet
- **Check-In System** - Mencatat waktu penyelesaian dengan keterlambatan otomatis
- **Time-based Rules**:
  - Toleransi keterlambatan: 5 menit
  - Check-in valid hanya dalam 2 jam sebelum/sesudah target time
- **Parent Dashboard** - Laporan kedisiplinan anak

## Configuration

Tambahkan variabel berikut ke file `.env`:

```env
DISCIPLINE_SPREADSHEET_ID=your_google_sheet_id
DISCIPLINE_TOLERANCE_MINUTES=5
DISCIPLINE_MAX_WINDOW_MINUTES=120
```

## Google Sheet Structure

### Tasks Sheet
| id | name | targetTime | description |
|----|------|------------|-------------|
|    |      | HH:mm      |             |

### CheckIns Sheet (auto-created)
| id | taskId | taskName | targetTime | completedAt | delayMinutes | status | notes | createdAt |

## Pages

- `/discipline` - Main page with tasks and today's check-ins
- `/discipline/history` - All check-in history
- `/discipline/parent` - Parent report dashboard

## API Routes

- `GET /api/discipline/tasks` - Get all tasks
- `POST /api/discipline/tasks` - Add new task
- `GET /api/discipline/checkins?date=YYYY-MM-DD` - Get check-ins for date
- `POST /api/discipline/checkins` - Create new check-in
