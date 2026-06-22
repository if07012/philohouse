# PRD - Aplikasi Manajemen Keuangan Badminton Club

## 1. Overview

### Nama Produk

Badminton Club Finance Management

### Tujuan

Membantu pengelola badminton mencatat kehadiran pemain, penggunaan shuttlecock, biaya lapangan, tagihan member, pembayaran, serta menghasilkan laporan keuangan secara otomatis.

### Target Pengguna

* Pengurus komunitas badminton
* Admin lapangan badminton
* Koordinator pertandingan rutin

---

# 2. Permasalahan

Saat ini pencatatan biaya badminton dilakukan secara manual sehingga:

* Sulit mengetahui total pemasukan dan pengeluaran.
* Sulit menghitung biaya shuttlecock yang dibagi kepada pemain.
* Sulit mengetahui siapa yang sudah membayar dan belum membayar.
* Tidak ada histori permainan dan kehadiran member.
* Sulit mengetahui saldo kas komunitas secara real-time.

---

# 3. Fitur Utama

## 3.1 Master Member

### Add Member

Admin dapat menambahkan data member.

| Field             | Type    |
| ----------------- | ------- |
| Nama              | Text    |
| Nomor HP          | Text    |
| Status Aktif      | Boolean |
| Tanggal Bergabung | Date    |

### List Member

Fitur:

* Search
* Edit
* Nonaktifkan Member
* Lihat Riwayat Kehadiran
* Lihat Total Tagihan
* Lihat Total Pembayaran

---

## 3.2 Konfigurasi Sistem

### Pengaturan Biaya Kehadiran

| Field          | Type     |
| -------------- | -------- |
| Attendance Fee | Currency |

Contoh:

```text
Rp25.000 per hadir
```

---

### Pengaturan Harga Shuttlecock

| Field             | Type     |
| ----------------- | -------- |
| Shuttlecock Price | Currency |

Contoh:

```text
Rp18.000 per shuttlecock
```

---

# 3.3 Manajemen Permainan

## Buat Permainan Baru

### Header

| Field        | Type              |
| ------------ | ----------------- |
| Tanggal Main | DateTime          |
| Lokasi       | Optional          |
| Status       | Active / Finished |

---

## Tambah Pemain

Karena permainan double, satu game harus terdiri dari 4 pemain.

| Field    | Type   |
| -------- | ------ |
| Player 1 | Member |
| Player 2 | Member |
| Player 3 | Member |
| Player 4 | Member |

### Validasi

* Harus tepat 4 pemain.
* Tidak boleh member yang sama.

---

## Selesaikan Permainan

Input:

| Field                       | Type    |
| --------------------------- | ------- |
| Jumlah Shuttlecock Terpakai | Integer |

Contoh:

```text
Shuttlecock Terpakai = 3
Harga Shuttlecock = Rp18.000

Total Shuttlecock Cost
= 3 × 18.000
= Rp54.000

Biaya Shuttlecock Per Orang
= 54.000 / 4
= Rp13.500
```

---

## Generate Tagihan

Ketika tombol **Generate Tagihan** ditekan:

### Perhitungan

```text
Biaya Hadir           = Rp25.000
Biaya Shuttlecock     = Rp13.500

Total Tagihan Member
= Rp38.500
```

---

### Sistem Membuat Tagihan

| Member | Tagihan  |
| ------ | -------- |
| Budi   | Rp38.500 |
| Andi   | Rp38.500 |
| Joko   | Rp38.500 |
| Deni   | Rp38.500 |

---

### Status Awal

Semua tagihan memiliki status:

```text
UNPAID
```

Status permainan:

```text
FINISHED
```

---

# 3.4 Manajemen Pembayaran

## Daftar Tagihan

Menampilkan seluruh tagihan yang belum dibayar.

| Tanggal | Member | Nominal  | Status |
| ------- | ------ | -------- | ------ |
| 01 Jan  | Budi   | Rp38.500 | Unpaid |

---

## Pembayaran Tagihan

Admin dapat menerima pembayaran.

### Input

| Field             | Type                   |
| ----------------- | ---------------------- |
| Member            | Auto                   |
| Nominal Dibayar   | Currency               |
| Metode Pembayaran | Cash / Transfer / QRIS |
| Tanggal Bayar     | DateTime               |

---

## Status Pembayaran

### Unpaid

Belum ada pembayaran.

### Partial

Pembayaran sebagian.

Contoh:

```text
Tagihan = Rp40.000
Bayar = Rp20.000
Status = Partial
```

### Paid

Pembayaran lunas.

Contoh:

```text
Tagihan = Rp40.000
Bayar = Rp40.000
Status = Paid
```

---

## Riwayat Pembayaran

| Tanggal | Member | Nominal  | Metode |
| ------- | ------ | -------- | ------ |
| 01 Jan  | Budi   | Rp38.500 | QRIS   |

---

# 3.5 Pengeluaran

Admin dapat menambahkan pengeluaran manual.

## Kategori

