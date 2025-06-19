import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase Configuration (YOUR CONFIGURATION IS HARDCODED HERE)
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
let userId; // Will store the Firebase User UID
let unsubscribeFromExpenses = () => {};
let unsubscribeFromCategories = () => {};

// Centralized state management (initial step)
const appState = {
    expenses: [],
    categories: {}, // Stored as {id: {name: 'Food', color: '#FFF'}, ...}
    isEditingExpense: false,
    editingExpenseId: null,
    editingCategoryId: null,
    isEditingCategory: false,
    currentTab: 'daily',
    isAuthReady: false,
    isOffline: !navigator.onLine,
    selectedCategoryIdForExpense: null, // Track selected category in modal
    defaultCategories: { // Hardcoded default categories as fallback
        'طعام': { name: 'طعام', color: '#EF4444' }, // Red
        'مواصلات': { name: 'مواصلات', color: '#3B82F6' }, // Blue
        'فواتير': { name: 'فواتير', color: '#F59E0B' }, // Amber
        'تسوق': { name: 'تسوق', color: '#10B981' }, // Emerald
        'صحة': { name: 'صحة', color: '#8B5CF6' }, // Violet
        'ترفيه': { name: 'ترفيه', color: '#EC4899' }, // Pink
        'أخرى': { name: 'أخرى', color: '#6B7280' } // Gray
    },
    // Random color generation for new categories (if user doesn't pick one)
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

// --- DOM Elements ---
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
const expenseDateInput = document.getElementById('expenseDate'); // Still used for daily page date selection
const addExpenseFAB = document.getElementById('addExpenseFAB');
const currentDateExpenseList = document.getElementById('currentDateExpenseList');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');
const currentDateTotalDisplay = document.getElementById('currentDateTotal');
const emptyDailyState = document.getElementById('emptyDailyState');
const dailyExpensesSkeleton = document.getElementById('dailyExpensesSkeleton');

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

// --- Utility Functions ---

/**
 * Displays a toast message to the user.
 * @param {string} message The message to display.
 * @param {number} duration The duration in milliseconds for which the toast should be visible.
 */
function showToast(message, duration = 3000) {
    toastMessageElement.textContent = message;
    toastMessageElement.classList.add('show');
    setTimeout(() => {
        toastMessageElement.classList.remove('show');
    }, duration);
}

/**
 * Displays a custom confirmation modal and returns a promise that resolves with true/false.
 * @param {string} title The title of the confirmation modal.
 * @param {string} message The message to display in the confirmation modal.
 * @returns {Promise<boolean>} A promise that resolves to true if 'Yes' is clicked, false otherwise.
 */
function showConfirmModal(title, message) {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmModal.classList.remove('hidden');

    return new Promise(resolve => {
        confirmModalResolve = resolve;
    });
}

/**
 * Handles the click for the "Yes" button in the confirmation modal.
 */
function handleConfirmYes() {
    confirmModal.classList.add('hidden');
    if (confirmModalResolve) {
        confirmModalResolve(true);
        confirmModalResolve = null;
    }
}

/**
 * Handles the click for the "No" (Cancel) button in the confirmation modal.
 */
function handleConfirmNo() {
    confirmModal.classList.add('hidden');
    if (confirmModalResolve) {
        confirmModalResolve(false);
        confirmModalResolve = null;
    }
}

/**
 * Gets a date string in 'YYYY-MM-DD' format from the date picker wheels.
 * @param {number} day The selected day.
 * @param {number} month The selected month (0-indexed).
 * @param {number} year The selected year.
 * @returns {string} Formatted date string.
 */
function getDateStringFromWheels(day, month, year) {
    const d = new Date(year, month, day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats a number as currency (AED).
 * @param {number} amount The amount to format.
 * @returns {string} Formatted currency string.
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED' }).format(amount || 0);
}

/**
 * Suggests a category ID or name based on product name. Prioritizes user's custom categories.
 * @param {string} productName The name of the product.
 * @returns {string|null} The suggested category ID (if custom) or name (if default), or null if no strong suggestion.
 */
function suggestCategory(productName) {
    const lowerProductName = productName.toLowerCase();
    // Prioritize matching with user-defined categories by their names
    for (const categoryId in appState.categories) {
        const category = appState.categories[categoryId];
        if (lowerProductName.includes(category.name.toLowerCase())) {
            return category.id; // Return custom category ID
        }
    }

    // Fallback to matching with default category names
    if (lowerProductName.includes('قهوة') || lowerProductName.includes('طعام') || lowerProductName.includes('مطعم') || lowerProductName.includes('وجبة')) return 'طعام';
    if (lowerProductName.includes('بنزين') || lowerProductName.includes('تاكسي') || lowerProductName.includes('مواصلات')) return 'مواصلات';
    if (lowerProductName.includes('فاتورة') || lowerProductName.includes('كهرباء') || lowerProductName.includes('انترنت')) return 'فواتير';
    if (lowerProductName.includes('ملابس') || lowerProductName.includes('تسوق') || lowerProductName.includes('إلكترونيات')) return 'تسوق';
    if (lowerProductName.includes('دواء') || lowerProductName.includes('صيدلية') || lowerProductName.includes('طبيب')) return 'صحة';
    if (lowerProductName.includes('سينما') || lowerProductName.includes('مقهى') || lowerProductName.includes('ترفيه')) return 'ترفيه';
    
    // Default to 'أخرى' if no specific match
    return 'أخرى';
}


/**
 * Gets a random color from the predefined list.
 * @returns {string} Hex color code.
 */
function getRandomCategoryColor() {
    return appState.categoryColors[Math.floor(Math.random() * appState.categoryColors.length)];
}

/**
 * Toggles the visibility of the loading overlay.
 * @param {boolean} show True to show, false to hide.
 * @param {string} message Optional message to display.
 */
function toggleLoading(show, message = 'جاري التحميل...') {
    loadingText.textContent = message;
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

/**
 * Switches the active tab and displays the corresponding page.
 * @param {string} tabName The name of the tab to activate ('daily', 'monthly', 'categories', 'settings').
 */
function switchTab(tabName) {
    console.log("Switching tab to:", tabName); // Debugging line
    // Deactivate all tabs and hide all pages
    const allTabs = [dailyTabBtn, monthlyTabBtn, categoriesTabBtn];
    const allPages = [dailyPage, monthlyPage, categoriesPage, settingsPage];

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
            // Reset LLM analysis section visibility
            llmAnalysisOutput.classList.add('hidden');
            llmAnalysisLoading.classList.add('hidden');
            analysisPlaceholder.classList.remove('hidden');
            generateAnalysisBtn.disabled = false;
            break;
        case 'categories':
            categoriesTabBtn.classList.add('active');
            categoriesPage.classList.add('active');
            renderUserCategories();
            break;
        case 'settings':
            // Settings button doesn't get 'active' tab style, it's a separate entry point
            // from header.
            settingsPage.classList.add('active');
            updateSettingsPage();
            break;
    }
    appState.currentTab = tabName;
    lucide.createIcons(); // Re-render Lucide icons on tab switch
}

/**
 * Renders expenses for the currently selected date.
 */
function renderCurrentDateExpenses() {
    const selectedDate = expenseDateInput.value;
    selectedDateDisplay.textContent = new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    dailyExpensesSkeleton.classList.remove('hidden');
    currentDateExpenseList.classList.add('hidden');
    emptyDailyState.classList.add('hidden');

    const expensesForDate = appState.expenses.filter(e => e.date === selectedDate).sort((a,b) => b.timestamp - a.timestamp);
    currentDateExpenseList.innerHTML = '';
    let total = 0;

    if (expensesForDate.length === 0) {
        dailyExpensesSkeleton.classList.add('hidden');
        emptyDailyState.classList.remove('hidden');
    } else {
        dailyExpensesSkeleton.classList.add('hidden'); // Hide skeleton before rendering list
        expensesForDate.forEach(exp => {
            total += exp.price;
            // Determine category info (custom first, then default fallback)
            const categoryInfo = appState.categories[exp.categoryId] || appState.defaultCategories[exp.category] || appState.defaultCategories['أخرى'];
            const categoryBadgeStyle = `background-color: ${categoryInfo.color}; color: ${getContrastColor(categoryInfo.color)};`;

            const item = document.createElement('div');
            item.className = 'expense-item';
            item.dataset.id = exp.id;
            item.innerHTML = `
                <div class="name">${exp.name}</div>
                <div class="details flex items-center">
                    <span class="category-badge" style="${categoryBadgeStyle}">${categoryInfo.name}</span>
                    <span class="price">${formatCurrency(exp.price)}</span>
                    <button class="delete-btn text-red-500 hover:text-red-700 ml-2 p-1 rounded-full"><i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i></button>
                </div>
            `;
            // Add event listener for editing when clicking the item itself
            item.addEventListener('click', () => editExpense(exp.id));
            // Add event listener for deleting when clicking the delete button
            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent item click (edit) when clicking delete button
                deleteExpense(exp.id, item);
            });
            currentDateExpenseList.appendChild(item);
        });
        currentDateExpenseList.classList.remove('hidden');
    }
    currentDateTotalDisplay.textContent = formatCurrency(total);
    lucide.createIcons();
}

