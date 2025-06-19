import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCD6TOeIO7g6RGp89YtA1maduwMfyTE1VQ",
  authDomain: "my-expenses-81714.firebaseapp.com",
  projectId: "my-expenses-81714",
  storageBucket: "my-expenses-81714.firebasestorage.app",
  messagingSenderId: "672207051964",
  appId: "1:672207051964:web:b6e0cedc143bd06fd584b9",
  measurementId: "G-YBTY3QD4YQ"
};

// Global Firebase and application state variables
let app, auth, db;
let expensesCollectionRef;
let categoriesCollectionRef;
let userId;
let unsubscribeFromExpenses = () => {};
let unsubscribeFromCategories = () => {};

// Enhanced state management with spinner date picker
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
    // Enhanced spinner date picker state
    spinnerDatePicker: {
        selectedDay: new Date().getDate(),
        selectedMonth: new Date().getMonth(),
        selectedYear: new Date().getFullYear(),
        isScrolling: false,
        scrollTimeout: null
    },
    defaultCategories: {
        'طعام': { name: 'طعام', color: '#EF4444' },
        'مواصلات': { name: 'مواصلات', color: '#3B82F6' },
        'فواتير': { name: 'فواتير', color: '#F59E0B' },
        'تسوق': { name: 'تسوق', color: '#10B981' },
        'صحة': { name: 'صحة', color: '#8B5CF6' },
        'ترفيه': { name: 'ترفيه', color: '#EC4899' },
        'أخرى': { name: 'أخرى', color: '#6B7280' }
    },
    categoryColors: [
        '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981',
        '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
        '#EC4899', '#F43F5E'
    ],
    monthNames: [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ]
};

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const signInBtn = document.getElementById('signInBtn');
const settingsBtn = document.getElementById('settingsBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const displayUserId = document.getElementById('displayUserId');

const dailyTabBtn = document.getElementById('dailyTabBtn');
const monthlyTabBtn = document.getElementById('monthlyTabBtn');
const categoriesTabBtn = document.getElementById('categoriesTabBtn');
const dailyPage = document.getElementById('dailyPage');
const monthlyPage = document.getElementById('monthlyPage');
const categoriesPage = document.getElementById('categoriesPage');
const settingsPage = document.getElementById('settingsPage');

const openAddExpenseModalBtn = document.getElementById('openAddExpenseModal');
const expenseDateInput = document.getElementById('expenseDate');
const addExpenseFAB = document.getElementById('addExpenseFAB');
const currentDateExpenseList = document.getElementById('currentDateExpenseList');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');
const currentDateTotalDisplay = document.getElementById('currentDateTotal');
const emptyDailyState = document.getElementById('emptyDailyState');
const dailyExpensesSkeleton = document.getElementById('dailyExpensesSkeleton');

// Spinner Date Picker Elements
const spinnerDatePicker = document.getElementById('spinnerDatePicker');
const dayWheel = document.getElementById('dayWheel');
const monthWheel = document.getElementById('monthWheel');
const yearWheel = document.getElementById('yearWheel');
const dayItems = document.getElementById('dayItems');
const monthItems = document.getElementById('monthItems');
const yearItems = document.getElementById('yearItems');

const monthlyTotalDisplay = document.getElementById('monthlyTotal');
const dailyAverageDisplay = document.getElementById('dailyAverage');
const daysRecordedDisplay = document.getElementById('daysRecorded');
const topCategoriesList = document.getElementById('topCategoriesList');
const monthlySummarySkeleton = document.getElementById('monthlySummarySkeleton');
const monthlyContent = document.getElementById('monthlyContent');
const emptyCategoriesSummary = document.getElementById('emptyCategoriesSummary');

// LLM elements
const generateAnalysisBtn = document.getElementById('generateAnalysisBtn');
const analysisPlaceholder = document.getElementById('analysisPlaceholder');
const llmAnalysisOutput = document.getElementById('llmAnalysisOutput');
const llmAnalysisLoading = document.getElementById('llmAnalysisLoading');

const categoryNameInput = document.getElementById('categoryNameInput');
const categoryColorInput = document.getElementById('categoryColorInput');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const cancelCategoryEditBtn = document.getElementById('cancelCategoryEditBtn');
const userCategoriesList = document.getElementById('userCategoriesList');
const emptyCategoriesState = document.getElementById('emptyCategoriesState');
const categoriesSkeleton = document.getElementById('categoriesSkeleton');

const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const clearAllDataBtn = document.getElementById('clearAllDataBtn');
const toastMessageElement = document.getElementById('toastMessage');

// Expense Modal Elements
const expenseModal = document.getElementById('expenseModal');
const expenseModalTitle = document.getElementById('expenseModalTitle');
const modalDaySelect = document.getElementById('modalDaySelect');
const modalMonthSelect = document.getElementById('modalMonthSelect');
const modalYearSelect = document.getElementById('modalYearSelect');
const modalProductNameInput = document.getElementById('modalProductName');
const modalProductPriceInput = document.getElementById('modalProductPrice');
const categoryButtonsContainer = document.getElementById('categoryButtonsContainer');
const saveExpenseBtn = document.getElementById('saveExpenseBtn');
const cancelExpenseModalBtn = document.getElementById('cancelExpenseModalBtn');

// Confirmation Modal Elements
const confirmModal = document.getElementById('confirmModal');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmModalYes = document.getElementById('confirmModalYes');
const confirmModalNo = document.getElementById('confirmModalNo');
let confirmModalResolve;

// Settings page elements
const settingsUserAvatar = document.getElementById('settingsUserAvatar');
const settingsUserName = document.getElementById('settingsUserName');
const settingsUserEmail = document.getElementById('settingsUserEmail');
const darkModeToggle = document.getElementById('darkModeToggle');

// Offline Banner
const offlineBanner = document.getElementById('offlineBanner');

// ===== ENHANCED UTILITY FUNCTIONS =====

/**
 * Enhanced toast message with icon and progress bar
 */
function showToast(message, duration = 3000, type = 'success') {
    const toastText = toastMessageElement.querySelector('.toast-text');
    const toastIcon = toastMessageElement.querySelector('.toast-icon i');
    const toastProgress = toastMessageElement.querySelector('.toast-progress');
    
    // Set icon based on type
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    
    const colors = {
        success: 'rgba(16, 185, 129, 0.95)',
        error: 'rgba(239, 68, 68, 0.95)',
        warning: 'rgba(245, 158, 11, 0.95)',
        info: 'rgba(59, 130, 246, 0.95)'
    };
    
    toastIcon.setAttribute('data-lucide', icons[type] || icons.success);
    toastText.textContent = message;
    toastMessageElement.style.background = colors[type] || colors.success;
    
    // Reset progress bar
    toastProgress.style.animation = 'none';
    toastProgress.offsetHeight; // Trigger reflow
    toastProgress.style.animation = `toastProgress ${duration}ms linear`;
    
    toastMessageElement.classList.add('show');
    lucide.createIcons(); // Re-render icons
    
    setTimeout(() => {
        toastMessageElement.classList.remove('show');
    }, duration);
}

/**
 * Enhanced confirmation modal
 */
function showConfirmModal(title, message) {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmModal.classList.remove('hidden');

    return new Promise(resolve => {
        confirmModalResolve = resolve;
    });
}

function handleConfirmYes() {
    confirmModal.classList.add('hidden');
    if (confirmModalResolve) {
        confirmModalResolve(true);
        confirmModalResolve = null;
    }
}

function handleConfirmNo() {
    confirmModal.classList.add('hidden');
    if (confirmModalResolve) {
        confirmModalResolve(false);
        confirmModalResolve = null;
    }
}

/**
 * Enhanced date formatting
 */
function getDateStringFromWheels(day, month, year) {
    const d = new Date(year, month, day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Enhanced currency formatting
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-AE', { 
        style: 'currency', 
        currency: 'AED',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

/**
 * Get contrast color for text on colored backgrounds
 */
function getContrastColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
}

/**
 * Enhanced category suggestion
 */
function suggestCategory(productName) {
    const lowerProductName = productName.toLowerCase();
    
    // Check user categories first
    for (const categoryId in appState.categories) {
        const category = appState.categories[categoryId];
        if (lowerProductName.includes(category.name.toLowerCase())) {
            return category.id;
        }
    }

    // Fallback to default categories
    if (lowerProductName.includes('قهوة') || lowerProductName.includes('طعام') || lowerProductName.includes('مطعم') || lowerProductName.includes('وجبة')) return 'طعام';
    if (lowerProductName.includes('بنزين') || lowerProductName.includes('تاكسي') || lowerProductName.includes('مواصلات')) return 'مواصلات';
    if (lowerProductName.includes('فاتورة') || lowerProductName.includes('كهرباء') || lowerProductName.includes('انترنت')) return 'فواتير';
    if (lowerProductName.includes('ملابس') || lowerProductName.includes('تسوق') || lowerProductName.includes('إلكترونيات')) return 'تسوق';
    if (lowerProductName.includes('دواء') || lowerProductName.includes('صيدلية') || lowerProductName.includes('طبيب')) return 'صحة';
    if (lowerProductName.includes('سينما') || lowerProductName.includes('مقهى') || lowerProductName.includes('ترفيه')) return 'ترفيه';
    
    return 'أخرى';
}

function getRandomCategoryColor() {
    return appState.categoryColors[Math.floor(Math.random() * appState.categoryColors.length)];
}

/**
 * Enhanced loading overlay
 */
function toggleLoading(show, message = 'جاري التحميل...') {
    loadingText.textContent = message;
    if (show) {
        loadingOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        loadingOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// ===== ENHANCED SPINNER DATE PICKER =====

/**
 * Initialize the enhanced spinner date picker
 */
function initializeSpinnerDatePicker() {
    const today = new Date();
    appState.spinnerDatePicker.selectedDay = today.getDate();
    appState.spinnerDatePicker.selectedMonth = today.getMonth();
    appState.spinnerDatePicker.selectedYear = today.getFullYear();
    
    populateSpinnerWheels();
    setupSpinnerEventListeners();
    updateSelectedDate();
}

/**
 * Populate spinner wheels with data
 */
function populateSpinnerWheels() {
    // Populate days (1-31)
    dayItems.innerHTML = '';
    for (let i = 1; i <= 31; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'wheel-item';
        dayElement.textContent = i;
        dayElement.dataset.value = i;
        dayItems.appendChild(dayElement);
    }
    
    // Populate months
    monthItems.innerHTML = '';
    appState.monthNames.forEach((month, index) => {
        const monthElement = document.createElement('div');
        monthElement.className = 'wheel-item';
        monthElement.textContent = month;
        monthElement.dataset.value = index;
        monthItems.appendChild(monthElement);
    });
    
    // Populate years (current year - 5 to current year + 2)
    yearItems.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 2; year++) {
        const yearElement = document.createElement('div');
        yearElement.className = 'wheel-item';
        yearElement.textContent = year;
        yearElement.dataset.value = year;
        yearItems.appendChild(yearElement);
    }
    
    // Set initial positions
    updateWheelPosition('day', appState.spinnerDatePicker.selectedDay);
    updateWheelPosition('month', appState.spinnerDatePicker.selectedMonth);
    updateWheelPosition('year', appState.spinnerDatePicker.selectedYear);
}

/**
 * Update wheel position with smooth animation
 */
function updateWheelPosition(wheelType, value) {
    let container, items, selectedValue;
    
    switch (wheelType) {
        case 'day':
            container = dayItems;
            selectedValue = value;
            break;
        case 'month':
            container = monthItems;
            selectedValue = value;
            break;
        case 'year':
            container = yearItems;
            selectedValue = value;
            break;
    }
    
    const wheelItems = container.querySelectorAll('.wheel-item');
    const itemHeight = 40; // Height of each item
    const containerHeight = 120; // Height of the wheel container
    const centerOffset = (containerHeight - itemHeight) / 2;
    
    // Find the target item
    let targetIndex = 0;
    wheelItems.forEach((item, index) => {
        item.classList.remove('selected');
        if (wheelType === 'day' && parseInt(item.dataset.value) === selectedValue) {
            targetIndex = index;
            item.classList.add('selected');
        } else if (wheelType === 'month' && parseInt(item.dataset.value) === selectedValue) {
            targetIndex = index;
            item.classList.add('selected');
        } else if (wheelType === 'year' && parseInt(item.dataset.value) === selectedValue) {
            targetIndex = index;
            item.classList.add('selected');
        }
    });
    
    // Calculate transform position
    const translateY = centerOffset - (targetIndex * itemHeight);
    container.style.transform = `translateY(${translateY}px)`;
    
    // Add fade effect to non-selected items
    wheelItems.forEach((item, index) => {
        const distance = Math.abs(index - targetIndex);
        const opacity = Math.max(0.3, 1 - (distance * 0.3));
        const scale = Math.max(0.8, 1 - (distance * 0.1));
        
        if (distance === 0) {
            item.style.opacity = '1';
            item.style.transform = 'scale(1.1)';
            item.style.fontWeight = '700';
        } else {
            item.style.opacity = opacity;
            item.style.transform = `scale(${scale})`;
            item.style.fontWeight = '500';
        }
    });
}

/**
 * Setup event listeners for spinner wheels
 */
function setupSpinnerEventListeners() {
    // Touch and mouse event handling for each wheel
    setupWheelInteraction('day', dayItems, (value) => {
        appState.spinnerDatePicker.selectedDay = parseInt(value);
        updateSelectedDate();
    });
    
    setupWheelInteraction('month', monthItems, (value) => {
        appState.spinnerDatePicker.selectedMonth = parseInt(value);
        updateSelectedDate();
    });
    
    setupWheelInteraction('year', yearItems, (value) => {
        appState.spinnerDatePicker.selectedYear = parseInt(value);
        updateSelectedDate();
    });
}

/**
 * Setup interaction for individual wheel
 */
function setupWheelInteraction(wheelType, container, onValueChange) {
    let isScrolling = false;
    let startY = 0;
    let currentY = 0;
    let scrollTimeout;
    
    const wheelSelector = container.parentElement;
    
    // Mouse wheel event
    wheelSelector.addEventListener('wheel', (e) => {
        e.preventDefault();
        handleWheelScroll(wheelType, e.deltaY > 0 ? 1 : -1, onValueChange);
    });
    
    // Touch events
    wheelSelector.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isScrolling = true;
        clearTimeout(scrollTimeout);
    });
    
    wheelSelector.addEventListener('touchmove', (e) => {
        if (!isScrolling) return;
        e.preventDefault();
        
        currentY = e.touches[0].clientY;
        const deltaY = startY - currentY;
        
        if (Math.abs(deltaY) > 20) {
            const direction = deltaY > 0 ? 1 : -1;
            handleWheelScroll(wheelType, direction, onValueChange);
            startY = currentY;
        }
    });
    
    wheelSelector.addEventListener('touchend', () => {
        isScrolling = false;
        scrollTimeout = setTimeout(() => {
            // Snap to nearest item
            snapToNearestItem(wheelType, onValueChange);
        }, 100);
    });
    
    // Mouse events
    wheelSelector.addEventListener('mousedown', (e) => {
        startY = e.clientY;
        isScrolling = true;
        clearTimeout(scrollTimeout);
        
        const handleMouseMove = (e) => {
            if (!isScrolling) return;
            e.preventDefault();
            
            currentY = e.clientY;
            const deltaY = startY - currentY;
            
            if (Math.abs(deltaY) > 20) {
                const direction = deltaY > 0 ? 1 : -1;
                handleWheelScroll(wheelType, direction, onValueChange);
                startY = currentY;
            }
        };
        
        const handleMouseUp = () => {
            isScrolling = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            scrollTimeout = setTimeout(() => {
                snapToNearestItem(wheelType, onValueChange);
            }, 100);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });
    
    // Click on items
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('wheel-item')) {
            const value = e.target.dataset.value;
            onValueChange(value);
            updateWheelPosition(wheelType, parseInt(value));
        }
    });
}

