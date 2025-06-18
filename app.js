import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase and application state variables
let app, auth, db;
let expensesCollectionRef;
let categoriesCollectionRef;
let userId;
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
    defaultCategories: { // Hardcoded default categories as fallback
        'طعام': { name: 'طعام', color: '#EF4444' }, // Red
        'مواصلات': { name: 'مواصلات', color: '#3B82F6' }, // Blue
        'فواتير': { name: 'فواتير', color: '#F59E0B' }, // Amber
        'تسوق': { name: 'تسوق', color: '#10B981' }, // Emerald
        'صحة': { name: 'صحة', color: '#8B5CF6' }, // Violet
        'ترفيه': { name: 'ترفيه', color: '#EC4899' }, // Pink
        'أخرى': { name: 'أخرى', color: '#6B7280' } // Gray
    },
    // Random color generation for new categories
    categoryColors: [
        '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981',
        '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
        '#EC4899', '#F43F5E'
    ]
};

// --- DOM Elements ---
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const signInBtn = document.getElementById('signInBtn'); // Changed from googleSignInBtn
const settingsBtn = document.getElementById('settingsBtn'); // New settings button
const signOutBtn = document.getElementById('signOutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const displayUserId = document.getElementById('displayUserId'); // To display UID

const dailyTabBtn = document.getElementById('dailyTabBtn');
const monthlyTabBtn = document.getElementById('monthlyTabBtn');
const categoriesTabBtn = document.getElementById('categoriesTabBtn'); // New tab
const dailyPage = document.getElementById('dailyPage');
const monthlyPage = document.getElementById('monthlyPage');
const categoriesPage = document.getElementById('categoriesPage'); // New page
const settingsPage = document.getElementById('settingsPage'); // New page

const expenseDateInput = document.getElementById('expenseDate'); // Date input on daily page
const addExpenseFAB = document.getElementById('addExpenseFAB'); // Floating Action Button for adding expense
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


const categoryNameInput = document.getElementById('categoryNameInput');
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
const modalExpenseDateInput = document.getElementById('modalExpenseDate');
const modalProductNameInput = document.getElementById('modalProductName');
const modalProductPriceInput = document.getElementById('modalProductPrice');
const modalCategorySelect = document.getElementById('modalCategorySelect');
const saveExpenseBtn = document.getElementById('saveExpenseBtn');
const cancelExpenseModalBtn = document.getElementById('cancelExpenseModalBtn');

// Confirmation Modal Elements
const confirmModal = document.getElementById('confirmModal');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmModalYes = document.getElementById('confirmModalYes');
const confirmModalNo = document.getElementById('confirmModalNo');
let confirmModalResolve; // To store the promise resolve function for the confirm modal

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
 * Gets a date string in 'YYYY-MM-DD' format.
 * @param {Date} date The date object.
 * @returns {string} Formatted date string.
 */
function getDateString(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
 * Suggests a category based on product name. Prioritizes user's custom categories.
 * @param {string} productName The name of the product.
 * @returns {string} The suggested category name.
 */
function suggestCategory(productName) {
    const lowerProductName = productName.toLowerCase();
    // First, try to match with user-defined categories
    for (const categoryId in appState.categories) {
        const category = appState.categories[categoryId];
        // For simplicity, matching directly with category name for now.
        // Could expand this to include keywords within category objects.
        if (lowerProductName.includes(category.name.toLowerCase())) {
            return category.name;
        }
    }

    // If no user-defined category matches, fall back to default categories
    for (const categoryName in appState.defaultCategories) {
        // Here, you would implement more sophisticated keyword matching if needed
        // For now, it's a simple check.
        if (appState.defaultCategories[categoryName].name.toLowerCase() === lowerProductName ||
            (lowerProductName.includes('قهوة') && categoryName === 'طعام') || // Example: coffee is food
            (lowerProductName.includes('فاتورة') && categoryName === 'فواتير') // Example: bill is bills
        ) {
            return appState.defaultCategories[categoryName].name;
        }
    }

    return 'أخرى'; // Default to 'Other' if no match
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
    // Deactivate all tabs and hide all pages
    const allTabs = [dailyTabBtn, monthlyTabBtn, categoriesTabBtn, settingsBtn]; // Include settingsBtn for its page
    const allPages = [dailyPage, monthlyPage, categoriesPage, settingsPage];

    allTabs.forEach(btn => btn.classList.remove('active'));
    allPages.forEach(page => page.classList.remove('active'));
    allPages.forEach(page => page.classList.add('hidden')); // Ensure pages are truly hidden initially

    // Activate the selected tab and show its page
    switch (tabName) {
        case 'daily':
            dailyTabBtn.classList.add('active');
            dailyPage.classList.remove('hidden');
            dailyPage.classList.add('active');
            renderCurrentDateExpenses();
            break;
        case 'monthly':
            monthlyTabBtn.classList.add('active');
            monthlyPage.classList.remove('hidden');
            monthlyPage.classList.add('active');
            updateMonthlySummary();
            break;
        case 'categories':
            categoriesTabBtn.classList.add('active');
            categoriesPage.classList.remove('hidden');
            categoriesPage.classList.add('active');
            renderUserCategories();
            break;
        case 'settings':
            // Settings button doesn't get 'active' class on purpose as it's not a main tab
            settingsPage.classList.remove('hidden');
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
        expensesForDate.forEach(exp => {
            total += exp.price;
            const item = document.createElement('div');
            item.className = 'expense-item';
            item.dataset.id = exp.id;

            const categoryInfo = appState.categories[exp.categoryId] || appState.defaultCategories[exp.category] || appState.defaultCategories['أخرى'];
            const categoryBadgeStyle = `background-color: ${categoryInfo.color}; color: ${getContrastColor(categoryInfo.color)};`;

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
        dailyExpensesSkeleton.classList.add('hidden');
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

    monthlyTotalDisplay.textContent = formatCurrency(monthlyTotal);
    dailyAverageDisplay.textContent = formatCurrency(dailyAverage);
    daysRecordedDisplay.textContent = daysRecorded;

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
                const li = document.createElement('li');
                const categoryColor = Object.values(appState.categories).find(cat => cat.name === categoryName)?.color || appState.defaultCategories[categoryName]?.color || appState.defaultCategories['أخرى'].color;
                li.innerHTML = `
                    <span class="flex items-center">
                        <span class="w-3 h-3 rounded-full mr-2" style="background-color: ${categoryColor};"></span>
                        ${categoryName}
                    </span>
                    <span class="font-semibold">${formatCurrency(total)}</span>
                `;
                topCategoriesList.appendChild(li);
            });
    }

    monthlySummarySkeleton.classList.add('hidden');
    monthlyContent.classList.remove('hidden');
}

/**
 * Shows the expense modal for adding or editing an expense.
 * @param {object|null} expenseData The expense data to pre-fill the form, or null for a new expense.
 */
function showExpenseModal(expenseData = null) {
    appState.isEditingExpense = !!expenseData;
    appState.editingExpenseId = expenseData ? expenseData.id : null;
    expenseModalTitle.textContent = appState.isEditingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد';

    modalExpenseDateInput.value = expenseData ? expenseData.date : getDateString(new Date());
    modalProductNameInput.value = expenseData ? expenseData.name : '';
    modalProductPriceInput.value = expenseData ? expenseData.price : '';

    populateCategorySelect(expenseData ? (expenseData.categoryId || expenseData.category) : null); // Pre-select category

    expenseModal.classList.remove('hidden');
    // Set focus to the first input in the modal for accessibility
    modalExpenseDateInput.focus();
}

/**
 * Hides the expense modal and resets the form.
 */
function hideExpenseModal() {
    expenseModal.classList.add('hidden');
    appState.isEditingExpense = false;
    appState.editingExpenseId = null;
    modalProductNameInput.value = '';
    modalProductPriceInput.value = '';
    modalExpenseDateInput.value = getDateString(new Date()); // Reset to current date
    modalCategorySelect.innerHTML = ''; // Clear categories
}

/**
 * Populates the category select dropdown in the expense modal.
 * @param {string} selectedCategoryValue The ID or name of the category to pre-select.
 */
function populateCategorySelect(selectedCategoryValue) {
    modalCategorySelect.innerHTML = ''; // Clear existing options

    const categoriesArray = Object.values(appState.categories).sort((a, b) => a.name.localeCompare(b.name));

    // Add user-defined categories first
    categoriesArray.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id; // Store category ID as value
        option.textContent = cat.name;
        if (selectedCategoryValue && (selectedCategoryValue === cat.id || selectedCategoryValue === cat.name)) {
            option.selected = true;
        }
        modalCategorySelect.appendChild(option);
    });

    // Add a separator or 'Default Categories' heading if needed, then add default ones
    const defaultOptionGroup = document.createElement('optgroup');
    defaultOptionGroup.label = "الفئات الافتراضية";
    Object.values(appState.defaultCategories).forEach(cat => {
        // Skip default if a user-defined category with the same name exists
        if (categoriesArray.some(userCat => userCat.name === cat.name)) {
            return;
        }
        const option = document.createElement('option');
        option.value = cat.name; // Use name for default categories
        option.textContent = cat.name;
        if (selectedCategoryValue && selectedCategoryValue === cat.name) {
            option.selected = true;
        }
        defaultOptionGroup.appendChild(option);
    });
    modalCategorySelect.appendChild(defaultOptionGroup);

    // If no category was selected, try to pre-select 'أخرى'
    if (!selectedCategoryValue && modalCategorySelect.querySelector('option[value="أخرى"]')) {
        modalCategorySelect.value = 'أخرى';
    } else if (!selectedCategoryValue && modalCategorySelect.options.length > 0) {
        modalCategorySelect.selectedIndex = 0; // Select the first available option
    }
}