/**
 * Updates the monthly summary statistics and top categories.
 */
function updateMonthlySummary() {
    monthlySummarySkeleton.classList.remove('hidden');
    monthlyContent.classList.add('hidden');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenses = appState.expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const monthlyTotal = monthlyExpenses.reduce((sum, exp) => sum + exp.price, 0);
    const uniqueDays = [...new Set(monthlyExpenses.map(exp => exp.date))];
    const daysRecorded = uniqueDays.length;
    const dailyAverage = daysRecorded > 0 ? monthlyTotal / daysRecorded : 0;

    const categoryTotals = monthlyExpenses.reduce((acc, exp) => {
        const categoryInfo = appState.categories[exp.categoryId] || appState.defaultCategories[exp.category] || appState.defaultCategories['أخرى'];
        const categoryName = categoryInfo.name;
        acc[categoryName] = (acc[categoryName] || 0) + exp.price;
        return acc;
    }, {});

    topCategoriesList.innerHTML = '';
    if (Object.keys(categoryTotals).length === 0) {
        emptyCategoriesSummary.classList.remove('hidden');
    } else {
        emptyCategoriesSummary.classList.add('hidden');
        Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .forEach(([categoryName, total]) => {
                // Find the color for the category (custom first, then default)
                const categoryColor = Object.values(appState.categories).find(cat => cat.name === categoryName)?.color || appState.defaultCategories[categoryName]?.color || appState.defaultCategories['أخرى'].color;
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="flex items-center">
                        <span class="w-3 h-3 rounded-full ml-2" style="background-color: ${categoryColor};"></span>
                        ${categoryName}
                    </span>
                    <span class="font-semibold">${formatCurrency(total)}</span>
                `;
                topCategoriesList.appendChild(li);
            });
    }

    monthlySummarySkeleton.classList.add('hidden');
    monthlyContent.classList.remove('hidden');

    monthlyTotalDisplay.textContent = formatCurrency(monthlyTotal);
    dailyAverageDisplay.textContent = formatCurrency(dailyAverage);
    daysRecordedDisplay.textContent = daysRecorded;

    lucide.createIcons();
}

/**
 * Populates the day select element based on the selected month and year.
 */
function populateDaySelect() {
    const selectedMonth = parseInt(modalMonthSelect.value);
    const selectedYear = parseInt(modalYearSelect.value);
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate(); // Get last day of the month

    const currentDay = parseInt(modalDaySelect.value); // Get current selected day if any
    let dayToSelect = currentDay;

    // Adjust day if it exceeds the new month's max days
    if (isNaN(currentDay) || currentDay === 0 || currentDay > daysInMonth) {
        dayToSelect = 1; // Default to 1st day if invalid or not set
    }

    modalDaySelect.innerHTML = '';
    for (let i = 1; i <= daysInMonth; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === dayToSelect) {
            option.selected = true;
        }
        modalDaySelect.appendChild(option);
    }

    // Scroll to the selected option for smooth spinner effect
    setTimeout(() => {
        const selectedOption = modalDaySelect.querySelector(`option[value="${dayToSelect}"]`);
        if (selectedOption) {
            modalDaySelect.scrollTop = selectedOption.offsetTop - (modalDaySelect.clientHeight / 2) + (selectedOption.clientHeight / 2);
        }
    }, 0); // Small delay to ensure rendering before scroll
}

/**
 * Populates the month select element.
 */
function populateMonthSelect() {
    modalMonthSelect.innerHTML = '';
    const currentMonth = parseInt(modalMonthSelect.value); // Get current selected month if any
    let monthToSelect = currentMonth;
    
    if (isNaN(currentMonth)) {
        monthToSelect = new Date().getMonth(); // Default to today's month if not set
    }

    appState.monthNames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = name;
        if (index === monthToSelect) {
            option.selected = true;
        }
        modalMonthSelect.appendChild(option);
    });

    // Scroll to the selected option for smooth spinner effect
    setTimeout(() => {
        const selectedOption = modalMonthSelect.querySelector(`option[value="${monthToSelect}"]`);
        if (selectedOption) {
            modalMonthSelect.scrollTop = selectedOption.offsetTop - (modalMonthSelect.clientHeight / 2) + (selectedOption.clientHeight / 2);
        }
    }, 0);
}

/**
 * Populates the year select element.
 */
function populateYearSelect() {
    modalYearSelect.innerHTML = '';
    const currentYear = parseInt(modalYearSelect.value); // Get current selected year if any
    let yearToSelect = currentYear;

    if (isNaN(currentYear)) {
        yearToSelect = new Date().getFullYear(); // Default to today's year if not set
    }

    const startYear = new Date().getFullYear() - 5; // 5 years back
    const endYear = new Date().getFullYear() + 5;   // 5 years forward

    for (let year = startYear; year <= endYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === yearToSelect) {
            option.selected = true;
        }
        modalYearSelect.appendChild(option);
    }

    // Scroll to the selected option for smooth spinner effect
    setTimeout(() => {
        const selectedOption = modalYearSelect.querySelector(`option[value="${yearToSelect}"]`);
        if (selectedOption) {
            modalYearSelect.scrollTop = selectedOption.offsetTop - (modalYearSelect.clientHeight / 2) + (selectedOption.clientHeight / 2);
        }
    }, 0);
}

/**
 * Initializes and updates the date picker wheels.
 * @param {Date} dateToSet Optional Date object to pre-select the wheels.
 */
function initializeDateWheels(dateToSet = new Date()) {
    // Set initial values for select elements directly to ensure correct population
    modalYearSelect.value = dateToSet.getFullYear();
    modalMonthSelect.value = dateToSet.getMonth();
    modalDaySelect.value = dateToSet.getDate();

    // Populate dropdowns first based on initial values
    populateYearSelect();
    populateMonthSelect();
    populateDaySelect();

    // Add event listeners to update days when month or year changes
    // Remove listeners first to prevent duplicates
    modalMonthSelect.removeEventListener('change', populateDaySelect);
    modalMonthSelect.addEventListener('change', populateDaySelect);

    modalYearSelect.removeEventListener('change', populateDaySelect);
    modalYearSelect.addEventListener('change', populateDaySelect);
}

/**
 * Renders the category buttons in the expense modal.
 * @param {string|null} selectedCategoryValue The ID of the category (if custom) or name (if default) to be pre-selected.
 */
function renderCategoryButtons(selectedCategoryValue) {
    categoryButtonsContainer.innerHTML = ''; // Clear existing buttons

    // Get all user-defined categories
    const customCategories = Object.values(appState.categories).map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        isCustom: true
    }));

    // Add 'أخرى' (Other) default category to the list, but only if no custom category with the same name exists
    let allCategoriesForButtons = [...customCategories];
    if (!customCategories.some(cat => cat.name === 'أخرى')) {
        allCategoriesForButtons.push({
            id: 'أخرى', // Use name as ID for default category to differentiate
            name: 'أخرى',
            color: appState.defaultCategories['أخرى'].color,
            isCustom: false
        });
    }

    // Sort categories alphabetically by name for consistent display
    allCategoriesForButtons.sort((a, b) => a.name.localeCompare(b.name));

    appState.selectedCategoryIdForExpense = null; // Reset current selection

    allCategoriesForButtons.forEach(cat => {
        const button = document.createElement('button');
        button.type = 'button'; // Prevent form submission
        button.className = 'category-button';
        button.textContent = cat.name;
        button.style.backgroundColor = cat.color;
        button.style.color = getContrastColor(cat.color);
        button.dataset.id = cat.id; // Use ID for custom, name for 'أخرى'

        // Check if this button should be pre-selected
        if (selectedCategoryValue) {
            if (cat.isCustom && cat.id === selectedCategoryValue) {
                button.classList.add('selected');
                appState.selectedCategoryIdForExpense = cat.id;
            } else if (!cat.isCustom && cat.name === selectedCategoryValue) {
                button.classList.add('selected');
                appState.selectedCategoryIdForExpense = cat.name;
            }
        }

        button.addEventListener('click', () => {
            // Remove 'selected' from all other buttons in this container
            document.querySelectorAll('#categoryButtonsContainer .category-button').forEach(btn => btn.classList.remove('selected'));
            // Add 'selected' to the clicked button
            button.classList.add('selected');
            appState.selectedCategoryIdForExpense = button.dataset.id;
        });
        categoryButtonsContainer.appendChild(button);
    });

    // If no category was pre-selected (e.g., new expense, or original category was deleted),
    // try to auto-select 'أخرى' or the first available custom category.
    if (!appState.selectedCategoryIdForExpense && allCategoriesForButtons.length > 0) {
        const defaultToSelect = allCategoriesForButtons.find(cat => cat.name === 'أخرى') || allCategoriesForButtons[0];
        const defaultButton = categoryButtonsContainer.querySelector(`[data-id="${defaultToSelect.id}"]`);
        if (defaultButton) {
            defaultButton.classList.add('selected');
            appState.selectedCategoryIdForExpense = defaultButton.dataset.id;
        }
    }
}


/**
 * Shows the expense modal for adding or editing an expense.
 * @param {object|null} expenseData The expense data to pre-fill the form, or null for a new expense.
 */
function showExpenseModal(expenseData = null) {
    appState.isEditingExpense = !!expenseData;
    appState.editingExpenseId = expenseData ? expenseData.id : null;
    expenseModalTitle.textContent = appState.isEditingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد';

    // Initialize date wheels
    if (expenseData && expenseData.date) {
        const [year, month, day] = expenseData.date.split('-').map(Number);
        initializeDateWheels(new Date(year, month - 1, day)); // Month is 0-indexed in Date object
    } else {
        initializeDateWheels(new Date()); // Default to today
    }

    modalProductNameInput.value = expenseData ? expenseData.name : '';
    modalProductPriceInput.value = expenseData ? expenseData.price : '';

    // Render category buttons. If editing, pass the current category ID/name.
    // Ensure categories are loaded before attempting to render buttons
    if (Object.keys(appState.categories).length > 0) {
        renderCategoryButtons(expenseData ? (expenseData.categoryId || expenseData.category) : null);
    } else {
        // Fallback or a loading state if categories aren't ready
        categoryButtonsContainer.innerHTML = '<p class="text-gray-500">جاري تحميل الفئات...</p>';
        // This scenario should be rare if Firestore listener is fast, but good for robustness
    }

    expenseModal.classList.remove('hidden');
    modalProductNameInput.focus(); // Focus on product name
}

/**
 * Hides the expense modal and resets the form.
 */
function hideExpenseModal() {
    expenseModal.classList.add('hidden');
    appState.isEditingExpense = false;
    appState.editingExpenseId = null;
    appState.selectedCategoryIdForExpense = null; // Clear selected category
    modalProductNameInput.value = '';
    modalProductPriceInput.value = '';
    initializeDateWheels(new Date()); // Reset date wheels to today
    categoryButtonsContainer.innerHTML = ''; // Clear category buttons
}

/**
 * Adds a new expense or updates an existing one.
 */
async function addOrUpdateExpense() {
    const name = modalProductNameInput.value.trim();
    const price = parseFloat(modalProductPriceInput.value);
    
    // Get date from wheels
    const day = parseInt(modalDaySelect.value);
    const month = parseInt(modalMonthSelect.value); // 0-indexed month
    const year = parseInt(modalYearSelect.value);
    const date = getDateStringFromWheels(day, month, year);

    const selectedCategoryValue = appState.selectedCategoryIdForExpense;

    if (!name || isNaN(price) || price <= 0 || !date || !selectedCategoryValue) {
        showToast("الرجاء إدخال بيانات صحيحة لاسم المنتج، السعر، التاريخ والفئة.");
        return;
    }

    let categoryId = null; // Default to null for categoryId
    let categoryName;

    // Determine categoryName and categoryId based on whether it's a custom ID or a default name
    const foundCustomCategory = appState.categories[selectedCategoryValue];
    if (foundCustomCategory) {
        categoryName = foundCustomCategory.name;
        categoryId = foundCustomCategory.id; // It's a custom category, use its ID
    } else {
        // It's a default category name (like 'أخرى') or an unrecognized value
        categoryName = selectedCategoryValue;
        // categoryId remains null for default categories
    }

    const expenseData = {
        name,
        price,
        date,
        category: categoryName, // Always store category name
        categoryId: categoryId, // Store category ID if it's a custom one, otherwise null
        timestamp: new Date().getTime()
    };

    toggleLoading(true, appState.isEditingExpense ? 'جاري تحديث المصروف...' : 'جاري إضافة المصروف...');

    try {
        if (appState.isEditingExpense) {
            await updateDoc(doc(expensesCollectionRef, appState.editingExpenseId), expenseData);
            showToast("تم تحديث المصروف بنجاح.");
        } else {
            await addDoc(expensesCollectionRef, expenseData);
            showToast("تمت إضافة المصروف بنجاح.");
        }
        hideExpenseModal();
    } catch (error) {
        console.error("Error saving expense: ", error);
        showToast("حدث خطأ أثناء الحفظ.");
    } finally {
        toggleLoading(false);
    }
}

/**
 * Populates the expense modal with data for editing.
 * @param {string} id The ID of the expense to edit.
 */
function editExpense(id) {
    const expense = appState.expenses.find(e => e.id === id);
    if (expense) {
        showExpenseModal(expense);
    }
}

/**
 * Deletes an expense after confirmation.
 * @param {string} id The ID of the expense to delete.
 * @param {HTMLElement} element The DOM element representing the expense (for visual fade-out).
 */
async function deleteExpense(id, element) {
    const confirmed = await showConfirmModal("تأكيد الحذف", "هل أنت متأكد من حذف هذا المصروف؟");
    if (confirmed) {
        element.classList.add('fade-out');
        setTimeout(async () => {
            try {
                await deleteDoc(doc(expensesCollectionRef, id));
                showToast("تم حذف المصروف.");
            } catch (error) {
                console.error("Error deleting expense: ", error);
                showToast("حدث خطأ أثناء الحذف.");
                element.classList.remove('fade-out'); // Revert fade-out if error
            }
        }, 500); // Allow fade-out animation to play
    }
}

/**
 * Exports all user expense data to a JSON file.
 */
function exportData() {
    if (appState.expenses.length === 0) {
        showToast("لا توجد بيانات لتصديرها.");
        return;
    }
    const dataStr = JSON.stringify(appState.expenses.map(({id, ...rest}) => rest), null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `مصاريفي_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("تم بدء تصدير البيانات.");
}

/**
 * Triggers the file input for importing data.
 */
async function importData() {
    const confirmed = await showConfirmModal("استيراد البيانات", "سيتم إضافة المصاريف من الملف الحالي إلى بياناتك الموجودة. هل تريد المتابعة؟");
    if (confirmed) {
        importFileInput.click();
    }
}

/**
 * Handles the selected file for import, parses it, and adds expenses to Firestore in a batch.
 * @param {Event} event The change event from the file input.
 */
async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    try {
        const importedExpenses = JSON.parse(text);
        if (!Array.isArray(importedExpenses)) throw new Error("File is not a valid JSON array.");

        toggleLoading(true, 'جاري استيراد البيانات...');
        const batch = writeBatch(db);
        importedExpenses.forEach(exp => {
            const newDocRef = doc(expensesCollectionRef); // Create a new doc with a random ID
            batch.set(newDocRef, {
                ...exp,
                timestamp: exp.timestamp || new Date(exp.date).getTime() // Ensure timestamp exists
            });
        });
        await batch.commit();
        showToast(`تم استيراد ${importedExpenses.length} عنصر بنجاح.`);
    } catch (error) {
        console.error("Import failed: ", error);
        showToast("فشل استيراد الملف. تأكد من أن صيغته صحيحة.");
    } finally {
        importFileInput.value = ''; // Clear the input so same file can be selected again
        toggleLoading(false);
    }
}

/**
 * Clears all user expense data after confirmation.
 */
async function clearAllData() {
    const confirmed = await showConfirmModal("مسح جميع البيانات", "تحذير! سيتم حذف جميع بياناتك (مصاريف وفئات) بشكل نهائي. هل أنت متأكد؟");
    if (confirmed) {
        toggleLoading(true, 'جاري مسح جميع البيانات...');
        try {
            const expenseSnapshot = await getDocs(expensesCollectionRef);
            const categorySnapshot = await getDocs(categoriesCollectionRef);
            const batch = writeBatch(db);

            expenseSnapshot.docs.forEach(d => batch.delete(d.ref));
            categorySnapshot.docs.forEach(d => batch.delete(d.ref));

            await batch.commit();
            showToast("تم مسح جميع البيانات بنجاح.");
        } catch (error) {
            console.error("Error clearing data:", error);
            showToast("حدث خطأ أثناء مسح البيانات.");
        } finally {
            toggleLoading(false);
        }
    }
}

/**
 * Calculates contrast color (black or white) for a given hex color.
 * @param {string} hexcolor The hex color code (e.g., '#RRGGBB').
 * @returns {string} '#000000' for dark text, '#FFFFFF' for light text.
 */
function getContrastColor(hexcolor) {
    if (!hexcolor || hexcolor.length !== 7) return '#000000'; // Default to black
    const r = parseInt(hexcolor.substr(1, 2), 16);
    const g = parseInt(hexcolor.substr(3, 2), 16);
    const b = parseInt(hexcolor.substr(5, 2), 16);
    const y = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (y >= 128) ? '#000000' : '#FFFFFF';
}

/**
 * Renders the user's custom categories list.
 */
function renderUserCategories() {
    categoriesSkeleton.classList.remove('hidden');
    userCategoriesList.classList.add('hidden');
    emptyCategoriesState.classList.add('hidden');

    userCategoriesList.innerHTML = '';
    const categoriesArray = Object.values(appState.categories).sort((a, b) => a.name.localeCompare(b.name));

    if (categoriesArray.length === 0) {
        categoriesSkeleton.classList.add('hidden');
        emptyCategoriesState.classList.remove('hidden');
    } else {
        categoriesSkeleton.classList.add('hidden'); // Hide skeleton before rendering list
        categoriesArray.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.dataset.id = cat.id;

            const categoryBadgeStyle = `background-color: ${cat.color}; color: ${getContrastColor(cat.color)};`;

            item.innerHTML = `
                <div class="name flex items-center">
                    <span class="w-4 h-4 rounded-full ml-2" style="background-color: ${cat.color};"></span>
                    ${cat.name}
                </div>
                <div class="actions flex items-center">
                    <button class="edit-btn text-blue-500 hover:text-blue-700 p-1 rounded-full"><i data-lucide="edit" class="w-5 h-5 pointer-events-none"></i></button>
                    <button class="delete-btn text-red-500 hover:text-red-700 ml-2 p-1 rounded-full"><i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i></button>
                </div>
            `;
            item.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                editCategory(cat.id);
            });
            item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCategory(cat.id, item);
            });
            userCategoriesList.appendChild(item);
        });
        userCategoriesList.classList.remove('hidden');
    }
    lucide.createIcons();
}

