# Pizza Pantas API (Cloudflare Worker + D1)

Login dan simpanan skor untuk Pizza Pantas. Game kekal di GitHub Pages; Worker ini hanya API kecil.
Tanpa Worker, game masih jalan sebagai **tetamu** (skor disimpan dalam pelayar sahaja).

## Pasang tanpa Node.js (guna dashboard Cloudflare sahaja)

1. Daftar / log masuk di <https://dash.cloudflare.com>.
2. **Storage & Databases → D1 SQL database → Create**. Nama: `pizza-pantas`.
3. Buka database itu → tab **Console**. Salin seluruh isi [`schema.sql`](schema.sql), tampal, tekan **Execute**.
4. **Workers & Pages → Create → Create Worker**. Nama: `pizza-pantas-api` → **Deploy**, kemudian **Edit code**.
   Padam kod contoh, tampal seluruh isi [`worker.js`](worker.js), tekan **Deploy**.
5. Buka Worker itu → **Settings → Bindings → Add → D1 database**.
   *Variable name* mesti tepat `DB`, pilih database `pizza-pantas`.
6. **Settings → Variables and Secrets → Add** (jenis *Text*):
   - `ALLOWED_ORIGINS` = `https://manorazali.github.io` (boleh tambah `,http://localhost:5173` untuk ujian setempat; tanpa `/` di hujung).
7. Salin URL Worker (cth. `https://pizza-pantas-api.<nama-anda>.workers.dev`) dan letak dalam
   [`../config.js`](../config.js):
   ```js
   window.PP_CONFIG = { API_URL: 'https://pizza-pantas-api.<nama-anda>.workers.dev' };
   ```
8. Commit dan push `config.js`. Buka game: skrin log masuk kini ada tab **Log masuk / Daftar**.

Semak cepat: buka `https://…workers.dev/api/health` dalam pelayar, sepatutnya keluar `{"ok":true}`.

## Pasang dengan wrangler (pilihan, perlu Node.js)

```powershell
npm i -g wrangler
wrangler d1 create pizza-pantas          # salin database_id ke wrangler.toml
wrangler d1 execute pizza-pantas --remote --file=schema.sql
wrangler deploy
```

## Nota penting

- **Had CPU pelan percuma.** Kata laluan di-hash dengan PBKDF2 (100,000 pusingan, had maksimum Workers). Operasi ini
  mengambil CPU lebih besar daripada had 10 ms pelan percuma, jadi log masuk/daftar mungkin gagal dengan ralat
  "Exceeded CPU limit" (1102). Jika itu berlaku: (a) naik taraf ke **Workers Paid** (sekitar USD 5/bulan), cara paling
  selamat untuk kegunaan kelas; atau (b) tetapkan pemboleh ubah `PBKDF2_ITER` kepada nilai lebih rendah (cth. `20000`)
  sebagai kompromi, bermakna kata laluan lebih mudah dipecahkan jika pangkalan data bocor.
  Saya belum dapat menguji ini pada akaun Cloudflare sebenar.
- **Privasi murid.** Tiada e-mel, nama penuh atau IP disimpan: hanya nama pengguna, hash kata laluan dan keputusan
  permainan. Pengguna boleh memadam akaun dan semua datanya sendiri (`DELETE /api/me`). Jika sekolah mahu guna
  untuk murid bawah 13 tahun, semak keperluan persetujuan ibu bapa / PDPA sekolah anda.
- **Skor boleh dipalsukan** oleh sesiapa yang tahu cara memanggil API (skor dihantar oleh pelayar). Sesuai untuk latihan
  peribadi dan ringkasan kemajuan, bukan untuk pertandingan atau gred rasmi.
- Had kadar: 8 percubaan log masuk gagal (nama pengguna + IP) akan dikunci 10 minit; 10 pendaftaran/IP/jam.
- Tiada pemulihan kata laluan (tiada e-mel). Murid yang lupa kata laluan perlu daftar akaun baharu.

## Pengujian

`worker.js` diuji terhadap SQLite dalam memori yang meniru D1 (30 semakan: pendaftaran, log masuk, sesi, had kadar,
CORS, pengesahan skor, pemadaman akaun, pengasingan data antara pengguna). Ia belum dijalankan pada Cloudflare sebenar.
