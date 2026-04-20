// Variabel global untuk menyimpan instance chart agar bisa di-destroy saat refresh
var barChartInstance = null;
var pieChartInstance = null;

// Inisialisasi awal saat script diload
refreshData(); // Panggil data pertama kali

function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

function refreshData() {
    const tahun = document.getElementById('filterTahun').value;
    const url = `${GAS_WEB_APP_URL}?tahun=${tahun}`;
    
    // Tampilkan Loading Overlay (Asumsi sudah ada di HTML utama)
    const overlay = document.getElementById('loadingOverlay');
    if(overlay) overlay.classList.remove('d-none');

    fetch(url)
        .then(response => response.json())
        .then(res => {
            if(overlay) overlay.classList.add('d-none');
            
            if (res.status === 'success') {
                processAndRenderData(res.data);
            } else {
                Swal.fire('Informasi', res.message, 'info');
                clearDashboard();
            }
        })
        .catch(err => {
            if(overlay) overlay.classList.add('d-none');
            Swal.fire('Error', 'Gagal mengambil data dari server.', 'error');
            console.error(err);
        });
}

function processAndRenderData(data) {
    const filterTw = document.getElementById('filterTriwulan').value;
    const currentTahun = parseInt(document.getElementById('filterTahun').value); // Ambil tahun saat ini

    let barData = {
        "Bidang Pendidikan dan Kemahasiswaan": { tercapai: 0, belum: 0 },
        "Bidang Keuangan, Aset, dan SDM": { tercapai: 0, belum: 0 },
        "Bidang Penelitian, Pengabdian kepada Masyarakat, dan Kerjasama": { tercapai: 0, belum: 0 }
    };
    
    let totalTercapai = 0;
    let totalBelum = 0;
    
    let listTidakTercapai = [];
    let listTercapaiByBidang = {
        "Bidang Pendidikan dan Kemahasiswaan": [],
        "Bidang Keuangan, Aset, dan SDM": [],
        "Bidang Penelitian, Pengabdian kepada Masyarakat, dan Kerjasama": []
    };

    let listMustahil = [];

    // 2. Looping Data Row per Row
    data.forEach(row => {
        let bidang = row[COL.BIDANG];
        let noIndikator = row[COL.NO] ? row[COL.NO].toString() : "";
        
        // Skip baris kosong
        if (!noIndikator) return;

        // Cek apakah dia ditandai Mustahil
        let isMustahil = (row[COL.KET_MUSTAHIL] || "").toString().trim() === "Tidak Mungkin Tercapai";
        if (isMustahil) {
            // Kita simpan ke array khusus agar nanti di-render di tabel bawah
            listMustahil.push(row);
            // Jangan masukkan ke perhitungan grafik & list biasa agar tidak rancu
            return; 
        }

        // Hitung untuk Grafik
        // Ambil nilai masing-masing komponen
        let target = parseFloat(row[COL.TARGET]) || 0;
        let tw1 = parseFloat(row[COL.TW1]) || 0;
        let tw2 = parseFloat(row[COL.TW2]) || 0;
        let tw3 = parseFloat(row[COL.TW3]) || 0;
        let tw4 = parseFloat(row[COL.TW4]) || 0;

        let capaianFinal = 0;
        let persentaseFinal = 0;
        let statusFinal = "";

        // Logika Kumulatif berdasarkan filter
        if (filterTw === 'all') {
            capaianFinal = parseFloat(row[COL.CAPAIAN_TOTAL]) || 0;
            
            // BYPASS ERROR SPREADSHEET: Jika target 0, paksa jadi Tercapai (100%)
            if (target === 0) {
                persentaseFinal = 1;
                statusFinal = 'tercapai';
            } else {
                // Gunakan nilai spreadsheet, jika berupa teks "#DIV/0!", ganti jadi 0
                let sheetPct = parseFloat(row[COL.PERSENTASE]);
                persentaseFinal = isNaN(sheetPct) ? 0 : sheetPct;
                statusFinal = row[COL.KET_CAPAIAN].toString().trim().toLowerCase();
            }
        } else {
            // Jika filter spesifik, kumpulkan data kumulatifnya
            let valuesToConsider = [];
            if (filterTw === 'tw1') valuesToConsider = [tw1];
            if (filterTw === 'tw2') valuesToConsider = [tw1, tw2];
            if (filterTw === 'tw3') valuesToConsider = [tw1, tw2, tw3];
            if (filterTw === 'tw4') valuesToConsider = [tw1, tw2, tw3, tw4];

            // Tentukan perhitungan berdasarkan MAX atau SUM
            if (MAX_INDICATORS.includes(noIndikator)) {
                capaianFinal = Math.max(...valuesToConsider);
            } else {
                capaianFinal = valuesToConsider.reduce((a, b) => a + b, 0);
            }

            // Hitung Ulang Persentase (Format desimal untuk dikali 100 di render list)
            if (target > 0) {
                persentaseFinal = capaianFinal / target;
            } else {
                persentaseFinal = 1; // Maksimal 100% jika target 0
            }

            statusFinal = persentaseFinal >= 1 ? 'tercapai' : 'tidak tercapai';

            // Override nilai di dalam array row agar fungsi renderListTercapai 
            // & renderListTidakTercapai menampilkan nilai hasil filter ini, 
            // bukan nilai statis dari spreadsheet
            row[COL.CAPAIAN_TOTAL] = capaianFinal;
            row[COL.PERSENTASE] = persentaseFinal;
            row[COL.KET_CAPAIAN] = statusFinal;
        }

        // Distribusikan data untuk Grafik dan List Kontainer
        if (barData[bidang] !== undefined) {
            if (statusFinal === 'tercapai') {
                barData[bidang].tercapai++;
                totalTercapai++;
                listTercapaiByBidang[bidang].push(row);
            } else {
                barData[bidang].belum++;
                totalBelum++;
                listTidakTercapai.push(row);
            }
        }
    });

    // 3. Render Grafik Bar
    renderBarChart(barData);
    
    // 4. Render Grafik Pie
    renderPieChart(totalTercapai, totalBelum);

    // 5. Render List Kontainer Bawah
    renderListTidakTercapai(listTidakTercapai);
    renderListTercapai(listTercapaiByBidang);
    renderTableMustahil(listMustahil, currentTahun);
}

