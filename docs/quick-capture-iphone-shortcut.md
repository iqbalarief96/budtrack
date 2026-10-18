# Tutor: Bikin iOS Shortcut untuk Quick Capture BudTrack

Panduan lengkap dari nol sampai jalan, termasuk tombol preset, Share Sheet, dan widget Home Screen.

---

## 0. Prasyarat

| Item | Nilai |
|---|---|
| URL endpoint | `https://budtrack.iqbalarif.me/api/quick-capture` |
| Method | `POST` |
| Auth | header `Authorization: Bearer <API_KEY>` |
| API key | 38 karakter, ada di `.env.production` (var `QUICK_CAPTURE_API_KEY`) |

Ambil key dari VPS:

```bash
cd ~/projects/budtrack && grep QUICK_CAPTURE_API_KEY .env.production | cut -d= -f2
```

Kalau lo jalanin dari iPhone, cara paling aman: **copy key-nya ke Notes / clipboard**, nanti di-paste pas bikin shortcut. Jangan kirim lewat chat publik.

---

## 1. Shortcut Dasar (ketik manual)

Buka **Shortcuts** app → tap **+** (kanan atas) → kasih nama `Catat BudTrack`.

Susun 4 action ini, urut dari atas:

### Action 1 — Ask for Input
- Tap **Add Action**, cari `Ask for Input`
- **Input Type**: `Text`
- **Prompt**: `Transaksi? (DESKRIPSI-KATEGORI-DOMPET-JUMLAH)`
- **Default Answer**: kosongin
- **Allow Multiple Lines**: OFF

> Output action ini otomatis jadi variabel bernama `Provided Input`.

### Action 2 — Get Contents of URL
- Cari `Get Contents of URL`
- Tap **Show More** biar field lengkap muncul

| Field | Isi |
|---|---|
| URL | `https://budtrack.iqbalarif.me/api/quick-capture` |
| Method | `POST` |
| Headers | lihat di bawah |
| Request Body | `JSON` |

**Headers** — tap **Add new header** dua kali:

| Key | Value |
|---|---|
| `Authorization` | `Bearer <PASTE_API_KEY_LO>` |
| `Content-Type` | `application/json` |

⚠️ Perhatiin: ada **spasi** setelah `Bearer`. Kalau lupa, bakal 401.

**Request Body → JSON** — tap **Add new field**:

| Key | Type | Value |
|---|---|---|
| `text` | Text | tap field value → pilih variabel **Provided Input** |

### Action 3 — Get Dictionary Value
- Cari `Get Dictionary Value`
- **Get**: `Value for key`
- **Key**: `message`
- **Dictionary**: tap → pilih **Contents of URL** (output Action 2)

### Action 4 — Show Notification
- Cari `Show Notification`
- **Text**: tap → pilih **Dictionary Value** (output Action 3)
- **Title**: `BudTrack`

Selesai. Tap tombol ▶️ buat tes — ketik misal:

```
Kopi Kenangan-Makanan-Dompet Utama-28000
```

Harusnya muncul notifikasi:

```
✅ Tercatat: -Rp 28.000 [Dompet Utama] (Makanan) - Kopi Kenangan
```

Kalau muncul `Unauthorized` → cek ulang header Authorization (spasi setelah `Bearer`, key bener semua 38 karakter).

---

## 2. Varian: Tombol Preset (nggak perlu ngetik)

Enak buat transaksi yang sering berulang. Ganti Action 1 jadi menu.

### Action 1 — Choose from Menu
- Cari `Choose from Menu`
- **Prompt**: `Catat apa?`
- Tap **Add Case** buat tiap preset. Contoh isi menu:

| Menu Item | Isi teks yang dikirim |
|---|---|
| Kopi | `Kopi-Makanan & Minuman-Dompet Utama-25000` |
| Makan Siang | `Makan Siang-Makanan-Dompet Utama-35000` |
| Transport | `Transport-Transportasi-Dompet Utama-20000` |
| Belanja Online | `Belanja-Shopee-Dompet Utama-` + tanya nominal |
| Custom | `Ask for Input` bebas |

