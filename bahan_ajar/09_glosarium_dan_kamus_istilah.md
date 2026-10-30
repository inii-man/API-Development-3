# 📖 Modul 09: Glosarium Komprehensif Kosakata & Istilah Teknis
**Kamus Lengkap Penerjemahan Seluruh Istilah Teknis 69 Slide PDF Pelatihan NQA Hari 3**

Dokumen ini disusun untuk menerjemahkan dan menguraikan setiap kosakata sulit bahasa Inggris yang muncul pada materi Hari 3 ke dalam Bahasa Indonesia dengan struktur baku:
- **Terjemahan Baku Bahasa Indonesia**
- **Definisi Formal Teknis**
- **Analogi Sederhana Bahasa Manusia**
- **Risiko Fatal Jika Diabaikan**
- **Contoh Konkret pada Kode / Slide Hari 3**

---

## 🔤 DAFTAR ISTILAH (A – Z)

---

### 1. At-Least-Once Delivery
- **Terjemahan Baku**: Jaminan Pengiriman Paling-Tidak-Sekali.
- **Definisi Formal**: Model semantik distribusi jaringan di mana sistem pengirim menjamin bahwa pesan akan terkirim setidaknya satu kali ke penerima. Karena potensi kegagalan jaringan atau timeout saat respons dikirim, pengirim dapat mengirim ulang pesan yang sama sehingga penerima berpotensi menerima pesan duplikat.
- **Analogi Sederhana**: Kurir paket yang mengetuk pintu rumah Anda, tetapi karena Anda tidak menjawab salam (padahal paket sudah Anda ambil di pagar), kurir tersebut datang lagi 10 menit kemudian membawakan barang pengganti yang sama.
- **Risiko Jika Diabaikan**: Jika penerima tidak idempoten, satu transaksi pembayaran nasabah akan diproses dan dipotong berkali-kali.
- **Rujukan Slide**: Slide 14 & 66.

---

### 2. Broken Object Level Authorization (BOLA / IDOR)
- **Terjemahan Baku**: Kerentanan Otorisasi Tingkat Objek / Referensi Objek Langsung Tidak Aman.
- **Definisi Formal**: Celah keamanan di mana aplikasi web tidak memvalidasi apakah pengguna yang sedang terautentikasi memiliki hak kepemilikan yang sah untuk mengakses, mengubah, atau menghapus ID objek data tertentu.
- **Analogi Sederhana**: Anda memiliki kunci kamar hotel nomor 101 yang sah, tetapi Anda mencoba memasukkan kunci tersebut ke pintu kamar 102 milik tamu lain dan ternyata pintunya terbuka.
- **Risiko Jika Diabaikan**: Pengguna biasa (Bob) dapat membaca, mengedit, atau menghapus data sensitif milik pengguna lain (Alice) hanya dengan mengganti parameter URL `tasks/:id`.
- **Rujukan Slide**: Slide 45, 48 (Langkah 9), 50.

---

### 3. Claim / Lease Pattern
- **Terjemahan Baku**: Pola Klaim / Hak Sewa Pekerjaan Sementara.
- **Definisi Formal**: Mekanisme koordinasi pada sistem worker konkuren di mana satu instans worker mengunci suatu baris data pekerjaan untuk jangka waktu tertentu agar tidak diproses oleh worker lain pada waktu yang sama.
- **Analogi Sederhana**: Mengambil spidol di papan tulis saat Anda mulai mengerjakan soal di depan kelas, sehingga teman lain tahu bahwa soal tersebut sedang Anda kerjakan.
- **Risiko Jika Diabaikan**: Terjadi kondisi *Race Condition* di mana dua worker mengeksekusi satu email atau transaksi yang sama secara paralel.
- **Rujukan Slide**: Slide 26.

---

### 4. Clock Skew
- **Terjemahan Baku**: Penyimpangan / Perbedaan Jam Antar-Server.
- **Definisi Formal**: Ketidaksesuaian nilai waktu riil (*timestamp*) antara jam internal milik server pengirim dengan jam internal server penerima akibat perbedaan sinkronisasi osilator perangkat keras atau NTP.
- **Analogi Sederhana**: Jam tangan Anda menunjukkan pukul 08:00, namun jam dinding di ruang rapat sudah menunjukkan pukul 08:05.
- **Risiko Jika Diabaikan**: Receiver menolak paket webhook yang sah karena dianggap sudah kedaluwarsa, atau sebaliknya membuka celah *Replay Attack* jika toleransi dimatikan secara total.
- **Rujukan Slide**: Slide 12 & 20 (Toleransi 300 detik).