/**
 * Handle wheel scroll with smooth animation
 */
function handleWheelScroll(wheelType, direction, onValueChange) {
    let currentValue, minValue, maxValue;
    
    switch (wheelType) {
        case 'day':
            currentValue = appState.spinnerDatePicker.selectedDay;
            minValue = 1;
            maxValue = getDaysInMonth(appState.spinnerDatePicker.selectedMonth, appState.spinnerDatePicker.selectedYear);
            break;
        case 'month':
            currentValue = appState.spinnerDatePicker.selectedMonth;
            minValue = 0;
            maxValue = 11;
            break;
        case 'year':
            currentValue = appState.spinnerDatePicker.selectedYear;
            minValue = new Date().getFullYear() - 5;
            maxValue = new Date().getFullYear() + 2;
            break;
    }
    
    let newValue = currentValue + direction;
    
    // Handle wrapping
    if (newValue < minValue) {
        newValue = maxValue;
    } else if (newValue > maxValue) {
        newValue = minValue;
    }
    
    onValueChange(newValue);
    updateWheelPosition(wheelType, newValue);
}

/**
 * Snap to nearest item after scrolling
 */
function snapToNearestItem(wheelType, onValueChange) {
    // This function ensures the wheel snaps to the nearest valid item
    // after user interaction ends
    let currentValue;
    
    switch (wheelType) {
        case 'day':
            currentValue = appState.spinnerDatePicker.selectedDay;
            break;
        case 'month':
            currentValue = appState.spinnerDatePicker.selectedMonth;
            break;
        case 'year':
            currentValue = appState.spinnerDatePicker.selectedYear;
            break;
    }
    
    updateWheelPosition(wheelType, currentValue);
}