/**
 * Adds a new category or updates an existing one.
 */
async function addOrUpdateCategory() {
    const name = categoryNameInput.value.trim();
    let color = categoryColorInput.value;
    if (!name) {
        showToast("الرجاء إدخال اسم الفئة.");
        return;
    }

    if (color === '#000000') { // If user didn't pick a color (still black default)
        color = getRandomCategoryColor();
    }

    toggleLoading(true, appState.isEditingCategory ? 'جاري تحديث الفئة...' : 'جاري إضافة الفئة...');

    try {
        if (appState.isEditingCategory) {
            await updateDoc(doc(categoriesCollectionRef, appState.editingCategoryId), { name, color });
            showToast("تم تحديث الفئة بنجاح.");
        } else {
            // Check for duplicate category name before adding
            const existingCategory = Object.values(appState.categories).find(cat => cat.name === name);
            if (existingCategory) {
                showToast("هذه الفئة موجودة بالفعل.");
                return;
            }

            await addDoc(categoriesCollectionRef, {
                name: name,
                color: color,
                timestamp: new Date().getTime()
            });
            showToast("تمت إضافة الفئة بنجاح.");
        }
        cancelCategoryEdit();
    } catch (error) {
        console.error("Error saving category: ", error);
        showToast("حدث خطأ أثناء الحفظ.");
    } finally {
        toggleLoading(false);
    }
}