---

### 5. Compensating Transaction
- **Terjemahan Baku**: Transaksi Kompensasi.
- **Definisi Formal**: Suatu operasi bisnis dalam arsitektur SAGA yang secara eksplisit membatalkan atau menetralisir dampak dari operasi transaksi lokal yang telah berhasil dieksekusi sebelumnya setelah langkah berikutnya mengalami kegagalan.
- **Analogi Sederhana**: Anda sudah memesan kamar hotel, namun penerbangan pesawat Anda dibatalkan. Transaksi kompensasi adalah menelepon pihak hotel untuk membatalkan pesanan dan mencairkan pengembalian uang (*refund*).
- **Risiko Jika Diabaikan**: Terjadi inkonsistensi data di mana barang/tiket tetap terreservasi padahal pelanggan gagal membayar.
- **Rujukan Slide**: Slide 40.

---

### 6. Constant-Time Comparison
- **Terjemahan Baku**: Perbandingan Waktu-Konstan.
- **Definisi Formal**: Algoritme perbandingan dua rangkaian byte di mana durasi waktu komputasi yang dibutuhkan selalu sama persis, tanpa memedulikan di byte ke berapa ketidakcocokan ditemukan (mencegah *early exit*).
- **Analogi Sederhana**: Seorang juri yang memeriksa 10 lembar jawaban ujian dan selalu menghabiskan waktu tepat 5 menit per lembar, baik jawaban pertama salah maupun benar semua, sehingga pengamat luar tidak bisa menebak nilai ujian dari waktu penilaian.
- **Risiko Jika Diabaikan**: Terkena serangan *Timing Attack* yang memungkinkan penyerang menebak tanda tangan kriptografi karakter demi karakter.
- **Rujukan Slide**: Slide 11, 21 (`crypto.timingSafeEqual`).

---

### 7. Contract-First Design
- **Terjemahan Baku**: Desain Berbasis Kontrak Dahulu.
- **Definisi Formal**: Metodologi pengembangan API di mana dokumen kontrak antarmuka (misal: OpenAPI Specification) dirancang, ditinjau, dan disepakati terlebih dahulu oleh seluruh pemangku kepentingan sebelum satu baris kode controller ditulis.
- **Analogi Sederhana**: Membuat cetak biru (*blueprint*) gambar arsitektur rumah dan menyepakatinya bersama kontraktor sebelum mulai meletakkan batu bata pondasi.
- **Risiko Jika Diabaikan**: Developer backend dan frontend saling menyalahkan karena ekspektasi format payload atau tipe data berbeda di tengah proses integrasi.
- **Rujukan Slide**: Slide 42, 49, 61.

---

### 8. Correlation ID / Request ID
- **Terjemahan Baku**: Identitas Korelasi / Pengenal Jejak Permintaan.
- **Definisi Formal**: String pengenal unik (biasanya UUID) yang dilekatkan pada setiap request HTTP saat pertama kali masuk ke API Gateway dan diteruskan ke seluruh header komunikasi internal untuk melacak siklus hidup request tersebut.
- **Analogi Sederhana**: Nomor resi paket pengiriman yang dapat digunakan untuk melacak keberadaan paket saat berpindah dari gudang sortir, bandara, kurir lokal, hingga tangan penerima.
- **Risiko Jika Diabaikan**: Tim teknisi operasional kesulitan mencari log kesalahan di antara jutaan baris log ketika terjadi kegagalan transaksi pengguna.
- **Rujukan Slide**: Slide 54, 55 (`X-Request-Id`).

---

### 9. Dead Letter Queue (DLQ)
- **Terjemahan Baku**: Antrean Surat Mati / Antrean Pesan Gagal.
- **Definisi Formal**: Antrean penyimpanan khusus untuk menampung pesan atau event yang gagal diproses oleh worker setelah melampaui batas toleransi percobaan ulang (*retry limit*) yang ditentukan.
- **Analogi Sederhana**: Kotak surat di kantor pos khusus untuk menampung surat-surat yang alamat tujuannya tidak ditemukan setelah kurir mencoba mengantar 3 kali.
- **Risiko Jika Diabaikan**: Pesan yang gagal akan terus diputar ulang tanpa henti (*infinite retry poison pill*), menghabiskan CPU dan memori server, serta memblokir pesan valid lainnya.
- **Rujukan Slide**: Slide 25, 26.