/**
 * Get number of days in a month
 */
function getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Update the selected date and sync with hidden input
 */
function updateSelectedDate() {
    const { selectedDay, selectedMonth, selectedYear } = appState.spinnerDatePicker;
    
    // Validate day against month/year
    const maxDays = getDaysInMonth(selectedMonth, selectedYear);
    if (selectedDay > maxDays) {
        appState.spinnerDatePicker.selectedDay = maxDays;
        updateWheelPosition('day', maxDays);
    }
    
    // Create date string
    const dateString = getDateStringFromWheels(
        appState.spinnerDatePicker.selectedDay,
        selectedMonth,
        selectedYear
    );
    
    // Update hidden input for compatibility
    expenseDateInput.value = dateString;
    
    // Update display
    const displayDate = new Date(selectedYear, selectedMonth, appState.spinnerDatePicker.selectedDay);
    selectedDateDisplay.textContent = displayDate.toLocaleDateString('ar-EG', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Trigger expense list update
    if (appState.currentTab === 'daily') {
        renderCurrentDateExpenses();
    }
}

// ===== ENHANCED TAB SWITCHING =====

/**
 * Enhanced tab switching with smooth animations
 */
function switchTab(tabName) {
    console.log("Switching tab to:", tabName);
    
    const allTabs = [dailyTabBtn, monthlyTabBtn, categoriesTabBtn];
    const allPages = [dailyPage, monthlyPage, categoriesPage, settingsPage];

    // Add fade out animation to current page
    const currentPage = document.querySelector('.tab-content.active');
    if (currentPage) {
        currentPage.style.opacity = '0';
        currentPage.style.transform = 'translateY(10px)';
    }

    setTimeout(() => {
        allTabs.forEach(btn => btn.classList.remove('active'));
        allPages.forEach(page => page.classList.remove('active'));

        // Activate the selected tab and show its page
        switch (tabName) {
            case 'daily':
                dailyTabBtn.classList.add('active');
                dailyPage.classList.add('active');
                renderCurrentDateExpenses();
                break;
            case 'monthly':
                monthlyTabBtn.classList.add('active');
                monthlyPage.classList.add('active');
                updateMonthlySummary();
                resetLLMAnalysisSection();
                break;
            case 'categories':
                categoriesTabBtn.classList.add('active');
                categoriesPage.classList.add('active');
                renderUserCategories();
                break;
            case 'settings':
                settingsPage.classList.add('active');
                updateSettingsPage();
                break;
        }
        
        appState.currentTab = tabName;
        
        // Add fade in animation to new page
        const newPage = document.querySelector('.tab-content.active');
        if (newPage) {
            newPage.style.opacity = '1';
            newPage.style.transform = 'translateY(0)';
        }
        
        lucide.createIcons();
    }, 150);
}

function resetLLMAnalysisSection() {
    llmAnalysisOutput.classList.add('hidden');
    llmAnalysisLoading.classList.add('hidden');
    analysisPlaceholder.classList.remove('hidden');
    generateAnalysisBtn.disabled = false;
}

// ===== ENHANCED EXPENSE RENDERING =====

/**
 * Enhanced expense rendering with animations
 */
function renderCurrentDateExpenses() {
    const selectedDate = expenseDateInput.value;
    
    // Show skeleton loading
    dailyExpensesSkeleton.classList.remove('hidden');
    currentDateExpenseList.classList.add('hidden');
    emptyDailyState.classList.add('hidden');

    // Simulate loading delay for smooth UX
    setTimeout(() => {
        const expensesForDate = appState.expenses.filter(e => e.date === selectedDate).sort((a,b) => b.timestamp - a.timestamp);
        currentDateExpenseList.innerHTML = '';
        let total = 0;

        if (expensesForDate.length === 0) {
            dailyExpensesSkeleton.classList.add('hidden');
            emptyDailyState.classList.remove('hidden');
        } else {
            expensesForDate.forEach((exp, index) => {
                total += exp.price;
                const categoryInfo = appState.categories[exp.categoryId] || appState.defaultCategories[exp.category] || appState.defaultCategories['أخرى'];
                const categoryBadgeStyle = `background-color: ${categoryInfo.color}; color: ${getContrastColor(categoryInfo.color)};`;

                const item = document.createElement('div');
                item.className = 'expense-item';
                item.dataset.id = exp.id;
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                
                item.innerHTML = `
                    <div class="expense-content">
                        <div class="expense-main">
                            <div class="expense-name">${exp.name}</div>
                            <div class="expense-details">
                                <span class="category-badge" style="${categoryBadgeStyle}">${categoryInfo.name}</span>
                                <span class="expense-price">${formatCurrency(exp.price)}</span>
                            </div>
                        </div>
                        <div class="expense-actions">
                            <button class="expense-action-btn edit-btn" title="تعديل">
                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                            </button>
                            <button class="expense-action-btn delete-btn" title="حذف">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                `;

                // Add event listeners
                const editBtn = item.querySelector('.edit-btn');
                const deleteBtn = item.querySelector('.delete-btn');
                
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    editExpense(exp.id);
                });
                
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteExpense(exp.id);
                });

                currentDateExpenseList.appendChild(item);
                
                // Animate item appearance
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 100);
            });

            dailyExpensesSkeleton.classList.add('hidden');
            currentDateExpenseList.classList.remove('hidden');
        }

        // Update total with animation
        animateNumberChange(currentDateTotalDisplay, total, formatCurrency);
        
        lucide.createIcons();
    }, 300);
}

