var tableDataTCK = [];
var loggedInUserName = "";

initUserTCK();
refreshDataTCK();

function initUserTCK() {
    const userStr = sessionStorage.getItem("user");
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }
    const user = JSON.parse(userStr);
    loggedInUserName = Object.keys(PIC_OPTIONS).find(key => PIC_OPTIONS[key] === user.email) || user.email;
}

function refreshDataTCK() {
    const tahun = document.getElementById('filterTahunTCK').value;
    const url = `${GAS_WEB_APP_URL}?tahun=${tahun}`;
    
    const overlay = document.getElementById('loadingOverlay');
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
        let isAuthorized = picList.includes(loggedInUserName);
        
        if (!isAuthorized) {
            tr.classList.add("table-secondary", "opacity-75");
        }

        let ketCapaian = row[13] || "";
        let badgeKet = ketCapaian.toLowerCase() === "tercapai" 
            ? `<i class="bi bi-check-circle-fill text-success fs-5" title="Tercapai"></i>` 
            : `<i class="bi bi-x-circle-fill text-danger fs-5" title="Tidak Tercapai"></i>`;

        let buktiHtml = row[14] ? `<a href="${row[14]}" target="_blank" class="text-truncate d-block" style="max-width: 100px;">Lihat Bukti</a>` : "-";

        let aksiHtml = "";
        if (isAuthorized) {
            aksiHtml = `
                <button class="btn btn-sm btn-warning text-dark px-2 py-1 btn-edit" onclick="enableEditMode('${row[0]}')">
                    <i class="bi bi-pencil-square"></i>
                </button>
            `;
        } else {
            aksiHtml = `<i class="bi bi-lock-fill text-muted" title="Bukan tugas Anda"></i>`;
        }

        let persentase = row[12] !== "" ? Math.round(row[12] * 100) + "%" : "-";

        // Menambahkan class spesifik (val-target, val-capaian-total, dll) agar mudah ditarget oleh JS saat kalkulasi real-time
        tr.innerHTML = `
            <td class="fw-bold text-center val-no">${row[0]}</td>
            <td class="small">
                ${row[3]}
                <div class="mt-1 text-muted" style="font-size: 0.75rem;">PIC: <b>${row[4] || '-'}</b></div>
            </td>
            <td class="text-center fw-bold val-target">${row[6] || 0}</td>
            <td class="text-center val-tw1">${row[7] || 0}</td>
            <td class="text-center val-tw2">${row[8] || 0}</td>
            <td class="text-center val-tw3">${row[9] || 0}</td>
            <td class="text-center val-tw4">${row[10] || 0}</td>
            <td class="text-center fw-bold bg-light val-capaian-total">${row[11] || 0}</td>
            <td class="text-center val-persentase">${persentase}</td>
            <td class="text-center val-keterangan">${badgeKet}</td>
            <td class="val-bukti text-center" data-raw="${row[14] || ''}">${buktiHtml}</td>
            <td class="text-center action-col">${aksiHtml}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

function enableEditMode(rowNo) {
    const tr = document.getElementById(`row-${rowNo}`);
    const targetVal = parseFloat(tr.querySelector('.val-target').innerText) || 0;
    
    const twCols = ['.val-tw1', '.val-tw2', '.val-tw3', '.val-tw4'];
    twCols.forEach(selector => {
        const td = tr.querySelector(selector);
        const val = parseFloat(td.innerText) || 0;
        
        // Lebarkan input menjadi 90px agar muat nominal besar seperti di 1B
        td.innerHTML = `<input type="number" class="form-control form-control-sm text-center input-tw px-1" value="${val}" style="min-width:90px;" oninput="recalculateRow('${rowNo}', ${targetVal})">`;
    });

    const tdBukti = tr.querySelector('.val-bukti');
    const rawBukti = tdBukti.dataset.raw;
    tdBukti.innerHTML = `<input type="text" class="form-control form-control-sm input-bukti" value="${rawBukti}" placeholder="Link Drive">`;

    const tdAction = tr.querySelector('.action-col');
    tdAction.innerHTML = `
        <button class="btn btn-sm btn-success px-2 py-1 mb-1 w-100" onclick="saveRowData('${rowNo}')">
            <i class="bi bi-check2"></i> Simpan
        </button>
        <button class="btn btn-sm btn-secondary px-2 py-1 w-100" onclick="cancelEditMode()">
            <i class="bi bi-x"></i> Batal
        </button>
    `;
}

// Fungsi Kalkulasi Real-Time
function recalculateRow(rowNo, targetVal) {
    const tr = document.getElementById(`row-${rowNo}`);
    const inputs = tr.querySelectorAll('.input-tw');
    
    let tw1 = parseFloat(inputs[0].value) || 0;
    let tw2 = parseFloat(inputs[1].value) || 0;
    let tw3 = parseFloat(inputs[2].value) || 0;
    let tw4 = parseFloat(inputs[3].value) || 0;
    
    let capaianTCK = 0;
    
    // Cek apakah No Indikator masuk ke array MAX_INDICATORS
    if (MAX_INDICATORS.includes(rowNo.toString())) {
        capaianTCK = Math.max(tw1, tw2, tw3, tw4);
    } else {
        capaianTCK = tw1 + tw2 + tw3 + tw4; // Sisa nomor menggunakan SUM
    }
    
    // Hitung persentase
    let persentase = 0;
    if (targetVal > 0) {
        persentase = (capaianTCK / targetVal) * 100;
    } else if (targetVal === 0 && capaianTCK > 0) {
        persentase = 100; // Logika fallback jika target 0 tapi ada isian
    }
    let persentaseBulat = Math.round(persentase);
    
    // Update tampilan HTML secara langsung
    tr.querySelector('.val-capaian-total').innerText = capaianTCK;
    tr.querySelector('.val-persentase').innerText = persentaseBulat + '%';
    
    const badgeKet = persentaseBulat >= 100 
        ? `<span class="badge bg-success">Tercapai</span>` 
        : `<span class="badge bg-danger">Tidak Tercapai</span>`;
        
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

    const overlay = document.getElementById('loadingOverlay');
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