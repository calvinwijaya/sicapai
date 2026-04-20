var tableDataTCK = [];
var loggedInUserName = "";
var isAdminUser = false;

initUserTCK();
refreshDataTCK();

// 1. Fungsi Helper Format
function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

function initUserTCK() {
    const userStr = sessionStorage.getItem("user");
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }
    const user = JSON.parse(userStr);
    
    // Cari nama berdasarkan email dari config
    loggedInUserName = Object.keys(PIC_OPTIONS).find(key => PIC_OPTIONS[key] === user.email) || user.email;
    
    // Cek apakah email user yang login ada di dalam list ADMIN_EMAILS
    isAdminUser = ADMIN_EMAILS.includes(user.email.trim());
}

function refreshDataTCK() {
    const tahun = document.getElementById('filterTahunTCK').value;
    const url = `${GAS_WEB_APP_URL}?tahun=${tahun}`;
    
    showLoading('Sedang Memuat Data...');

    fetch(url)
        .then(res => res.json())
        .then(res => {
            hideLoading();
            if (res.status === 'success') {
                tableDataTCK = res.data;
                renderTabelTCK();
            } else {
                Swal.fire('Info', res.message, 'info');
                document.getElementById("tbodyTCK").innerHTML = "";
            }
        })
        .catch(err => {
            hideLoading();
            Swal.fire('Error', 'Gagal memuat data.', 'error');
        });
}