* Pembelian Shuttlecock
* Sewa Lapangan
* Turnamen
* Konsumsi
* Peralatan
* Lainnya

---

### Form Pengeluaran

| Field      | Type     |
| ---------- | -------- |
| Tanggal    | Date     |
| Kategori   | Dropdown |
| Keterangan | Text     |
| Nominal    | Currency |

---

# 3.6 Dashboard

Menampilkan ringkasan keuangan.

## KPI

### Saldo Kas

```text
Total Pembayaran Diterima
-
Total Pengeluaran
```

---

### Statistik

* Saldo Kas
* Total Tagihan Belum Dibayar
* Total Pembayaran Bulan Ini
* Total Pengeluaran Bulan Ini
* Total Permainan
* Total Member Aktif

---

# 3.7 Laporan

## Laporan Tagihan

Filter:

* Tanggal
* Member
* Status Pembayaran

Kolom:

| Tanggal | Member | Tagihan | Status |
| ------- | ------ | ------- | ------ |

---

## Laporan Pembayaran

| Tanggal | Member | Nominal | Metode |
| ------- | ------ | ------- | ------ |

---

## Laporan Pemasukan

Berisi pembayaran yang benar-benar diterima.

| Tanggal | Member | Nominal |
| ------- | ------ | ------- |

---

## Laporan Pengeluaran

| Tanggal | Kategori | Nominal |
| ------- | -------- | ------- |

---

## Laporan Kas

```text
Saldo Awal
+ Pembayaran Masuk
- Pengeluaran
= Saldo Akhir
```

---

# 3.8 Riwayat Permainan

Menampilkan seluruh permainan yang pernah dimainkan.

| Tanggal | Pemain | Shuttlecock | Total Tagihan |
| ------- | ------ | ----------- | ------------- |

### Detail Permainan

Menampilkan:

* Daftar pemain
* Harga shuttlecock
* Jumlah shuttlecock
* Total biaya shuttlecock
* Biaya per pemain
* Total tagihan
* Status pembayaran masing-masing pemain

---

# 4. Business Rules

## BR-001

Permainan hanya dapat disimpan jika terdapat tepat 4 pemain.

---

## BR-002

Member yang sama tidak boleh dipilih lebih dari sekali dalam satu permainan.

---

## BR-003

Biaya shuttlecock dibagi rata kepada 4 pemain.

```text
(Jumlah Shuttlecock × Harga Shuttlecock)
÷ 4
```

---

## BR-004

Biaya kehadiran ditambahkan kepada setiap pemain.

---

## BR-005

Generate Tagihan akan:

1. Menutup permainan.
2. Membuat 4 tagihan.
3. Mengubah status permainan menjadi Finished.

---

## BR-006

Saldo kas hanya bertambah ketika pembayaran diterima.

Tagihan yang belum dibayar tidak dihitung sebagai kas.

---

## BR-007

Tagihan dapat memiliki status:

* Unpaid
* Partial
* Paid

---

## BR-008

Pembayaran dapat dilakukan lebih dari satu kali hingga tagihan lunas.

---

# 5. Database Design

## Members

```sql
Member
------
Id
Name
PhoneNumber
IsActive
CreatedDate
```

---

## Configuration

```sql
Configuration
-------------
AttendanceFee
DefaultShuttlecockPrice
```

---

## Games

```sql
Game
----
Id
GameDate
Location
Status
CreatedDate
```

---

## GamePlayers

```sql
GamePlayer
----------
Id
GameId
MemberId
```

---

## GameSettlement

```sql
GameSettlement
--------------
Id
GameId
ShuttlecockUsed
ShuttlecockPrice
AttendanceFee
TotalBillAmount
CreatedDate
```

---

## MemberBills

```sql
MemberBill
----------
Id
GameId
MemberId
BillAmount
PaidAmount
OutstandingAmount
PaymentStatus
CreatedDate
```

---

## Payments

```sql
Payment
-------
Id
MemberBillId
PaymentDate
Amount
PaymentMethod
CreatedDate
```

---

## ExpenseTransactions

```sql
ExpenseTransaction
------------------
Id
TransactionDate
Category
Description
Amount
CreatedDate
```

---

# 6. User Flow

## Permainan

```text
Buat Game
    ↓
Pilih 4 Member
    ↓
Main Badminton
    ↓
Input Jumlah Shuttlecock
    ↓
Generate Tagihan
    ↓
Sistem Membuat 4 Tagihan
    ↓
Status = Unpaid
```

---

## Pembayaran

```text
Member Bayar
    ↓
Admin Input Pembayaran
    ↓
Update Paid Amount
    ↓
Update Status
(Unpaid / Partial / Paid)
    ↓
Masuk Ke Laporan Pemasukan
    ↓
Saldo Kas Bertambah
```

---


# 8. Success Metrics

* 100% permainan tercatat dalam sistem.
* Tidak ada perhitungan manual shuttlecock.
* Seluruh tagihan dapat dilacak.
* Status pembayaran dapat dipantau secara real-time.
* Saldo kas selalu akurat.
* Laporan keuangan dapat diakses kapan saja.