---

### 10. Deduplication (Dedup)
- **Terjemahan Baku**: Deduplikasi / Penghapusan Duplikat.
- **Definisi Formal**: Proses mengidentifikasi dan mengabaikan pesan atau event yang identik yang diterima lebih dari sekali, guna memastikan efek samping bisnis hanya dieksekusi satu kali.
- **Analogi Sederhana**: Petugas loket konser yang menandai tiket Anda dengan stempel; jika tiket dengan nomor seri yang sama diserahkan kembali, petugas akan menolaknya.
- **Risiko Jika Diabaikan**: Data ganda di basis data, seperti pencatatan dua pesanan untuk satu kali transfer.
- **Rujukan Slide**: Slide 15, 24, 31.

---

### 11. Dual Write Problem
- **Terjemahan Baku**: Masalah Penulisan Ganda.
- **Definisi Formal**: Kondisi anomali kegagalan pada arsitektur terdistribusi di mana aplikasi harus memperbarui dua sistem penyimpanan data yang berbeda (misal: basis data lokal dan broker pesan Kafka) tanpa adanya jaminan transaksi atomik terdistribusi.
- **Analogi Sederhana**: Menulis catatan di buku harian pribadi dan mengirim SMS ke teman; jika pulsa tiba-tiba habis saat mengirim SMS, catatan di buku harian Anda tidak lagi sesuai dengan apa yang diketahui teman Anda.
- **Risiko Jika Diabaikan**: Data di database berhasil diubah tetapi event notifikasi ke layanan lain tidak pernah terkirim, atau sebaliknya.
- **Rujukan Slide**: Slide 38.

---

### 12. Durable Inbox Pattern
- **Terjemahan Baku**: Pola Kotak Masuk Durabel.
- **Definisi Formal**: Pola arsitektur di mana event webhook yang masuk langsung disimpan ke media penyimpanan persisten (seperti SQLite/PostgreSQL) dan di-commit sebelum aplikasi mengembalikan status sukses (HTTP 202) kepada pengirim.
- **Analogi Sederhana**: Memasukkan surat berharga ke dalam brankas besi sebelum Anda menandatangani tanda terima kepada kurir pengantar.
- **Risiko Jika Diabaikan**: Jika server mendadak restart saat event masih berada di memori RAM, data event tersebut hilang selamanya tanpa jejak.
- **Rujukan Slide**: Slide 17, 24, 66.

---

### 13. Eventual Consistency
- **Terjemahan Baku**: Konsistensi Bertahap / Konsistensi Pada Akhirnya.
- **Definisi Formal**: Model konsistensi dalam sistem terdistribusi di mana data di semua replika atau layanan downstream tidak langsung sinkron pada detik yang sama, namun dijamin akan menjadi konsisten setelah periode waktu tertentu.
- **Analogi Sederhana**: Anda mentransfer uang ke teman di bank berbeda; saldo Anda terpotong sekarang, dan uang teman Anda baru bertambah 15 detik kemudian.
- **Risiko Jika Diabaikan**: Pengembang membuat query langsung mengasumsikan data langsung ada seketika (*Race Condition*) sehingga memicu error 404 palsu.
- **Rujukan Slide**: Slide 36.

---

### 14. Exactly-Once Delivery
- **Terjemahan Baku**: Pengiriman Tepat-Satu-Kali.
- **Definisi Formal**: Semantik pengiriman ideal di mana pesan dijamin tiba di penerima tepat satu kali tanpa duplikasi dan tanpa kehilangan data. Dalam sistem jaringan riil, hal ini mustahil dicapai pada layer transport murni dan hanya dapat disimulasikan melalui kombinasi *At-Least-Once Delivery* + *Idempotent Receiver*.
- **Analogi Sederhana**: Mengirim surat pos yang mustahil tersesat dan mustahil dicetak dua kali oleh kurir mana pun di dunia tanpa bantuan pengecekan nomor seri oleh penerima.
- **Risiko Jika Diabaikan**: Developer malas membuat deduplikasi karena mengira sistem message broker sudah menangani segalanya secara gaib.
- **Rujukan Slide**: Slide 14, 25, 38, 39.