/**
 * Populates the category form for editing.
 * @param {string} id The ID of the category to edit.
 */
function editCategory(id) {
    const category = appState.categories[id];
    if (category) {
        appState.isEditingCategory = true;
        appState.editingCategoryId = id;
        categoryNameInput.value = category.name;
        categoryColorInput.value = category.color;
        addCategoryBtn.innerHTML = `<i data-lucide="edit" class="inline-block align-middle ml-2"></i> تحديث`;
        addCategoryBtn.classList.add('primary-button'); // Ensure primary button style
        cancelCategoryEditBtn.classList.remove('hidden');
        lucide.createIcons();
    }
}

/**
 * Resets the category form.
 */
function cancelCategoryEdit() {
    appState.isEditingCategory = false;
    appState.editingCategoryId = null;
    categoryNameInput.value = '';
    categoryColorInput.value = '#000000'; // Reset color picker to black
    addCategoryBtn.innerHTML = `<i data-lucide="plus" class="inline-block align-middle ml-2"></i> إضافة فئة`;
    addCategoryBtn.classList.add('primary-button'); // Ensure primary button style
    cancelCategoryEditBtn.classList.add('hidden');
    lucide.createIcons();
}

/**
 * Deletes a category after confirmation.
 * @param {string} id The ID of the category to delete.
 * @param {HTMLElement} element The DOM element representing the category.
 */
