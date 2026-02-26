var isEditMode = false;
var tableDataCache = [];

checkAdminAccess();
refreshDataPIC();

function checkAdminAccess() {
    const userStr = sessionStorage.getItem("user");
    if (!userStr) {
        window.location.href = 'index.html'; // Proteksi page
        return;
    }
    const user = JSON.parse(userStr);
    
    // Tampilkan tombol edit hanya jika email ada di daftar admin
    if (ADMIN_EMAILS.includes(user.email)) {
        document.getElementById("btnEditMode").classList.remove("d-none");
    }
}

function refreshDataPIC() {
    const tahun = document.getElementById('filterTahunPIC').value;
    const url = `${GAS_WEB_APP_URL}?tahun=${tahun}`; // Menggunakan URL doGet dari page sebelumnya
    
    const overlay = document.getElementById('loadingOverlay');
    showLoading('Sedang Memuat Data...');

    fetch(url)
        .then(res => res.json())
        .then(res => {
            hideLoading();
            if (res.status === 'success') {
                tableDataCache = res.data;
                renderTabelPIC();
            } else {
                Swal.fire('Info', res.message, 'info');
                tableDataCache = [];
                renderTabelPIC();
            }
        })
        .catch(err => {
            hideLoading();
            Swal.fire('Error', 'Gagal memuat data.', 'error');
        });
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById("btnEditMode");
    const footer = document.getElementById("footerSaveAction");
    
    if (isEditMode) {
        btn.classList.replace("btn-warning", "btn-danger");
        btn.innerHTML = `<i class="bi bi-x-circle me-1"></i> Matikan Edit`;
        footer.classList.remove("d-none");
    } else {
        btn.classList.replace("btn-danger", "btn-warning");
        btn.innerHTML = `<i class="bi bi-pencil-square me-1"></i> Edit Mode`;
        footer.classList.add("d-none");
    }
    
    // Re-render tabel sesuai state isEditMode
    renderTabelPIC(); 
}

function renderTabelPIC() {
    const tbody = document.getElementById("tbodyPIC");
    tbody.innerHTML = "";
    
    tableDataCache.forEach(row => {
        if(!row[0]) return;
        
        const tr = document.createElement("tr");
        tr.dataset.no = row[0]; 
        
        // Sekarang yang dibaca dari kolom E (row[4]) adalah Nama, bukan Email
        let currentNames = (row[4] || "").toString().split(",").map(n => n.trim()).filter(n => n);
        
        let picHtml, ketHtml, targetHtml;
        
        if (isEditMode) {
            // Mode Edit: Buat tag berdasarkan Nama
            let tagsHtml = currentNames.map(name => {
                // Cari email berdasarkan nama di config, jika tidak ada anggap input manual
                let email = PIC_OPTIONS[name] || name; 
                return `<span class="tag-badge" data-email="${email}" data-name="${name}">${name} <span class="tag-remove" onclick="removeTag(this)">&times;</span></span>`;
            }).join("");

            picHtml = `
                <div class="position-relative">
                    <div class="tags-input-wrapper" onclick="this.querySelector('input').focus()">
                        <div class="tags-container d-flex flex-wrap gap-1">${tagsHtml}</div>
                        <input type="text" class="tag-input" placeholder="Ketik PIC..." 
                               oninput="showSuggestions(this, '${row[0]}')" 
                               onkeydown="handleTagInput(event, this)">
                    </div>
                    <div class="autocomplete-suggestions d-none" id="suggestions-${row[0]}"></div>
                </div>
            `;
            ketHtml = `<textarea class="form-control form-control-sm input-ket" rows="2">${row[5] || ""}</textarea>`;
            targetHtml = `<input type="number" class="form-control form-control-sm input-target text-center" value="${row[6] || 0}">`;
        } else {
            // Mode Read-Only: Langsung tampilkan namanya
            let displayNames = currentNames.join("<br>");
            picHtml = displayNames ? `<span class="badge bg-secondary">${displayNames.replace(/<br>/g, '</span><br><span class="badge bg-secondary mt-1">')}</span>` : "-";
            
            ketHtml = row[5] || "-";
            targetHtml = `<span class="fw-bold fs-6">${row[6] || 0}</span>`;
        }

        tr.innerHTML = `
            <td class="fw-bold text-center">${row[0]}</td>
            <td class="small">${row[3]}</td>
            <td class="text-center">${picHtml}</td> <td>${ketHtml}</td>
            <td class="text-center">${targetHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function showSuggestions(inputEl, rowNo) {
    const val = inputEl.value.toLowerCase().trim();
    const suggestionBox = document.getElementById(`suggestions-${rowNo}`);
    suggestionBox.innerHTML = '';

    if (!val) {
        suggestionBox.classList.add('d-none');
        return;
    }

    // Filter dari const PIC_OPTIONS
    let matches = Object.keys(PIC_OPTIONS).filter(name =>
        name.toLowerCase().includes(val) || PIC_OPTIONS[name].toLowerCase().includes(val)
    );

    if (matches.length > 0) {
        matches.forEach(name => {
            let div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<strong>${name}</strong> <br><small class="text-muted">${PIC_OPTIONS[name]}</small>`;
            // Saat diklik, tambahkan tag
            div.onmousedown = (e) => { 
                e.preventDefault(); // Mencegah input kehilangan fokus terlalu cepat
                addTag(inputEl, name, PIC_OPTIONS[name]); 
            };
            suggestionBox.appendChild(div);
        });
        suggestionBox.classList.remove('d-none');
    } else {
        suggestionBox.classList.add('d-none');
    }
}