/**
 * Animate number changes
 */
function animateNumberChange(element, targetValue, formatter = (val) => val) {
    const currentValue = parseFloat(element.textContent.replace(/[^\d.-]/g, '')) || 0;
    const difference = targetValue - currentValue;
    const steps = 20;
    const stepValue = difference / steps;
    let currentStep = 0;

    const animation = setInterval(() => {
        currentStep++;
        const newValue = currentValue + (stepValue * currentStep);
        element.textContent = formatter(newValue);
        
        if (currentStep >= steps) {
            clearInterval(animation);
            element.textContent = formatter(targetValue);
        }
    }, 50);
}

// ===== ENHANCED MODAL SYSTEM =====

/**
 * Enhanced expense modal with better UX
 */
function openExpenseModal(expenseId = null) {
    appState.isEditingExpense = !!expenseId;
    appState.editingExpenseId = expenseId;
    
    // Reset modal state
    expenseModalTitle.textContent = expenseId ? 'تعديل المصروف' : 'إضافة مصروف جديد';
    modalProductNameInput.value = '';
    modalProductPriceInput.value = '';
    appState.selectedCategoryIdForExpense = null;
    
    // Populate date selects
    populateModalDateSelects();
    
    if (expenseId) {
        // Fill form with existing expense data
        const expense = appState.expenses.find(e => e.id === expenseId);
        if (expense) {
            modalProductNameInput.value = expense.name;
            modalProductPriceInput.value = expense.price;
            appState.selectedCategoryIdForExpense = expense.categoryId || expense.category;
            
            // Set date
            const expenseDate = new Date(expense.date);
            modalDaySelect.value = expenseDate.getDate();
            modalMonthSelect.value = expenseDate.getMonth();
            modalYearSelect.value = expenseDate.getFullYear();
        }
    } else {
        // Set current date from spinner
        modalDaySelect.value = appState.spinnerDatePicker.selectedDay;
        modalMonthSelect.value = appState.spinnerDatePicker.selectedMonth;
        modalYearSelect.value = appState.spinnerDatePicker.selectedYear;
    }
    
    renderCategoryButtons();
    expenseModal.classList.remove('hidden');
    
    // Focus on product name input
    setTimeout(() => {
        modalProductNameInput.focus();
    }, 300);
}

function closeExpenseModal() {
    expenseModal.classList.add('hidden');
    appState.isEditingExpense = false;
    appState.editingExpenseId = null;
    appState.selectedCategoryIdForExpense = null;
}

/**
 * Enhanced category button rendering
 */
function renderCategoryButtons() {
    categoryButtonsContainer.innerHTML = '';
    
    // Render user categories first
    Object.values(appState.categories).forEach(category => {
        createCategoryButton(category, true);
    });
    
    // Render default categories
    Object.values(appState.defaultCategories).forEach(category => {
        createCategoryButton(category, false);
    });
}