async function deleteCategory(id, element) {
    const confirmed = await showConfirmModal("تأكيد الحذف", "هل أنت متأكد من حذف هذه الفئة؟ سيتم تغيير فئة المصاريف المرتبطة بها إلى 'أخرى'.");
    if (confirmed) {
        element.classList.add('fade-out');
        setTimeout(async () => {
            try {
                await deleteDoc(doc(categoriesCollectionRef, id));
                showToast("تم حذف الفئة بنجاح.");

                // Update expenses that used this category to 'أخرى'
                const batch = writeBatch(db);
                const expensesToUpdate = appState.expenses.filter(exp => exp.categoryId === id);
                expensesToUpdate.forEach(exp => {
                    batch.update(doc(expensesCollectionRef, exp.id), {
                        category: 'أخرى',
                        categoryId: null
                    });
                });
                await batch.commit();
            } catch (error) {
                console.error("Error deleting category: ", error);
                showToast("حدث خطأ أثناء الحذف.");
                element.classList.remove('fade-out');
            }
        }, 500);
    }
}

/**
 * Toggles dark mode on/off and saves the preference to local storage.
 */
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    darkModeToggle.checked = isDarkMode;
}

/**
 * Applies dark mode based on local storage preference.
 */
function applyDarkModePreference() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        darkModeToggle.checked = false;
    }
}

