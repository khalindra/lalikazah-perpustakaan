const K = { b: 'lit_buku', p: 'lit_pinjam', r: 'lit_riwayat', t: 'lit_tema' };
function ambil(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } }
function simpan(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage diblokir */ } }

// Terapkan tema sebelum halaman tampil (anti-berkedip)
(function () {
  const t = ambil(K.t, matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = t; document.documentElement.dataset.bsTheme = t;
})();

$(function () {
  const pg = $('body').data('page');
  let buku = ambil(K.b, null); if (!buku || !buku.length) buku = DATA_BUKU.slice();
  let pinjam = ambil(K.p, []), riwayat = ambil(K.r, []);
  const tgl = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const esc = s => $('<i>').text(s).html();
  const cari = isbn => buku.find(b => b.isbn === isbn);
  const toast = (icon, title, text) => window.Swal ? Swal.fire({ icon, title, text, confirmButtonColor: '#FB6F92', background: getComputedStyle(document.body).getPropertyValue('--card') || '#fff', color: getComputedStyle(document.body).color })
    : alert(title + '\n' + text);

  
  if (sessionStorage.getItem('lit_load')) $('#loader').remove();
  else setTimeout(() => { $('#loader').fadeOut(500, function () { $(this).remove(); }); sessionStorage.setItem('lit_load', 1); }, 1100);

  //darkmode
  const ikonTema = () => $('#tema i').attr('class', 'bi ' + (document.documentElement.dataset.theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'));
  $('#tema').on('click', function () {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t; document.documentElement.dataset.bsTheme = t;
    simpan(K.t, t); ikonTema();
  });
  ikonTema();

  // Efek klik ripple (hanya untuk mouse, bukan sentuhan)
  if (matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $(document).on('click', function (e) {
      const ripple = document.createElement('span');
      ripple.className = 'click-ripple';
      ripple.style.left = e.clientX + 'px';
      ripple.style.top = e.clientY + 'px';
      document.body.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  }

  
  $(document).on('click', 'a[href]', function (e) {
    const h = $(this).attr('href');
    if (/^[a-z]+\.html/.test(h) && !e.ctrlKey && !e.metaKey && !$(this).attr('target')) {
      e.preventDefault(); $('body').addClass('keluar'); setTimeout(() => { location.href = h; }, 280);
    }
  });
  $(window).on('scroll', () => $('#top').toggleClass('on', scrollY > 400));
  $('#top').on('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('show'); io.unobserve(en.target); } }), { threshold: .12 }) : null;
  const reveal = () => $('.rv').not('.show').each(function () { io ? io.observe(this) : $(this).addClass('show'); });

  
  const cover = b => '<div class="cw"><div class="cover k-' + esc(b.kategori.toLowerCase()) + '"><span>' + esc(b.judul) + '</span><i class="bi ' + (b.cover || 'bi-book') + '"></i></div></div>';
  const badge = b => b.status === 'tersedia' ? '<span class="bdg ok">Tersedia</span>' : '<span class="bdg out">Dipinjam</span>';
  function kartu(b, list) {
    return '<div class="' + (list ? 'col-12' : 'col-12 col-sm-6 col-lg-4 col-xl-3') + ' rv"><article class="card-buku">' +
      '<a href="detail.html?isbn=' + b.isbn + '" aria-label="' + esc(b.judul) + '">' + cover(b) + '</a><div class="info"><span class="kt">' + esc(b.kategori) + '</span>' +
      '<h3>' + esc(b.judul) + '</h3><p class="mut small mb-2">' + esc(b.pengarang) + ' &bull; ' + b.tahun + '</p><div class="mb-3">' + badge(b) +
      '</div><a class="btn-soft mt-auto text-center" href="detail.html?isbn=' + b.isbn + '">Lihat Detail</a></div></article></div>';
  }

  
  function statistik() {
    const t = buku.filter(b => b.status === 'tersedia').length;
    [['#sTotal', buku.length], ['#sTersedia', t], ['#sPinjam', buku.length - t]].forEach(function (a) {
      const $e = $(a[0]); $({ n: parseInt($e.text(), 10) || 0 }).animate({ n: a[1] }, { duration: 900, step: n => $e.text(Math.round(n)), complete: () => $e.text(a[1]) });
    });
  }

    //home
  if (pg === 'home') {
    $('#featured').html(buku.filter(b => b.status === 'tersedia').slice(0, 4).map(b => kartu(b)).join(''));
    $('#formCari').on('submit', function (e) { e.preventDefault(); const q = $('#cariHome').val().trim(); if (q.length < 2) return; location.href = 'katalog.html?q=' + encodeURIComponent(q); });
    statistik();
  }

    //katalog
  if (pg === 'katalog') {
    const url = new URLSearchParams(location.search); let list = false;
    $('#cari').val(url.get('q') || ''); $('#fKat').val(url.get('kat') || '');

    // Menyaring, mengurutkan, lalu menampilkan buku
    function render() {
      const q = $('#cari').val().trim().toLowerCase(), kat = $('#fKat').val(), st = $('#fStatus').val(), so = $('#fSort').val();
      const hasil = buku.filter(b => (!q || (b.judul + ' ' + b.pengarang).toLowerCase().includes(q)) && (!kat || b.kategori === kat) && (st === 'semua' || b.status === st));
      hasil.sort((a, b) => so === 'az' ? a.judul.localeCompare(b.judul) : so === 'za' ? b.judul.localeCompare(a.judul) : so === 'baru' ? b.tahun - a.tahun : a.tahun - b.tahun);
      $('#daftar').html(hasil.map(b => kartu(b, list)).join('')).toggleClass('list', list);
      $('#kosong').toggleClass('d-none', hasil.length > 0); reveal(); statistik();
    }
    $('#cari').on('input', render); $('#fKat, #fStatus, #fSort').on('change', render);
    $('#btnView').on('click', function () { list = !list; $(this).html('<i class="bi bi-' + (list ? 'list-ul' : 'grid') + '"></i> ' + (list ? 'List' : 'Grid')); render(); });

    // Validasi form tambah buku (jQuery)
    const err = ($e, m) => { $e.addClass('is-invalid').removeClass('is-valid').siblings('.invalid-feedback').text(m); return false; };
    const ok = $e => { $e.removeClass('is-invalid').addClass('is-valid'); return true; };
    $('#formTambah').on('input change', 'input,select,textarea', function () { $(this).removeClass('is-invalid is-valid'); });
    $('#formTambah').on('submit', function (e) {
      e.preventDefault(); let v = true;
      const cek = (id, fn) => { const $e = $('#' + id), m = fn($e.val().trim()); v = (m ? err($e, m) : ok($e)) && v; };
      cek('fIsbn', x => !x ? 'ISBN wajib diisi.' : !/^\d{13}$/.test(x) ? 'ISBN harus tepat 13 digit angka.' : cari(x) ? 'ISBN sudah terdaftar.' : '');
      cek('fJudul', x => x.length < 3 ? 'Judul minimal 3 karakter.' : '');
      cek('fPengarang', x => x.length < 3 ? 'Pengarang minimal 3 karakter.' : '');
      cek('fPenerbit', x => x.length < 2 ? 'Penerbit wajib diisi.' : '');
      cek('fTahun', x => !x ? 'Tahun wajib diisi.' : (x < 1900 || x > 2026) ? 'Tahun harus 1900 sampai 2026.' : '');
      cek('fKategori', x => !x ? 'Pilih kategori.' : '');
      cek('fSinopsis', x => x.length < 10 ? 'Sinopsis minimal 10 karakter.' : '');
      if (!v) return;
      buku.push({ isbn: $('#fIsbn').val().trim(), judul: $('#fJudul').val().trim(), pengarang: $('#fPengarang').val().trim(), penerbit: $('#fPenerbit').val().trim(),
        tahun: Number($('#fTahun').val()), kategori: $('#fKategori').val(), status: 'tersedia', cover: 'bi-book', sinopsis: $('#fSinopsis').val().trim() });
      simpan(K.b, buku); this.reset(); $(this).find('.is-valid').removeClass('is-valid');
      bootstrap.Modal.getInstance('#modalTambah').hide(); render(); toast('success', 'Buku ditambahkan', 'Buku baru sudah masuk ke katalog.');
    });
    render();
  }

  // Detail buku
  if (pg === 'detail') {
    const b = cari(new URLSearchParams(location.search).get('isbn'));
    if (!b) { $('#detail').html('<div class="kosong"><i class="bi bi-emoji-frown"></i><h2>Buku tidak ditemukan</h2><a class="btn-rose" href="katalog.html">Kembali ke Katalog</a></div>'); }
    else {
      document.title = b.judul + ' | PERPUSTAKAAN KEL 2';
      $('#detail').html('<div class="col-12 col-md-5"><div class="detail-cover">' + cover(b) + '</div></div><div class="col-12 col-md-7"><span class="kt">' + esc(b.kategori) + '</span><h1>' + esc(b.judul) + '</h1><p class="mut fs-5">oleh ' + esc(b.pengarang) + '</p>' +
        '<dl class="meta"><dt>ISBN</dt><dd>' + b.isbn + '</dd><dt>Penerbit</dt><dd>' + esc(b.penerbit) + '</dd><dt>Tahun</dt><dd>' + b.tahun + '</dd><dt>Status</dt><dd id="stBuku">' + badge(b) + '</dd></dl>' +
        '<p class="lh-lg">' + esc(b.sinopsis) + '</p><button class="btn-rose" id="btnPinjam"><i class="bi bi-bookmark-heart me-1"></i>Pinjam Buku</button> <a class="btn-soft" href="katalog.html">Kembali ke Katalog</a></div>');
      // Pinjam buku: cek status, ubah, simpan, notifikasi
      $('#btnPinjam').on('click', function () {
        if (b.status !== 'tersedia') return toast('error', 'Buku tidak tersedia', 'Buku ini sedang dipinjam. Coba lagi nanti.');
        b.status = 'dipinjam'; pinjam.push({ isbn: b.isbn, tgl: tgl() });
        simpan(K.b, buku); simpan(K.p, pinjam); $('#stBuku').html(badge(b));
        toast('success', 'Berhasil dipinjam', '"' + b.judul + '" sudah masuk ke Peminjaman Saya.');
      });
      const rek = buku.filter(x => x.isbn !== b.isbn).sort((x, y) => (y.kategori === b.kategori) - (x.kategori === b.kategori)).slice(0, 4);
      $('#rekomendasi').html(rek.map(x => kartu(x)).join('')); reveal();
    }
  }

  // Peminjaman
  if (pg === 'peminjaman') {
    function render() {
      $('#kosongPinjam').toggleClass('d-none', pinjam.length > 0);
      $('#listPinjam').html(pinjam.map(p => { const b = cari(p.isbn); return !b ? '' :
        '<div class="col-12 col-md-6"><div class="card-buku flex-row gap-3 align-items-center"><div class="borrow-cover">' + cover(b) + '</div><div class="flex-grow-1"><h3>' + esc(b.judul) + '</h3><p class="mut small mb-1">' + esc(b.pengarang) + '</p><p class="small mb-2">Dipinjam: ' + p.tgl + '</p><span class="bdg out">Sedang dipinjam</span><br>' +
        '<button class="btn-rose mt-2 btn-kembali" data-isbn="' + b.isbn + '">Kembalikan Buku</button></div></div></div>'; }).join(''));
      $('#isiRiwayat').html(riwayat.length ? riwayat.map(r => '<tr><td>' + esc(r.judul) + '</td><td>' + r.pinjam + '</td><td>' + r.kembali + '</td><td><span class="bdg ok">Dikembalikan</span></td></tr>').join('') : '<tr><td colspan="4" class="text-center mut py-4">Belum ada riwayat pengembalian.</td></tr>');
      $('#nPinjam').text(pinjam.length);
    }
    $('#listPinjam').on('click', '.btn-kembali', function () {
      const isbn = String($(this).data('isbn')), b = cari(isbn), p = pinjam.find(x => x.isbn === isbn); if (!b || !p) return;
      b.status = 'tersedia'; pinjam = pinjam.filter(x => x.isbn !== isbn);
      riwayat.unshift({ judul: b.judul, pinjam: p.tgl, kembali: tgl() });
      simpan(K.b, buku); simpan(K.p, pinjam); simpan(K.r, riwayat); render();
      toast('success', 'Buku dikembalikan', '"' + b.judul + '" kini tersedia kembali di katalog.');
    });
    render();
  }

  reveal();
});
