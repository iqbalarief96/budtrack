# Quick Capture — Catat Transaksi Tanpa Buka App

Endpoint API buat nyatet transaksi BudTrack langsung dari mana aja: **iPhone Shortcuts**, Telegram bot, Alfred/Raycast, cron, `curl`. Nggak perlu login, cukup satu API key.

- **Endpoint:** `POST https://budtrack.iqbalarif.me/api/quick-capture`
- **Format input:** `DESKRIPSI-KATEGORI-DOMPET-JUMLAH` (dipisah tanda strip `-`)
- **Auth:** header `Authorization: Bearer <API_KEY>` **atau** query `?key=<API_KEY>`
- **Efek:** bikin transaksi + update saldo wallet (atomic), lalu jalanin hook auto-savings, goal tracking, dan auto-link savings

---

## 1. Setup (sekali doang)

API key + user target di-set lewat env di `.env.production`:

```bash
QUICK_CAPTURE_API_KEY=<string-acak-panjang>
QUICK_CAPTURE_DEFAULT_USER=muhamad.iqbal70@gmail.com
```

Generate key baru kalau perlu:

```bash
openssl rand -hex 32
```

Setelah ubah `.env.production`, **wajib restart service** biar env-nya kebaca:

```bash
sudo systemctl restart budtrack.service
```

> **Penting:** `QUICK_CAPTURE_API_KEY` **harus** ada. Kalau kosong, endpoint balas `401` untuk semua request (by design — nggak ada fallback ke key default).
>
> `QUICK_CAPTURE_DEFAULT_USER` opsional; kalau nggak di-set fallback ke `muhamad.iqbal70@gmail.com`.

---

## 2. Format Teks

```
DESKRIPSI-KATEGORI-DOMPET-JUMLAH
```

Parser baca **dari belakang**, jadi deskripsi boleh mengandung strip sebanyak yang lo mau:

| Posisi | Field | Contoh |
|---|---|---|
| `parts[last]` | Jumlah | `28000`, `28k`, `1.5jt` |
| `parts[last-1]` | Dompet | `Dompet Utama`, `Selly` |
| `parts[last-2]` | Kategori | `Makanan`, `Transport` |
| sisanya | Deskripsi | `Kopi Kenangan` |

Contoh valid:

```
Kopi Kenangan-Makanan-Dompet Utama-28000
Nasi Padang-Makanan & Minuman-Selly-25rb
Bensin-Transport-Dompet Utama-50k
Gaji bulan Oktober-Salary-Dompet Utama-7.5jt
Jual sepatu lama-Penjualan-Dompet Utama-350000
```

### Format jumlah yang didukung

| Input | Hasil |
|---|---|
| `28000` | 28.000 |
| `28k` / `28rb` | 28.000 |
| `1.5jt` / `1.5m` | 1.500.000 |
| `7.5jt` | 7.500.000 |
| `Rp50.000` | 50.000 |
| `1,5jt` | 1.500.000 (koma = desimal) |

Aturan parsing:
- Prefix `rp` (case-insensitive) dibuang
- Spasi dibuang
- Koma `,` → titik `.` (desimal)
- Akhiran `jt`/`m` → ×1.000.000; `k`/`rb` → ×1.000
- Kalau nggak ada suffix, titik ribuan dibuang (`50.000` → `50000`)

---

## 3. Matching Wallet & Kategori

**Wallet** — dicari urut:
1. Exact match nama (case-insensitive)
2. Partial match (`includes` dua arah) — `dompet` cocok ke `Dompet Utama`
3. Fallback: wallet tipe `MAIN`, atau wallet pertama punya user

**Kategori** — dicari urut:
1. Exact match nama (case-insensitive)
2. Partial match (`includes` dua arah)
3. **Kalau nggak ketemu → dibuat otomatis** pakai nama yang lo tulis

**Tipe transaksi (INCOME/EXPENSE)** — ditentukan dari:
1. Tipe kategori yang match (`Salary` → INCOME), atau
2. Keyword di kategori/deskripsi: `gaji`, `bonus`, `pendapatan`, `income`, `hadiah`, `transfer masuk`, `profit`, `dividen`

Default kalau nggak ada indikasi income: **EXPENSE**.

### Wallet yang ada di akun lo

```
Dompet Utama (MAIN)      Selly (MAIN)
Tabungan Bibit           Tabungan Emas
Tabungan Smol            Tabungan IWK
Tabungan Lainnya         Tabungan BCA
Tabungan Crypto          Tabungan Bank Bandung
Tabungan Smoll
```

### Contoh kategori yang udah ada

**Expense:** `Makanan`, `Makanan & Minuman`, `Transport`, `Transportasi`, `Belanja`, `Shopping`, `Tagihan & Utilitas`, `WiFi Rumah`, `Pulsa & Paket Data`, `Parkir & Tol`, `Kesehatan`, `Perawatan Diri`, `Pendidikan`, `Tabungan`, `Tarik Tunai`, `Uncategorized`

**Income:** `Salary`, `Pendapatan Lain`, `Penjualan`, `THR`

> Kalau lo ketik kategori yang nggak ada (mis. `Skincare`), BudTrack bikin kategori baru otomatis. Rapi sih, tapi kalau kebanyakan typo, daftar kategori lo jadi berantakan — cek ejaan sebelum kirim.

