# 📄 Product Requirement Document (PRD)  
## 🧩 Discipline Tracker for Kids

---

## 1. 🎯 Product Overview
Aplikasi berbasis web untuk membantu orang tua memonitor kedisiplinan anak (±12 tahun) dalam menyelesaikan tugas harian melalui sistem checklist dan check-in berbasis waktu.

Aplikasi akan:
- Menampilkan daftar tugas harian
- Mencatat waktu penyelesaian
- Mengukur keterlambatan secara akurat
- Memberikan feedback langsung ke anak

---

## 2. 🚨 Problem Statement
Orang tua kesulitan:
- Memantau disiplin waktu anak secara objektif
- Mengetahui seberapa sering anak terlambat
- Memberikan evaluasi berbasis data

---

## 3. 👤 Target Users

### 👦 Anak (Primary)
- Umur: ±12 tahun
- Mengisi checklist
- Melakukan check-in saat task selesai

### 👨‍👩‍👧 Orang Tua (Secondary)
- Melihat monitoring
- Evaluasi kedisiplinan anak

---

## 4. 🎯 Goals & Success Metrics

### Goals
- Meningkatkan disiplin anak
- Memberikan visibilitas ke orang tua

### Metrics
- % task tepat waktu
- Jumlah keterlambatan
- Total menit keterlambatan per hari

---

## 5. 🧩 Core Features

---

### 5.1 Daily Task Checklist
- Task diambil dari Google Sheet
- Ditampilkan per hari

**Struktur Task:**
- Nama task
- Waktu target (HH:mm)

---

### 5.2 Check-In System (Enhanced)

#### ✅ Behavior
Saat anak klik “Selesai”:
- Sistem mencatat waktu (`completedAt`)
- Sistem membandingkan dengan `targetTime`
- Sistem menentukan status dan keterlambatan

---

#### ⏱️ Aturan Waktu
- Toleransi keterlambatan: **5 menit**

Jika:
- `completedAt <= targetTime + 5 menit` → ✅ On Time
- `completedAt > targetTime + 5 menit` → ⚠️ Late

---

#### 🚫 Batas Valid Check-In
- Check-in **tidak dihitung** jika dilakukan terlalu jauh dari waktu task
- Contoh: check-in dilakukan malam hari untuk task pagi
- Status: **Ignored / Invalid**

---

#### ⏳ Perhitungan Keterlambatan

```ts
delayMinutes = max(0, completedAt - targetTime)