---

### 15. HMAC (Hash-based Message Authentication Code)
- **Terjemahan Baku**: Kode Otentikasi Pesan Berbasis Hash.
- **Definisi Formal**: Mekanisme kriptografi yang menggabungkan fungsi hash kriptografis (seperti SHA-256) dengan sebuah kunci rahasia bersama (*Shared Secret*) untuk memverifikasi keaslian pengirim dan integritas data secara simultan.
- **Analogi Sederhana**: Segel lilin bertanda cap cincin kerajaan khusus yang hanya dimiliki oleh raja; jika lilin rusak atau capnya berbeda, isi surat pasti sudah dibuka atau dipalsukan.
- **Risiko Jika Diabaikan**: Peretas dapat memalsukan pesan webhook dan mengelabui receiver Anda untuk mengubah status data tanpa otorisasi.
- **Rujukan Slide**: Slide 9, 11, 21.

---

### 16. Idempotency Key
- **Terjemahan Baku**: Kunci Idempotensi.
- **Definisi Formal**: Pengenal unik yang disertakan oleh klien dalam header request (misal: `Idempotency-Key: uuid`) agar server dapat mengenali percobaan ulang dari permintaan yang sama dan mengembalikan hasil yang identik tanpa mengeksekusi efek samping kedua kali.
- **Analogi Sederhana**: Tombol lift yang Anda tekan berkali-kali; lampu lift tetap menyala dan lift hanya akan datang satu kali, tidak peduli berapa kali Anda menekan tombolnya.
- **Risiko Jika Diabaikan**: Tombol "Bayar Sekarang" yang diklik 3 kali oleh pengguna dengan koneksi lambat akan mendebit saldo tabungan 3 kali lipat.
- **Rujukan Slide**: Slide 48 (Langkah 11 & 12).

---

### 17. Liveness Probe
- **Terjemahan Baku**: Penyelidikan Kehidupan Proses.
- **Definisi Formal**: Endpoint diagnostik HTTP (misal: `/health/liveness`) yang dipantau oleh orkestrator kontainer (seperti Kubernetes) untuk memeriksa apakah proses aplikasi utama masih berjalan atau sudah mengalami kondisi deadlock/hang.
- **Analogi Sederhana**: Memeriksa denyut nadi seseorang; jika denyut nadi berhenti, dokter harus segera melakukan tindakan resusitasi jantung (*restart proses*).
- **Risiko Jika Diabaikan**: Aplikasi yang mengalami kebocoran memori atau loop macet akan terus menggantung tanpa pernah di-restart secara otomatis.
- **Rujukan Slide**: Slide 57.

---

### 18. Mass Assignment Vulnerability
- **Terjemahan Baku**: Kerentanan Penugasan Massal.
- **Definisi Formal**: Celah keamanan di mana aplikasi langsung memetakan seluruh properti request body dari klien ke dalam model data internal tanpa memfilter atau membatasi atribut yang memiliki hak istimewa (seperti `role`, `owner_id`, atau `is_admin`).
- **Analogi Sederhana**: Formulir pendaftaran kartu member yang memiliki kolom "Jabatan di Perusahaan", dan pelamar secara bebas menuliskan dirinya sendiri sebagai "Direktur Utama" lalu disetujui otomatis oleh sistem.
- **Risiko Jika Diabaikan**: Pengguna biasa dapat meningkatkan hak aksesnya sendiri (*Privilege Escalation*) menjadi admin atau mencuri kepemilikan task akun lain.
- **Rujukan Slide**: Slide 45, 48 (Langkah 10), 50.

---

