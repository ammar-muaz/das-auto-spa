type TranslationEntry = { en: string; bm: string };
type Translations = Record<string, TranslationEntry>;

export const translations: Translations = {
  // Navigation
  "nav.dashboard": { en: "Dashboard", bm: "Papan Pemuka" },
  "nav.adminDashboard": { en: "Admin Dashboard", bm: "Papan Pemuka Admin" },
  "nav.jobDashboard": { en: "Job Dashboard", bm: "Papan Pemuka Kerja" },
  "nav.bookNow": { en: "Book a Car Wash", bm: "Tempah Cuci Kereta" },
  "nav.bookingHistory": { en: "Booking History", bm: "Sejarah Tempahan" },
  "nav.myReviews": { en: "My Reviews", bm: "Ulasan Saya" },
  "nav.reviews": { en: "Reviews", bm: "Ulasan" },
  "nav.jobHistory": { en: "Job History", bm: "Sejarah Kerja" },
  "nav.myLeave": { en: "My Leave", bm: "Cuti Saya" },
  "nav.manageBookings": { en: "Manage Bookings", bm: "Urus Tempahan" },
  "nav.manageUsers": { en: "Manage Users", bm: "Urus Pengguna" },
  "nav.reportsAnalytics": { en: "Reports & Analytics", bm: "Laporan & Analitik" },
  "nav.leaveManagement": { en: "Leave Management", bm: "Pengurusan Cuti" },
  "nav.getHelp": { en: "Get Help", bm: "Dapatkan Bantuan" },
  "nav.settings": { en: "Settings", bm: "Tetapan" },
  "nav.logOut": { en: "Log out", bm: "Log Keluar" },
  "nav.darkMode": { en: "Dark Mode", bm: "Mod Gelap" },
  "nav.lightMode": { en: "Light Mode", bm: "Mod Cerah" },

  // Dropdown
  "dropdown.settings": { en: "Settings", bm: "Tetapan" },
  "dropdown.getHelp": { en: "Get Help", bm: "Dapatkan Bantuan" },
  "dropdown.logOut": { en: "Log out", bm: "Log Keluar" },

  // Settings page tabs
  "settings.title": { en: "Settings", bm: "Tetapan" },
  "settings.profile": { en: "Profile", bm: "Profil" },
  "settings.preferences": { en: "Preferences", bm: "Keutamaan" },
  "settings.language": { en: "Language", bm: "Bahasa" },
  "settings.security": { en: "Security", bm: "Keselamatan" },
  "security.subtitle": { en: "Manage your password and account security", bm: "Urus kata laluan dan keselamatan akaun anda" },

  // Preferences tab
  "pref.appearance": { en: "Appearance", bm: "Penampilan" },
  "pref.appearanceDesc": { en: "Choose your preferred theme", bm: "Pilih tema pilihan anda" },
  "pref.lightMode": { en: "Light Mode", bm: "Mod Cerah" },
  "pref.darkMode": { en: "Dark Mode", bm: "Mod Gelap" },
  "pref.fontSize": { en: "Font Size", bm: "Saiz Fon" },
  "pref.fontSizeDesc": { en: "Choose your preferred text size", bm: "Pilih saiz teks pilihan anda" },
  "pref.fontSmall": { en: "Small", bm: "Kecil" },
  "pref.fontMedium": { en: "Medium", bm: "Sederhana" },
  "pref.fontLarge": { en: "Large", bm: "Besar" },

  // Language tab
  "lang.title": { en: "Language", bm: "Bahasa" },
  "lang.desc": { en: "Choose your preferred language for the interface", bm: "Pilih bahasa pilihan anda untuk antara muka" },
  "lang.english": { en: "English (US)", bm: "Bahasa Inggeris (AS)" },
  "lang.malay": { en: "Bahasa Melayu", bm: "Bahasa Melayu" },
  "lang.currentLabel": { en: "Current language", bm: "Bahasa semasa" },

  // Profile form
  "profile.title": { en: "Profile", bm: "Profil" },
  "profile.subtitle": { en: "Update your personal information and security", bm: "Kemaskini maklumat peribadi dan keselamatan anda" },
  "profile.fullName": { en: "Full Name", bm: "Nama Penuh" },
  "profile.email": { en: "Email Address", bm: "Alamat E-mel" },
  "profile.phone": { en: "Phone Number", bm: "Nombor Telefon" },
  "profile.address": { en: "Address", bm: "Alamat" },
  "profile.passwordSecurity": { en: "Password Security", bm: "Keselamatan Kata Laluan" },
  "profile.changePassword": { en: "Change Password", bm: "Tukar Kata Laluan" },
  "profile.currentPassword": { en: "Current Password", bm: "Kata Laluan Semasa" },
  "profile.newPassword": { en: "New Password", bm: "Kata Laluan Baru" },
  "profile.confirmNewPassword": { en: "Confirm New Password", bm: "Sahkan Kata Laluan Baru" },
  "profile.cancelPasswordChange": { en: "Cancel password change", bm: "Batal perubahan kata laluan" },
  "profile.saveChanges": { en: "Save Changes", bm: "Simpan Perubahan" },
  "profile.cancel": { en: "Cancel", bm: "Batal" },
  "profile.fullNameRequired": { en: "Full name is required", bm: "Nama penuh diperlukan" },
  "profile.phoneRequired": { en: "Phone number is required", bm: "Nombor telefon diperlukan" },
  "profile.currentPasswordRequired": { en: "Current password is required", bm: "Kata laluan semasa diperlukan" },
  "profile.passwordMinLength": { en: "Password must be at least 6 characters", bm: "Kata laluan mestilah sekurang-kurangnya 6 aksara" },
  "profile.passwordNoMatch": { en: "Passwords do not match", bm: "Kata laluan tidak sepadan" },
  "profile.updateSuccess": { en: "Profile updated successfully.", bm: "Profil berjaya dikemaskini." },
  "profile.updateFailed": { en: "Failed to update profile.", bm: "Gagal mengemaskini profil." },

  // Common
  "common.back": { en: "Back", bm: "Kembali" },
  "common.save": { en: "Save", bm: "Simpan" },
  "common.cancel": { en: "Cancel", bm: "Batal" },
  "common.loading": { en: "Loading...", bm: "Memuatkan..." },
  "common.search": { en: "Search", bm: "Cari" },
  "common.filter": { en: "Filter", bm: "Tapis" },
  "common.view": { en: "View", bm: "Lihat" },
  "common.edit": { en: "Edit", bm: "Edit" },
  "common.confirm": { en: "Confirm", bm: "Sahkan" },
  "common.submit": { en: "Submit", bm: "Hantar" },
  "common.noData": { en: "No data found", bm: "Tiada data dijumpai" },

  // Status labels
  "status.pending": { en: "Pending", bm: "Menunggu" },
  "status.confirmed": { en: "Confirmed", bm: "Disahkan" },
  "status.assigned": { en: "Assigned", bm: "Ditugaskan" },
  "status.inProgress": { en: "In Progress", bm: "Sedang Diproses" },
  "status.completionPending": { en: "Completion Pending", bm: "Menunggu Penyelesaian" },
  "status.completed": { en: "Completed", bm: "Selesai" },
  "status.cancelled": { en: "Cancelled", bm: "Dibatalkan" },
  "status.enRoute": { en: "En Route", bm: "Dalam Perjalanan" },
  "status.approved": { en: "Approved", bm: "Diluluskan" },
  "status.rejected": { en: "Rejected", bm: "Ditolak" },

  // Help page
  "help.title": { en: "Help & Guide", bm: "Bantuan & Panduan" },
  "help.customerSubtitle": { en: "Customer guide — everything you need to know", bm: "Panduan pelanggan — semua yang anda perlu tahu" },
  "help.providerSubtitle": { en: "Service Provider guide — everything you need to know", bm: "Panduan Pembekal Servis — semua yang anda perlu tahu" },
  "help.adminSubtitle": { en: "Admin guide — everything you need to know", bm: "Panduan Admin — semua yang anda perlu tahu" },

  // Notifications page
  "notif.title": { en: "Notifications", bm: "Pemberitahuan" },
  "notif.unread": { en: "unread", bm: "belum dibaca" },
  "notif.allCaughtUp": { en: "You're all caught up", bm: "Anda sudah membaca semua" },
  "notif.markAllRead": { en: "Mark all read", bm: "Tandakan semua dibaca" },
  "notif.noNotifications": { en: "No notifications yet", bm: "Tiada pemberitahuan lagi" },
  "notif.noNotificationsDesc": { en: "We'll notify you when something happens.", bm: "Kami akan memberitahu anda apabila ada sesuatu berlaku." },

  // Dashboard labels
  "dash.todaysJobs": { en: "Today's Jobs", bm: "Kerja Hari Ini" },
  "dash.completedToday": { en: "Completed Today", bm: "Selesai Hari Ini" },
  "dash.totalJobs": { en: "Total Jobs", bm: "Jumlah Kerja" },
  "dash.totalRevenue": { en: "Total Revenue", bm: "Jumlah Pendapatan" },
  "dash.bookingHistory": { en: "Booking History", bm: "Sejarah Tempahan" },
  "dash.noBookings": { en: "No bookings found", bm: "Tiada tempahan dijumpai" },
};