function createCategoryButton(category, isCustom) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-button';
    button.style.backgroundColor = category.color;
    button.style.color = getContrastColor(category.color);
    
    const categoryId = isCustom ? category.id : category.name;
    
    if (appState.selectedCategoryIdForExpense === categoryId) {
        button.classList.add('selected');
    }
    
    button.innerHTML = `
        <div class="category-icon">
            <i data-lucide="tag" class="w-4 h-4"></i>
        </div>
        <span class="category-name">${category.name}</span>
    `;
    
    button.addEventListener('click', () => {
        // Remove selection from all buttons
        categoryButtonsContainer.querySelectorAll('.category-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Select this button
        button.classList.add('selected');
        appState.selectedCategoryIdForExpense = categoryId;
        
        // Auto-suggest if product name is filled
        if (modalProductNameInput.value.trim()) {
            const suggestedCategory = suggestCategory(modalProductNameInput.value);
            if (suggestedCategory === categoryId) {
                showToast(`تم اختيار فئة "${category.name}" تلقائياً`, 2000, 'info');
            }
        }
    });
    
    categoryButtonsContainer.appendChild(button);
}

// ===== ENHANCED FIREBASE INTEGRATION =====

/**
 * Enhanced Firebase initialization
 */
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        
        // Enhanced auth state listener
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                expensesCollectionRef = collection(db, `users/${userId}/expenses`);
                categoriesCollectionRef = collection(db, `users/${userId}/categories`);
                
                // Update UI
                userAvatar.src = user.photoURL || 'https://via.placeholder.com/50';
                userName.textContent = user.displayName || 'مستخدم';
                settingsUserAvatar.src = user.photoURL || 'https://via.placeholder.com/70';
                settingsUserName.textContent = user.displayName || 'مستخدم';
                settingsUserEmail.textContent = user.email || '';
                displayUserId.textContent = userId;
                
                // Setup real-time listeners
                setupRealtimeListeners();
                
                // Show app screen
                authScreen.classList.add('hidden');
                appScreen.classList.remove('hidden');
                
                // Initialize spinner date picker
                initializeSpinnerDatePicker();
                
                appState.isAuthReady = true;
                toggleLoading(false);
                
                showToast('تم تسجيل الدخول بنجاح!', 3000, 'success');
            } else {
                // User is signed out
                authScreen.classList.remove('hidden');
                appScreen.classList.add('hidden');
                appState.isAuthReady = false;
                toggleLoading(false);
            }
        });
        
    } catch (error) {
        console.error('Firebase initialization error:', error);
        showToast('خطأ في تهيئة التطبيق', 3000, 'error');
        toggleLoading(false);
    }
}

/**
 * Enhanced real-time listeners
 */
function setupRealtimeListeners() {
    // Expenses listener
    unsubscribeFromExpenses = onSnapshot(expensesCollectionRef, (snapshot) => {
        appState.expenses = [];
        snapshot.forEach((doc) => {
            appState.expenses.push({ id: doc.id, ...doc.data() });
        });
        
        if (appState.currentTab === 'daily') {
            renderCurrentDateExpenses();
        } else if (appState.currentTab === 'monthly') {
            updateMonthlySummary();
        }
    });
    
    // Categories listener
    unsubscribeFromCategories = onSnapshot(categoriesCollectionRef, (snapshot) => {
        appState.categories = {};
        snapshot.forEach((doc) => {
            appState.categories[doc.id] = { id: doc.id, ...doc.data() };
        });
        
        if (appState.currentTab === 'categories') {
            renderUserCategories();
        }
    });
}

// ===== ENHANCED EVENT LISTENERS =====

/**
 * Setup all enhanced event listeners
 */
function setupEventListeners() {
    // Auth buttons
    signInBtn.addEventListener('click', async () => {
        try {
            toggleLoading(true, 'جاري تسجيل الدخول...');
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Sign in error:', error);
            showToast('فشل في تسجيل الدخول', 3000, 'error');
            toggleLoading(false);
        }
    });
    
    signOutBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmModal('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟');
        if (confirmed) {
            try {
                await signOut(auth);
                showToast('تم تسجيل الخروج بنجاح', 3000, 'success');
            } catch (error) {
                console.error('Sign out error:', error);
                showToast('خطأ في تسجيل الخروج', 3000, 'error');
            }
        }
    });
    
    // Tab buttons
    dailyTabBtn.addEventListener('click', () => switchTab('daily'));
    monthlyTabBtn.addEventListener('click', () => switchTab('monthly'));
    categoriesTabBtn.addEventListener('click', () => switchTab('categories'));
    settingsBtn.addEventListener('click', () => switchTab('settings'));
    
    // Modal buttons
    openAddExpenseModalBtn.addEventListener('click', () => openExpenseModal());
    addExpenseFAB.addEventListener('click', () => openExpenseModal());
    cancelExpenseModalBtn.addEventListener('click', closeExpenseModal);
    
    // Save expense button
    saveExpenseBtn.addEventListener('click', saveExpense);
    
    // Confirmation modal buttons
    confirmModalYes.addEventListener('click', handleConfirmYes);
    confirmModalNo.addEventListener('click', handleConfirmNo);
    
    // Category management
    addCategoryBtn.addEventListener('click', saveCategory);
    cancelCategoryEditBtn.addEventListener('click', cancelCategoryEdit);
    
    // Data management
    exportDataBtn.addEventListener('click', exportData);
    importDataBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importData);
    clearAllDataBtn.addEventListener('click', clearAllData);
    
    // Dark mode toggle
    darkModeToggle.addEventListener('change', toggleDarkMode);
    
    // LLM Analysis
    generateAnalysisBtn.addEventListener('click', generateLLMAnalysis);
    
    // Auto-suggest category based on product name
    modalProductNameInput.addEventListener('input', (e) => {
        const productName = e.target.value.trim();
        if (productName.length > 2) {
            const suggestedCategory = suggestCategory(productName);
            if (suggestedCategory && !appState.selectedCategoryIdForExpense) {
                // Auto-select suggested category
                const categoryButton = Array.from(categoryButtonsContainer.querySelectorAll('.category-button'))
                    .find(btn => {
                        const categoryName = btn.querySelector('.category-name').textContent;
                        return categoryName === suggestedCategory || 
                               (appState.categories[suggestedCategory] && appState.categories[suggestedCategory].name === categoryName);
                    });
                
                if (categoryButton) {
                    categoryButton.click();
                }
            }
        }
    });
    
    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N: New expense
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openExpenseModal();
        }
        
        // Escape: Close modals
        if (e.key === 'Escape') {
            if (!expenseModal.classList.contains('hidden')) {
                closeExpenseModal();
            }
            if (!confirmModal.classList.contains('hidden')) {
                handleConfirmNo();
            }
        }
        
        // Tab navigation
        if (e.key >= '1' && e.key <= '3' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const tabs = ['daily', 'monthly', 'categories'];
            switchTab(tabs[parseInt(e.key) - 1]);
        }
    });
    
    // Enhanced offline/online detection
    window.addEventListener('online', () => {
        appState.isOffline = false;
        offlineBanner.classList.add('hidden');
        showToast('تم الاتصال بالإنترنت', 2000, 'success');
    });
    
    window.addEventListener('offline', () => {
        appState.isOffline = true;
        offlineBanner.classList.remove('hidden');
        showToast('انقطع الاتصال بالإنترنت', 3000, 'warning');
    });
}

