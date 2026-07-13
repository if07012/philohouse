# Product Requirements Document (PRD)

# Quiz Management System

## 1. Document Information

| Item            | Detail                          |
| --------------- | ------------------------------- |
| Product         | Quiz Management System          |
| Technology      | Next.js                         |
| Database        | Google Sheets                   |
| Target Platform | Web Responsive                  |

---

# 2. Product Overview

Quiz Management System adalah aplikasi berbasis web yang memungkinkan pengguna mengerjakan soal pilihan ganda dengan batas waktu tertentu. Setelah quiz selesai, pengguna dapat langsung melihat hasil, jawaban yang benar dan salah, serta total nilai yang diperoleh dan waktu yang dihabiskan dalam menjawab pertanyaan per soal atau keseluruhan.

Seluruh riwayat quiz akan tersimpan sehingga pengguna dapat melihat perkembangan hasil dari seluruh quiz yang pernah dikerjakan.

Administrator dapat membuat quiz dengan soal yang terdiri dari teks maupun gambar, begitu juga pilihan jawabannya.

---

# 3. Goals

## User Goals

* Mengerjakan quiz dengan mudah
* Mengetahui hasil secara langsung
* Mengetahui jawaban yang benar
* Melihat riwayat nilai
* Melihat perkembangan hasil belajar

## Business Goals

* Mudah membuat quiz baru
* Mudah mengelola soal
* Data disimpan menggunakan Google Sheets
* Biaya operasional rendah
* Tidak membutuhkan database server

---

# 4. Scope

## In Scope

* Multiple Quiz
* Multiple Choice
* Countdown Timer
* Result Page
* Quiz History
* Review Answer
* Google Sheets Storage
* Image Support
* Text Support
* Responsive

## Out of Scope

* Essay
* Drag & Drop
* Audio Question
* Video Question
* Random Question AI

---

# 5. User Roles

## Student

* Melihat daftar quiz
* Mengerjakan quiz
* Melihat hasil
* Melihat history

---

## Admin

* Membuat quiz
* Mengedit quiz
* Menghapus quiz
* Mengelola soal
* Mengelola jawaban
* Melihat report seluruh peserta

---

# 6. Functional Requirements

---

## FR-001 Quiz List

### Description

Menampilkan seluruh quiz yang tersedia.

### Information

* Judul Quiz
* Deskripsi
* Jumlah Soal
* Durasi
* Passing Score
* Status
* Last Score (jika pernah mengerjakan)

### Action

* Start Quiz

---

## FR-002 Start Quiz

Saat tombol Start ditekan:

* Generate Session Quiz
* Simpan waktu mulai
* Mulai countdown timer
* Ambil seluruh soal

---

## FR-003 Quiz Question

Satu halaman menampilkan:

### Header

* Nama Quiz
* Timer
* Progress

Contoh

```
Quiz Matematika

00:18:24

Question 5 of 20
```

---

### Body

Question dapat berupa

#### Text

```
Berapakah hasil 5 x 6 ?
```

atau

#### Image

```
[Image]
```

atau

Gabungan

```
Gambar berikut menunjukkan....

[Image]
```

---

### Answer

Pilihan jawaban mendukung

### Text

```
A. 20

B. 25

C. 30

D. 40
```

---

### Image

```
A.
[Image]

B.
[Image]
```

---

### Mixed

```
A.

Segitiga

[Image]

B.

Persegi

[Image]
```

---

### Navigation

* Previous
* Next
* Finish

---

## FR-004 Auto Save Answer

Setiap user memilih jawaban:

* otomatis tersimpan
* tidak perlu klik Save

---

## FR-005 Timer

Quiz memiliki durasi.

Misal

```
30 Menit
```

Saat waktu habis

* quiz otomatis submit
* tampil Result

---

## FR-006 Finish Quiz

Quiz dapat selesai karena

* klik Finish
* waktu habis

---

## FR-007 Calculate Score

Perhitungan score

```
Correct Answer = 5 point

Wrong Answer = 0

Skipped = 0
```

Contoh

20 soal

Benar = 17

Score

17 x 5 = 85

---

## FR-008 Result Page

Setelah submit

Tampilkan

```
Score

85

Correct

17

Wrong

3

Passing

YES
```

---

## FR-009 Review Answer

User dapat melihat seluruh soal kembali.

Setiap soal menampilkan

* Pertanyaan
* Jawaban User
* Jawaban Benar
* Status

```
✔ Correct

✖ Wrong
```

---

## FR-010 Quiz History

