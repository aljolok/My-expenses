import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Enhanced Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCD6TOeIO7g6RGp89YtA1maduwMfyTE1VQ",
  authDomain: "my-expenses-81714.firebaseapp.com",
  projectId: "my-expenses-81714",
  storageBucket: "my-expenses-81714.firebasestorage.app",
  messagingSenderId: "672207051964",
  appId: "1:672207051964:web:b6e0cedc143bd06fd584b9",
  measurementId: "G-YBTY3QD4YQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enhanced Global Variables
let expensesCollectionRef;
let categoriesCollectionRef;
let userId;
let unsubscribeFromExpenses = () => {};
let unsubscribeFromCategories = () => {};

// Enhanced Application State Management
const appState = {
    expenses: [],
    categories: {},
    isEditingExpense: false,
    editingExpenseId: null,
    editingCategoryId: null,
    isEditingCategory: false,
    currentTab: 'daily',
    isAuthReady: false,
    isOffline: !navigator.onLine,
    selectedCategoryIdForExpense: null,
    darkMode: localStorage.getItem('darkMode') === 'true',
    
    // Enhanced Spinner Date Picker State
    spinnerDatePicker: {
        selectedDay: new Date().getDate(),
        selectedMonth: new Date().getMonth(),
        selectedYear: new Date().getFullYear(),
        isScrolling: false,
        scrollTimeout: null,
        touchStartY: 0,
        touchCurrentY: 0,
        isDragging: false
    },
    
    // Enhanced Default Categories
    defaultCategories: {
        'طعام': { name: 'طعام', color: '#EF4444', icon: 'utensils' },
        'مواصلات': { name: 'مواصلات', color: '#3B82F6', icon: 'car' },
        'فواتير': { name: 'فواتير', color: '#F59E0B', icon: 'receipt' },
        'تسوق': { name: 'تسوق', color: '#10B981', icon: 'shopping-bag' },
        'صحة': { name: 'صحة', color: '#8B5CF6', icon: 'heart' },
        'ترفيه': { name: 'ترفيه', color: '#EC4899', icon: 'gamepad-2' },
        'أخرى': { name: 'أخرى', color: '#6B7280', icon: 'more-horizontal' }
    },
    
    // Enhanced Color Palette
    categoryColors: [
        '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981',
        '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
        '#EC4899', '#F43F5E', '#64748B', '#475569', '#374151', '#1F2937'
    ],
    
    // Enhanced Month Names
    monthNames: [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ],
    
    // Enhanced Animation Settings
    animations: {
        enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
};

// Enhanced DOM Elements
const elements = {
    // Loading and Auth
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    authScreen: document.getElementById('authScreen'),
    appScreen: document.getElementById('appScreen'),
    signInBtn: document.getElementById('signInBtn'),
    signOutBtn: document.getElementById('signOutBtn'),
    
    // Header and Navigation
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    displayUserId: document.getElementById('displayUserId'),
    settingsBtn: document.getElementById('settingsBtn'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    
    // Navigation Tabs
    dailyTabBtn: document.getElementById('dailyTabBtn'),
    monthlyTabBtn: document.getElementById('monthlyTabBtn'),
    categoriesTabBtn: document.getElementById('categoriesTabBtn'),
    dailyPage: document.getElementById('dailyPage'),
    monthlyPage: document.getElementById('monthlyPage'),
    categoriesPage: document.getElementById('categoriesPage'),
    settingsPage: document.getElementById('settingsPage'),
    
    // Spinner Date Picker
    spinnerDatePicker: document.getElementById('spinnerDatePicker'),
    dayWheel: document.getElementById('dayWheel'),
    monthWheel: document.getElementById('monthWheel'),
    yearWheel: document.getElementById('yearWheel'),
    dayItems: document.getElementById('dayItems'),
    monthItems: document.getElementById('monthItems'),
    yearItems: document.getElementById('yearItems'),
    selectedDateDisplay: document.getElementById('selectedDateDisplay'),
    
    // Daily Page
    openAddExpenseModalBtn: document.getElementById('openAddExpenseModal'),
    addExpenseFAB: document.getElementById('addExpenseFAB'),
    currentDateExpenseList: document.getElementById('currentDateExpenseList'),
    currentDateTotalDisplay: document.getElementById('currentDateTotal'),
    emptyDailyState: document.getElementById('emptyDailyState'),
    dailyExpensesSkeleton: document.getElementById('dailyExpensesSkeleton'),
    
    // Monthly Page
    monthlyTotalDisplay: document.getElementById('monthlyTotal'),
    dailyAverageDisplay: document.getElementById('dailyAverage'),
    daysRecordedDisplay: document.getElementById('daysRecorded'),
    topCategoriesList: document.getElementById('topCategoriesList'),
    monthlySummarySkeleton: document.getElementById('monthlySummarySkeleton'),
    monthlyContent: document.getElementById('monthlyContent'),
    emptyCategoriesSummary: document.getElementById('emptyCategoriesSummary'),
    generateAnalysisBtn: document.getElementById('generateAnalysisBtn'),
    analysisPlaceholder: document.getElementById('analysisPlaceholder'),
    llmAnalysisOutput: document.getElementById('llmAnalysisOutput'),
    llmAnalysisLoading: document.getElementById('llmAnalysisLoading'),
    
    // Categories Page
    categoryNameInput: document.getElementById('categoryNameInput'),
    categoryColorInput: document.getElementById('categoryColorInput'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    cancelCategoryEditBtn: document.getElementById('cancelCategoryEditBtn'),
    userCategoriesList: document.getElementById('userCategoriesList'),
    emptyCategoriesState: document.getElementById('emptyCategoriesState'),
    categoriesSkeleton: document.getElementById('categoriesSkeleton'),
    
    // Settings Page
    settingsUserAvatar: document.getElementById('settingsUserAvatar'),
    settingsUserName: document.getElementById('settingsUserName'),
    settingsUserEmail: document.getElementById('settingsUserEmail'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    importDataBtn: document.getElementById('importDataBtn'),
    importFileInput: document.getElementById('importFileInput'),
    clearAllDataBtn: document.getElementById('clearAllDataBtn'),
    
    // Modals
    expenseModal: document.getElementById('expenseModal'),
    expenseModalTitle: document.getElementById('expenseModalTitle'),
    modalDaySelect: document.getElementById('modalDaySelect'),
    modalMonthSelect: document.getElementById('modalMonthSelect'),
    modalYearSelect: document.getElementById('modalYearSelect'),
    modalProductNameInput: document.getElementById('modalProductName'),
    modalProductPriceInput: document.getElementById('modalProductPrice'),
    categoryButtonsContainer: document.getElementById('categoryButtonsContainer'),
    saveExpenseBtn: document.getElementById('saveExpenseBtn'),
    cancelExpenseModalBtn: document.getElementById('cancelExpenseModalBtn'),
    
    // Confirmation Modal
    confirmModal: document.getElementById('confirmModal'),
    confirmModalTitle: document.getElementById('confirmModalTitle'),
    confirmModalMessage: document.getElementById('confirmModalMessage'),
    confirmModalYes: document.getElementById('confirmModalYes'),
    confirmModalNo: document.getElementById('confirmModalNo'),
    
    // Toast and Offline
    toastMessage: document.getElementById('toastMessage'),
    offlineBanner: document.getElementById('offlineBanner')
};

// Enhanced Utility Functions
const utils = {
    // Enhanced Toast Notifications
    showToast(message, duration = 3000, type = 'success') {
        const toastText = elements.toastMessage.querySelector('.toast-text');
        const toastIcon = elements.toastMessage.querySelector('.toast-icon i');
        const toastProgress = elements.toastMessage.querySelector('.toast-progress');
        
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        
        const colors = {
            success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
        };
        
        toastIcon.setAttribute('data-lucide', icons[type] || icons.success);
        toastText.textContent = message;
        elements.toastMessage.style.background = colors[type] || colors.success;
        
        // Reset and start progress animation
        toastProgress.style.animation = 'none';
        toastProgress.offsetHeight; // Trigger reflow
        toastProgress.style.animation = `toastProgress ${duration}ms linear`;
        
        elements.toastMessage.classList.add('show');
        lucide.createIcons(); // Re-render icons
        
        setTimeout(() => {
            elements.toastMessage.classList.remove('show');
        }, duration);
    },

    // Enhanced Loading Overlay
    toggleLoading(show, message = 'جاري التحميل...') {
        elements.loadingText.textContent = message;
        if (show) {
            elements.loadingOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } else {
            elements.loadingOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },

    // Enhanced Date Formatting
    formatDate(date) {
        const d = new Date(date);
        const day = d.getDate();
        const month = appState.monthNames[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
    },

    // Enhanced Currency Formatting
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-AE', { 
            style: 'currency', 
            currency: 'AED',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    },

    // Enhanced Color Contrast
    getContrastColor(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    },

    // Enhanced Category Suggestion
    suggestCategory(productName) {
        const lowerProductName = productName.toLowerCase();
        
        // Check user categories first
        for (const categoryId in appState.categories) {
            const category = appState.categories[categoryId];
            if (lowerProductName.includes(category.name.toLowerCase())) {
                return categoryId;
            }
        }

        // Fallback to default categories
        const suggestions = {
            'طعام': ['قهوة', 'طعام', 'مطعم', 'وجبة', 'فطار', 'غداء', 'عشاء', 'مشروب'],
            'مواصلات': ['بنزين', 'تاكسي', 'مواصلات', 'أوبر', 'كريم', 'باص', 'مترو'],
            'فواتير': ['فاتورة', 'كهرباء', 'انترنت', 'ماء', 'غاز', 'هاتف', 'تلفون'],
            'تسوق': ['ملابس', 'تسوق', 'إلكترونيات', 'أحذية', 'حقيبة', 'ساعة'],
            'صحة': ['دواء', 'صيدلية', 'طبيب', 'مستشفى', 'علاج', 'فيتامين'],
            'ترفيه': ['سينما', 'مقهى', 'ترفيه', 'لعبة', 'كتاب', 'موسيقى']
        };

        for (const [category, keywords] of Object.entries(suggestions)) {
            if (keywords.some(keyword => lowerProductName.includes(keyword))) {
                return category;
            }
        }
        
        return 'أخرى';
    },

    // Enhanced Random Color Generator
    getRandomCategoryColor() {
        return appState.categoryColors[Math.floor(Math.random() * appState.categoryColors.length)];
    },

    // Enhanced Date String Generator
    getDateStringFromWheels(day, month, year) {
        const d = new Date(year, month, day);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    },

    // Enhanced Animation Helper
    animate(element, animation, duration = 300) {
        if (!appState.animations.enabled) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.animation = `${animation} ${duration}ms ${appState.animations.easing}`;
            element.addEventListener('animationend', () => {
                element.style.animation = '';
                resolve();
            }, { once: true });
        });
    },

    // Enhanced Debounce Function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Enhanced Throttle Function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
};

// Enhanced Spinner Date Picker Implementation
const spinnerDatePicker = {
    init() {
        this.populateWheels();
        this.setupEventListeners();
        this.updateSelectedDate();
        this.updateWheelPositions();
    },

    populateWheels() {
        // Populate days (1-31)
        elements.dayItems.innerHTML = '';
        for (let i = 1; i <= 31; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'wheel-item';
            dayElement.textContent = i;
            dayElement.dataset.value = i;
            elements.dayItems.appendChild(dayElement);
        }
        
        // Populate months
        elements.monthItems.innerHTML = '';
        appState.monthNames.forEach((month, index) => {
            const monthElement = document.createElement('div');
            monthElement.className = 'wheel-item';
            monthElement.textContent = month;
            monthElement.dataset.value = index;
            elements.monthItems.appendChild(monthElement);
        });
        
        // Populate years (current year - 5 to current year + 2)
        elements.yearItems.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 5; year <= currentYear + 2; year++) {
            const yearElement = document.createElement('div');
            yearElement.className = 'wheel-item';
            yearElement.textContent = year;
            yearElement.dataset.value = year;
            elements.yearItems.appendChild(yearElement);
        }
    },

    setupEventListeners() {
        // Touch and mouse events for each wheel
        this.setupWheelEvents(elements.dayWheel, 'day');
        this.setupWheelEvents(elements.monthWheel, 'month');
        this.setupWheelEvents(elements.yearWheel, 'year');
    },

    setupWheelEvents(wheel, type) {
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        let animationFrameId = null;

        const itemHeight = wheel.querySelector('.wheel-item') ? wheel.querySelector('.wheel-item').offsetHeight : 0;
        const visibleItems = 5; // Number of visible items in the wheel
        const centerIndex = Math.floor(visibleItems / 2);

        const snapToNearest = () => {
            const currentScroll = wheel.scrollTop;
            const nearestIndex = Math.round(currentScroll / itemHeight);
            const targetScroll = nearestIndex * itemHeight;
            wheel.scrollTo({ top: targetScroll, behavior: 'smooth' });
            
            // Update selected value after scroll ends
            setTimeout(() => {
                const newIndex = Math.round(wheel.scrollTop / itemHeight);
                const selectedElement = wheel.children[newIndex + centerIndex];
                if (selectedElement) {
                    const value = parseInt(selectedElement.dataset.value);
                    if (type === 'day') appState.spinnerDatePicker.selectedDay = value;
                    else if (type === 'month') appState.spinnerDatePicker.selectedMonth = value;
                    else if (type === 'year') appState.spinnerDatePicker.selectedYear = value;
                    this.updateSelectedDate();
                }
            }, 300); // Allow scroll-behavior 'smooth' to finish
        };

        const onStart = (e) => {
            isDragging = true;
            startY = e.clientY || e.touches[0].clientY;
            wheel.style.cursor = 'grabbing';
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            wheel.classList.add('scrolling');
        };

        const onMove = (e) => {
            if (!isDragging) return;
            currentY = e.clientY || e.touches[0].clientY;
            const diff = startY - currentY;
            wheel.scrollTop += diff;
            startY = currentY;
            
            // Prevent default to avoid scrolling the entire page
            e.preventDefault();
        };

        const onEnd = () => {
            isDragging = false;
            wheel.style.cursor = 'grab';
            wheel.classList.remove('scrolling');
            snapToNearest();
        };

        wheel.addEventListener('mousedown', onStart);
        wheel.addEventListener('mousemove', onMove);
        wheel.addEventListener('mouseup', onEnd);
        wheel.addEventListener('mouseleave', onEnd);

        wheel.addEventListener('touchstart', onStart, { passive: false });
        wheel.addEventListener('touchmove', onMove, { passive: false });
        wheel.addEventListener('touchend', onEnd);

        // Handle mouse wheel scrolling
        wheel.addEventListener('wheel', utils.throttle((e) => {
            e.preventDefault();
            wheel.scrollTop += e.deltaY;
            clearTimeout(appState.spinnerDatePicker.scrollTimeout);
            appState.spinnerDatePicker.scrollTimeout = setTimeout(() => {
                snapToNearest();
            }, 150);
        }, 50));

        // Initial scroll to center the selected value
        wheel.scrollTop = (this.getSelectedIndex(type) - centerIndex) * itemHeight;
    },

    getSelectedIndex(type) {
        if (type === 'day') return appState.spinnerDatePicker.selectedDay - 1;
        if (type === 'month') return appState.spinnerDatePicker.selectedMonth;
        if (type === 'year') {
            const currentYear = new Date().getFullYear();
            return appState.spinnerDatePicker.selectedYear - (currentYear - 5);
        }
        return 0;
    },

    updateSelectedDate() {
        const selectedDate = new Date(
            appState.spinnerDatePicker.selectedYear,
            appState.spinnerDatePicker.selectedMonth,
            appState.spinnerDatePicker.selectedDay
        );
        elements.selectedDateDisplay.textContent = utils.formatDate(selectedDate);
        // Update modal date pickers if they exist
        if (elements.modalDaySelect) elements.modalDaySelect.value = appState.spinnerDatePicker.selectedDay;
        if (elements.modalMonthSelect) elements.modalMonthSelect.value = appState.spinnerDatePicker.selectedMonth;
        if (elements.modalYearSelect) elements.modalYearSelect.value = appState.spinnerDatePicker.selectedYear;
    },

    updateWheelPositions() {
        const itemHeight = elements.dayWheel.querySelector('.wheel-item') ? elements.dayWheel.querySelector('.wheel-item').offsetHeight : 0;
        const centerIndex = Math.floor(5 / 2); // 5 visible items

        elements.dayWheel.scrollTop = (appState.spinnerDatePicker.selectedDay - 1 - centerIndex) * itemHeight;
        elements.monthWheel.scrollTop = (appState.spinnerDatePicker.selectedMonth - centerIndex) * itemHeight;
        const currentYear = new Date().getFullYear();
        elements.yearWheel.scrollTop = (appState.spinnerDatePicker.selectedYear - (currentYear - 5) - centerIndex) * itemHeight;
    }
};

// Enhanced Authentication Functions
const authFunctions = {
    async signInWithGoogle() {
        utils.toggleLoading(true, 'جاري تسجيل الدخول...');
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            utils.showToast('تم تسجيل الدخول بنجاح!', 3000, 'success');
            console.log('Google Sign-In successful');
        } catch (error) {
            console.error('Error signing in with Google:', error);
            utils.showToast('فشل تسجيل الدخول: ' + error.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async signInAnonymously() {
        utils.toggleLoading(true, 'جاري تسجيل الدخول كمجهول...');
        try {
            await signInAnonymously(auth);
            utils.showToast('تم تسجيل الدخول كمجهول بنجاح!', 3000, 'success');
            console.log('Anonymous Sign-In successful');
        } catch (error) {
            console.error('Error signing in anonymously:', error);
            utils.showToast('فشل تسجيل الدخول كمجهول: ' + error.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async signOutUser() {
        utils.toggleLoading(true, 'جاري تسجيل الخروج...');
        try {
            await signOut(auth);
            utils.showToast('تم تسجيل الخروج بنجاح!', 3000, 'success');
        } catch (error) {
            console.error('Error signing out:', error);
            utils.showToast('فشل تسجيل الخروج: ' + error.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    setupAuthObserver() {
        onAuthStateChanged(auth, async (user) => {
            console.log('Auth state changed. User:', user);
            if (user) {
                userId = user.uid;
                expensesCollectionRef = collection(db, `users/${userId}/expenses`);
                categoriesCollectionRef = collection(db, `users/${userId}/categories`);

                elements.userName.textContent = user.displayName || 'مستخدم جديد';
                elements.displayUserId.textContent = user.email || user.uid;
                elements.userAvatar.src = user.photoURL || 'https://via.placeholder.com/150';
                elements.settingsUserAvatar.src = user.photoURL || 'https://via.placeholder.com/150';
                elements.settingsUserName.textContent = user.displayName || 'مستخدم جديد';
                elements.settingsUserEmail.textContent = user.email || '';

                elements.authScreen.classList.add('hidden');
                elements.appScreen.classList.remove('hidden');
                document.body.classList.remove('auth-bg');
                document.body.classList.add('app-bg');
                console.log('User logged in. Displaying app screen.');

                // Load user data
                await dataFunctions.loadCategories();
                await dataFunctions.loadExpenses();
                
                // Initialize spinner date picker after data is loaded
                spinnerDatePicker.init();

            } else {
                userId = null;
                unsubscribeFromExpenses();
                unsubscribeFromCategories();

                elements.authScreen.classList.remove('hidden');
                elements.appScreen.classList.add('hidden');
                document.body.classList.add('auth-bg');
                document.body.classList.remove('app-bg');
                console.log('User logged out. Displaying auth screen.');
            }
            appState.isAuthReady = true;
            utils.toggleLoading(false);
        });
    }
};

// Enhanced Data Management Functions
const dataFunctions = {
    async addExpense(expense) {
        utils.toggleLoading(true, 'جاري إضافة المصروف...');
        try {
            const docRef = await addDoc(expensesCollectionRef, {
                ...expense,
                userId: userId,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            utils.showToast('تم إضافة المصروف بنجاح!', 3000, 'success');
            return docRef.id;
        } catch (e) {
            console.error('Error adding document: ', e);
            utils.showToast('فشل إضافة المصروف: ' + e.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async updateExpense(id, updatedData) {
        utils.toggleLoading(true, 'جاري تحديث المصروف...');
        try {
            const expenseRef = doc(db, `users/${userId}/expenses`, id);
            await updateDoc(expenseRef, {
                ...updatedData,
                updatedAt: new Date()
            });
            utils.showToast('تم تحديث المصروف بنجاح!', 3000, 'success');
        } catch (e) {
            console.error('Error updating document: ', e);
            utils.showToast('فشل تحديث المصروف: ' + e.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async deleteExpense(id) {
        utils.toggleLoading(true, 'جاري حذف المصروف...');
        try {
            await deleteDoc(doc(db, `users/${userId}/expenses`, id));
            utils.showToast('تم حذف المصروف بنجاح!', 3000, 'success');
        } catch (e) {
            console.error('Error deleting document: ', e);
            utils.showToast('فشل حذف المصروف: ' + e.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async loadExpenses() {
        utils.toggleLoading(true, 'جاري تحميل المصروفات...');
        unsubscribeFromExpenses(); // Unsubscribe from previous listener
        unsubscribeFromExpenses = onSnapshot(expensesCollectionRef, (snapshot) => {
            appState.expenses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate(),
                updatedAt: doc.data().updatedAt.toDate()
            }));
            renderFunctions.renderDailyExpenses();
            renderFunctions.renderMonthlySummary();
            utils.toggleLoading(false);
        }, (error) => {
            console.error('Error loading expenses:', error);
            utils.showToast('فشل تحميل المصروفات: ' + error.message, 5000, 'error');
            utils.toggleLoading(false);
        });
    },

    async addCategory(category) {
        utils.toggleLoading(true, 'جاري إضافة الفئة...');
        try {
            const docRef = await addDoc(categoriesCollectionRef, {
                ...category,
                userId: userId,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            utils.showToast('تم إضافة الفئة بنجاح!', 3000, 'success');
            return docRef.id;
        } catch (e) {
            console.error('Error adding category: ', e);
            utils.showToast('فشل إضافة الفئة: ' + e.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async updateCategory(id, updatedData) {
        utils.toggleLoading(true, 'جاري تحديث الفئة...');
        try {
            const categoryRef = doc(db, `users/${userId}/categories`, id);
            await updateDoc(categoryRef, {
                ...updatedData,
                updatedAt: new Date()
            });
            utils.showToast('تم تحديث الفئة بنجاح!', 3000, 'success');
        } catch (e) {
            console.error('Error updating category: ', e);
            utils.showToast('فشل تحديث الفئة: ' + e.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async deleteCategory(id) {
        utils.toggleLoading(true, 'جاري حذف الفئة...');
        try {
            // Check if category is used in any expenses
            const expensesUsingCategory = appState.expenses.filter(exp => exp.categoryId === id);
            if (expensesUsingCategory.length > 0) {
                utils.showToast('لا يمكن حذف الفئة: توجد مصروفات مرتبطة بها.', 5000, 'warning');
                return;
            }

            await deleteDoc(doc(db, `users/${userId}/categories`, id));
            utils.showToast('تم حذف الفئة بنجاح!', 3000, 'success');
        } catch (e) {
            console.error('Error deleting category: ', e);
            utils.showToast('فشل حذف الفئة: ' + e.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async loadCategories() {
        utils.toggleLoading(true, 'جاري تحميل الفئات...');
        unsubscribeFromCategories(); // Unsubscribe from previous listener
        unsubscribeFromCategories = onSnapshot(categoriesCollectionRef, (snapshot) => {
            appState.categories = {};
            snapshot.docs.forEach(doc => {
                appState.categories[doc.id] = {
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt.toDate(),
                    updatedAt: doc.data().updatedAt.toDate()
                };
            });
            renderFunctions.renderCategories();
            renderFunctions.renderCategoryButtons();
            utils.toggleLoading(false);
        }, (error) => {
            console.error('Error loading categories:', error);
            utils.showToast('فشل تحميل الفئات: ' + error.message, 5000, 'error');
            utils.toggleLoading(false);
        });
    },

    async exportData() {
        utils.toggleLoading(true, 'جاري تصدير البيانات...');
        try {
            const allExpenses = (await getDocs(expensesCollectionRef)).docs.map(doc => doc.data());
            const allCategories = (await getDocs(categoriesCollectionRef)).docs.map(doc => doc.data());

            const data = {
                expenses: allExpenses,
                categories: allCategories,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expense_data_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            utils.showToast('تم تصدير البيانات بنجاح!', 3000, 'success');
        } catch (e) {
            console.error('Error exporting data: ', e);
            utils.showToast('فشل تصدير البيانات: ' + e.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async importData(file) {
        utils.toggleLoading(true, 'جاري استيراد البيانات...');
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    const { expenses, categories } = importedData;

                    const batch = writeBatch(db);

                    // Import categories first to ensure they exist for expenses
                    for (const cat of categories) {
                        const newCatRef = doc(categoriesCollectionRef);
                        batch.set(newCatRef, { ...cat, userId: userId, createdAt: new Date(cat.createdAt), updatedAt: new Date() });
                    }

                    for (const exp of expenses) {
                        const newExpRef = doc(expensesCollectionRef);
                        batch.set(newExpRef, { ...exp, userId: userId, createdAt: new Date(exp.createdAt), updatedAt: new Date() });
                    }

                    await batch.commit();
                    utils.showToast('تم استيراد البيانات بنجاح!', 3000, 'success');
                } catch (parseError) {
                    console.error('Error parsing imported file:', parseError);
                    utils.showToast('خطأ في قراءة الملف: ' + parseError.message, 5000, 'error');
                }
            };
            reader.readAsText(file);
        } catch (e) {
            console.error('Error importing data: ', e);
            utils.showToast('فشل استيراد البيانات: ' + e.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async clearAllData() {
        utils.toggleLoading(true, 'جاري حذف جميع البيانات...');
        try {
            const expensesSnapshot = await getDocs(expensesCollectionRef);
            const categoriesSnapshot = await getDocs(categoriesCollectionRef);

            const batch = writeBatch(db);

            expensesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            categoriesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

            await batch.commit();
            utils.showToast('تم حذف جميع البيانات بنجاح!', 3000, 'success');
        } catch (e) {
            console.error('Error clearing all data: ', e);
            utils.showToast('فشل حذف البيانات: ' + e.message, 5000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    }
};

// Enhanced Rendering Functions
const renderFunctions = {
    renderDailyExpenses() {
        const today = utils.getDateStringFromWheels(
            appState.spinnerDatePicker.selectedDay,
            appState.spinnerDatePicker.selectedMonth,
            appState.spinnerDatePicker.selectedYear
        );
        const dailyExpenses = appState.expenses.filter(exp => {
            const expenseDate = new Date(exp.date).toISOString().slice(0, 10);
            return expenseDate === today;
        }).sort((a, b) => b.createdAt - a.createdAt);

        elements.currentDateExpenseList.innerHTML = '';
        let totalDaily = 0;

        if (dailyExpenses.length === 0) {
            elements.emptyDailyState.classList.remove('hidden');
            elements.dailyExpensesSkeleton.classList.add('hidden');
        } else {
            elements.emptyDailyState.classList.add('hidden');
            elements.dailyExpensesSkeleton.classList.add('hidden');
            dailyExpenses.forEach(expense => {
                totalDaily += expense.price;
                const category = appState.categories[expense.categoryId] || { name: 'غير مصنف', color: '#6B7280', icon: 'tag' };
                const expenseItem = document.createElement('div');
                expenseItem.className = 'expense-item fade-in-scale';
                expenseItem.innerHTML = `
                    <div class="expense-icon" style="background-color: ${category.color};">
                        <i data-lucide="${category.icon}" style="color: ${utils.getContrastColor(category.color)};"></i>
                    </div>
                    <div class="expense-details">
                        <div class="expense-name">${expense.productName}</div>
                        <div class="expense-category" style="color: ${category.color};">${category.name}</div>
                    </div>
                    <div class="expense-price">${utils.formatCurrency(expense.price)}</div>
                    <div class="expense-actions">
                        <button class="edit-expense-btn" data-id="${expense.id}" title="تعديل"><i data-lucide="edit"></i></button>
                        <button class="delete-expense-btn" data-id="${expense.id}" title="حذف"><i data-lucide="trash-2"></i></button>
                    </div>
                `;
                elements.currentDateExpenseList.appendChild(expenseItem);
            });
        }
        elements.currentDateTotalDisplay.textContent = utils.formatCurrency(totalDaily);
        lucide.createIcons();
    },

    renderMonthlySummary() {
        const currentMonth = appState.spinnerDatePicker.selectedMonth;
        const currentYear = appState.spinnerDatePicker.selectedYear;

        const monthlyExpenses = appState.expenses.filter(exp => {
            const expenseDate = new Date(exp.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        let totalMonthly = 0;
        const dailyTotals = {};
        const categoryTotals = {};

        monthlyExpenses.forEach(expense => {
            totalMonthly += expense.price;
            const dateKey = new Date(expense.date).toISOString().slice(0, 10);
            dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + expense.price;
            categoryTotals[expense.categoryId] = (categoryTotals[expense.categoryId] || 0) + expense.price;
        });

        const daysRecorded = Object.keys(dailyTotals).length;
        const dailyAverage = daysRecorded > 0 ? totalMonthly / daysRecorded : 0;

        elements.monthlyTotalDisplay.textContent = utils.formatCurrency(totalMonthly);
        elements.dailyAverageDisplay.textContent = utils.formatCurrency(dailyAverage);
        elements.daysRecordedDisplay.textContent = `${daysRecorded} يوم`;

        // Render Top Categories
        const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);
        elements.topCategoriesList.innerHTML = '';

        if (sortedCategories.length === 0) {
            elements.emptyCategoriesSummary.classList.remove('hidden');
            elements.monthlySummarySkeleton.classList.add('hidden');
        } else {
            elements.emptyCategoriesSummary.classList.add('hidden');
            elements.monthlySummarySkeleton.classList.add('hidden');
            sortedCategories.slice(0, 5).forEach(([categoryId, total]) => {
                const category = appState.categories[categoryId] || { name: 'غير مصنف', color: '#6B7280', icon: 'tag' };
                const percentage = totalMonthly > 0 ? (total / totalMonthly) * 100 : 0;
                const categoryItem = document.createElement('div');
                categoryItem.className = 'category-summary-item fade-in-scale';
                categoryItem.innerHTML = `
                    <div class="category-info">
                        <div class="category-icon" style="background-color: ${category.color};">
                            <i data-lucide="${category.icon}" style="color: ${utils.getContrastColor(category.color)};"></i>
                        </div>
                        <span class="category-name">${category.name}</span>
                    </div>
                    <div class="category-progress-bar">
                        <div class="progress" style="width: ${percentage.toFixed(1)}%; background-color: ${category.color};"></div>
                    </div>
                    <span class="category-total">${utils.formatCurrency(total)}</span>
                `;
                elements.topCategoriesList.appendChild(categoryItem);
            });
        }
        lucide.createIcons();
    },

    renderCategories() {
        elements.userCategoriesList.innerHTML = '';
        const userCategories = Object.values(appState.categories).sort((a, b) => a.name.localeCompare(b.name));

        if (userCategories.length === 0) {
            elements.emptyCategoriesState.classList.remove('hidden');
            elements.categoriesSkeleton.classList.add('hidden');
        } else {
            elements.emptyCategoriesState.classList.add('hidden');
            elements.categoriesSkeleton.classList.add('hidden');
            userCategories.forEach(category => {
                const categoryItem = document.createElement('div');
                categoryItem.className = 'category-item fade-in-scale';
                categoryItem.innerHTML = `
                    <div class="category-info">
                        <div class="category-icon" style="background-color: ${category.color};">
                            <i data-lucide="${category.icon}" style="color: ${utils.getContrastColor(category.color)};"></i>
                        </div>
                        <span class="category-name">${category.name}</span>
                    </div>
                    <div class="category-actions">
                        <button class="edit-category-btn" data-id="${category.id}" title="تعديل"><i data-lucide="edit"></i></button>
                        <button class="delete-category-btn" data-id="${category.id}" title="حذف"><i data-lucide="trash-2"></i></button>
                    </div>
                `;
                elements.userCategoriesList.appendChild(categoryItem);
            });
        }
        lucide.createIcons();
    },

    renderCategoryButtons() {
        elements.categoryButtonsContainer.innerHTML = '';
        const allCategories = { ...appState.defaultCategories, ...appState.categories };
        const sortedCategories = Object.values(allCategories).sort((a, b) => a.name.localeCompare(b.name));

        sortedCategories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-select-btn';
            button.dataset.id = category.id;
            button.dataset.name = category.name;
            button.dataset.color = category.color;
            button.dataset.icon = category.icon;
            button.style.backgroundColor = category.color;
            button.style.color = utils.getContrastColor(category.color);
            button.innerHTML = `<i data-lucide="${category.icon}"></i> ${category.name}`;
            elements.categoryButtonsContainer.appendChild(button);
        });
        lucide.createIcons();
    },

    showTab(tabName) {
        // Hide all pages
        elements.dailyPage.classList.add('hidden');
        elements.monthlyPage.classList.add('hidden');
        elements.categoriesPage.classList.add('hidden');
        elements.settingsPage.classList.add('hidden');

        // Remove active class from all buttons
        elements.dailyTabBtn.classList.remove('active');
        elements.monthlyTabBtn.classList.remove('active');
        elements.categoriesTabBtn.classList.remove('active');
        elements.settingsBtn.classList.remove('active');

        // Show selected page and add active class to button
        if (tabName === 'daily') {
            elements.dailyPage.classList.remove('hidden');
            elements.dailyTabBtn.classList.add('active');
            renderFunctions.renderDailyExpenses();
        } else if (tabName === 'monthly') {
            elements.monthlyPage.classList.remove('hidden');
            elements.monthlyTabBtn.classList.add('active');
            renderFunctions.renderMonthlySummary();
        } else if (tabName === 'categories') {
            elements.categoriesPage.classList.remove('hidden');
            elements.categoriesTabBtn.classList.add('active');
            renderFunctions.renderCategories();
        } else if (tabName === 'settings') {
            elements.settingsPage.classList.remove('hidden');
            elements.settingsBtn.classList.add('active');
        }
        appState.currentTab = tabName;
    }
};

// Enhanced Event Listeners
const eventListeners = {
    setupGlobalListeners() {
        // Auth screen button
        if (elements.signInBtn) {
            elements.signInBtn.addEventListener('click', authFunctions.signInWithGoogle); // Changed to Google Sign-In
        }

        // App screen buttons
        if (elements.signOutBtn) {
            elements.signOutBtn.addEventListener('click', authFunctions.signOutUser);
        }
        if (elements.dailyTabBtn) {
            elements.dailyTabBtn.addEventListener('click', () => renderFunctions.showTab('daily'));
        }
        if (elements.monthlyTabBtn) {
            elements.monthlyTabBtn.addEventListener('click', () => renderFunctions.showTab('monthly'));
        }
        if (elements.categoriesTabBtn) {
            elements.categoriesTabBtn.addEventListener('click', () => renderFunctions.showTab('categories'));
        }
        if (elements.settingsBtn) {
            elements.settingsBtn.addEventListener('click', () => renderFunctions.showTab('settings'));
        }

        // Dark mode toggle
        if (elements.darkModeToggle) {
            elements.darkModeToggle.addEventListener('change', (e) => {
                appState.darkMode = e.target.checked;
                document.body.classList.toggle('dark-mode', appState.darkMode);
                localStorage.setItem('darkMode', appState.darkMode);
            });
        }

        // Add Expense FAB
        if (elements.addExpenseFAB) {
            elements.addExpenseFAB.addEventListener('click', () => uiFunctions.openExpenseModal());
        }

        // Save Expense Button
        if (elements.saveExpenseBtn) {
            elements.saveExpenseBtn.addEventListener('click', uiFunctions.handleSaveExpense);
        }

        // Cancel Expense Modal Button
        if (elements.cancelExpenseModalBtn) {
            elements.cancelExpenseModalBtn.addEventListener('click', uiFunctions.closeExpenseModal);
        }

        // Add Category Button
        if (elements.addCategoryBtn) {
            elements.addCategoryBtn.addEventListener('click', uiFunctions.handleAddCategory);
        }

        // Cancel Category Edit Button
        if (elements.cancelCategoryEditBtn) {
            elements.cancelCategoryEditBtn.addEventListener('click', uiFunctions.cancelCategoryEdit);
        }

        // Export Data Button
        if (elements.exportDataBtn) {
            elements.exportDataBtn.addEventListener('click', dataFunctions.exportData);
        }

        // Import Data Button
        if (elements.importDataBtn) {
            elements.importDataBtn.addEventListener('click', () => elements.importFileInput.click());
        }
        if (elements.importFileInput) {
            elements.importFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    dataFunctions.importData(e.target.files[0]);
                }
            });
        }

        // Clear All Data Button
        if (elements.clearAllDataBtn) {
            elements.clearAllDataBtn.addEventListener('click', () => uiFunctions.showConfirmModal(
                'تأكيد حذف البيانات',
                'هل أنت متأكد أنك تريد حذف جميع بيانات المصروفات والفئات؟ لا يمكن التراجع عن هذا الإجراء.',
                dataFunctions.clearAllData
            ));
        }

        // Dynamic event listeners for expense and category lists
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-expense-btn')) {
                const id = e.target.closest('.edit-expense-btn').dataset.id;
                uiFunctions.openExpenseModal(id);
            }
            if (e.target.closest('.delete-expense-btn')) {
                const id = e.target.closest('.delete-expense-btn').dataset.id;
                uiFunctions.showConfirmModal(
                    'تأكيد حذف المصروف',
                    'هل أنت متأكد أنك تريد حذف هذا المصروف؟',
                    () => dataFunctions.deleteExpense(id)
                );
            }
            if (e.target.closest('.edit-category-btn')) {
                const id = e.target.closest('.edit-category-btn').dataset.id;
                uiFunctions.editCategory(id);
            }
            if (e.target.closest('.delete-category-btn')) {
                const id = e.target.closest('.delete-category-btn').dataset.id;
                uiFunctions.showConfirmModal(
                    'تأكيد حذف الفئة',
                    'هل أنت متأكد أنك تريد حذف هذه الفئة؟ سيتم حذف جميع المصروفات المرتبطة بها.',
                    () => dataFunctions.deleteCategory(id)
                );
            }
            if (e.target.closest('.category-select-btn')) {
                const btn = e.target.closest('.category-select-btn');
                appState.selectedCategoryIdForExpense = btn.dataset.id;
                // Highlight selected category button
                document.querySelectorAll('.category-select-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            }
        });

        // Offline banner
        window.addEventListener('online', () => {
            appState.isOffline = false;
            elements.offlineBanner.classList.add('hidden');
            utils.showToast('تم استعادة الاتصال بالإنترنت!', 3000, 'success');
        });
        window.addEventListener('offline', () => {
            appState.isOffline = true;
            elements.offlineBanner.classList.remove('hidden');
            utils.showToast('لا يوجد اتصال بالإنترنت. قد لا تعمل بعض الميزات.', 5000, 'warning');
        });

        // Generate Analysis Button
        if (elements.generateAnalysisBtn) {
            elements.generateAnalysisBtn.addEventListener('click', uiFunctions.generateLLMAnalysis);
        }
    }
};

// Enhanced UI Functions
const uiFunctions = {
    openExpenseModal(expenseId = null) {
        appState.isEditingExpense = !!expenseId;
        appState.editingExpenseId = expenseId;
        elements.expenseModalTitle.textContent = expenseId ? 'تعديل مصروف' : 'إضافة مصروف جديد';
        elements.modalProductNameInput.value = '';
        elements.modalProductPriceInput.value = '';
        appState.selectedCategoryIdForExpense = null;
        document.querySelectorAll('.category-select-btn').forEach(b => b.classList.remove('selected'));

        if (expenseId) {
            const expense = appState.expenses.find(exp => exp.id === expenseId);
            if (expense) {
                elements.modalProductNameInput.value = expense.productName;
                elements.modalProductPriceInput.value = expense.price;
                appState.selectedCategoryIdForExpense = expense.categoryId;
                
                // Set spinner date picker to expense date
                const expenseDate = new Date(expense.date);
                appState.spinnerDatePicker.selectedDay = expenseDate.getDate();
                appState.spinnerDatePicker.selectedMonth = expenseDate.getMonth();
                appState.spinnerDatePicker.selectedYear = expenseDate.getFullYear();
                spinnerDatePicker.updateWheelPositions();

                const selectedBtn = document.querySelector(`.category-select-btn[data-id="${expense.categoryId}"]`);
                if (selectedBtn) selectedBtn.classList.add('selected');
            }
        } else {
            // Reset spinner date picker to current date for new expense
            const today = new Date();
            appState.spinnerDatePicker.selectedDay = today.getDate();
            appState.spinnerDatePicker.selectedMonth = today.getMonth();
            appState.spinnerDatePicker.selectedYear = today.getFullYear();
            spinnerDatePicker.updateWheelPositions();
        }

        elements.expenseModal.classList.add('show');
        utils.animate(elements.expenseModal.querySelector('.modal-content'), 'slideInUp');
    },

    closeExpenseModal() {
        utils.animate(elements.expenseModal.querySelector('.modal-content'), 'slideOutDown').then(() => {
            elements.expenseModal.classList.remove('show');
        });
    },

    async handleSaveExpense() {
        const productName = elements.modalProductNameInput.value.trim();
        const price = parseFloat(elements.modalProductPriceInput.value);
        const categoryId = appState.selectedCategoryIdForExpense;
        
        const selectedDate = utils.getDateStringFromWheels(
            appState.spinnerDatePicker.selectedDay,
            appState.spinnerDatePicker.selectedMonth,
            appState.spinnerDatePicker.selectedYear
        );

        if (!productName || isNaN(price) || price <= 0 || !categoryId || !selectedDate) {
            utils.showToast('الرجاء إدخال اسم المنتج، السعر، الفئة، والتاريخ بشكل صحيح.', 5000, 'warning');
            return;
        }

        const expenseData = {
            productName,
            price,
            date: selectedDate,
            categoryId
        };

        if (appState.isEditingExpense) {
            await dataFunctions.updateExpense(appState.editingExpenseId, expenseData);
        } else {
            await dataFunctions.addExpense(expenseData);
        }
        uiFunctions.closeExpenseModal();
    },

    async handleAddCategory() {
        const name = elements.categoryNameInput.value.trim();
        const color = elements.categoryColorInput.value;

        if (!name || !color) {
            utils.showToast('الرجاء إدخال اسم الفئة واختيار لون.', 5000, 'warning');
            return;
        }

        const categoryData = {
            name,
            color,
            icon: 'tag' // Default icon, can be extended later
        };

        if (appState.isEditingCategory) {
            await dataFunctions.updateCategory(appState.editingCategoryId, categoryData);
        } else {
            await dataFunctions.addCategory(categoryData);
        }
        elements.categoryNameInput.value = '';
        elements.categoryColorInput.value = utils.getRandomCategoryColor();
        uiFunctions.cancelCategoryEdit();
    },

    editCategory(categoryId) {
        const category = appState.categories[categoryId];
        if (category) {
            appState.isEditingCategory = true;
            appState.editingCategoryId = categoryId;
            elements.categoryNameInput.value = category.name;
            elements.categoryColorInput.value = category.color;
            elements.addCategoryBtn.textContent = 'تعديل الفئة';
            elements.cancelCategoryEditBtn.classList.remove('hidden');
        }
    },

    cancelCategoryEdit() {
        appState.isEditingCategory = false;
        appState.editingCategoryId = null;
        elements.categoryNameInput.value = '';
        elements.categoryColorInput.value = utils.getRandomCategoryColor();
        elements.addCategoryBtn.textContent = 'إضافة فئة';
        elements.cancelCategoryEditBtn.classList.add('hidden');
    },

    showConfirmModal(title, message, onConfirm) {
        elements.confirmModalTitle.textContent = title;
        elements.confirmModalMessage.textContent = message;
        elements.confirmModal.classList.add('show');

        const handleConfirm = () => {
            onConfirm();
            elements.confirmModalYes.removeEventListener('click', handleConfirm);
            elements.confirmModal.classList.remove('show');
        };

        const handleCancel = () => {
            elements.confirmModalNo.removeEventListener('click', handleCancel);
            elements.confirmModal.classList.remove('show');
        };

        elements.confirmModalYes.addEventListener('click', handleConfirm);
        elements.confirmModalNo.addEventListener('click', handleCancel);
    },

    async generateLLMAnalysis() {
        elements.analysisPlaceholder.classList.add('hidden');
        elements.llmAnalysisLoading.classList.remove('hidden');
        elements.llmAnalysisOutput.innerHTML = '';

        const currentMonth = appState.spinnerDatePicker.selectedMonth;
        const currentYear = appState.spinnerDatePicker.selectedYear;

        const monthlyExpenses = appState.expenses.filter(exp => {
            const expenseDate = new Date(exp.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        if (monthlyExpenses.length === 0) {
            elements.llmAnalysisOutput.innerHTML = '<p class="text-center text-gray-500">لا توجد بيانات كافية لتحليل هذا الشهر.</p>';
            elements.llmAnalysisLoading.classList.add('hidden');
            return;
        }

        let prompt = `أنا أستخدم تطبيق إدارة المصروفات. لدي المصروفات التالية لشهر ${appState.monthNames[currentMonth]} ${currentYear}:

`;
        monthlyExpenses.forEach(exp => {
            const category = appState.categories[exp.categoryId] ? appState.categories[exp.categoryId].name : 'غير مصنف';
            prompt += `- ${exp.productName} (${category}): ${exp.price} AED في تاريخ ${exp.date}\n`;
        });
        prompt += `\nالرجاء تقديم تحليل مفصل لهذه المصروفات، بما في ذلك:\n1. ملخص لأكبر الفئات التي تم الإنفاق عليها.\n2. أي أنماط أو اتجاهات ملحوظة في الإنفاق.\n3. نصائح شخصية لتحسين إدارة المصروفات لهذا الشهر بناءً على البيانات المقدمة.\n4. توقعات للمصروفات المستقبلية بناءً على الأنماط الحالية.\n5. اقتراحات لتقليل المصروفات في الفئات ذات الإنفاق العالي.\n\nالرجاء تقديم التحليل باللغة العربية، بصيغة Markdown، مع استخدام العناوين الفرعية والقوائم لتسهيل القراءة. اجعل التحليل شاملاً ومفيداً.`;

        try {
            // This is a placeholder for actual LLM API call
            // In a real application, you would send this prompt to a backend service
            // that interacts with a large language model (e.g., Gemini API)
            const mockAnalysis = `
# تحليل المصروفات لشهر ${appState.monthNames[currentMonth]} ${currentYear}

## 1. ملخص لأكبر الفئات التي تم الإنفاق عليها

بناءً على بيانات المصروفات المقدمة، إليك ملخص لأكبر الفئات التي تم الإنفاق عليها:

* **طعام:** [مثال: 500 درهم]
* **مواصلات:** [مثال: 300 درهم]
* **فواتير:** [مثال: 250 درهم]

## 2. أنماط واتجاهات ملحوظة في الإنفاق

* **ارتفاع الإنفاق على الطعام:** يلاحظ أن فئة الطعام تستحوذ على نسبة كبيرة من إجمالي المصروفات، مما يشير إلى أنها قد تكون مجالاً للتحسين.
* **إنفاق ثابت على المواصلات:** يبدو أن الإنفاق على المواصلات مستقر نسبياً.

## 3. نصائح شخصية لتحسين إدارة المصروفات

* **تتبع وجبات الطعام:** حاول تسجيل جميع وجبات الطعام التي تتناولها خارج المنزل لتحديد الأيام أو الأوقات التي تنفق فيها أكثر.
* **خطط لوجباتك:** يمكن أن يساعد التخطيط المسبق للوجبات في تقليل الإنفاق على الطعام غير المخطط له.

## 4. توقعات للمصروفات المستقبلية

بناءً على الأنماط الحالية، من المتوقع أن يستمر الإنفاق على الطعام والمواصلات في كونهما الفئتين الرئيسيتين للمصروفات.

## 5. اقتراحات لتقليل المصروفات

* **الطعام:**
    * قلل من تناول الطعام في المطاعم.
    * قم بإعداد وجباتك في المنزل.
    * ابحث عن عروض وخصومات في محلات البقالة.
* **المواصلات:**
    * استخدم وسائل النقل العام إن أمكن.
    * خطط لرحلاتك مسبقاً لتجنب الازدحام.

نتمنى لك إدارة مالية موفقة!
            `;
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            elements.llmAnalysisOutput.innerHTML = marked.parse(mockAnalysis);
        } catch (error) {
            console.error('Error generating LLM analysis:', error);
            elements.llmAnalysisOutput.innerHTML = '<p class="text-center text-red-500">حدث خطأ أثناء توليد التحليل. الرجاء المحاولة مرة أخرى.</p>';
        } finally {
            elements.llmAnalysisLoading.classList.add('hidden');
        }
    }
};

// Initializations
document.addEventListener('DOMContentLoaded', () => {
    // Set initial dark mode state
    document.body.classList.toggle('dark-mode', appState.darkMode);
    if (elements.darkModeToggle) {
        elements.darkModeToggle.checked = appState.darkMode;
    }

    // Initialize Firebase Auth observer
    authFunctions.setupAuthObserver();

    // Setup all event listeners
    eventListeners.setupGlobalListeners();

    // Initial render of daily expenses (will be updated by auth observer)
    renderFunctions.renderDailyExpenses();

    // Check initial offline status
    if (appState.isOffline) {
        elements.offlineBanner.classList.remove('hidden');
    }

    // Initialize spinner date picker
    spinnerDatePicker.init();

    // Set initial date display
    spinnerDatePicker.updateSelectedDate();
});

// Expose functions for debugging (optional)
window.appState = appState;
window.utils = utils;
window.authFunctions = authFunctions;
window.dataFunctions = dataFunctions;
window.renderFunctions = renderFunctions;
window.uiFunctions = uiFunctions;
window.spinnerDatePicker = spinnerDatePicker;