### Cara isi tiap case

Di dalam tiap case, tambahin **Text** action:
- Isi teksnya literal, misal `Kopi-Makanan & Minuman-Dompet Utama-25000`

Lalu di luar menu, Action 2 (`Get Contents of URL`) body-nya pakai variabel **Menu Result** (output dari Choose from Menu) — bukan `Provided Input` lagi.

**Trik**: iOS Shortcuts otomatis bikin variabel `Menu Result` yang isinya = teks dari case yang dipilih. Jadi lo tinggal ganti value field `text` di Action 2 jadi `Menu Result`.

### Kalau nominal mau dinamis

Di dalam case, susun 2 action:

1. **Ask for Input** → Input Type `Number`, Prompt `Nominal?`
2. **Text** → isi: `Kopi-Makanan & Minuman-Dompet Utama-` lalu tap dan sisipkan variabel **Provided Input**

Hasilnya teks gabungan kayak `Kopi-Makanan & Minuman-Dompet Utama-28000`.

---

## 3. Varian: Share Sheet (dari app apa pun)

Biar bisa share teks dari WhatsApp/Notes/browser langsung ke BudTrack.

1. Buka shortcut → tap ikon **ⓘ** (info) → **Show in Share Sheet** → ON
2. **Share Sheet Types**: matiin semua kecuali `Text` dan `URL`
3. Ganti Action 1 dari `Ask for Input` jadi **Receive Input from Share Sheet**:
   - Cari action `Receive` (nama persisnya `Receive <X> input from Share Sheet`)
   - **Input Types**: `Text`
   - **If there's no input**: `Ask for Input`
4. Action 2 body `text` → pakai variabel **Shortcut Input**

Cara pakai: di app apa pun, select teks `Kopi Kenangan-Makanan-Dompet Utama-28000` → Share → pilih `Catat BudTrack`.

> Praktis kalau lo sering nyatet di Notes dulu baru sore-nya batch input.

---

## 4. Widget di Home Screen

Biar sekali tap langsung input:

1. Long-press Home Screen → **+** → **Shortcuts** → pilih size (kecil cukup)
2. Tap widget → **Edit Widget** → pilih shortcut `Catat BudTrack`
3. Sekarang tap widget = langsung muncul prompt input

### Bonus: Back Tap
- Settings → Accessibility → Touch → **Back Tap** → **Double Tap** → pilih `Catat BudTrack`
- Tap belakang iPhone dua kali = langsung capture

---

## 5. Varian: Siri Voice

Shortcut yang udah dinamain bisa dipanggil Siri otomatis:

> "Hey Siri, Catat BudTrack"

Siri bakal ngejalanin shortcut dan nampilin prompt input. Cocok buat nyatet sambil nyetir (tapi jangan ngetik sambil nyetir — pakai dictation).

Kalau mau full voice: ganti Action 1 jadi `Dictate Text` (bukan Ask for Input). Hasilnya lo ngomong `"kopi kenangan makanan dompet utama dua puluh delapan ribu"` — tapi **ini rawan salah parse** karena formatnya butuh strip `-`. Nggak gw saranin kecuali lo bikin shortcut khusus per kategori.

---

## 6. Format Teks yang Bener

```
DESKRIPSI-KATEGORI-DOMPET-JUMLAH
```

**Aturan parsing:**
- Dipisah strip `-`, minimal **4 bagian**
- Kalau deskripsi multi-kata, tetap pakai strip antar kata → parser gabungin balik pakai ` - `
  - Contoh: `Makan Siang-Kopi Kenangan-Makanan-Dompet Utama-28000`