Menampilkan seluruh quiz yang pernah dikerjakan.

Kolom

| Quiz | Date | Score | Status |
| ---- | ---- | ----- | ------ |

---

## FR-011 Report Dashboard

Menampilkan statistik.

Contoh

```
Total Quiz

25
```

```
Average Score

82
```

```
Highest Score

100
```

```
Lowest Score

40
```

```
Total Correct

420
```

```
Total Wrong

75
```

Grafik

* Nilai per Quiz
* Progress Nilai

---

## FR-012 Search History

Filter

* Nama Quiz
* Tanggal
* Score

---

## FR-013 Admin Manage Quiz

CRUD Quiz

Field

* Title
* Description
* Duration
* Passing Score
* Active

---

## FR-014 Manage Question

CRUD Soal

Question Type

* Text
* Image
* Mixed

---

## FR-015 Manage Answer

Minimal

2 pilihan

Maksimal

6 pilihan

Answer Type

* Text
* Image
* Mixed

Tentukan

```
Correct Answer
```

---

# 7. Non Functional Requirements

## Performance

* Load < 2 detik
* Submit < 3 detik

---

## Security

* Session Token
* Validasi Input
* API Protection

---

## Responsive

Support

* Desktop
* Tablet
* Mobile

---

## Accessibility

* Keyboard Navigation
* Alt Image
* Screen Reader

---

# 8. User Flow

## Student

```
Home

↓

Quiz List

↓

Start Quiz

↓

Question 1

↓

Question 2

↓

...

↓

Finish

↓

Result

↓

Review

↓

History
```

---

## Admin

```
Dashboard

↓

Quiz

↓

Create Quiz

↓

Tambah Soal

↓

Tambah Jawaban

↓

Publish
```

---

# 9. Data Model

## Quiz

| Field        | Type    |
| ------------ | ------- |
| QuizId       | String  |
| Title        | String  |
| Description  | String  |
| Duration     | Number  |
| PassingScore | Number  |
| Active       | Boolean |

---

## Question

| Field      | Type             |
| ---------- | ---------------- |
| QuestionId | String           |
| QuizId     | String           |
| Type       | Text/Image/Mixed |
| Question   | String           |
| ImageUrl   | String           |
| Score      | Number           |

---

## Answer

| Field      | Type             |
| ---------- | ---------------- |
| AnswerId   | String           |
| QuestionId | String           |
| Type       | Text/Image/Mixed |
| Text       | String           |
| ImageUrl   | String           |
| IsCorrect  | Boolean          |

---

## Quiz Attempt

| Field      | Type                |
| ---------- | ------------------- |
| AttemptId  | String              |
| UserId     | String              |
| QuizId     | String              |
| StartTime  | Datetime            |
| FinishTime | Datetime            |
| Duration   | Number              |
| Score      | Number              |
| Correct    | Number              |
| Wrong      | Number              |
| Status     | Completed / Timeout |

---

## User Answer

| Field          | Type    |
| -------------- | ------- |
| AttemptId      | String  |
| QuestionId     | String  |
| SelectedAnswer | String  |
| Correct        | Boolean |

---

# 10. Google Sheets Structure

## Sheet 1

Quiz

---

## Sheet 2

Questions

---

## Sheet 3

Answers

---

## Sheet 4

Users

---

## Sheet 5

QuizAttempts

---

## Sheet 6

UserAnswers

---

# 11. API Design (Next.js)

## Quiz

```
GET /api/quiz/quiz

GET /api/quiz/quiz/:id

POST /api/quiz/quiz

PUT /api/quiz/quiz/:id

DELETE /api/quiz/quiz/:id
```

---

## Question

```
GET /api/quiz/question

POST /api/quiz/question

PUT /api/quiz/question

DELETE /api/quiz/question
```

---

## Submit

```
POST /api/quiz/quiz/submit
```

---

## History

```
GET /api/quiz/history
```

---

## Dashboard

```
GET /api/quiz/dashboard
```

---

# 12. Success Metrics

* Quiz dapat dimulai dalam kurang dari 2 detik.
* Auto Save jawaban berhasil tanpa kehilangan data.
* Timer tetap sinkron hingga quiz selesai.
* Nilai dihitung secara akurat sesuai aturan penilaian.
* Riwayat quiz tersimpan dengan benar di Google Sheets.
* Dashboard report menampilkan statistik berdasarkan seluruh percobaan quiz.
* Mendukung soal dan jawaban dalam format teks, gambar, maupun kombinasi keduanya.