function renderTabelTCK() {
    const tbody = document.getElementById("tbodyTCK");
    tbody.innerHTML = "";
    
    tableDataTCK.forEach(row => {
        if(!row[0]) return;
        
        const tr = document.createElement("tr");
        tr.id = `row-${row[0]}`;
        
        let picList = (row[4] || "").toString().split(",").map(n => n.trim());
        let isAuthorized = picList.includes(loggedInUserName) || isAdminUser;
        
        // --- CEK STATUS TIDAK MUNGKIN TERCAPAI (KOLOM P / INDEX 15) ---
        let isMustahil = (row[15] || "").toString().trim() === "Tidak Mungkin Tercapai";

        // Pewarnaan Baris (Merah gelap jika mustahil)
        if (isMustahil) {
            // Menimpa variabel CSS Bootstrap agar warna teraplikasi ke seluruh sel (<td>)
            tr.style.setProperty('--bs-table-bg', '#721c24');
            tr.style.setProperty('--bs-table-color', '#ffffff');
            tr.style.setProperty('--bs-table-hover-bg', '#5c161d'); // Warna saat di-hover
            tr.style.setProperty('--bs-table-hover-color', '#ffffff');
            tr.classList.add("fw-semibold");
        } else if (!isAuthorized) {
            tr.classList.add("table-secondary", "opacity-75");
        }

        // Kalkulasi target & capaian (sama seperti sebelumnya)
        let targetVal = parseFloat(row[6]) || 0;
        let capaianTotal = parseFloat(row[11]) || 0;
        
        let persentaseNum = 0;
        if (targetVal > 0) {
            let sheetPct = parseFloat(row[12]);
            persentaseNum = isNaN(sheetPct) ? (capaianTotal / targetVal) : sheetPct;
        } else {
            persentaseNum = 1; 
        }
        
        let persentaseStr = Math.round(persentaseNum * 100) + "%";
        let isTercapai = persentaseNum >= 1;

        // TAMBAHAN: Tentukan status baris untuk fitur filter
        let rowStatus = isMustahil ? "mustahil" : (isTercapai ? "tercapai" : "tidak_tercapai");
        tr.dataset.status = rowStatus;
        tr.dataset.search = (row[3] || "").toString().toLowerCase(); // Simpan nama indikator huruf kecil
        
        let badgeKet = isTercapai 
            ? `<i class="bi bi-check-circle-fill ${isMustahil ? 'text-light' : 'text-success'} fs-5" title="Tercapai"></i>` 
            : `<i class="bi bi-x-circle-fill ${isMustahil ? 'text-light' : 'text-danger'} fs-5" title="Tidak Tercapai"></i>`;

        // Ubah warna link bukti jadi putih jika baris merah
        let linkClass = isMustahil ? "text-info" : "text-primary";
        let buktiHtml = row[14] ? `<a href="${row[14]}" target="_blank" class="text-truncate d-block ${linkClass}" style="max-width: 100px;">Lihat Bukti</a>` : "-";

        // --- TOMBOL AKSI TERMASUK TOMBOL ADMIN ---
        let aksiHtml = "";
        
        let btnEdit = "";
        if (isAuthorized && !isMustahil) {
            btnEdit = `
                <button class="btn btn-sm btn-warning text-dark px-2 py-1 btn-edit" onclick="enableEditMode('${row[0]}')" title="Edit Capaian">
                    <i class="bi bi-pencil-square"></i>
                </button>
            `;
        }

        let btnAdminMustahil = "";
        if (isAdminUser) {
            // Jika sudah ditandai, tombol berubah jadi 'batal tandai'
            let btnClass = isMustahil ? "btn-light text-danger" : "btn-danger";
            let iconMustahil = isMustahil ? "bi-arrow-counterclockwise" : "bi-slash-circle";
            let titleMustahil = isMustahil ? "Batalkan Status Tidak Mungkin" : "Tandai Tidak Mungkin Tercapai";
            
            btnAdminMustahil = `
                <button class="btn btn-sm ${btnClass} px-2 py-1 ms-1" onclick="toggleMustahil('${row[0]}', ${isMustahil})" title="${titleMustahil}">
                    <i class="bi ${iconMustahil}"></i>
                </button>
            `;
        }

        if (isAuthorized || isAdminUser) {
            aksiHtml = `<div class="d-flex justify-content-center">${btnEdit}${btnAdminMustahil}</div>`;
        } else {
            aksiHtml = `<i class="bi bi-lock-fill text-muted" title="Bukan tugas Anda"></i>`;
        }

        tr.innerHTML = `
            <td class="fw-bold text-center val-no">${row[0]}</td>
            <td class="small">
                ${row[3]}
                <div class="mt-1 ${isMustahil ? 'text-light' : 'text-muted'}" style="font-size: 0.75rem;">PIC: <b>${row[4] || '-'}</b></div>
            </td>
            <td class="text-center fw-bold val-target" data-value="${targetVal}">${formatNumber(targetVal)}</td>
            <td class="text-center val-tw1">${formatNumber(row[7] || 0)}</td>
            <td class="text-center val-tw2">${formatNumber(row[8] || 0)}</td>
            <td class="text-center val-tw3">${formatNumber(row[9] || 0)}</td>
            <td class="text-center val-tw4">${formatNumber(row[10] || 0)}</td>
            <td class="text-center fw-bold val-capaian-total">${formatNumber(capaianTotal)}</td>
            <td class="text-center val-persentase">${persentaseStr}</td>
            <td class="text-center val-keterangan">${badgeKet}</td>
            <td class="val-bukti text-center" data-raw="${row[14] || ''}">${buktiHtml}</td>
            <td class="text-center action-col">${aksiHtml}</td>
        `;
        
        tbody.appendChild(tr);
    });

    // Menjaga presisi sticky header
    setTimeout(() => {
        const row1 = document.querySelector('#tableTCK thead tr:nth-child(1)');
        const row2Headers = document.querySelectorAll('#tableTCK thead tr:nth-child(2) th');
        if (row1 && row2Headers.length > 0) {
            row2Headers.forEach(th => th.style.top = row1.getBoundingClientRect().height + 'px');
        }
        
        // Aplikasikan kembali filter setelah data selesai dirender
        filterTableTCK();
        
    }, 50);
}