function handleTagInput(event, inputEl) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const val = inputEl.value.trim();
        if (val) {
            // Cek apakah input manual ini cocok dengan nama atau email di config
            let foundName = Object.keys(PIC_OPTIONS).find(name => 
                name.toLowerCase() === val.toLowerCase() || 
                PIC_OPTIONS[name].toLowerCase() === val.toLowerCase()
            );
            
            if (foundName) {
                addTag(inputEl, foundName, PIC_OPTIONS[foundName]);
            } else {
                // Jika tidak ada di config, tambahkan input manual langsung sebagai nama
                addTag(inputEl, val, val);
            }
        }
    }
}

function addTag(inputEl, displayName, emailVal) {
    const wrapper = inputEl.closest('.tags-input-wrapper');
    const container = wrapper.querySelector('.tags-container');
    const suggestionBox = wrapper.nextElementSibling;

    // Cek duplikasi berdasarkan nama
    let existingNames = Array.from(container.querySelectorAll('.tag-badge')).map(el => el.dataset.name);
    
    if (!existingNames.includes(displayName)) {
        let span = document.createElement('span');
        span.className = 'tag-badge';
        span.dataset.email = emailVal;
        span.dataset.name = displayName; // Menyimpan atribut nama
        span.innerHTML = `${displayName} <span class="tag-remove" onclick="removeTag(this)">&times;</span>`;
        container.appendChild(span);
    }

    inputEl.value = ''; 
    suggestionBox.classList.add('d-none'); 
}

function removeTag(element) {
    element.closest('.tag-badge').remove();
}

// Menutup rekomendasi jika user klik di luar area input
document.addEventListener('click', function(e) {
    if (!e.target.closest('.position-relative')) {
        document.querySelectorAll('.autocomplete-suggestions').forEach(el => el.classList.add('d-none'));
    }
});

function savePICData() {
    const tahun = document.getElementById('filterTahunPIC').value;
    const btnSave = document.getElementById('btnSavePIC');
    const tbody = document.getElementById("tbodyPIC");
    
    let updates = [];
    
    Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
        const no = tr.dataset.no;
        
        // AMBIL NAMA dari tag, bukan emailnya
        const tagsContainer = tr.querySelector('.tags-container');
        let selectedNames = Array.from(tagsContainer.querySelectorAll('.tag-badge')).map(badge => badge.dataset.name);
        
        // Gabungkan nama menjadi string yang dipisahkan koma
        let finalNames = selectedNames.join(", "); 
        
        const ket = tr.querySelector('.input-ket').value;
        const target = tr.querySelector('.input-target').value;
        
        updates.push({
            no: no,
            pic: finalNames, // Mengirimkan Nama ke Spreadsheet
            ket: ket,
            target: parseInt(target) || 0
        });
    });

    const overlay = document.getElementById('loadingOverlay');
    showLoading('Sedang Mengirim Data...');
    btnSave.disabled = true;

    fetch(GAS_POST_TCK_URL, {
        method: 'POST',
        body: JSON.stringify({ tahun: tahun, updates: updates })
    })
    .then(res => res.json())
    .then(res => {
        if(overlay) overlay.classList.add('d-none');
        btnSave.disabled = false;
        
        if (res.status === 'success') {
            Swal.fire({
            title: 'Tersimpan!',
            text: 'Data capaian berhasil diperbarui.',
            icon: 'success',
            showConfirmButton: true, // Pastikan tombol OK muncul
            confirmButtonText: 'OK'
        }).then((result) => {            
            if (result.isConfirmed) {
                toggleEditMode();
                refreshDataPIC(); 
            }
        });
        } else {
            Swal.fire('Gagal!', res.message, 'error');
        }
    })
    .catch(err => {
        hideLoading();
        btnSave.disabled = false;
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