/**
 * Adds a new expense or updates an existing one.
 */
async function addOrUpdateExpense() {
    const name = modalProductNameInput.value.trim();
    const price = parseFloat(modalProductPriceInput.value);
    const date = modalExpenseDateInput.value;
    const selectedCategoryValue = modalCategorySelect.value;

    if (!name || isNaN(price) || price <= 0 || !date || !selectedCategoryValue) {
        showToast("الرجاء إدخال بيانات صحيحة لاسم المنتج، السعر، التاريخ والفئة.");
        return;
    }

    let categoryId = selectedCategoryValue;
    let categoryName = selectedCategoryValue; // Default to value, will be updated if it's an ID

    // Check if the selected value is an ID (user-defined category)
    const foundCategory = Object.values(appState.categories).find(cat => cat.id === selectedCategoryValue);
    if (foundCategory) {
        categoryName = foundCategory.name;
    } else {
        // It's a default category name
        categoryId = null; // No specific ID for default categories
    }

    const expenseData = {
        name,
        price,
        date,
        category: categoryName, // Store category name (for backwards compatibility/simplicity)
        categoryId: categoryId, // Store category ID if it's a custom one
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
        categoriesSkeleton.classList.add('hidden');
        userCategoriesList.classList.remove('hidden');
    }
    lucide.createIcons();
}