function renderBarChart(barData) {
    const ctx = document.getElementById('barChartRealisasi').getContext('2d');
    
    if (barChartInstance) barChartInstance.destroy();

    const dataTercapai = NAMA_BIDANG.map(b => barData[b].tercapai);
    const dataBelum = NAMA_BIDANG.map(b => barData[b].belum);
    
    // Cari nilai tertinggi untuk sumbu Y, lalu tambah 1
    const maxValue = Math.max(...dataTercapai, ...dataBelum);

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            // Membagi string menjadi array membuat teks otomatis turun ke baris baru (Word Wrap)
            labels: [
                ['Pendidikan &', 'Kemahasiswaan'], 
                ['Keuangan, Aset', '& SDM'], 
                ['Penelitian, Pengabdian', '& Kerjasama']
            ],
            datasets: [
                {
                    label: 'Tidak Tercapai',
                    backgroundColor: '#dc3545',
                    data: dataBelum
                },
                {
                    label: 'Tercapai',
                    backgroundColor: '#0d6efd',
                    data: dataTercapai
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }, // Pindah legenda ke bawah
                datalabels: { display: false }  // Sembunyikan angka di dalam bar chart
            },
            scales: { 
                y: { 
                    beginAtZero: true, 
                    max: maxValue + 1, // Sumbu Y + 1 dari data tertinggi
                    ticks: { stepSize: 1 } 
                } 
            }
        }
    });
}

function renderPieChart(tercapai, belum) {
    const ctx = document.getElementById('pieChartRealisasi').getContext('2d');
    
    if (pieChartInstance) pieChartInstance.destroy();

    pieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Tercapai', 'Tidak Tercapai'],
            datasets: [{
                data: [tercapai, belum],
                backgroundColor: ['#0d6efd', '#dc3545']
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                datalabels: {
                    color: '#ffffff', 
                    font: { weight: 'bold', size: 16 },
                    formatter: (value, context) => {
                        let total = context.chart._metasets[context.datasetIndex].total;
                        if (total === 0) return '0%';
                        let percentage = Math.round((value / total) * 100) + '%';
                        return percentage; 
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            let value = context.raw;
                            return `${label}: ${value} Indikator`;
                        }
                    }
                }
            }
        }
    });
}