function enableEditMode(rowNo) {
    const tr = document.getElementById(`row-${rowNo}`);
    const targetVal = parseFloat(tr.querySelector('.val-target').innerText) || 0;
    
    const twCols = ['.val-tw1', '.val-tw2', '.val-tw3', '.val-tw4'];
    twCols.forEach(selector => {
        const td = tr.querySelector(selector);
        const val = parseFloat(td.innerText.replace(/\./g, '')) || 0; // Hapus titik ribuan sebelum masuk ke input type="number"
        
        td.innerHTML = `<input type="number" class="form-control form-control-sm text-center input-tw px-1" value="${val}" style="min-width:90px;" oninput="recalculateRow('${rowNo}', ${targetVal})">`;
    });

    const tdBukti = tr.querySelector('.val-bukti');
    const rawBukti = tdBukti.dataset.raw;
    tdBukti.innerHTML = `<input type="text" class="form-control form-control-sm input-bukti" value="${rawBukti}" placeholder="Link Drive">`;

    const tdAction = tr.querySelector('.action-col');
    
    // PERBAIKAN DI SINI: Menggunakan flexbox horizontal (d-flex gap-1) dan hanya menggunakan ikon agar dimensi baris tidak membesar
    tdAction.innerHTML = `
        <div class="d-flex justify-content-center gap-1">
            <button class="btn btn-sm btn-success px-2 py-1" onclick="saveRowData('${rowNo}')" title="Simpan Data">
                <i class="bi bi-check-lg fw-bold"></i>
            </button>
            <button class="btn btn-sm btn-secondary px-2 py-1" onclick="cancelEditMode()" title="Batal Edit">
                <i class="bi bi-x-lg fw-bold"></i>
            </button>
        </div>
    `;
}

function recalculateRow(rowNo, targetVal) {
    const tr = document.getElementById(`row-${rowNo}`);
    const inputs = tr.querySelectorAll('.input-tw');
    
    let tw1 = parseFloat(inputs[0].value) || 0;
    let tw2 = parseFloat(inputs[1].value) || 0;
    let tw3 = parseFloat(inputs[2].value) || 0;
    let tw4 = parseFloat(inputs[3].value) || 0;
    
    let capaianTCK = 0;
    
    if (MAX_INDICATORS.includes(rowNo.toString())) {
        capaianTCK = Math.max(tw1, tw2, tw3, tw4);
    } else {
        capaianTCK = tw1 + tw2 + tw3 + tw4; 
    }
    
    let persentase = 0;
    if (targetVal > 0) {
        persentase = (capaianTCK / targetVal) * 100;
    } else {
        persentase = 100; // Target 0 otomatis tercapai
    }
    
    let persentaseBulat = Math.round(persentase);
    
    // TAMBAHAN: Update status baris agar filter dropdown tetap akurat saat diedit
    tr.dataset.status = persentaseBulat >= 100 ? "tercapai" : "tidak_tercapai";

    tr.querySelector('.val-capaian-total').innerText = formatNumber(capaianTCK);
    tr.querySelector('.val-persentase').innerText = persentaseBulat + '%';
    
    const badgeKet = persentaseBulat >= 100 
        ? `<i class="bi bi-check-circle-fill text-success fs-5" title="Tercapai"></i>` 
        : `<i class="bi bi-x-circle-fill text-danger fs-5" title="Tidak Tercapai"></i>`;
        
    tr.querySelector('.val-keterangan').innerHTML = badgeKet;
}