/**
 * Updates the settings page with user information.
 */
function updateSettingsPage() {
    if (auth.currentUser) {
        settingsUserAvatar.src = auth.currentUser.photoURL || 'https://i.pravatar.cc/40';
        settingsUserName.textContent = auth.currentUser.displayName || 'مستخدم';
        settingsUserEmail.textContent = auth.currentUser.email || 'لا يوجد بريد إلكتروني';
        displayUserId.textContent = userId;
    }
    applyDarkModePreference();
}

/**
 * Updates the offline banner visibility based on network status.
 */
function updateOfflineStatus() {
    appState.isOffline = !navigator.onLine;
    if (appState.isOffline) {
        offlineBanner.classList.remove('hidden');
    } else {
        offlineBanner.classList.add('hidden');
    }
}

/**
 * Generates a spending analysis using Gemini API.
 */
async function generateSpendingAnalysis() {
    // Show loading spinner and hide placeholder/output
    analysisPlaceholder.classList.add('hidden');
    llmAnalysisOutput.classList.add('hidden');
    llmAnalysisLoading.classList.remove('hidden');
    generateAnalysisBtn.disabled = true; // Disable button during analysis

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenses = appState.expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const monthlyTotal = monthlyExpenses.reduce((sum, exp) => sum + exp.price, 0);
    const uniqueDays = [...new Set(monthlyExpenses.map(exp => exp.date))];
    const daysRecorded = uniqueDays.length;
    const dailyAverage = daysRecorded > 0 ? monthlyTotal / daysRecorded : 0;

    const categoryTotals = monthlyExpenses.reduce((acc, exp) => {
        const categoryInfo = appState.categories[exp.categoryId] || appState.defaultCategories[exp.category] || appState.defaultCategories['أخرى'];
        const categoryName = categoryInfo.name;
        acc[categoryName] = (acc[categoryName] || 0) + exp.price;
        return acc;
    }, {});

    // Prepare data for LLM
    let analysisInput = `بيانات إنفاق المستخدم للشهر الحالي (${appState.monthNames[currentMonth]} ${currentYear}):\n`;
    analysisInput += `الإجمالي الكلي للإنفاق: ${monthlyTotal.toFixed(2)} درهم إماراتي.\n`;
    analysisInput += `المتوسط اليومي للإنفاق: ${dailyAverage.toFixed(2)} درهم إماراتي.\n`;
    analysisInput += `فئات الإنفاق وتكاليفها:\n`;
    if (Object.keys(categoryTotals).length === 0) {
        analysisInput += "لا توجد مصاريف مسجلة لهذا الشهر بعد.\n";
    } else {
        Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .forEach(([category, total]) => {
                analysisInput += `- ${category}: ${total.toFixed(2)} درهم إماراتي.\n`;
            });
    }

    const prompt = `أنت مساعد مالي يقدم تحليلًا للإنفاق ونصائح بناءً على البيانات المقدمة.
    يرجى تقديم تحليل موجز وشخصي لإنفاق المستخدم لهذا الشهر، وتسليط الضوء على أبرز فئات الإنفاق، وتقديم نصيحتين أو ثلاث نصائح عملية لتحسين الإدارة المالية أو التوفير. استخدم اللغة العربية.
    إذا لم تكن هناك مصاريف، اطلب من المستخدم تسجيل بعض المصاريف.

    البيانات:
    ${analysisInput}`;

    try {
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        const apiKey = ""; // You must replace this with a real Gemini API key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const analysisText = result.candidates[0].content.parts[0].text;
            llmAnalysisOutput.innerHTML = analysisText.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
            llmAnalysisOutput.classList.remove('hidden');
        } else {
            console.error("Gemini API returned an unexpected structure:", result);
            llmAnalysisOutput.innerHTML = `<p class="text-red-500">عذرًا، لم أتمكن من إنشاء التحليل. يرجى المحاولة مرة أخرى.</p>`;
            llmAnalysisOutput.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        llmAnalysisOutput.innerHTML = `<p class="text-red-500">حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.</p>`;
        llmAnalysisOutput.classList.remove('hidden');
    } finally {
        llmAnalysisLoading.classList.add('hidden');
        generateAnalysisBtn.disabled = false;
    }
}