// ===== ENHANCED EXPENSE OPERATIONS =====

/**
 * Enhanced save expense function
 */
async function saveExpense() {
    const name = modalProductNameInput.value.trim();
    const price = parseFloat(modalProductPriceInput.value);
    const day = parseInt(modalDaySelect.value);
    const month = parseInt(modalMonthSelect.value);
    const year = parseInt(modalYearSelect.value);
    
    // Validation
    if (!name) {
        showToast('يرجى إدخال اسم المنتج', 3000, 'warning');
        modalProductNameInput.focus();
        return;
    }
    
    if (!price || price <= 0) {
        showToast('يرجى إدخال سعر صحيح', 3000, 'warning');
        modalProductPriceInput.focus();
        return;
    }
    
    if (!appState.selectedCategoryIdForExpense) {
        showToast('يرجى اختيار فئة للمصروف', 3000, 'warning');
        return;
    }
    
    const date = getDateStringFromWheels(day, month, year);
    
    const expenseData = {
        name,
        price,
        date,
        categoryId: appState.selectedCategoryIdForExpense,
        category: appState.selectedCategoryIdForExpense, // For backward compatibility
        timestamp: Date.now()
    };
    
    try {
        saveExpenseBtn.disabled = true;
        saveExpenseBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> <span>جاري الحفظ...</span>';
        
        if (appState.isEditingExpense) {
            await updateDoc(doc(expensesCollectionRef, appState.editingExpenseId), expenseData);
            showToast('تم تحديث المصروف بنجاح', 3000, 'success');
        } else {
            await addDoc(expensesCollectionRef, expenseData);
            showToast('تم إضافة المصروف بنجاح', 3000, 'success');
        }
        
        closeExpenseModal();
    } catch (error) {
        console.error('Error saving expense:', error);
        showToast('خطأ في حفظ المصروف', 3000, 'error');
    } finally {
        saveExpenseBtn.disabled = false;
        saveExpenseBtn.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i> <span>حفظ المصروف</span>';
        lucide.createIcons();
    }
}

/**
 * Enhanced delete expense function
 */
async function deleteExpense(expenseId) {
    const expense = appState.expenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    const confirmed = await showConfirmModal(
        'حذف المصروف',
        `هل أنت متأكد من حذف "${expense.name}" بقيمة ${formatCurrency(expense.price)}؟`
    );
    
    if (confirmed) {
        try {
            await deleteDoc(doc(expensesCollectionRef, expenseId));
            showToast('تم حذف المصروف بنجاح', 3000, 'success');
        } catch (error) {
            console.error('Error deleting expense:', error);
            showToast('خطأ في حذف المصروف', 3000, 'error');
        }
    }
}

/**
 * Enhanced edit expense function
 */
function editExpense(expenseId) {
    openExpenseModal(expenseId);
}

// ===== ENHANCED CATEGORY OPERATIONS =====

/**
 * Enhanced save category function
 */
async function saveCategory() {
    const name = categoryNameInput.value.trim();
    const color = categoryColorInput.value;
    
    if (!name) {
        showToast('يرجى إدخال اسم الفئة', 3000, 'warning');
        categoryNameInput.focus();
        return;
    }
    
    // Check for duplicate names
    const existingCategory = Object.values(appState.categories).find(cat => cat.name.toLowerCase() === name.toLowerCase());
    if (existingCategory && (!appState.isEditingCategory || existingCategory.id !== appState.editingCategoryId)) {
        showToast('اسم الفئة موجود بالفعل', 3000, 'warning');
        return;
    }
    
    const categoryData = { name, color };
    
    try {
        addCategoryBtn.disabled = true;
        addCategoryBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> <span>جاري الحفظ...</span>';
        
        if (appState.isEditingCategory) {
            await updateDoc(doc(categoriesCollectionRef, appState.editingCategoryId), categoryData);
            showToast('تم تحديث الفئة بنجاح', 3000, 'success');
            cancelCategoryEdit();
        } else {
            await addDoc(categoriesCollectionRef, categoryData);
            showToast('تم إضافة الفئة بنجاح', 3000, 'success');
            categoryNameInput.value = '';
            categoryColorInput.value = getRandomCategoryColor();
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showToast('خطأ في حفظ الفئة', 3000, 'error');
    } finally {
        addCategoryBtn.disabled = false;
        addCategoryBtn.innerHTML = '<i data-lucide="plus" class="w-5 h-5"></i> <span>إضافة فئة</span>';
        lucide.createIcons();
    }
}

/**
 * Enhanced render user categories
 */
function renderUserCategories() {
    categoriesSkeleton.classList.remove('hidden');
    userCategoriesList.classList.add('hidden');
    emptyCategoriesState.classList.add('hidden');
    
    setTimeout(() => {
        userCategoriesList.innerHTML = '';
        
        const categories = Object.values(appState.categories);
        
        if (categories.length === 0) {
            categoriesSkeleton.classList.add('hidden');
            emptyCategoriesState.classList.remove('hidden');
        } else {
            categories.forEach((category, index) => {
                const item = document.createElement('div');
                item.className = 'category-item';
                item.style.backgroundColor = category.color;
                item.style.color = getContrastColor(category.color);
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                
                item.innerHTML = `
                    <div class="category-content">
                        <div class="category-icon">
                            <i data-lucide="tag" class="w-6 h-6"></i>
                        </div>
                        <div class="category-name">${category.name}</div>
                        <div class="category-actions">
                            <button class="category-action-btn edit-btn" title="تعديل">
                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                            </button>
                            <button class="category-action-btn delete-btn" title="حذف">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                `;
                
                // Add event listeners
                const editBtn = item.querySelector('.edit-btn');
                const deleteBtn = item.querySelector('.delete-btn');
                
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    editCategory(category.id);
                });
                
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteCategory(category.id);
                });
                
                userCategoriesList.appendChild(item);
                
                // Animate item appearance
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 100);
            });
            
            categoriesSkeleton.classList.add('hidden');
            userCategoriesList.classList.remove('hidden');
        }
        
        lucide.createIcons();
    }, 300);
}

