import Swal from 'sweetalert2';

const brand = '#24b47f';
const brandDark = '#1e9c6d';
const inkDark = '#0e1a14';

const base = Swal.mixin({
  customClass: {
    popup:          'swal-popup',
    confirmButton:  'swal-btn-confirm',
    cancelButton:   'swal-btn-cancel',
    denyButton:     'swal-btn-deny',
  },
  buttonsStyling: false,
  color: inkDark,
  background: '#ffffff',
});

export function swalSuccess(title: string, text?: string) {
  return base.fire({
    icon: 'success',
    iconColor: brand,
    title,
    text,
    confirmButtonText: 'OK',
    timer: 2000,
    timerProgressBar: true,
  });
}

export function swalError(title: string, text?: string) {
  return base.fire({
    icon: 'error',
    iconColor: '#e53e3e',
    title,
    text,
    confirmButtonText: 'Tutup',
  });
}

export function swalConfirm(title: string, text?: string) {
  return base.fire({
    icon: 'warning',
    iconColor: '#d97706',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal',
  });
}

export function swalInfo(title: string, text?: string) {
  return base.fire({
    icon: 'info',
    iconColor: brand,
    title,
    text,
    confirmButtonText: 'OK',
  });
}