- **Jumlah** support:
  | Tulis | Hasil |
  |---|---|
  | `28000` | 28.000 |
  | `28k` / `28rb` | 28.000 |
  | `1.5jt` / `1.5m` | 1.500.000 |
  | `Rp28.000` | 28.000 |

**Wallet yang valid** (dari DB lo):
- `Dompet Utama` (MAIN)
- `Selly` (MAIN)
- `Tabungan Bibit`, `Tabungan Emas`, `Tabungan Smol`, `Tabungan Smoll`, `Tabungan IWK`, `Tabungan Lainnya`, `Tabungan BCA`, `Tabungan Crypto`, `Tabungan Bank Bandung`

⚠️ Ada dua wallet mirip: **Tabungan Smol** vs **Tabungan Smoll**. Tulis lengkap biar match-nya tepat.

**Kategori**: kalau nama kategori nggak ketemu, BudTrack **bikin kategori baru otomatis**. Jadi konsisten pakai nama yang udah ada (`Makanan`, `Transportasi`, `Belanja`, dst) biar DB nggak penuh kategori sampah.

**Income**: keyword `gaji`, `bonus`, `dividen`, `profit`, `pendapatan`, `hadiah`, `transfer masuk`, `THR` otomatis ke-detect sebagai INCOME.

**Tanggal Kustom / Backdate (Bisa di depan atau belakang):**
- **1 digit bulan:** `5 senin 9`, `5 9`, `5/9`, `5-9`
- **2 digit bulan:** `5 senin 09`, `5 09`, `5/09`
- **Nama bulan:** `5 sep`, `5 senin sep`, `5 september 2026`
- **Tanggal saja (bulan ini):** `5 senin`, `senin 5`, `tgl 5`
- **Kata relatif:** `kemarin`, `kemarin lusa`, `hari ini`
- Contoh:
  - `5 senin 9 - Kopi Kenangan-Makanan-Dompet Utama-28000`
  - `Kopi Kenangan-Makanan-Dompet Utama-28000 - 5 senin 9`
  - `Kopi Kenangan-Makanan-Dompet Utama-28000-5/9`
  - `Kopi Kenangan-Makanan-Dompet Utama-28000-kemarin`

---

## 7. Troubleshooting Cepat

| Gejala | Penyebab |
|---|---|
| `Unauthorized` | Key salah/typo, atau lupa spasi setelah `Bearer` |
| `Format salah` | Kurang dari 4 bagian dipisah strip |
| `Nominal tidak valid` | Typo jumlah, misal `28ribu` (harus `28rb` atau `28k`) |
| `User tidak ditemukan` | Email di `QUICK_CAPTURE_DEFAULT_USER` nggak ada di DB |
| Transaksi masuk wallet salah | Nama wallet partial-match — tulis lebih spesifik |
| Kategori baru muncul | Typo kategori → dibuat baru. Benerin dari UI |

**Tes manual dari terminal** (buat mastiin endpoint hidup, sebelum nyalahin shortcut):

```bash
KEY=$(cd ~/projects/budtrack && \
  awk -F= '/^QUICK_CAPTURE_API_KEY/{print substr($0, index($0,"=")+1)}' .env.production | tr -d '\r\n"' | xargs)
echo "key_len=${#KEY}"   # harus 36

curl -s -X POST https://budtrack.iqbalarif.me/api/quick-capture \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test-Test-Dompet Utama-1000"}'
```

Kalau `key_len` bukan 36 → key-nya kebawa kutip/whitespace, dan shortcut lo bakal 401 juga.

Kalau curl ini balik 200 tapi shortcut 401 → masalahnya di shortcut (header/key), bukan server.

---

## 8. Limitasi yang Perlu Diingat

- Cuma `POST`, nggak ada `GET`
- Tanggal opsional (kalau tidak ditulis, otomatis jam & hari saat ini)
- Satu request = satu transaksi
- Nggak ada endpoint edit/hapus — benerin dari UI BudTrack
- Hook auto-savings & goal tracking tetap jalan kayak input dari UI
