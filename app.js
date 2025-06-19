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

// Enhanced Global Variables
let app, auth, db;
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
        let startTransform = 0;

        // Mouse events
        wheel.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startTransform = this.getCurrentTransform(type);
            wheel.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            currentY = e.clientY;
            const deltaY = currentY - startY;
            this.updateWheelTransform(type, startTransform + deltaY);
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            wheel.style.cursor = 'grab';
            this.snapToNearestItem(type);
        });

        // Touch events
        wheel.addEventListener('touchstart', (e) => {
            isDragging = true;
            startY = e.touches[0].clientY;
            startTransform = this.getCurrentTransform(type);
            e.preventDefault();
        }, { passive: false });

        wheel.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            this.updateWheelTransform(type, startTransform + deltaY);
            e.preventDefault();
        }, { passive: false });

        wheel.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            this.snapToNearestItem(type);
        });

        // Wheel event for desktop
        wheel.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 40 : -40;
            const currentTransform = this.getCurrentTransform(type);
            this.updateWheelTransform(type, currentTransform + delta);
            
            clearTimeout(appState.spinnerDatePicker.scrollTimeout);
            appState.spinnerDatePicker.scrollTimeout = setTimeout(() => {
                this.snapToNearestItem(type);
            }, 150);
        });

        // Click events for direct selection
        wheel.addEventListener('click', (e) => {
            if (e.target.classList.contains('wheel-item')) {
                const value = parseInt(e.target.dataset.value);
                this.selectValue(type, value);
            }
        });
    },

    getCurrentTransform(type) {
        const container = type === 'day' ? elements.dayItems : 
                        type === 'month' ? elements.monthItems : elements.yearItems;
        const transform = container.style.transform;
        const match = transform.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
        return match ? parseFloat(match[1]) : 0;
    },

    updateWheelTransform(type, translateY) {
        const container = type === 'day' ? elements.dayItems : 
                        type === 'month' ? elements.monthItems : elements.yearItems;
        container.style.transform = `translateY(${translateY}px)`;
    },

    snapToNearestItem(type) {
        const currentTransform = this.getCurrentTransform(type);
        const itemHeight = 40;
        const centerOffset = 40; // (120 - 40) / 2
        
        const targetIndex = Math.round((centerOffset - currentTransform) / itemHeight);
        const container = type === 'day' ? elements.dayItems : 
                        type === 'month' ? elements.monthItems : elements.yearItems;
        const items = container.querySelectorAll('.wheel-item');
        
        const clampedIndex = Math.max(0, Math.min(targetIndex, items.length - 1));
        const targetTransform = centerOffset - (clampedIndex * itemHeight);
        
        // Smooth animation to target position
        container.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        container.style.transform = `translateY(${targetTransform}px)`;
        
        setTimeout(() => {
            container.style.transition = '';
        }, 300);

        // Update selected value
        if (items[clampedIndex]) {
            const value = parseInt(items[clampedIndex].dataset.value);
            this.updateSelectedValue(type, value);
        }
    },

    selectValue(type, value) {
        this.updateSelectedValue(type, value);
        this.updateWheelPosition(type, value);
    },

    updateSelectedValue(type, value) {
        switch (type) {
            case 'day':
                appState.spinnerDatePicker.selectedDay = value;
                break;
            case 'month':
                appState.spinnerDatePicker.selectedMonth = value;
                break;
            case 'year':
                appState.spinnerDatePicker.selectedYear = value;
                break;
        }
        
        this.updateSelectedDate();
        this.updateWheelHighlight(type);
        this.validateDate();
    },

    updateWheelPosition(type, value) {
        const container = type === 'day' ? elements.dayItems : 
                        type === 'month' ? elements.monthItems : elements.yearItems;
        const items = container.querySelectorAll('.wheel-item');
        
        let targetIndex = 0;
        items.forEach((item, index) => {
            if (parseInt(item.dataset.value) === value) {
                targetIndex = index;
            }
        });
        
        const itemHeight = 40;
        const centerOffset = 40;
        const targetTransform = centerOffset - (targetIndex * itemHeight);
        
        container.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        container.style.transform = `translateY(${targetTransform}px)`;
        
        setTimeout(() => {
            container.style.transition = '';
        }, 300);
    },

    updateWheelHighlight(type) {
        const container = type === 'day' ? elements.dayItems : 
                        type === 'month' ? elements.monthItems : elements.yearItems;
        const items = container.querySelectorAll('.wheel-item');
        const selectedValue = type === 'day' ? appState.spinnerDatePicker.selectedDay :
                            type === 'month' ? appState.spinnerDatePicker.selectedMonth :
                            appState.spinnerDatePicker.selectedYear;
        
        items.forEach(item => {
            item.classList.remove('selected');
            if (parseInt(item.dataset.value) === selectedValue) {
                item.classList.add('selected');
            }
        });
    },

    updateWheelPositions() {
        this.updateWheelPosition('day', appState.spinnerDatePicker.selectedDay);
        this.updateWheelPosition('month', appState.spinnerDatePicker.selectedMonth);
        this.updateWheelPosition('year', appState.spinnerDatePicker.selectedYear);
        
        this.updateWheelHighlight('day');
        this.updateWheelHighlight('month');
        this.updateWheelHighlight('year');
    },

    validateDate() {
        const { selectedDay, selectedMonth, selectedYear } = appState.spinnerDatePicker;
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        
        if (selectedDay > daysInMonth) {
            this.selectValue('day', daysInMonth);
        }
    },

    updateSelectedDate() {
        const { selectedDay, selectedMonth, selectedYear } = appState.spinnerDatePicker;
        const dateString = utils.formatDate(new Date(selectedYear, selectedMonth, selectedDay));
        elements.selectedDateDisplay.textContent = dateString;
        
        // Update expenses for the selected date
        if (appState.currentTab === 'daily') {
            expenseManager.loadDailyExpenses();
        }
    }
};