---

## 4. Response

Sukses (`200`):

```json
{
  "success": true,
  "message": "✅ Tercatat: -Rp28.000 [Dompet Utama] (Makanan) - Kopi Kenangan",
  "data": {
    "id": "clx...",
    "amount": 28000,
    "type": "EXPENSE",
    "description": "Kopi Kenangan",
    "wallet": "Dompet Utama",
    "category": "Makanan",
    "date": "2026-10-04T12:00:00.000Z"
  }
}
```

Field `message` sengaja dibikin format notifikasi iOS — cocok buat ditampilin langsung sebagai hasil Shortcut.

Error:

| Status | Penyebab |
|---|---|
| `401` | API key salah/kosong, atau `QUICK_CAPTURE_API_KEY` belum di-set |
| `400` | Format salah (<4 bagian), nominal invalid, payload kosong, user nggak punya wallet |
| `404` | Email di `QUICK_CAPTURE_DEFAULT_USER` nggak ketemu di DB |

---

## 5. Contoh Pakai

### curl

```bash
curl -X POST https://budtrack.iqbalarif.me/api/quick-capture \
  -H "Authorization: Bearer $QUICK_CAPTURE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"Kopi Kenangan-Makanan-Dompet Utama-28000"}'
```

Atau pakai query key + plain text:

```bash
curl -X POST "https://budtrack.iqbalarif.me/api/quick-capture?key=$QUICK_CAPTURE_API_KEY" \
  -H "Content-Type: text/plain" \
  --data 'Kopi Kenangan-Makanan-Dompet Utama-28000'
```

### iPhone Shortcuts (yang lo minta)

Bikin shortcut baru, susun action-nya:

1. **Ask for Input** (Text) → prompt: `Transaksi? (DESKRIPSI-KATEGORI-DOMPET-JUMLAH)`
2. **Get Contents of URL**
   - URL: `https://budtrack.iqbalarif.me/api/quick-capture`
   - Method: `POST`
   - Headers:
     - `Authorization` → `Bearer <API_KEY>`
     - `Content-Type` → `application/json`
   - Request Body: `JSON`
     - `text` → *Provided Input* (variabel dari step 1)
3. **Get Dictionary Value** → key `message`
4. **Show Notification** → isi pakai hasil step 3

Simpan sebagai `Catat BudTrack`, lalu:
- Tambahin ke **Share Sheet** biar bisa kirim teks langsung dari app apa pun
- Atau bikin varian **Ask for Input** dengan beberapa tombol preset (Makanan / Transport / Belanja) biar nggak perlu ngetik

Contoh body JSON yang dikirim:

```json
{"text": "Kopi Kenangan-Makanan-Dompet Utama-28000"}
```

> **Catatan:** field body bisa `text`, `input`, atau `query` — parser nerima ketiganya. Content-Type `text/plain` juga jalan, teks mentah langsung diparse.

### Telegram bot / automation lain

Arahin webhook atau `curl` dari script apa pun ke endpoint yang sama. Karena wallet & kategori di-match otomatis dan balikannya pesan jadi, output-nya bisa langsung diteruskan ke chat.

---

## 6. Batasan yang Perlu Lo Tau

- **Cuma `POST`** — nggak ada `GET` buat list transaksi.
- **Nggak bisa pilih tanggal** — selalu pakai waktu server (`new Date()`). Kalau lo capture transaksi kemarin, tanggalnya tetap hari ini.
- **Nggak bisa multi-item** — satu request = satu transaksi. Buat beberapa item, kirim beberapa request.
- **Nggak ada endpoint buat edit/hapus** — kalau salah input, benerin dari UI BudTrack.
- **Bukan pengganti UI transaksi** — UI tetap dipakai buat transaksi yang butuh detail (items, split, tanggal custom). Quick Capture buat yang cepet dan sederhana.
- **Hook auto-savings/goal jalan** — sama kayak input dari UI, jadi transaksi dari Quick Capture ikut kena aturan auto-savings yang lo set.

---

## 7. Troubleshooting

| Gejala | Cek |
|---|---|
| `401 Unauthorized` | Key di header/query sama persis dengan `QUICK_CAPTURE_API_KEY` di `.env.production`? Key ada isinya? Service udah restart setelah ubah env? |
| `404 User tidak ditemukan` | Email di `QUICK_CAPTURE_DEFAULT_USER` ada di tabel `User`? |
| `400 Format salah` | Pastikan minimal 4 bagian dipisah `-`. Deskripsi multi-kata tanpa strip bakal salah hitung posisi. |
| `400 Nominal tidak valid` | Cek penulisan jumlah — `28rb` bukan `28 rb` (spasi tetap di-handle, tapi hati-hati suffix typo kayak `28ribu`). |
| Transaksi masuk ke wallet salah | Nama dompet di-match partial — kalau ada dua wallet mirip (`Tabungan Smol` vs `Tabungan Smoll`), tulis nama yang lebih spesifik. |
| Kategori baru bermunculan | Typo di field kategori → BudTrack bikin kategori baru. Konsisten pakai nama yang udah ada. |