/**
 * Adds a new category or updates an existing one.
 */
async function addOrUpdateCategory() {
    const name = categoryNameInput.value.trim();
    if (!name) {
        showToast("الرجاء إدخال اسم الفئة.");
        return;
    }

    toggleLoading(true, appState.isEditingCategory ? 'جاري تحديث الفئة...' : 'جاري إضافة الفئة...');

    try {
        if (appState.isEditingCategory) {
            await updateDoc(doc(categoriesCollectionRef, appState.editingCategoryId), { name });
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
                color: getRandomCategoryColor(), // Assign a random color
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
        addCategoryBtn.innerHTML = `<i data-lucide="edit" class="inline-block align-middle ml-2"></i> تحديث`;
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
    addCategoryBtn.innerHTML = `<i data-lucide="plus" class="inline-block align-middle ml-2"></i> إضافة فئة`;
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
                        categoryId: null // Remove categoryId reference
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
    darkModeToggle.checked = isDarkMode; // Update toggle state
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
    applyDarkModePreference(); // Ensure dark mode toggle reflects current state
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

// --- Firebase Initialization and Auth State Management ---

/**
 * Sets up Firestore listeners for expenses and categories for the current user.
 * @param {string} uid The current user's UID.
 */
function setupFirestoreListeners(uid) {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Unsubscribe from previous listeners if they exist
    if (unsubscribeFromExpenses) unsubscribeFromExpenses();
    if (unsubscribeFromCategories) unsubscribeFromCategories();

    // Define collection references with the specific path
    expensesCollectionRef = collection(db, 'artifacts', appId, 'users', uid, 'expenses');
    categoriesCollectionRef = collection(db, 'artifacts', appId, 'users', uid, 'categories');

    // Listen for real-time updates to expenses
    unsubscribeFromExpenses = onSnapshot(expensesCollectionRef, (snapshot) => {
        appState.expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Only render/update if the corresponding tab is active
        if (appState.currentTab === 'daily') {
            renderCurrentDateExpenses();
        }
        if (appState.currentTab === 'monthly') {
            updateMonthlySummary();
        }
    }, (error) => {
        console.error("Error listening to expenses:", error);
        showToast("خطأ في الاتصال بقاعدة بيانات المصاريف.");
    });

    // Listen for real-time updates to categories
    unsubscribeFromCategories = onSnapshot(categoriesCollectionRef, (snapshot) => {
        appState.categories = {}; // Clear existing categories
        snapshot.docs.forEach(doc => {
            appState.categories[doc.id] = { id: doc.id, ...doc.data() };
        });
        // Only render/update if the corresponding tab is active
        if (appState.currentTab === 'categories') {
            renderUserCategories();
        }
        // Also update modal category select if open
        if (!expenseModal.classList.contains('hidden')) {
            populateCategorySelect(modalCategorySelect.value); // Re-populate, keeping current selection if possible
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
    userId = user.uid; // Store the authenticated user's ID
    userAvatar.src = user.photoURL || 'https://i.pravatar.cc/40';
    userName.textContent = user.displayName || 'مستخدم';

    appScreen.classList.remove('hidden');
    authScreen.classList.add('hidden');
    toggleLoading(false); // Hide loading overlay

    setupFirestoreListeners(userId); // Start listening to user's data
    switchTab('daily'); // Go to daily view by default
}

/**
 * Resets the application UI to the unauthenticated state.
 */
function resetAppUi() {
    if (unsubscribeFromExpenses) unsubscribeFromExpenses();
    if (unsubscribeFromCategories) unsubscribeFromCategories();
    appState.expenses = [];
    appState.categories = {}; // Clear categories on logout
    appScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    toggleLoading(false); // Hide loading overlay
    renderCurrentDateExpenses(); // Clear displayed expenses
    updateMonthlySummary(); // Clear monthly summary
    renderUserCategories(); // Clear categories list
}

// --- Event Listeners and Initial Setup ---
document.addEventListener('DOMContentLoaded', async () => {
    // Initial loading state
    toggleLoading(true, 'جاري تهيئة التطبيق...');

    // Get Firebase config from global variable provided by Canvas environment
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    if (!firebaseConfig) {
        toggleLoading(false);
        document.body.innerHTML = `<div class="h-screen w-screen flex flex-col justify-center items-center bg-red-100 text-red-800 p-8">
            <h1 class="text-2xl font-bold mb-4">خطأ في الإعدادات</h1>
            <p class="text-center">الرجاء توفير تهيئة Firebase الصحيحة (عبر __firebase_config).</p>
        </div>`;
        return;
    }

    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Listen for authentication state changes
        onAuthStateChanged(auth, async user => {
            if (user) {
                // Check if it's the initial auth check completion
                if (!appState.isAuthReady) {
                    appState.isAuthReady = true; // Mark auth as ready
                    initializeAppUi(user);
                }
            } else {
                // If no user, and it's the initial auth check, try to sign in anonymously if no token
                if (!appState.isAuthReady) {
                    appState.isAuthReady = true; // Mark auth as ready regardless of sign-in method
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(auth, initialAuthToken);
                        } else {
                            await signInAnonymously(auth);
                        }
                    } catch (signInError) {
                        console.error("Authentication failed:", signInError);
                        showToast("فشل تسجيل الدخول التلقائي.");
                        resetAppUi(); // Show auth screen if auto-sign-in fails
                    }
                } else {
                    resetAppUi(); // User logged out or auto-sign-in failed after being ready
                }
            }
        });

    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        toggleLoading(false);
        showToast("فشل تهيئة التطبيق. تأكد من صحة إعدادات Firebase.");
        // Display an error message to the user directly on the page
        document.body.innerHTML = `<div class="h-screen w-screen flex flex-col justify-center items-center bg-red-100 text-red-800 p-8">
            <h1 class="text-2xl font-bold mb-4">خطأ في الإعدادات</h1>
            <p class="text-center">فشل تهيئة Firebase. تأكد من أن إعدادات مشروعك صحيحة.</p>
        </div>`;
        return;
    }

    // Apply dark mode preference on load
    applyDarkModePreference();

    // Set initial date input to today's date
    expenseDateInput.value = getDateString(new Date());

    // --- Core UI Event Listeners ---
    signInBtn.addEventListener('click', async () => {
        toggleLoading(true, 'جاري تسجيل الدخول...');
        try {
            // Since we're using custom token/anonymous, this button would typically not be for Google Sign-In pop-up
            // For a production app, you'd integrate actual Google Sign-In with your Firebase project
            // For Canvas, it's handled by __initial_auth_token.
            showToast("تسجيل الدخول يتم تلقائيًا عبر البيئة.", 5000);
            toggleLoading(false);
            // If you still want a "sign in" button for an unauthenticated state when __initial_auth_token isn't available,
            // you'd call signInAnonymously() here or prompt for a real Google Sign-In method if configured.
            await signInAnonymously(auth); // Fallback if no token was available initially
        } catch (error) {
            console.error("Sign-In Error: ", error);
            showToast("فشل تسجيل الدخول. الرجاء المحاولة مرة أخرى.");
            toggleLoading(false);
        }
    });

    signOutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showToast("تم تسجيل الخروج بنجاح.");
        } catch (error) {
            console.error("Sign-Out Error:", error);
            showToast("فشل تسجيل الخروج.");
        }
    });

    // Tab Navigation
    dailyTabBtn.addEventListener('click', () => switchTab('daily'));
    monthlyTabBtn.addEventListener('click', () => switchTab('monthly'));
    categoriesTabBtn.addEventListener('click', () => switchTab('categories'));
    settingsBtn.addEventListener('click', () => switchTab('settings'));

    // Daily Page Expense Input
    expenseDateInput.addEventListener('change', renderCurrentDateExpenses);
    addExpenseFAB.addEventListener('click', () => showExpenseModal()); // Show modal on FAB click

    // Expense Modal Buttons
    saveExpenseBtn.addEventListener('click', addOrUpdateExpense);
    cancelExpenseModalBtn.addEventListener('click', hideExpenseModal);

    // Confirmation Modal Buttons
    confirmModalYes.addEventListener('click', handleConfirmYes);
    confirmModalNo.addEventListener('click', handleConfirmNo);

    // Category Management
    addCategoryBtn.addEventListener('click', addOrUpdateCategory);
    cancelCategoryEditBtn.addEventListener('click', cancelCategoryEdit);

    // Settings Page
    exportDataBtn.addEventListener('click', exportData);
    importDataBtn.addEventListener('click', importData);
    importFileInput.addEventListener('change', handleImportFile); // Hidden input for file selection
    clearAllDataBtn.addEventListener('click', clearAllData);
    darkModeToggle.addEventListener('change', toggleDarkMode); // Dark mode toggle

    // Offline status detection
    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
    updateOfflineStatus(); // Initial check

    // Initialize Lucide icons
    lucide.createIcons();

    // Service Worker registration (existing logic)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker: Registered'))
                .catch(err => console.log(`Service Worker: Error: ${err}`));
        });
    }
});