### 19. Optimistic Concurrency Control (OCC / Version Locking)
- **Terjemahan Baku**: Kontrol Konkurensi Optimis / Penguncian Versi.
- **Definisi Formal**: Strategi pencegahan konflik penulisan bersamaan di mana setiap baris data memiliki nomor versi (`version`). Saat pembaruan (PATCH), sistem memeriksa apakah versi yang dikirim klien masih sama dengan versi di server; jika tidak sama, pembaruan ditolak dengan HTTP 409 Conflict.
- **Analogi Sederhana**: Mengedit dokumen di Google Docs; jika teman Anda sudah menyimpan editan versi 2 lebih dulu saat Anda masih memegang versi 1, sistem akan meminta Anda menggabungkan revisi terlebih dahulu agar editan teman Anda tidak tertimpa secara buta (*Lost Update*).
- **Risiko Jika Diabaikan**: Perubahan penting yang dilakukan seorang manajer akan tertimpa dan hilang tanpa sengaja oleh data lama dari anggota timnya.
- **Rujukan Slide**: Slide 45, 48 (Langkah 6 & 7).

---

### 20. Out-of-Order Delivery
- **Terjemahan Baku**: Pengiriman di Luar Urutan Waktu.
- **Definisi Formal**: Kondisi di mana pesan yang dikirim belakangan tiba lebih dulu di tujuan daripada pesan yang dikirim lebih awal, disebabkan oleh latensi rute jaringan yang fluktuatif atau mekanisme pengiriman ulang.
- **Analogi Sederhana**: Anda mengirimkan Surat Pernyataan Cerai hari Senin dan Surat Rujuk hari Selasa. Namun kurir pos mengantarkan Surat Rujuk pada hari Rabu dan Surat Cerai baru tiba hari Kamis.
- **Risiko Jika Diabaikan**: Status task yang sudah 'completed' bisa tiba-tiba kembali menjadi 'in_progress' karena paket lama tiba terlambat.
- **Rujukan Slide**: Slide 16.

---

### 21. Raw Body Buffer
- **Terjemahan Baku**: Rangkaian Byte Mentah Asli.
- **Definisi Formal**: Rangkaian byte biner data payload HTTP request yang dibaca langsung dari soket TCP jaringan tanpa melalui proses dekoding, penataan spasi, atau parsing objek JSON.
- **Analogi Sederhana**: Rekaman kaset pita audio asli sebelum suaranya diubah atau dipotong oleh perangkat lunak equalizer komputer.
- **Risiko Jika Diabaikan**: Kegagalan verifikasi tanda tangan kriptografi (HMAC) karena serialisasi ulang mengubah posisi spasi atau urutan kunci JSON.
- **Rujukan Slide**: Slide 11, 12, 19, 20.

---

### 22. Readiness Probe
- **Terjemahan Baku**: Penyelidikan Kesiapan Menerima Trafik.
- **Definisi Formal**: Endpoint diagnostik HTTP (misal: `/health/readiness`) yang digunakan untuk memastikan bahwa aplikasi tidak hanya hidup, tetapi dependensi pentingnya (seperti koneksi basis data SQLite dan media penyimpanan) sudah siap melayani permintaan pengguna.
- **Analogi Sederhana**: Memeriksa apakah seorang koki di dapur restoran sudah selesai menyiapkan wajan, minyak, dan bahan masakan sebelum pelayan membuka pintu masuk pelanggan.
- **Risiko Jika Diabaikan**: Pengguna akan menerima pesan error 500 saat aplikasi baru saja dinyalakan karena basis data belum selesai melakukan inisialisasi koneksi.
- **Rujukan Slide**: Slide 57.

---

### 23. Replay Attack
- **Terjemahan Baku**: Serangan Pemutaran Ulang.
- **Definisi Formal**: Bentuk serangan jaringan di mana penyerang menyadap paket transmisi data yang sah dan mengirimkannya kembali ke server tujuan untuk menduplikasi efek dari transaksi tersebut.
- **Analogi Sederhana**: Merekam suara majikan Anda saat berkata "Buka Pintu!" lalu memutar rekaman tersebut di depan pintu pintar rumah saat majikan sedang pergi.
- **Risiko Jika Diabaikan**: Penyerang dapat mengirimkan kembali notifikasi pembayaran lama untuk mencairkan saldo berkali-kali.
- **Rujukan Slide**: Slide 11, 13, 20.

---

