function handleCredentialResponse(response) {
  const idToken = response.credential;

  // 1. Tampilkan Loading Spinner menggunakan SweetAlert
  Swal.fire({
    title: 'Memeriksa Kredensial...',
    text: 'Mohon tunggu sebentar',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  fetch(GAS_LOGIN, {
    method: "POST",
    body: JSON.stringify({
      action: "login",
      id_token: idToken
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "ok") {
      sessionStorage.setItem("user", JSON.stringify(data.user));
      // Tampilkan popup sukses
      Swal.fire({
        icon: 'success',
        title: 'Login Berhasil!',
        text: 'Membuka SICAPAI...',
        confirmButtonText: 'OK',
        confirmButtonColor: '#1e7e34' // Warna hijau
      }).then((result) => {
        // Baru pindah ke home.html jika user klik "OK"
        if (result.isConfirmed) {
          window.location.href = "home.html";
        }
      });

    } else {
      // Tampilkan popup error
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: data.message || "Gagal melakukan verifikasi.",
        confirmButtonColor: '#b02a37'
      });
    }
  })
  .catch(err => {
    console.error(err);
    Swal.fire({
      icon: 'error',
      title: 'Kesalahan Sistem',
      text: 'Terjadi masalah saat menghubungi server.',
      confirmButtonColor: '#b02a37'
    });
  });
}