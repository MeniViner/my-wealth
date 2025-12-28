import Swal from 'sweetalert2';

// הגדרות מותאמות לעברית
const defaultConfig = {
  confirmButtonText: 'אישור',
  cancelButtonText: 'ביטול',
  confirmButtonColor: '#10b981', // emerald-600
  cancelButtonColor: '#64748b', // slate-500
  buttonsStyling: true,
  reverseButtons: true, // כפתור אישור מימין
  customClass: {
    popup: 'rtl-popup',
    title: 'rtl-title',
    htmlContainer: 'rtl-html',
    confirmButton: 'rtl-confirm',
    cancelButton: 'rtl-cancel'
  }
};

// פונקציה לאישור (confirm)
export const confirmAlert = async (title, text = '', icon = 'warning', isDelete = false) => {
  const result = await Swal.fire({
    ...defaultConfig,
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: 'אישור',
    cancelButtonText: 'ביטול',
    confirmButtonColor: isDelete ? '#ef4444' : defaultConfig.confirmButtonColor, // אדום למחיקה
  });
  return result.isConfirmed;
};

// פונקציה להודעת הצלחה קצרה (toast)
export const successToast = (message, duration = 2000) => {
  return Swal.fire({
    title: message,
    icon: 'success',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: duration,
    timerProgressBar: true,
    customClass: {
      popup: 'rtl-popup',
    },
  });
};

// פונקציה להודעת הצלחה
export const successAlert = (title, text = '') => {
  return Swal.fire({
    ...defaultConfig,
    title,
    text,
    icon: 'success',
    confirmButtonText: 'אישור',
  });
};

// פונקציה להודעת שגיאה
export const errorAlert = (title, text = '') => {
  return Swal.fire({
    ...defaultConfig,
    title,
    text,
    icon: 'error',
    confirmButtonText: 'אישור',
  });
};

// פונקציה להודעת מידע
export const infoAlert = (title, text = '') => {
  return Swal.fire({
    ...defaultConfig,
    title,
    text,
    icon: 'info',
    confirmButtonText: 'אישור',
  });
};

