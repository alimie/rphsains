/* ==========================================================================
   RPH Digital — tetapan tapak (satu tempat untuk semua nilai yang berubah)

   Fail INI sahaja yang perlu diubah apabila nilai berubah:
     • sekolah   — tukar bila berpindah sekolah
     • sesi      — tukar setiap tahun persekolahan
     • tahun[]   — subjek & bilangan untuk halaman utama
                   (cth. KP2027: Tahun 1 & 2 jadi "Alam dan Manusia")

   Halaman tahun (rph-sains-tahunN.html) juga memuatkan fail ini, dan nilai
   sekolah + sesi di sini MENANG ke atas fail data. Jadi berpindah sekolah
   atau tukar sesi = satu suntingan di sini sahaja.

   Subjek pula milik kandungan tahun itu sendiri (assets/data-tahunN-sains.js),
   kerana ia menentukan skop simpanan dan kandungan RPH. Nilai mataPelajaran
   dalam senarai tahun[] di bawah hanya mengawal label pada halaman utama —
   pastikan ia sepadan dengan fail data tahun berkenaan.
   ========================================================================== */
window.RPH_SITE = {
  sekolah: "SK Kuala Betis",
  sesi: 2026,
  tahun: [
    { tahun: 1, mataPelajaran: "Sains", bil: 86 },
    { tahun: 2, mataPelajaran: "Sains", bil: 86 },
    { tahun: 3, mataPelajaran: "Sains", bil: 86 },
    { tahun: 4, mataPelajaran: "Sains", bil: 86 },
    { tahun: 5, mataPelajaran: "Sains", bil: 86 },
    { tahun: 6, mataPelajaran: "Sains", bil: 86 }
  ]
};
