# Misi Bijak KV+KV — prototaip pertama

Prototaip web untuk aktiviti Bahasa Melayu Tahun 1. Menggunakan HTML, CSS dan JavaScript biasa tanpa pemasangan pakej.

## Kandungan
- `index.html` — struktur halaman
- `styles.css` — reka bentuk responsif
- `app.js` — permainan, audio model, rakaman dan rekod setempat

## Cara membuka di komputer
1. Muat turun dan ekstrak fail ZIP.
2. Buka folder `bbm-digital-kvkv`.
3. Klik dua kali `index.html` untuk melihat permainan asas.
4. Audio model menggunakan Speech Synthesis API jika disokong pelayar. Suara dan loghat berbeza mengikut peranti.
5. Rakaman mikrofon mungkin tidak berfungsi apabila fail dibuka terus. Untuk rakaman, jalankan melalui pelayan tempatan atau hos HTTPS.

## Cara menjalankan pelayan tempatan (pilihan)
Jika Python dipasang:
1. Buka Terminal/Command Prompt dalam folder projek.
2. Jalankan `python -m http.server 8000`
3. Buka `http://localhost:8000` dalam pelayar.

## Penerbitan GitHub Pages
1. Cipta repositori baharu di GitHub.
2. Muat naik `index.html`, `styles.css`, dan `app.js` ke bahagian akar repositori.
3. Buka **Settings → Pages**.
4. Pilih sumber penerbitan daripada branch utama dan folder root, kemudian simpan.
5. Tunggu GitHub menyediakan pautan laman web.

## Had prototaip — penting
- Tiada akaun atau log masuk guru/murid.
- Tiada pangkalan data dalam talian atau penyegerakan antara peranti.
- Rekod aktiviti disimpan dalam `localStorage` pelayar pada peranti ini sahaja.
- Rakaman suara kekal dalam sesi pelayar/peranti ini dan tidak dihantar kepada guru. URL rakaman sementara tidak disimpan sebagai fail kekal.
- Audio model menggunakan suara sintesis yang tersedia pada peranti; suara perempuan tertentu tidak dijamin.
- Tiada pengecaman pertuturan automatik. Guru perlu mendengar rakaman untuk menilai sebutan.
- Senarai perkataan ialah contoh awal. Semak kesesuaian perkataan dan gambar dengan objektif serta tahap murid sebelum digunakan dalam PdP sebenar.
- Gunakan data rekaan sahaja dalam prototaip. Sebelum menyimpan rakaman murid sebenar, bina log masuk, kawalan akses, penyimpanan selamat, dasar tempoh simpanan dan proses persetujuan yang sesuai.

## Semakan pola
Perkataan contoh di dalam aplikasi dipisahkan sebagai dua suku kata KV, contohnya `ba` + `ju` = `baju`. Sila semak kandungan sebelum menambah perkataan baharu.
