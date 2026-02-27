// Deklarasi var untuk mencegah error identifier di SPA
var tsTotalChartInstance = null;
var tsBidangChartInstance = null;

// Indeks kolom (Fokus ke status capaian dan bidang)
var TS_COL = { NO: 0, BIDANG: 1, KET_CAPAIAN: 13 };

var NAMA_BIDANG_TS = [
    "Bidang Pendidikan dan Kemahasiswaan",
    "Bidang Keuangan, Aset, dan SDM",
    "Bidang Penelitian, Pengabdian kepada Masyarakat, dan Kerjasama"
];

// Inisiasi awal
refreshTimeSeriesData();

function refreshTimeSeriesData() {
    const startYear = parseInt(document.getElementById('filterTahunMulai').value);
    const endYear = parseInt(document.getElementById('filterTahunAkhir').value);

    // Validasi input tahun
    if (startYear > endYear) {
        Swal.fire('Perhatian', 'Tahun mulai tidak boleh lebih besar dari tahun akhir.', 'warning');
        return;
    }

    // Buat array tahun yang ingin di-fetch
    const yearsToFetch = [];
    for (let y = startYear; y <= endYear; y++) {
        yearsToFetch.push(y);
    }

    Loading.show();

    // Mapping array tahun menjadi array Promise Fetch
    const fetchPromises = yearsToFetch.map(year => {
        return fetch(`${GAS_WEB_APP_URL}?tahun=${year}`)
            .then(res => res.json())
            .then(res => ({ year: year, data: res.status === 'success' ? res.data : [] }))
            .catch(err => ({ year: year, data: [] })); // Jika gagal, anggap data kosong untuk tahun tsb
    });

    // Jalankan semua fetch secara paralel
    Promise.all(fetchPromises)
        .then(results => {
            Loading.hide();
            processTimeSeriesData(yearsToFetch, results);
        })
        .catch(err => {
            Loading.hide();
            Swal.fire('Error', 'Gagal memuat data time series dari server.', 'error');
            console.error(err);
        });
}

function processTimeSeriesData(years, results) {
    // Siapkan wadah struktur data
    let totalData = { tercapai: [], belum: [] };
    
    let bidangData = {
        "Bidang Pendidikan dan Kemahasiswaan": [],
        "Bidang Keuangan, Aset, dan SDM": [],
        "Bidang Penelitian, Pengabdian kepada Masyarakat, dan Kerjasama": []
    };

    // Ekstrak data per tahun secara berurutan
    years.forEach(year => {
        // Cari hasil fetch yang sesuai dengan tahun ini
        let yearResult = results.find(r => r.year === year);
        let rows = yearResult ? yearResult.data : [];

        let countTotalTercapai = 0;
        let countTotalBelum = 0;
        
        let countBidang = {
            "Bidang Pendidikan dan Kemahasiswaan": 0,
            "Bidang Keuangan, Aset, dan SDM": 0,
            "Bidang Penelitian, Pengabdian kepada Masyarakat, dan Kerjasama": 0
        };

        rows.forEach(row => {
            if (!row[TS_COL.NO]) return;

            let bidang = row[TS_COL.BIDANG];
            let status = (row[TS_COL.KET_CAPAIAN] || '').toString().trim().toLowerCase();

            if (status === 'tercapai') {
                countTotalTercapai++;
                if (countBidang[bidang] !== undefined) {
                    countBidang[bidang]++;
                }
            } else if (status === 'tidak tercapai') {
                countTotalBelum++;
            }
        });

        // Push data hasil hitungan ke array untuk grafik
        totalData.tercapai.push(countTotalTercapai);
        totalData.belum.push(countTotalBelum);
        
        NAMA_BIDANG_TS.forEach(b => {
            bidangData[b].push(countBidang[b]);
        });
    });

    renderTsTotalChart(years, totalData);
    renderTsBidangChart(years, bidangData);
}

function renderTsTotalChart(years, totalData) {
    const ctx = document.getElementById('tsTotalChart').getContext('2d');
    
    if (tsTotalChartInstance) tsTotalChartInstance.destroy();

    const maxVal = Math.max(...totalData.tercapai, ...totalData.belum);

    tsTotalChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years, // Sumbu X adalah Tahun
            datasets: [
                {
                    label: 'Tidak Tercapai',
                    backgroundColor: '#dc3545',
                    data: totalData.belum
                },
                {
                    label: 'Tercapai',
                    backgroundColor: '#0d6efd',
                    data: totalData.tercapai
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                datalabels: { display: false } // Sembunyikan label dalam bar untuk grafik TS
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: maxVal > 0 ? maxVal + 2 : 10, // Dinamis Y-Axis
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

function renderTsBidangChart(years, bidangData) {
    const ctx = document.getElementById('tsBidangChart').getContext('2d');
    
    if (tsBidangChartInstance) tsBidangChartInstance.destroy();

    // Data tertinggi dari seluruh bidang di semua tahun
    const allVals = [
        ...bidangData[NAMA_BIDANG_TS[0]], 
        ...bidangData[NAMA_BIDANG_TS[1]], 
        ...bidangData[NAMA_BIDANG_TS[2]]
    ];
    const maxVal = Math.max(...allVals);

    tsBidangChartInstance = new Chart(ctx, {
        type: 'bar', // Menggunakan bar agar perbandingan antar bidang di tahun yg sama terlihat jelas
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Pendidikan & Kemahasiswaan',
                    backgroundColor: '#0d6efd', // Biru
                    data: bidangData[NAMA_BIDANG_TS[0]]
                },
                {
                    label: 'Keuangan, Aset & SDM',
                    backgroundColor: '#ffc107', // Kuning/Warning
                    data: bidangData[NAMA_BIDANG_TS[1]]
                },
                {
                    label: 'Penelitian, Pengabdian & Kerjasama',
                    backgroundColor: '#198754', // Hijau/Success
                    data: bidangData[NAMA_BIDANG_TS[2]]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                datalabels: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: maxVal > 0 ? maxVal + 1 : 5,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}