// ===== ENHANCED MONTHLY SUMMARY =====

/**
 * Enhanced monthly summary with better calculations
 */
function updateMonthlySummary() {
    monthlySummarySkeleton.classList.remove('hidden');
    monthlyContent.classList.add('hidden');
    
    setTimeout(() => {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        const monthlyExpenses = appState.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });
        
        const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.price, 0);
        const uniqueDays = new Set(monthlyExpenses.map(expense => expense.date)).size;
        const dailyAverage = uniqueDays > 0 ? monthlyTotal / uniqueDays : 0;
        
        // Update displays with animation
        animateNumberChange(monthlyTotalDisplay, monthlyTotal, formatCurrency);
        animateNumberChange(dailyAverageDisplay, dailyAverage, formatCurrency);
        animateNumberChange(daysRecordedDisplay, uniqueDays, (val) => Math.round(val).toString());
        
        // Update top categories
        updateTopCategories(monthlyExpenses);
        
        monthlySummarySkeleton.classList.add('hidden');
        monthlyContent.classList.remove('hidden');
    }, 300);
}

/**
 * Enhanced top categories calculation
 */
function updateTopCategories(expenses) {
    const categoryTotals = {};
    
    expenses.forEach(expense => {
        const categoryInfo = appState.categories[expense.categoryId] || appState.defaultCategories[expense.category] || appState.defaultCategories['أخرى'];
        const categoryName = categoryInfo.name;
        
        if (!categoryTotals[categoryName]) {
            categoryTotals[categoryName] = {
                name: categoryName,
                total: 0,
                color: categoryInfo.color,
                count: 0
            };
        }
        
        categoryTotals[categoryName].total += expense.price;
        categoryTotals[categoryName].count += 1;
    });
    
    const sortedCategories = Object.values(categoryTotals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    
    topCategoriesList.innerHTML = '';
    
    if (sortedCategories.length === 0) {
        emptyCategoriesSummary.classList.remove('hidden');
    } else {
        emptyCategoriesSummary.classList.add('hidden');
        
        sortedCategories.forEach((category, index) => {
            const item = document.createElement('li');
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            
            const percentage = expenses.length > 0 ? (category.count / expenses.length * 100).toFixed(1) : 0;
            
            item.innerHTML = `
                <div class="category-info">
                    <div class="category-color-indicator" style="background-color: ${category.color}"></div>
                    <span class="category-name">${category.name}</span>
                    <span class="category-count">(${category.count} مصروف)</span>
                </div>
                <div class="category-amount">
                    <span class="amount">${formatCurrency(category.total)}</span>
                    <span class="percentage">${percentage}%</span>
                </div>
            `;
            
            topCategoriesList.appendChild(item);
            
            // Animate item appearance
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 100);
        });
    }
}

// ===== ENHANCED LLM ANALYSIS =====

/**
 * Enhanced LLM analysis generation
 */
async function generateLLMAnalysis() {
    try {
        generateAnalysisBtn.disabled = true;
        analysisPlaceholder.classList.add('hidden');
        llmAnalysisLoading.classList.remove('hidden');
        
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        const monthlyExpenses = appState.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });
        
        // Simulate AI analysis (replace with actual AI service call)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const analysisText = generateMockAnalysis(monthlyExpenses);
        
        llmAnalysisLoading.classList.add('hidden');
        llmAnalysisOutput.innerHTML = analysisText;
        llmAnalysisOutput.classList.remove('hidden');
        
        showToast('تم إنشاء التحليل بنجاح', 3000, 'success');
        
    } catch (error) {
        console.error('Error generating analysis:', error);
        showToast('خطأ في إنشاء التحليل', 3000, 'error');
        
        llmAnalysisLoading.classList.add('hidden');
        analysisPlaceholder.classList.remove('hidden');
    } finally {
        generateAnalysisBtn.disabled = false;
    }
}

/**
 * Generate mock analysis (replace with actual AI service)
 */
function generateMockAnalysis(expenses) {
    const total = expenses.reduce((sum, exp) => sum + exp.price, 0);
    const avgDaily = expenses.length > 0 ? total / new Set(expenses.map(e => e.date)).size : 0;
    
    const categoryTotals = {};
    expenses.forEach(expense => {
        const categoryInfo = appState.categories[expense.categoryId] || appState.defaultCategories[expense.category] || appState.defaultCategories['أخرى'];
        const categoryName = categoryInfo.name;
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + expense.price;
    });
    
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    
    return `
        <div class="analysis-section">
            <h4 class="analysis-title">📊 تحليل الإنفاق الشهري</h4>
            <p>بناءً على بياناتك لهذا الشهر، إليك التحليل المفصل:</p>
            
            <div class="analysis-insight">
                <strong>💰 إجمالي الإنفاق:</strong> ${formatCurrency(total)}
                <br>
                <strong>📅 متوسط الإنفاق اليومي:</strong> ${formatCurrency(avgDaily)}
            </div>
            
            ${topCategory ? `
            <div class="analysis-insight">
                <strong>🏆 أعلى فئة إنفاق:</strong> ${topCategory[0]} بقيمة ${formatCurrency(topCategory[1])}
            </div>
            ` : ''}
            
            <div class="analysis-recommendations">
                <h5>💡 توصيات لتحسين إدارة أموالك:</h5>
                <ul>
                    <li>حاول تقليل الإنفاق في فئة "${topCategory ? topCategory[0] : 'الطعام'}" بنسبة 10%</li>
                    <li>ضع ميزانية يومية قدرها ${formatCurrency(avgDaily * 0.9)} لتوفير المال</li>
                    <li>راجع مصاريفك أسبوعياً لتتبع تقدمك</li>
                    <li>فكر في إنشاء صندوق طوارئ بقيمة ${formatCurrency(total * 0.1)}</li>
                </ul>
            </div>
        </div>
    `;
}

// ===== ENHANCED UTILITY FUNCTIONS =====

/**
 * Enhanced modal date selects population
 */