### 24. SAGA Pattern
- **Terjemahan Baku**: Pola Transaksi SAGA.
- **Definisi Formal**: Pola manajemen transaksi terdistribusi untuk arsitektur microservices di mana satu transaksi bisnis besar dipecah menjadi rangkaian transaksi lokal independen yang dikoordinasikan secara bertahap, disertai transaksi kompensasi jika terjadi kegagalan.
- **Analogi Sederhana**: Alur perjalanan dinas luar kota: Pesan Tiket Pesawat &rarr; Pesan Hotel &rarr; Sewa Mobil. Jika sewa mobil ditolak, sistem secara berantai membatalkan reservasi hotel dan tiket pesawat.
- **Risiko Jika Diabaikan**: Sistem terkunci dalam kebuntuan (*deadlock*) karena mencoba menerapkan protokol *Two-Phase Commit (2PC)* yang lambat dan rapuh di jaringan terdistribusi.
- **Rujukan Slide**: Slide 40.

---

### 25. Service Level Objective (SLO)
- **Terjemahan Baku**: Sasaran Tingkat Layanan.
- **Definisi Formal**: Target kuantitatif terukur mengenai keandalan dan performa layanan perangkat lunak yang disepakati oleh tim teknis (misal: persentase keberhasilan permintaan $\ge 99.5\%$ dan latensi p95 $< 500\text{ ms}$).
- **Analogi Sederhana**: Janji restoran cepat saji bahwa 99% pesanan pelanggan akan disajikan dalam waktu di bawah 10 menit.
- **Risiko Jika Diabaikan**: Tidak ada tolok ukur obyektif untuk menentukan apakah sistem berjalan sehat atau sedang mengalami degradasi kinerja bagi pelanggan.
- **Rujukan Slide**: Slide 52 & 55.

---

### 26. Structured Logging
- **Terjemahan Baku**: Pencatatan Log Terstruktur.
- **Definisi Formal**: Praktik mencatat kejadian aplikasi menggunakan format data standar (umumnya JSON) dengan pasangan kunci-nilai (*key-value pairs*), sehingga dapat dengan mudah dicari, diindeks, dan dianalisis oleh mesin pengumpul log (seperti Elasticsearch, Datadog, atau CloudWatch).
- **Analogi Sederhana**: Mengisi formulir tabel resmi dengan kolom tanggal, nama, dan keperluan, bukan sekadar mencoret-coret kalimat bebas di secarik kertas buram.
- **Risiko Jika Diabaikan**: Pencarian log insiden memakan waktu berjam-jam (*grep text*) dan risiko tidak sengaja mencetak token otorisasi ke dalam string plaintext.
- **Rujukan Slide**: Slide 54 & 55.

---

### 27. Transactional Outbox Pattern
- **Terjemahan Baku**: Pola Kotak Keluar Transaksional.
- **Definisi Formal**: Pola arsitektur di mana penulisan data entitas utama dan pencatatan event keluar disimpan ke dalam transaksi basis data lokal yang sama secara atomik, kemudian proses latar belakang (*Relay Publisher*) membaca tabel outbox tersebut untuk diteruskan ke message broker eksternal.
- **Analogi Sederhana**: Menaruh surat yang hendak dikirim ke dalam kotak surat di depan rumah Anda sendiri pada saat yang sama Anda selesai menulisnya; kurir pos akan mengambil surat tersebut saat jadwal keliling tiba.
- **Risiko Jika Diabaikan**: Terjadinya anomali *Dual Write* di mana data berhasil disimpan tetapi notifikasi event tidak pernah terkirim.
- **Rujukan Slide**: Slide 38 & 39.

---

### 28. Write-Ahead Logging (WAL Mode)
- **Terjemahan Baku**: Mode Pencatatan Sebelum Menulis.
- **Definisi Formal**: Fitur mesin basis data (khususnya SQLite) di mana setiap perubahan data dicatat terlebih dahulu ke dalam berkas log terpisah (*WAL file*) sebelum dituliskan ke berkas basis data utama, memungkinkan proses pembacaan (*reader*) dan penulisan (*writer*) berjalan bersamaan tanpa saling mengunci.
- **Analogi Sederhana**: Mencatat pesanan pelanggan di buku nota kecil terlebih dahulu sambil terus melayani pembeli lain, baru kemudian memindahkan total penjualan ke buku besar kasir di akhir jam kerja.
- **Risiko Jika Diabaikan**: Munculnya kesalahan `database is locked` pada SQLite saat server diakses oleh beberapa worker atau thread pengujian secara bersamaan.
- **Rujukan Slide**: Slide 17 & 28.