function saveRowData(rowNo) {
    const tr = document.getElementById(`row-${rowNo}`);
    const tahun = document.getElementById('filterTahunTCK').value;
    
    const twInputs = tr.querySelectorAll('.input-tw');
    const buktiInput = tr.querySelector('.input-bukti').value;
    
    const updateData = {
        no: rowNo,
        tw1: Number(twInputs[0].value) || 0,
        tw2: Number(twInputs[1].value) || 0,
        tw3: Number(twInputs[2].value) || 0,
        tw4: Number(twInputs[3].value) || 0,
        bukti: buktiInput
    };

    showLoading('Sedang Mengirim Data...');

    fetch(GAS_POST_TCK_URL, {
        method: 'POST',
        body: JSON.stringify({ tahun: tahun, updates: [updateData] })
    })
    .then(res => res.json())
    .then(res => {
        hideLoading();
        if (res.status === 'success') {
            Swal.fire({
                title: 'Tersimpan!',
                text: 'Data capaian berhasil diperbarui.',
                icon: 'success',
                showConfirmButton: true,
                confirmButtonText: 'OK'
            }).then((result) => {
                if (result.isConfirmed) {
                    refreshDataTCK(); 
                }
            });
        } else {
            Swal.fire('Gagal!', res.message, 'error');
        }
    })
    .catch(err => {
        hideLoading();
        Swal.fire('Error', 'Terjadi kesalahan koneksi saat menyimpan.', 'error');
    });
}

function showLoading(text) {
    const overlay = document.getElementById('loadingOverlay');
    const textElem = document.getElementById('loadingText');
    if (overlay && textElem) {
        textElem.innerText = text;
        overlay.classList.remove('d-none');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('d-none');
}

function cancelEditMode() {
    renderTabelTCK();
}

function toggleMustahil(rowNo, isCurrentlyMustahil) {
    let actionText = isCurrentlyMustahil ? "membatalkan status" : "menandai indikator ini sebagai";
    let newValue = isCurrentlyMustahil ? "" : "Tidak Mungkin Tercapai";
    
    Swal.fire({
        title: 'Apakah Anda yakin?',
        text: `Anda akan ${actionText} "Tidak Mungkin Tercapai" untuk tahun ini.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Lanjutkan',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            const tahun = document.getElementById('filterTahunTCK').value;
            const updateData = { no: rowNo, ket_mustahil: newValue };
            
            showLoading('Memproses...');
            fetch(GAS_POST_TCK_URL, {
                method: 'POST',
                body: JSON.stringify({ tahun: tahun, updates: [updateData] })
            })
            .then(res => res.json())
            .then(res => {
                hideLoading(); // Sembunyikan loading "Memproses..."
                
                if (res.status === 'success') {
                    // PERBAIKAN: Gunakan .then() agar refresh menunggu klik OK dari user
                    Swal.fire({
                        title: 'Berhasil!',
                        text: 'Status TCK berhasil diperbarui.',
                        icon: 'success',
                        showConfirmButton: true,
                        confirmButtonText: 'OK'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            refreshDataTCK(); // Loading "Sedang Memuat Data..." baru akan muncul di sini
                        }
                    });
                } else {
                    Swal.fire('Gagal!', res.message, 'error');
                }
            })
            .catch(err => {
                hideLoading();
                Swal.fire('Error', 'Terjadi kesalahan saat memproses permintaan.', 'error');
            });
        }
    });
}

// FUNGSI BARU: Pencarian dan Filter Status secara Real-Time
function filterTableTCK() {
    const searchValue = document.getElementById('searchIndikator').value.toLowerCase();
    const statusValue = document.getElementById('filterStatusTCK').value;
    const rows = document.querySelectorAll('#tbodyTCK tr');

    // Kosongkan filter bawaan setiap kali pencarian dijalankan agar tidak bertabrakan
    rows.forEach(tr => {
        const text = tr.dataset.search || "";
        const status = tr.dataset.status || "";

        // Logika pencocokan
        const matchSearch = text.includes(searchValue);
        const matchStatus = statusValue === 'all' || status === statusValue;

        // Tampilkan jika cocok, sembunyikan jika tidak
        if (matchSearch && matchStatus) {
            tr.classList.remove('d-none');
        } else {
            tr.classList.add('d-none');
        }
    });
}