function renderListTidakTercapai(list) {
    const container = document.getElementById('containerTidakTercapai');
    container.innerHTML = ''; // Bersihkan dulu
    
    if (list.length === 0) {
        container.innerHTML = '<div class="alert alert-success">Semua indikator tercapai!</div>';
        return;
    }

    list.forEach(item => {
        let html = `
        <div class="card mb-3 border-danger shadow-sm">
            <div class="card-body p-3">
                <p class="fw-bold mb-1 text-danger">[${item[COL.NO]}] ${item[COL.INDIKATOR]}</p>
                <div class="d-flex justify-content-between text-muted small mb-2">
                    <span>Capaian: <b class="text-dark">${item[COL.CAPAIAN_TOTAL]}</b> / Target: ${item[COL.TARGET]}</span>
                    <span class="badge bg-danger">${Math.round(item[COL.PERSENTASE] * 100)}%</span>
                </div>
                <hr class="my-2">
                <div class="small">
                    <div><b>PIC:</b> ${item[COL.PIC] || '-'}</div>
                    <div class="mt-1"><b>Bukti:</b> <a href="${item[COL.BUKTI]}" target="_blank" class="text-decoration-none text-danger"><i class="bi bi-link-45deg"></i> Lihat Berkas</a></div>
                </div>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

function renderListTercapai(listGrouped) {
    const container = document.getElementById('containerTercapai');
    container.innerHTML = '';

    let isEmpty = true;

    NAMA_BIDANG.forEach(bidang => {
        let list = listGrouped[bidang];
        if (list.length > 0) {
            isEmpty = false;
            let groupHtml = `<h6 class="text-primary mt-3 mb-2 fw-bold border-bottom pb-1">${bidang}</h6>`;
            
            list.forEach(item => {
                groupHtml += `
                <div class="card mb-2 border-primary border-opacity-25 shadow-sm">
                    <div class="card-body p-2">
                        <p class="fw-semibold mb-1 small text-primary">[${item[COL.NO]}] ${item[COL.INDIKATOR]}</p>
                        <div class="d-flex justify-content-between text-muted" style="font-size: 0.75rem;">
                            <span>Capaian: <b>${item[COL.CAPAIAN_TOTAL]}</b> / ${item[COL.TARGET]}</span>
                            <span class="text-success fw-bold">${Math.round(item[COL.PERSENTASE] * 100)}%</span>
                        </div>
                        <div class="mt-1" style="font-size: 0.75rem;">
                            <b>Bukti:</b> <a href="${item[COL.BUKTI]}" target="_blank" class="text-decoration-none"><i class="bi bi-link-45deg"></i> Link</a>
                        </div>
                    </div>
                </div>`;
            });
            container.innerHTML += groupHtml;
        }
    });

    if (isEmpty) {
        container.innerHTML = '<div class="alert alert-secondary">Belum ada indikator yang tercapai.</div>';
    }
}

function clearDashboard() {
    if (barChartInstance) barChartInstance.destroy();
    if (pieChartInstance) pieChartInstance.destroy();
    document.getElementById('containerTidakTercapai').innerHTML = '';
    document.getElementById('containerTercapai').innerHTML = '';
}

function renderTableMustahil(listMustahil, currentTahun) {
    const tbody = document.getElementById('tbodyMustahil');
    
    if (listMustahil.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-muted py-3">Bagus! Belum ada indikator yang ditandai sebagai tidak mungkin tercapai tahun ini.</td></tr>';
        return;
    }

    // Tampilkan pesan loading selagi kita fetch data tahun lalu
    tbody.innerHTML = '<tr><td colspan="6" class="py-3"><div class="spinner-border spinner-border-sm text-danger me-2" role="status"></div> Mengambil data komparasi tahun lalu...</td></tr>';

    const prevYear = currentTahun - 1;
    const urlPrev = `${GAS_WEB_APP_URL}?tahun=${prevYear}`;

    fetch(urlPrev)
        .then(res => res.json())
        .then(res => {
            let prevData = res.status === 'success' ? res.data : [];
            tbody.innerHTML = "";
            
            listMustahil.forEach(item => {
                let no = item[COL.NO];
                let indName = item[COL.INDIKATOR];
                let capNow = item[COL.CAPAIAN_TOTAL]; // Pastikan properti ini sudah diformat sebelumnya di processAndRenderData atau gunakan formatNumber()
                let tgtNow = item[COL.TARGET];

                // Cari baris dari data tahun lalu yang No-nya sama
                let prevRow = prevData.find(r => r[COL.NO] == no);
                
                // Gunakan fungsi formatNumber() yang sudah kita buat sebelumnya
                let capPrev = prevRow ? formatNumber(parseFloat(prevRow[COL.CAPAIAN_TOTAL]) || 0) : "-";
                let tgtPrev = prevRow ? formatNumber(parseFloat(prevRow[COL.TARGET]) || 0) : "-";

                tbody.innerHTML += `
                    <tr>
                        <td class="fw-bold">${no}</td>
                        <td class="text-start small fw-semibold">${indName}</td>
                        <td>${formatNumber(capNow)}</td>
                        <td>${formatNumber(tgtNow)}</td>
                        <td>${capPrev}</td>
                        <td>${tgtPrev}</td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            tbody.innerHTML = '<tr><td colspan="6" class="text-danger py-3">Gagal memuat data komparasi tahun lalu. Pastikan sheet tahun sebelumnya tersedia.</td></tr>';
        });
}