// Enhanced Expense Manager
const expenseManager = {
    async addExpense(expenseData) {
        try {
            utils.toggleLoading(true, 'جاري إضافة المصروف...');
            
            const docRef = await addDoc(expensesCollectionRef, {
                ...expenseData,
                userId,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            utils.showToast('تم إضافة المصروف بنجاح', 3000, 'success');
            this.closeExpenseModal();
            
        } catch (error) {
            console.error('Error adding expense:', error);
            utils.showToast('حدث خطأ في إضافة المصروف', 3000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async updateExpense(expenseId, expenseData) {
        try {
            utils.toggleLoading(true, 'جاري تحديث المصروف...');
            
            const expenseRef = doc(db, 'expenses', expenseId);
            await updateDoc(expenseRef, {
                ...expenseData,
                updatedAt: new Date()
            });
            
            utils.showToast('تم تحديث المصروف بنجاح', 3000, 'success');
            this.closeExpenseModal();
            
        } catch (error) {
            console.error('Error updating expense:', error);
            utils.showToast('حدث خطأ في تحديث المصروف', 3000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async deleteExpense(expenseId) {
        try {
            const confirmed = await this.showConfirmModal(
                'حذف المصروف',
                'هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.'
            );
            
            if (!confirmed) return;
            
            utils.toggleLoading(true, 'جاري حذف المصروف...');
            
            const expenseRef = doc(db, 'expenses', expenseId);
            await deleteDoc(expenseRef);
            
            utils.showToast('تم حذف المصروف بنجاح', 3000, 'success');
            
        } catch (error) {
            console.error('Error deleting expense:', error);
            utils.showToast('حدث خطأ في حذف المصروف', 3000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    loadDailyExpenses() {
        const { selectedDay, selectedMonth, selectedYear } = appState.spinnerDatePicker;
        const selectedDate = utils.getDateStringFromWheels(selectedDay, selectedMonth, selectedYear);
        
        const dailyExpenses = appState.expenses.filter(expense => expense.date === selectedDate);
        
        this.renderDailyExpenses(dailyExpenses);
        this.updateDailyTotal(dailyExpenses);
    },

    renderDailyExpenses(expenses) {
        if (expenses.length === 0) {
            elements.currentDateExpenseList.classList.add('hidden');
            elements.emptyDailyState.classList.remove('hidden');
            return;
        }
        
        elements.emptyDailyState.classList.add('hidden');
        elements.currentDateExpenseList.classList.remove('hidden');
        
        elements.currentDateExpenseList.innerHTML = expenses.map(expense => {
            const category = appState.categories[expense.categoryId] || appState.defaultCategories[expense.categoryId];
            const categoryColor = category?.color || '#6B7280';
            const categoryName = category?.name || 'غير محدد';
            
            return `
                <div class="expense-item p-4 border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-all duration-300 group">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-lg" style="background: ${categoryColor}">
                                <i data-lucide="${category?.icon || 'circle'}" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-800 dark:text-white">${expense.productName}</h4>
                                <p class="text-sm text-gray-500 dark:text-gray-400">${categoryName}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="amount text-lg font-bold text-gray-800 dark:text-white">${utils.formatCurrency(expense.price)}</span>
                            <div class="actions opacity-0 group-hover:opacity-100 transition-all duration-300 flex space-x-1">
                                <button onclick="expenseManager.editExpense('${expense.id}')" class="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                                </button>
                                <button onclick="expenseManager.deleteExpense('${expense.id}')" class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Re-render Lucide icons
        lucide.createIcons();
    },

    updateDailyTotal(expenses) {
        const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.price || 0), 0);
        elements.currentDateTotalDisplay.textContent = utils.formatCurrency(total);
    },

    openExpenseModal(expenseId = null) {
        appState.isEditingExpense = !!expenseId;
        appState.editingExpenseId = expenseId;
        
        if (expenseId) {
            const expense = appState.expenses.find(e => e.id === expenseId);
            if (expense) {
                elements.expenseModalTitle.innerHTML = `
                    <i data-lucide="edit-2" class="w-6 h-6 text-blue-500"></i>
                    <span>تعديل المصروف</span>
                `;
                elements.modalProductNameInput.value = expense.productName;
                elements.modalProductPriceInput.value = expense.price;
                
                const date = new Date(expense.date);
                elements.modalDaySelect.value = date.getDate();
                elements.modalMonthSelect.value = date.getMonth();
                elements.modalYearSelect.value = date.getFullYear();
                
                appState.selectedCategoryIdForExpense = expense.categoryId;
            }
        } else {
            elements.expenseModalTitle.innerHTML = `
                <i data-lucide="plus-circle" class="w-6 h-6 text-green-500"></i>
                <span>إضافة مصروف جديد</span>
            `;
            elements.modalProductNameInput.value = '';
            elements.modalProductPriceInput.value = '';
            
            const { selectedDay, selectedMonth, selectedYear } = appState.spinnerDatePicker;
            elements.modalDaySelect.value = selectedDay;
            elements.modalMonthSelect.value = selectedMonth;
            elements.modalYearSelect.value = selectedYear;
            
            appState.selectedCategoryIdForExpense = null;
        }
        
        this.populateModalDateSelects();
        this.renderCategoryButtons();
        
        elements.expenseModal.classList.remove('hidden');
        setTimeout(() => {
            elements.expenseModal.querySelector('.modal-content').classList.add('show');
        }, 10);
        
        // Focus on product name input
        setTimeout(() => {
            elements.modalProductNameInput.focus();
        }, 300);
    },

    closeExpenseModal() {
        elements.expenseModal.querySelector('.modal-content').classList.remove('show');
        setTimeout(() => {
            elements.expenseModal.classList.add('hidden');
            appState.isEditingExpense = false;
            appState.editingExpenseId = null;
            appState.selectedCategoryIdForExpense = null;
        }, 300);
    },

    populateModalDateSelects() {
        // Populate days
        elements.modalDaySelect.innerHTML = '';
        for (let i = 1; i <= 31; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            elements.modalDaySelect.appendChild(option);
        }
        
        // Populate months
        elements.modalMonthSelect.innerHTML = '';
        appState.monthNames.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            elements.modalMonthSelect.appendChild(option);
        });
        
        // Populate years
        elements.modalYearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 5; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            elements.modalYearSelect.appendChild(option);
        }
    },

    renderCategoryButtons() {
        const allCategories = { ...appState.defaultCategories, ...appState.categories };
        
        elements.categoryButtonsContainer.innerHTML = Object.entries(allCategories).map(([id, category]) => {
            const isSelected = appState.selectedCategoryIdForExpense === id;
            return `
                <button type="button" 
                        onclick="expenseManager.selectCategory('${id}')"
                        class="category-btn p-3 rounded-xl border-2 transition-all duration-300 ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}"
                        style="color: ${category.color}">
                    <div class="flex items-center space-x-2">
                        <i data-lucide="${category.icon || 'circle'}" class="w-5 h-5"></i>
                        <span class="font-medium">${category.name}</span>
                    </div>
                </button>
            `;
        }).join('');
        
        lucide.createIcons();
    },

    selectCategory(categoryId) {
        appState.selectedCategoryIdForExpense = categoryId;
        this.renderCategoryButtons();
    },

    async saveExpense() {
        const productName = elements.modalProductNameInput.value.trim();
        const price = parseFloat(elements.modalProductPriceInput.value);
        const day = parseInt(elements.modalDaySelect.value);
        const month = parseInt(elements.modalMonthSelect.value);
        const year = parseInt(elements.modalYearSelect.value);
        const categoryId = appState.selectedCategoryIdForExpense;
        
        // Validation
        if (!productName) {
            utils.showToast('يرجى إدخال اسم المنتج', 3000, 'warning');
            elements.modalProductNameInput.focus();
            return;
        }
        
        if (!price || price <= 0) {
            utils.showToast('يرجى إدخال سعر صحيح', 3000, 'warning');
            elements.modalProductPriceInput.focus();
            return;
        }
        
        if (!categoryId) {
            utils.showToast('يرجى اختيار فئة للمصروف', 3000, 'warning');
            return;
        }
        
        const expenseData = {
            productName,
            price,
            date: utils.getDateStringFromWheels(day, month, year),
            categoryId
        };
        
        if (appState.isEditingExpense) {
            await this.updateExpense(appState.editingExpenseId, expenseData);
        } else {
            // Auto-suggest category if not selected
            if (!categoryId) {
                const suggestedCategory = utils.suggestCategory(productName);
                expenseData.categoryId = suggestedCategory;
            }
            
            await this.addExpense(expenseData);
        }
    },

    editExpense(expenseId) {
        this.openExpenseModal(expenseId);
    },

    showConfirmModal(title, message) {
        elements.confirmModalTitle.textContent = title;
        elements.confirmModalMessage.textContent = message;
        elements.confirmModal.classList.remove('hidden');

        return new Promise(resolve => {
            const handleYes = () => {
                elements.confirmModal.classList.add('hidden');
                elements.confirmModalYes.removeEventListener('click', handleYes);
                elements.confirmModalNo.removeEventListener('click', handleNo);
                resolve(true);
            };

            const handleNo = () => {
                elements.confirmModal.classList.add('hidden');
                elements.confirmModalYes.removeEventListener('click', handleYes);
                elements.confirmModalNo.removeEventListener('click', handleNo);
                resolve(false);
            };

            elements.confirmModalYes.addEventListener('click', handleYes);
            elements.confirmModalNo.addEventListener('click', handleNo);
        });
    }
};

// Enhanced Category Manager
const categoryManager = {
    async addCategory(categoryData) {
        try {
            utils.toggleLoading(true, 'جاري إضافة الفئة...');
            
            const docRef = await addDoc(categoriesCollectionRef, {
                ...categoryData,
                userId,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            utils.showToast('تم إضافة الفئة بنجاح', 3000, 'success');
            this.clearCategoryForm();
            
        } catch (error) {
            console.error('Error adding category:', error);
            utils.showToast('حدث خطأ في إضافة الفئة', 3000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async updateCategory(categoryId, categoryData) {
        try {
            utils.toggleLoading(true, 'جاري تحديث الفئة...');
            
            const categoryRef = doc(db, 'categories', categoryId);
            await updateDoc(categoryRef, {
                ...categoryData,
                updatedAt: new Date()
            });
            
            utils.showToast('تم تحديث الفئة بنجاح', 3000, 'success');
            this.clearCategoryForm();
            
        } catch (error) {
            console.error('Error updating category:', error);
            utils.showToast('حدث خطأ في تحديث الفئة', 3000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async deleteCategory(categoryId) {
        try {
            const confirmed = await expenseManager.showConfirmModal(
                'حذف الفئة',
                'هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع المصروفات المرتبطة بها.'
            );
            
            if (!confirmed) return;
            
            utils.toggleLoading(true, 'جاري حذف الفئة...');
            
            // Delete category
            const categoryRef = doc(db, 'categories', categoryId);
            await deleteDoc(categoryRef);
            
            // Delete associated expenses
            const expensesToDelete = appState.expenses.filter(expense => expense.categoryId === categoryId);
            const batch = writeBatch(db);
            
            expensesToDelete.forEach(expense => {
                const expenseRef = doc(db, 'expenses', expense.id);
                batch.delete(expenseRef);
            });
            
            await batch.commit();
            
            utils.showToast('تم حذف الفئة والمصروفات المرتبطة بها', 3000, 'success');
            
        } catch (error) {
            console.error('Error deleting category:', error);
            utils.showToast('حدث خطأ في حذف الفئة', 3000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    renderCategories() {
        const userCategories = Object.entries(appState.categories);
        
        if (userCategories.length === 0) {
            elements.userCategoriesList.classList.add('hidden');
            elements.emptyCategoriesState.classList.remove('hidden');
            return;
        }
        
        elements.emptyCategoriesState.classList.add('hidden');
        elements.userCategoriesList.classList.remove('hidden');
        
        elements.userCategoriesList.innerHTML = userCategories.map(([id, category]) => {
            const expenseCount = appState.expenses.filter(expense => expense.categoryId === id).length;
            
            return `
                <div class="category-item bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 hover:shadow-lg transition-all duration-300 group">
                    <div class="flex items-center justify-between mb-4">
                        <div class="category-icon w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg" style="background: ${category.color}">
                            <i data-lucide="${category.icon || 'circle'}" class="w-6 h-6"></i>
                        </div>
                        <div class="actions opacity-0 group-hover:opacity-100 transition-all duration-300 flex space-x-1">
                            <button onclick="categoryManager.editCategory('${id}')" class="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                            </button>
                            <button onclick="categoryManager.deleteCategory('${id}')" class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                    <h3 class="category-name text-lg font-semibold text-gray-800 dark:text-white mb-2">${category.name}</h3>
                    <p class="category-count text-sm text-gray-500 dark:text-gray-400">${expenseCount} مصروف</p>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
    },

    editCategory(categoryId) {
        const category = appState.categories[categoryId];
        if (!category) return;
        
        appState.isEditingCategory = true;
        appState.editingCategoryId = categoryId;
        
        elements.categoryNameInput.value = category.name;
        elements.categoryColorInput.value = category.color;
        elements.addCategoryBtn.textContent = 'تحديث';
        elements.cancelCategoryEditBtn.classList.remove('hidden');
        
        elements.categoryNameInput.focus();
    },

    clearCategoryForm() {
        elements.categoryNameInput.value = '';
        elements.categoryColorInput.value = utils.getRandomCategoryColor();
        elements.addCategoryBtn.textContent = 'إضافة';
        elements.cancelCategoryEditBtn.classList.add('hidden');
        
        appState.isEditingCategory = false;
        appState.editingCategoryId = null;
    },

    async saveCategory() {
        const name = elements.categoryNameInput.value.trim();
        const color = elements.categoryColorInput.value;
        
        if (!name) {
            utils.showToast('يرجى إدخال اسم الفئة', 3000, 'warning');
            elements.categoryNameInput.focus();
            return;
        }
        
        // Check for duplicate names
        const existingCategory = Object.values(appState.categories).find(cat => 
            cat.name.toLowerCase() === name.toLowerCase() && 
            (!appState.isEditingCategory || appState.editingCategoryId !== cat.id)
        );
        
        if (existingCategory) {
            utils.showToast('اسم الفئة موجود بالفعل', 3000, 'warning');
            elements.categoryNameInput.focus();
            return;
        }
        
        const categoryData = {
            name,
            color,
            icon: 'circle' // Default icon, can be enhanced later
        };
        
        if (appState.isEditingCategory) {
            await this.updateCategory(appState.editingCategoryId, categoryData);
        } else {
            await this.addCategory(categoryData);
        }
    }
};

// Enhanced Statistics Manager
const statisticsManager = {
    calculateMonthlyStats() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        const monthlyExpenses = appState.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });
        
        const total = monthlyExpenses.reduce((sum, expense) => sum + parseFloat(expense.price || 0), 0);
        const uniqueDays = new Set(monthlyExpenses.map(expense => expense.date)).size;
        const average = uniqueDays > 0 ? total / uniqueDays : 0;
        
        return {
            total,
            average,
            daysRecorded: uniqueDays,
            expenses: monthlyExpenses
        };
    },

    calculateCategoryStats() {
        const stats = this.calculateMonthlyStats();
        const categoryTotals = {};
        
        stats.expenses.forEach(expense => {
            const categoryId = expense.categoryId;
            if (!categoryTotals[categoryId]) {
                categoryTotals[categoryId] = 0;
            }
            categoryTotals[categoryId] += parseFloat(expense.price || 0);
        });
        
        return Object.entries(categoryTotals)
            .map(([categoryId, total]) => {
                const category = appState.categories[categoryId] || appState.defaultCategories[categoryId];
                return {
                    categoryId,
                    category,
                    total,
                    percentage: stats.total > 0 ? (total / stats.total) * 100 : 0
                };
            })
            .sort((a, b) => b.total - a.total);
    },

    renderMonthlyStats() {
        const stats = this.calculateMonthlyStats();
        
        elements.monthlyTotalDisplay.textContent = utils.formatCurrency(stats.total);
        elements.dailyAverageDisplay.textContent = utils.formatCurrency(stats.average);
        elements.daysRecordedDisplay.textContent = `${stats.daysRecorded} أيام`;
        
        this.renderTopCategories();
    },

    renderTopCategories() {
        const categoryStats = this.calculateCategoryStats();
        
        if (categoryStats.length === 0) {
            elements.topCategoriesList.classList.add('hidden');
            elements.emptyCategoriesSummary.classList.remove('hidden');
            return;
        }
        
        elements.emptyCategoriesSummary.classList.add('hidden');
        elements.topCategoriesList.classList.remove('hidden');
        
        elements.topCategoriesList.innerHTML = categoryStats.slice(0, 5).map(stat => {
            const category = stat.category;
            if (!category) return '';
            
            return `
                <div class="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md" style="background: ${category.color}">
                            <i data-lucide="${category.icon || 'circle'}" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-800 dark:text-white">${category.name}</h4>
                            <div class="w-32 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500" 
                                     style="width: ${stat.percentage}%; background: ${category.color}"></div>
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-gray-800 dark:text-white">${utils.formatCurrency(stat.total)}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${stat.percentage.toFixed(1)}%</p>
                    </div>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
    }
};

// Enhanced Data Manager
const dataManager = {
    async exportData() {
        try {
            utils.toggleLoading(true, 'جاري تصدير البيانات...');
            
            const exportData = {
                expenses: appState.expenses,
                categories: appState.categories,
                exportDate: new Date().toISOString(),
                version: '2.0'
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `expenses-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            utils.showToast('تم تصدير البيانات بنجاح', 3000, 'success');
            
        } catch (error) {
            console.error('Error exporting data:', error);
            utils.showToast('حدث خطأ في تصدير البيانات', 3000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async importData(file) {
        try {
            utils.toggleLoading(true, 'جاري استيراد البيانات...');
            
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate import data
            if (!importData.expenses || !importData.categories) {
                throw new Error('Invalid backup file format');
            }
            
            const confirmed = await expenseManager.showConfirmModal(
                'استيراد البيانات',
                'سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟'
            );
            
            if (!confirmed) return;
            
            // Clear existing data
            await this.clearAllData(false);
            
            // Import categories
            for (const [categoryId, categoryData] of Object.entries(importData.categories)) {
                await addDoc(categoriesCollectionRef, {
                    ...categoryData,
                    userId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
            
            // Import expenses
            for (const expense of importData.expenses) {
                await addDoc(expensesCollectionRef, {
                    ...expense,
                    userId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
            
            utils.showToast('تم استيراد البيانات بنجاح', 3000, 'success');
            
        } catch (error) {
            console.error('Error importing data:', error);
            utils.showToast('حدث خطأ في استيراد البيانات', 3000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    async clearAllData(showConfirm = true) {
        try {
            if (showConfirm) {
                const confirmed = await expenseManager.showConfirmModal(
                    'مسح جميع البيانات',
                    'سيتم حذف جميع المصروفات والفئات نهائياً. هل أنت متأكد؟'
                );
                
                if (!confirmed) return;
            }
            
            utils.toggleLoading(true, 'جاري مسح البيانات...');
            
            // Delete all expenses
            const batch1 = writeBatch(db);
            appState.expenses.forEach(expense => {
                const expenseRef = doc(db, 'expenses', expense.id);
                batch1.delete(expenseRef);
            });
            await batch1.commit();
            
            // Delete all categories
            const batch2 = writeBatch(db);
            Object.keys(appState.categories).forEach(categoryId => {
                const categoryRef = doc(db, 'categories', categoryId);
                batch2.delete(categoryRef);
            });
            await batch2.commit();
            
            utils.showToast('تم مسح جميع البيانات', 3000, 'success');
            
        } catch (error) {
            console.error('Error clearing data:', error);
            utils.showToast('حدث خطأ في مسح البيانات', 3000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    }
};

// Enhanced Theme Manager
const themeManager = {
    init() {
        this.applyTheme();
        this.setupThemeToggle();
    },

    applyTheme() {
        if (appState.darkMode) {
            document.documentElement.classList.add('dark');
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.setAttribute('data-theme', 'light');
        }
        
        this.updateThemeIcon();
    },

    toggleTheme() {
        appState.darkMode = !appState.darkMode;
        localStorage.setItem('darkMode', appState.darkMode.toString());
        this.applyTheme();
        
        // Add transition effect
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    },

    updateThemeIcon() {
        const icon = elements.darkModeToggle.querySelector('i');
        if (appState.darkMode) {
            icon.setAttribute('data-lucide', 'moon');
        } else {
            icon.setAttribute('data-lucide', 'sun');
        }
        lucide.createIcons();
    },

    setupThemeToggle() {
        elements.darkModeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });
    }
};

// Enhanced Navigation Manager
const navigationManager = {
    init() {
        this.setupTabNavigation();
        this.showTab('daily');
    },

    setupTabNavigation() {
        elements.dailyTabBtn.addEventListener('click', () => this.showTab('daily'));
        elements.monthlyTabBtn.addEventListener('click', () => this.showTab('monthly'));
        elements.categoriesTabBtn.addEventListener('click', () => this.showTab('categories'));
        elements.settingsBtn.addEventListener('click', () => this.showTab('settings'));
    },

    showTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        // Hide all pages
        [elements.dailyPage, elements.monthlyPage, elements.categoriesPage, elements.settingsPage]
            .forEach(page => page.classList.add('hidden'));
        
        // Show selected page and update active tab
        switch (tabName) {
            case 'daily':
                elements.dailyTabBtn.classList.add('active');
                elements.dailyPage.classList.remove('hidden');
                expenseManager.loadDailyExpenses();
                break;
            case 'monthly':
                elements.monthlyTabBtn.classList.add('active');
                elements.monthlyPage.classList.remove('hidden');
                statisticsManager.renderMonthlyStats();
                break;
            case 'categories':
                elements.categoriesTabBtn.classList.add('active');
                elements.categoriesPage.classList.remove('hidden');
                categoryManager.renderCategories();
                break;
            case 'settings':
                elements.settingsPage.classList.remove('hidden');
                this.updateSettingsPage();
                break;
        }
        
        appState.currentTab = tabName;
    },

    updateSettingsPage() {
        if (auth.currentUser) {
            elements.settingsUserAvatar.src = auth.currentUser.photoURL || '';
            elements.settingsUserName.textContent = auth.currentUser.displayName || 'مستخدم';
            elements.settingsUserEmail.textContent = auth.currentUser.email || '';
        }
    }
};

// Enhanced Authentication Manager
const authManager = {
    async signInWithGoogle() {
        try {
            utils.toggleLoading(true, 'جاري تسجيل الدخول...');
            
            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            utils.showToast(`مرحباً ${user.displayName}`, 3000, 'success');
            
        } catch (error) {
            console.error('Error signing in:', error);
            
            if (error.code === 'auth/popup-closed-by-user') {
                utils.showToast('تم إلغاء تسجيل الدخول', 3000, 'warning');
            } else {
                utils.showToast('حدث خطأ في تسجيل الدخول', 3000, 'error');
            }
        } finally {
            utils.toggleLoading(false);
        }
    },

    async signOut() {
        try {
            const confirmed = await expenseManager.showConfirmModal(
                'تسجيل الخروج',
                'هل أنت متأكد من تسجيل الخروج؟'
            );
            
            if (!confirmed) return;
            
            utils.toggleLoading(true, 'جاري تسجيل الخروج...');
            
            await signOut(auth);
            utils.showToast('تم تسجيل الخروج بنجاح', 3000, 'success');
            
        } catch (error) {
            console.error('Error signing out:', error);
            utils.showToast('حدث خطأ في تسجيل الخروج', 3000, 'error');
        } finally {
            utils.toggleLoading(false);
        }
    },

    updateUserInterface(user) {
        if (user) {
            elements.userAvatar.src = user.photoURL || '';
            elements.userName.textContent = user.displayName || 'مستخدم';
            elements.displayUserId.textContent = user.email || '';
            
            elements.authScreen.classList.add('hidden');
            elements.appScreen.classList.remove('hidden');
        } else {
            elements.authScreen.classList.remove('hidden');
            elements.appScreen.classList.add('hidden');
        }
    }
};

// Enhanced Firebase Data Listeners
const dataListeners = {
    setupExpensesListener() {
        if (!userId) return;
        
        unsubscribeFromExpenses = onSnapshot(
            expensesCollectionRef,
            (snapshot) => {
                appState.expenses = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Update current view
                if (appState.currentTab === 'daily') {
                    expenseManager.loadDailyExpenses();
                } else if (appState.currentTab === 'monthly') {
                    statisticsManager.renderMonthlyStats();
                }
                
                elements.dailyExpensesSkeleton.classList.add('hidden');
                elements.monthlySummarySkeleton.classList.add('hidden');
            },
            (error) => {
                console.error('Error listening to expenses:', error);
                utils.showToast('حدث خطأ في تحميل المصروفات', 3000, 'error');
            }
        );
    },

    setupCategoriesListener() {
        if (!userId) return;
        
        unsubscribeFromCategories = onSnapshot(
            categoriesCollectionRef,
            (snapshot) => {
                appState.categories = {};
                snapshot.docs.forEach(doc => {
                    appState.categories[doc.id] = {
                        id: doc.id,
                        ...doc.data()
                    };
                });
                
                // Update current view
                if (appState.currentTab === 'categories') {
                    categoryManager.renderCategories();
                }
                
                elements.categoriesSkeleton.classList.add('hidden');
            },
            (error) => {
                console.error('Error listening to categories:', error);
                utils.showToast('حدث خطأ في تحميل الفئات', 3000, 'error');
            }
        );
    }
};

// Enhanced Event Listeners Setup
const eventListeners = {
    init() {
        this.setupAuthListeners();
        this.setupExpenseModalListeners();
        this.setupCategoryListeners();
        this.setupDataManagementListeners();
        this.setupOfflineListeners();
        this.setupKeyboardShortcuts();
    },

    setupAuthListeners() {
        elements.signInBtn.addEventListener('click', authManager.signInWithGoogle);
        elements.signOutBtn.addEventListener('click', authManager.signOut);
    },

    setupExpenseModalListeners() {
        elements.openAddExpenseModalBtn.addEventListener('click', () => expenseManager.openExpenseModal());
        elements.addExpenseFAB.addEventListener('click', () => expenseManager.openExpenseModal());
        elements.saveExpenseBtn.addEventListener('click', expenseManager.saveExpense);
        elements.cancelExpenseModalBtn.addEventListener('click', expenseManager.closeExpenseModal);
        
        // Close modal on backdrop click
        elements.expenseModal.addEventListener('click', (e) => {
            if (e.target === elements.expenseModal) {
                expenseManager.closeExpenseModal();
            }
        });
        
        // Auto-suggest category on product name input
        elements.modalProductNameInput.addEventListener('input', utils.debounce((e) => {
            if (!appState.selectedCategoryIdForExpense && e.target.value.trim()) {
                const suggestedCategory = utils.suggestCategory(e.target.value);
                if (suggestedCategory) {
                    expenseManager.selectCategory(suggestedCategory);
                }
            }
        }, 500));
        
        // Enter key to save
        elements.modalProductNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                elements.modalProductPriceInput.focus();
            }
        });
        
        elements.modalProductPriceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                expenseManager.saveExpense();
            }
        });
    },

    setupCategoryListeners() {
        elements.addCategoryBtn.addEventListener('click', categoryManager.saveCategory);
        elements.cancelCategoryEditBtn.addEventListener('click', categoryManager.clearCategoryForm);
        
        // Enter key to save category
        elements.categoryNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                categoryManager.saveCategory();
            }
        });
        
        // Random color on color input click
        elements.categoryColorInput.addEventListener('click', () => {
            if (!appState.isEditingCategory) {
                elements.categoryColorInput.value = utils.getRandomCategoryColor();
            }
        });
    },

    setupDataManagementListeners() {
        elements.exportDataBtn.addEventListener('click', dataManager.exportData);
        elements.importDataBtn.addEventListener('click', () => elements.importFileInput.click());
        elements.clearAllDataBtn.addEventListener('click', () => dataManager.clearAllData());
        
        elements.importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                dataManager.importData(file);
                e.target.value = ''; // Reset input
            }
        });
    },

    setupOfflineListeners() {
        window.addEventListener('online', () => {
            appState.isOffline = false;
            elements.offlineBanner.style.transform = 'translateY(-100%)';
            utils.showToast('تم استعادة الاتصال بالإنترنت', 3000, 'success');
        });

        window.addEventListener('offline', () => {
            appState.isOffline = true;
            elements.offlineBanner.style.transform = 'translateY(0)';
            utils.showToast('لا يوجد اتصال بالإنترنت', 3000, 'warning');
        });
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N: New expense
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                expenseManager.openExpenseModal();
            }
            
            // Escape: Close modals
            if (e.key === 'Escape') {
                if (!elements.expenseModal.classList.contains('hidden')) {
                    expenseManager.closeExpenseModal();
                }
                if (!elements.confirmModal.classList.contains('hidden')) {
                    elements.confirmModal.classList.add('hidden');
                }
            }
            
            // Tab navigation with numbers
            if (e.key >= '1' && e.key <= '4' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                const tabs = ['daily', 'monthly', 'categories', 'settings'];
                navigationManager.showTab(tabs[parseInt(e.key) - 1]);
            }
        });
    }
};

// Enhanced Application Initialization
const app = {
    async init() {
        try {
            // Initialize Firebase
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            
            // Initialize theme
            themeManager.init();
            
            // Initialize navigation
            navigationManager.init();
            
            // Initialize event listeners
            eventListeners.init();
            
            // Initialize spinner date picker
            spinnerDatePicker.init();
            
            // Setup auth state listener
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    userId = user.uid;
                    expensesCollectionRef = collection(db, 'expenses');
                    categoriesCollectionRef = collection(db, 'categories');
                    
                    // Setup data listeners
                    dataListeners.setupExpensesListener();
                    dataListeners.setupCategoriesListener();
                    
                    authManager.updateUserInterface(user);
                    appState.isAuthReady = true;
                } else {
                    // Clean up listeners
                    unsubscribeFromExpenses();
                    unsubscribeFromCategories();
                    
                    authManager.updateUserInterface(null);
                    appState.isAuthReady = false;
                }
                
                utils.toggleLoading(false);
            });
            
            // Initialize Lucide icons
            lucide.createIcons();
            
            // Check offline status
            if (!navigator.onLine) {
                appState.isOffline = true;
                elements.offlineBanner.style.transform = 'translateY(0)';
            }
            
        } catch (error) {
            console.error('Error initializing app:', error);
            utils.showToast('حدث خطأ في تشغيل التطبيق', 5000, 'error');
            utils.toggleLoading(false);
        }
    }
};

// Enhanced Global Functions (for HTML onclick handlers)
window.expenseManager = expenseManager;
window.categoryManager = categoryManager;
window.dataManager = dataManager;
window.navigationManager = navigationManager;

// Start the application
document.addEventListener('DOMContentLoaded', app.init);

// Enhanced Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('SW registered: ', registration);
        } catch (registrationError) {
            console.log('SW registration failed: ', registrationError);
        }
    });
}