// --- Firebase Initialization and Auth State Management ---

/**
 * Sets up Firestore listeners for expenses and categories for the current user.
 * @param {string} uid The current user's UID.
 */
function setupFirestoreListeners(uid) {
    const appId = firebaseConfig.appId; 

    if (unsubscribeFromExpenses) unsubscribeFromExpenses();
    if (unsubscribeFromCategories) unsubscribeFromCategories();

    expensesCollectionRef = collection(db, 'artifacts', appId, 'users', uid, 'expenses');
    categoriesCollectionRef = collection(db, 'artifacts', appId, 'users', uid, 'categories');

    unsubscribeFromExpenses = onSnapshot(expensesCollectionRef, (snapshot) => {
        appState.expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (appState.currentTab === 'daily') {
            renderCurrentDateExpenses();
        }
        if (appState.currentTab === 'monthly') {
            updateMonthlySummary();
        }
        // Re-render category buttons in modal if it's open, to reflect any changes
        if (!expenseModal.classList.contains('hidden')) {
            renderCategoryButtons(appState.selectedCategoryIdForExpense);
        }
    }, (error) => {
        console.error("Error listening to expenses:", error);
        showToast("خطأ في الاتصال بقاعدة بيانات المصاريف.");
    });

    unsubscribeFromCategories = onSnapshot(categoriesCollectionRef, (snapshot) => {
        appState.categories = {};
        snapshot.docs.forEach(doc => {
            appState.categories[doc.id] = { id: doc.id, ...doc.data() };
        });
        if (appState.currentTab === 'categories') {
            renderUserCategories();
        }
        // Re-render category buttons in modal if it's open, to reflect any changes
        if (!expenseModal.classList.contains('hidden')) {
            renderCategoryButtons(appState.selectedCategoryIdForExpense);
        }
        if (appState.currentTab === 'monthly') {
            updateMonthlySummary();
        }
    }, (error) => {
        console.error("Error listening to categories:", error);
        showToast("خطأ في الاتصال بقاعدة بيانات الفئات.");
    });
}

