const user = JSON.parse(sessionStorage.getItem("user"));
if (!user) {
    window.location.href = 'index.html';
} else {
    document.addEventListener("DOMContentLoaded", () => {
        document.getElementById("userNama").textContent = user.nama;
    });
}

const Loading = {
    show: () => {
        const el = document.getElementById("loadingOverlay");
        if (el) el.classList.remove("d-none");
    },
    hide: () => {
        const el = document.getElementById("loadingOverlay");
        if (el) el.classList.add("d-none");
    }
};

// Sidebar Toggle
document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById('toggleSidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('collapsed');
            if (sidebar.classList.contains('collapsed')) {
                document.querySelectorAll('.sidebar .collapse.show').forEach(el => {
                    const bsCollapse = bootstrap.Collapse.getInstance(el) || new bootstrap.Collapse(el, { toggle: false });
                    bsCollapse.hide();
                });
            }
        });
    }

    // Logout Event
    document.getElementById("btnLogout").addEventListener("click", (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Keluar dari Sistem?',
            text: "Sesi Anda akan berakhir.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Ya, Keluar',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) performLogout();
        });
    });

    // Handle initial routing
    const params = new URLSearchParams(window.location.search);
    const pageKey = params.get("page");
    const routes = { 'dashboard': '01_dashboard.html',
                     'assignPIC': '02_assignPIC.html',
                     'pengisianTCK': '03_pengisianTCK.html'
     };
    if (pageKey && routes[pageKey]) loadPage(routes[pageKey], pageKey);
});

// Fungsi Load Page
function loadPage(eventOrPage, pagePath, key) {
    let finalPage, finalKey;
    if (typeof eventOrPage === 'object' && eventOrPage !== null) {
        if (eventOrPage.preventDefault) eventOrPage.preventDefault();
        finalPage = pagePath;
        finalKey = key;
    } else {
        finalPage = eventOrPage;
        finalKey = pagePath;
    }

    if (!finalPage || !finalKey) return;

    Loading.show(); 

    fetch(finalPage)
        .then(res => {
            if (!res.ok) throw new Error("Gagal mengambil file");
            return res.text();
        })
        .then(html => {
            document.getElementById("mainContent").innerHTML = html;
            const newUrl = `${window.location.origin}${window.location.pathname}?page=${finalKey}`;
            history.pushState({ page: finalPage, key: finalKey }, "", newUrl);

            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            const activeLink = document.querySelector(`a[onclick*="'${finalKey}'"]`);
            if (activeLink) activeLink.classList.add('active');

            // --- TAMBAHAN LOGIKA AUTO-HIDE SIDEBAR ---
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                if (finalKey === 'pengisianTCK') {
                    // Sembunyikan sidebar otomatis khusus untuk halaman ini
                    sidebar.classList.add('collapsed');
                } else {
                    // Buka kembali sidebar untuk halaman lain (Opsional, hapus 'else' jika ingin biarkan tertutup)
                    sidebar.classList.remove('collapsed');
                }
            }
            // -----------------------------------------

            if (finalKey === 'dashboard') loadScript('js/01_dashboard.js')
            else if (finalKey === 'assignPIC') loadScript('js/02_assignPIC.js')
            else if (finalKey === 'pengisianTCK') loadScript('js/03_pengisianTCK.js')
        })
        .catch(err => {
            console.error(err);
            document.getElementById("mainContent").innerHTML = "<p class='text-danger'>Gagal memuat halaman.</p>";
        })
        .finally(() => Loading.hide()); 
}

function loadScript(src) {
    const oldScript = document.querySelector(`script[src="${src}"]`);
    if (oldScript) oldScript.remove();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
}

window.onpopstate = function(event) {
    if (event.state && event.state.page) {
        loadPage(event.state.page, event.state.key);
    } else {
        window.location.href = window.location.pathname;
    }
};

function performLogout() {
    sessionStorage.clear();
    localStorage.clear();
    Swal.fire({
        title: 'Berhasil Keluar',
        icon: 'success',
        timer: 1000,
        showConfirmButton: false
    }).then(() => {
        window.location.href = "index.html";
    });
}