function populateModalDateSelects() {
    // Clear existing options
    modalDaySelect.innerHTML = '<option value="">اليوم</option>';
    modalMonthSelect.innerHTML = '<option value="">الشهر</option>';
    modalYearSelect.innerHTML = '<option value="">السنة</option>';
    
    // Populate days
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        modalDaySelect.appendChild(option);
    }
    
    // Populate months
    appState.monthNames.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        modalMonthSelect.appendChild(option);
    });
    
    // Populate years
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 2; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        modalYearSelect.appendChild(option);
    }
}

/**
 * Enhanced dark mode toggle
 */
function toggleDarkMode() {
    const isDarkMode = darkModeToggle.checked;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    
    showToast(
        isDarkMode ? 'تم تفعيل الوضع المظلم' : 'تم تفعيل الوضع الفاتح',
        2000,
        'info'
    );
}

/**
 * Enhanced settings page update
 */
function updateSettingsPage() {
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    darkModeToggle.checked = savedDarkMode;
    document.body.classList.toggle('dark-mode', savedDarkMode);
}

/**
 * Enhanced data export
 */
async function exportData() {
    try {
        const data = {
            expenses: appState.expenses,
            categories: appState.categories,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('تم تصدير البيانات بنجاح', 3000, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('خطأ في تصدير البيانات', 3000, 'error');
    }
}

/**
 * Enhanced data import
 */
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const confirmed = await showConfirmModal(
            'استيراد البيانات',
            'هل أنت متأكد من استيراد البيانات؟ سيتم استبدال البيانات الحالية.'
        );
        
        if (confirmed) {
            toggleLoading(true, 'جاري استيراد البيانات...');
            
            // Import expenses
            if (data.expenses && Array.isArray(data.expenses)) {
                const batch = writeBatch(db);
                data.expenses.forEach(expense => {
                    const docRef = doc(expensesCollectionRef);
                    batch.set(docRef, expense);
                });
                await batch.commit();
            }
            
            // Import categories
            if (data.categories && typeof data.categories === 'object') {
                const batch = writeBatch(db);
                Object.values(data.categories).forEach(category => {
                    const docRef = doc(categoriesCollectionRef);
                    batch.set(docRef, category);
                });
                await batch.commit();
            }
            
            showToast('تم استيراد البيانات بنجاح', 3000, 'success');
            toggleLoading(false);
        }
    } catch (error) {
        console.error('Import error:', error);
        showToast('خطأ في استيراد البيانات', 3000, 'error');
        toggleLoading(false);
    }
    
    // Reset file input
    event.target.value = '';
}

/**
 * Enhanced clear all data
 */
async function clearAllData() {
    const confirmed = await showConfirmModal(
        'مسح جميع البيانات',
        'هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.'
    );
    
    if (confirmed) {
        try {
            toggleLoading(true, 'جاري مسح البيانات...');
            
            // Clear expenses
            const expensesSnapshot = await getDocs(expensesCollectionRef);
            const batch = writeBatch(db);
            expensesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Clear categories
            const categoriesSnapshot = await getDocs(categoriesCollectionRef);
            categoriesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            showToast('تم مسح جميع البيانات بنجاح', 3000, 'success');
            toggleLoading(false);
        } catch (error) {
            console.error('Clear data error:', error);
            showToast('خطأ في مسح البيانات', 3000, 'error');
            toggleLoading(false);
        }
    }
}

// ===== ENHANCED CATEGORY OPERATIONS =====

/**
 * Enhanced edit category
 */
function editCategory(categoryId) {
    const category = appState.categories[categoryId];
    if (!category) return;
    
    appState.isEditingCategory = true;
    appState.editingCategoryId = categoryId;
    
    categoryNameInput.value = category.name;
    categoryColorInput.value = category.color;
    
    addCategoryBtn.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i> <span>تحديث الفئة</span>';
    cancelCategoryEditBtn.classList.remove('hidden');
    
    categoryNameInput.focus();
    lucide.createIcons();
}

/**
 * Enhanced cancel category edit
 */
function cancelCategoryEdit() {
    appState.isEditingCategory = false;
    appState.editingCategoryId = null;
    
    categoryNameInput.value = '';
    categoryColorInput.value = getRandomCategoryColor();
    
    addCategoryBtn.innerHTML = '<i data-lucide="plus" class="w-5 h-5"></i> <span>إضافة فئة</span>';
    cancelCategoryEditBtn.classList.add('hidden');
    
    lucide.createIcons();
}

/**
 * Enhanced delete category
 */
async function deleteCategory(categoryId) {
    const category = appState.categories[categoryId];
    if (!category) return;
    
    // Check if category is used in expenses
    const usedInExpenses = appState.expenses.some(expense => expense.categoryId === categoryId);
    
    let message = `هل أنت متأكد من حذف فئة "${category.name}"؟`;
    if (usedInExpenses) {
        message += '\n\nتحذير: هذه الفئة مستخدمة في بعض المصاريف. سيتم تحويل هذه المصاريف إلى فئة "أخرى".';
    }
    
    const confirmed = await showConfirmModal('حذف الفئة', message);
    
    if (confirmed) {
        try {
            // Delete category
            await deleteDoc(doc(categoriesCollectionRef, categoryId));
            
            // Update expenses that use this category
            if (usedInExpenses) {
                const batch = writeBatch(db);
                appState.expenses
                    .filter(expense => expense.categoryId === categoryId)
                    .forEach(expense => {
                        const expenseRef = doc(expensesCollectionRef, expense.id);
                        batch.update(expenseRef, {
                            categoryId: 'أخرى',
                            category: 'أخرى'
                        });
                    });
                await batch.commit();
            }
            
            showToast('تم حذف الفئة بنجاح', 3000, 'success');
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('خطأ في حذف الفئة', 3000, 'error');
        }
    }
}

// ===== APPLICATION INITIALIZATION =====

/**
 * Enhanced application initialization
 */
async function initializeApp() {
    try {
        toggleLoading(true, 'جاري تهيئة التطبيق...');
        
        // Initialize Firebase
        await initializeFirebase();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize UI components
        lucide.createIcons();
        
        // Set random color for category input
        categoryColorInput.value = getRandomCategoryColor();
        
        // Load user preferences
        updateSettingsPage();
        
        console.log('Enhanced app initialized successfully');
        
    } catch (error) {
        console.error('App initialization error:', error);
        showToast('خطأ في تهيئة التطبيق', 5000, 'error');
        toggleLoading(false);
    }
}

// Start the enhanced application
document.addEventListener('DOMContentLoaded', initializeApp);

