// إعدادات Firebase المدمجة
const firebaseConfig = {
  apiKey: "AIzaSyABC123...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// عناصر DOM
const loadingScreen = document.getElementById('loading-screen');
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const googleSigninBtn = document.getElementById('google-signin-btn');
const logoutBtn = document.getElementById('logout-btn');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');

// تهيئة أيقونات Lucide
lucide.createIcons();

// متابعة حالة المصادقة
auth.onAuthStateChanged(user => {
  if (user) {
    // تم تسجيل الدخول
    currentUser = user;
    updateUserProfile(user);
    showMainApp();
    loadAppData();
  } else {
    // غير مسجل الدخول
    showAuthScreen();
  }
});

// تسجيل الدخول بـ Google
googleSigninBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .catch(error => {
      showToast('حدث خطأ أثناء التسجيل: ' + error.message, 'error');
    });
});

// تسجيل الخروج
logoutBtn.addEventListener('click', () => {
  showConfirmDialog('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', () => {
    auth.signOut();
  });
});

// تحديث بيانات المستخدم
function updateUserProfile(user) {
  userAvatar.src = user.photoURL || 'data:image/svg+xml;base64,...'; // صورة افتراضية
  userName.textContent = user.displayName || 'مستخدم';
  userEmail.textContent = user.email || '';
}

// تحميل بيانات التطبيق
function loadAppData() {
  // سيتم تنفيذها لاحقاً
}

// عرض/إخفاء الشاشات
function showLoading() {
  loadingScreen.classList.remove('hidden');
  authScreen.classList.add('hidden');
  mainApp.classList.add('hidden');
}

function showAuthScreen() {
  loadingScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  mainApp.classList.add('hidden');
}

function showMainApp() {
  loadingScreen.classList.add('hidden');
  authScreen.classList.add('hidden');
  mainApp.classList.remove('hidden');
}

// عرض تنبيه
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastMessage = document.getElementById('toast-message');
  
  toastIcon.setAttribute('data-lucide', type === 'success' ? 'check-circle' : 'alert-circle');
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
  
  lucide.createIcons();
}

// عرض حوار تأكيد
function showConfirmDialog(title, message, onConfirm) {
  const confirmModal = document.getElementById('confirm-modal');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmYesBtn = document.getElementById('confirm-yes-btn');
  
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  
  confirmYesBtn.onclick = () => {
    onConfirm();
    hideModal('confirm-modal');
  };
  
  showModal('confirm-modal');
}

// إدارة النمط (الوضع المظلم/الفاتح)
const themeToggleBtn = document.getElementById('theme-toggle-btn');
themeToggleBtn.addEventListener('click', toggleTheme);

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('darkTheme', isDark);
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  const icon = themeToggleBtn.querySelector('i');
  icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
  lucide.createIcons();
}

// تهيئة التطبيق
showLoading();

// تحقق من تفضيلات النمط
if (localStorage.getItem('darkTheme') === 'true') {
  document.body.classList.add('dark-theme');
  updateThemeIcon(true);
}