/**
 * Initializes the application UI after successful authentication.
 * @param {object} user The authenticated Firebase user object.
 */
function initializeAppUi(user) {
    userId = user.uid;
    userAvatar.src = user.photoURL || 'https://i.pravatar.cc/40';
    userName.textContent = user.displayName || 'مستخدم';

    appScreen.classList.remove('hidden');
    authScreen.classList.add('hidden');
    toggleLoading(false);

    setupFirestoreListeners(userId);
    switchTab('daily');
}

/**
 * Resets the application UI to the unauthenticated state.
 */
function resetAppUi() {
    if (unsubscribeFromExpenses) unsubscribeFromExpenses();
    if (unsubscribeFromCategories) unsubscribeFromCategories();
    appState.expenses = [];
    appState.categories = {};
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    toggleLoading(false);
    renderCurrentDateExpenses(); // Clear displayed expenses
    updateMonthlySummary(); // Clear monthly summary
    renderUserCategories(); // Clear categories
}

// --- Event Listeners and Initial Setup ---
document.addEventListener('DOMContentLoaded', async () => {
    toggleLoading(true, 'جاري تهيئة التطبيق...');

    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
            toggleLoading(false);
            document.body.innerHTML = `<div class="h-screen w-screen flex flex-col justify-center items-center bg-red-100 text-red-800 p-8">
                <h1 class="text-2xl font-bold mb-4">خطأ في الإعدادات</h1>
                <p class="text-center">الرجاء استبدال بيانات تهيئة Firebase المؤقتة في ملف app.js بالبيانات الحقيقية لمشروعك.</p>
            </div>`;
            return;
        }

        onAuthStateChanged(auth, async user => {
            if (user) {
                initializeAppUi(user);
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (anonSignInError) {
                    console.error("Anonymous Sign-In Error:", anonSignInError);
                    showToast("فشل تسجيل الدخول التلقائي كمجهول.");
                    resetAppUi();
                }
            }
        });

    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        toggleLoading(false);
        showToast("فشل تهيئة التطبيق. تأكد من صحة إعدادات Firebase.");
        document.body.innerHTML = `<div class="h-screen w-screen flex flex-col justify-center items-center bg-red-100 text-red-800 p-8">
            <h1 class="text-2xl font-bold mb-4">خطأ في الإعدادات</h1>
            <p class="text-center">فشل تهيئة Firebase. تأكد من أن إعدادات مشروعك صحيحة.</p>
        </div>`;
        return;
    }

    applyDarkModePreference();

    // Set initial date for the daily view's date input
    const today = new Date();
    expenseDateInput.value = getDateStringFromWheels(today.getDate(), today.getMonth(), today.getFullYear());

    signInBtn.addEventListener('click', async () => {
        toggleLoading(true, 'جاري تسجيل الدخول...');
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Google Sign-In Error: ", error);
            showToast("فشل تسجيل الدخول باستخدام جوجل.");
        } finally {
            toggleLoading(false);
        }
    });

    signOutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showToast("تم تسجيل الخروج بنجاح.");
        }
        catch (error) {
            console.error("Sign-Out Error:", error);
            showToast("فشل تسجيل الخروج.");
        }
    });

    dailyTabBtn.addEventListener('click', () => switchTab('daily'));
    monthlyTabBtn.addEventListener('click', () => switchTab('monthly'));
    categoriesTabBtn.addEventListener('click', () => switchTab('categories'));
    settingsBtn.addEventListener('click', () => switchTab('settings'));

    openAddExpenseModalBtn.addEventListener('click', () => showExpenseModal());
    addExpenseFAB.addEventListener('click', () => showExpenseModal());

    saveExpenseBtn.addEventListener('click', addOrUpdateExpense);
    cancelExpenseModalBtn.addEventListener('click', hideExpenseModal);

    generateAnalysisBtn.addEventListener('click', generateSpendingAnalysis);

    confirmModalYes.addEventListener('click', handleConfirmYes);
    confirmModalNo.addEventListener('click', handleConfirmNo);

    addCategoryBtn.addEventListener('click', addOrUpdateCategory);
    cancelCategoryEditBtn.addEventListener('click', cancelCategoryEdit);

    // Add event listener for date input to update expenses when date changes
    expenseDateInput.addEventListener('change', renderCurrentDateExpenses);

    exportDataBtn.addEventListener('click', exportData);
    importDataBtn.addEventListener('click', importData);
    importFileInput.addEventListener('change', handleImportFile);
    clearAllDataBtn.addEventListener('click', clearAllData);
    darkModeToggle.addEventListener('change', toggleDarkMode);

    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
    updateOfflineStatus();

    lucide.createIcons();

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker: Registered'))
                .catch(err => console.log(`Service Worker: Error: ${err}`));
        });
    }
});
