// =================================================================
// Expense App - Professional JavaScript - Bulletproof Loading & Auth
// =================================================================

// --- 1. Firebase Setup (Integrated Directly) ---
const firebaseConfig = {
    apiKey: "AIzaSyCD6TOeIO7g6RGp89YtA1maduwMfyTE1VQ",
    authDomain: "my-expenses-81714.firebaseapp.com",
    projectId: "my-expenses-81714",
    storageBucket: "my-expenses-81714.firebasestorage.app",
    messagingSenderId: "672207051964",
    appId: "1:672207051964:web:b6e0cedc143bd06fd584b9",
    measurementId: "G-YBTY3QD4YQ"
};

// Global variables for Firebase services
let app, auth, db;

// --- 2. State Management ---
const state = {
    user: null,
    expenses: [],
    categories: [],
    currentPage: 'daily',
    isLoading: true,
    isEditing: null,
    unsubscribe: [],

    setState(newState) {
        Object.assign(this, newState);
        ui.render(this);
    },
    
    cleanupListeners() {
        this.unsubscribe.forEach(unsub => unsub());
        this.unsubscribe = [];
    }
};

// --- 3. UI Rendering & DOM Elements ---
const ui = {
    elements: {
        loadingScreen: document.getElementById('loading-screen'),
        loadingText: document.querySelector('#loading-screen p'),
        authScreen: document.getElementById('auth-screen'),
        mainApp: document.getElementById('main-app'),
        mainContent: document.getElementById('main-content'),
        googleSigninBtn: document.getElementById('google-signin-btn'),
        anonSigninBtn: document.getElementById('anon-signin-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        userAvatar: document.getElementById('user-avatar'),
        userName: document.getElementById('user-name'),
        userEmail: document.getElementById('user-email'),
        navButtons: document.querySelectorAll('.nav-btn'),
        fabAddExpense: document.getElementById('fab-add-expense'),
        modalBackdrop: document.getElementById('modal-backdrop'),
        expenseModal: document.getElementById('expense-modal'),
        expenseModalTitle: document.getElementById('expense-modal-title'),
        expenseNameInput: document.getElementById('expense-name'),
        expenseAmountInput: document.getElementById('expense-amount'),
        expenseCategorySelect: document.getElementById('expense-category'),
        saveExpenseBtn: document.getElementById('save-expense-btn'),
        cancelExpenseBtn: document.getElementById('cancel-expense-btn'),
        toast: document.getElementById('toast'),
        toastIcon: document.getElementById('toast-icon'),
        toastMessage: document.getElementById('toast-message'),
        offlineIndicator: document.getElementById('offline-indicator'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmTitle: document.getElementById('confirm-title'),
        confirmMessage: document.getElementById('confirm-message'),
        confirmYesBtn: document.getElementById('confirm-yes-btn'),
        confirmNoBtn: document.getElementById('confirm-no-btn'),
    },
    
    defaultAvatarSVG: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xOCAyMHYtMWMwLTIuMi0xLjgtNC00LTRoLTRjLTIuMiAwLTQgMS44LTQgNHYxIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+",

    render(appState) {
        this.elements.loadingScreen.classList.toggle('hidden', !appState.isLoading);
        this.elements.authScreen.classList.toggle('hidden', !!appState.user || appState.isLoading);
        this.elements.mainApp.classList.toggle('hidden', !appState.user || appState.isLoading);
        
        if (appState.user && !appState.isLoading) {
            this.updateHeader(appState.user);
            this.renderPage(appState.currentPage, appState);
        }
    },
    
    updateHeader(user) {
        this.elements.userAvatar.src = user.photoURL || this.defaultAvatarSVG;
        this.elements.userName.textContent = user.isAnonymous ? 'مستخدم مجهول' : (user.displayName || 'مستخدم جديد');
        this.elements.userEmail.textContent = user.isAnonymous ? `ID: ${user.uid.slice(0,6)}...` : user.email;
    },

    renderPage(pageName, appState) {
        this.elements.mainContent.innerHTML = '';
        let pageContent;
        switch (pageName) {
            case 'daily': pageContent = this.createDailyPage(appState); break;
            case 'monthly': pageContent = this.createMonthlyPage(appState); break;
            case 'categories': pageContent = this.createCategoriesPage(appState); break;
            case 'settings': pageContent = this.createSettingsPage(appState); break;
            default: pageContent = document.createElement('div');
        }
        this.elements.mainContent.appendChild(pageContent);
        lucide.createIcons();
    },
    
    // --- All page creation and UI helper functions below are unchanged ---
    createDailyPage({ expenses, categories }) { const page = document.createElement('div'); page.className = 'page active'; const today = new Date().toISOString().slice(0, 10); const dailyExpenses = expenses.filter(e => e.date === today).sort((a,b) => b.createdAt.seconds - a.createdAt.seconds); const total = dailyExpenses.reduce((sum, e) => sum + e.amount, 0); page.innerHTML = `<div class="card"><h3><i data-lucide="sun"></i>مصروفات اليوم</h3><p class="amount">${utils.formatCurrency(total)}</p></div><div id="daily-list" class="item-list"></div>`; const list = page.querySelector('#daily-list'); if (dailyExpenses.length > 0) { dailyExpenses.forEach(expense => list.appendChild(this.createExpenseItem(expense, categories))); } else { list.innerHTML = `<p class="empty-state">لا توجد مصروفات مسجلة اليوم.</p>`; } return page; },
    createMonthlyPage({ expenses, categories }) { const page = document.createElement('div'); page.className = 'page active'; const now = new Date(); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10); const monthlyExpenses = expenses.filter(e => e.date >= startOfMonth && e.date <= endOfMonth); const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0); const categoryTotals = {}; monthlyExpenses.forEach(exp => { categoryTotals[exp.categoryId] = (categoryTotals[exp.categoryId] || 0) + exp.amount; }); const sortedCategories = Object.entries(categoryTotals).sort(([,a],[,b]) => b - a); page.innerHTML = `<div class="card"><h3><i data-lucide="calendar-month"></i>ملخص الشهر</h3><p class="amount">${utils.formatCurrency(total)}</p></div><div class="card"><h3><i data-lucide="pie-chart"></i>الأعلى إنفاقًا</h3><div id="monthly-category-list" class="item-list"></div></div>`; const catList = page.querySelector('#monthly-category-list'); if (sortedCategories.length > 0) { sortedCategories.forEach(([catId, catTotal]) => { const category = categories.find(c => c.id === catId); if(category) { const percentage = total > 0 ? (catTotal / total) * 100 : 0; catList.innerHTML += `<div class="category-summary-item"><span>${category.name}</span><div class="progress-bar"><div class="progress-fill" style="width:${percentage}%; background-color:${category.color};"></div></div><span>${utils.formatCurrency(catTotal)}</span></div>`; } }); } else { catList.innerHTML = `<p class="empty-state">لا توجد بيانات لهذا الشهر.</p>`; } return page; },
    createCategoriesPage({ categories }) { const page = document.createElement('div'); page.className = 'page active'; page.innerHTML = `<div class="card"><h3><i data-lucide="tags"></i>إدارة الفئات</h3><div class="form-group"><input type="text" id="new-category-name" placeholder="اسم الفئة الجديدة"><input type="color" id="new-category-color" value="#4f46e5"></div><button id="add-category-btn" class="btn btn-primary" style="width: 100%; margin-top: var(--space-md);">إضافة فئة</button></div><div id="category-list" class="item-list"></div>`; const list = page.querySelector('#category-list'); if (categories.length > 0) { categories.forEach(cat => list.appendChild(this.createCategoryItem(cat))); } else { list.innerHTML = `<p class="empty-state">لا توجد فئات. أضف فئة لتبدأ.</p>`; } return page; },
    createSettingsPage() { const page = document.createElement('div'); page.className = 'page active'; page.innerHTML = `<div class="card"><h3><i data-lucide="settings"></i>الإعدادات</h3><button id="clear-data-btn" class="btn btn-danger" style="width: 100%;">مسح جميع البيانات</button></div>`; return page; },
    createExpenseItem(expense, categories) { const item = document.createElement('div'); item.className = 'expense-item'; const category = categories.find(c => c.id === expense.categoryId) || { name: 'غير محدد', color: '#9ca3af' }; item.innerHTML = `<div class="item-icon" style="background-color: ${category.color};"><i data-lucide="tag"></i></div><div class="item-details"><p class="item-name">${utils.escapeHTML(expense.name)}</p><p class="item-category">${utils.escapeHTML(category.name)}</p></div><p class="item-amount">${utils.formatCurrency(expense.amount)}</p><div class="item-actions"><button class="btn-icon edit-expense" data-id="${expense.id}"><i data-lucide="edit-3"></i></button><button class="btn-icon delete-expense" data-id="${expense.id}"><i data-lucide="trash-2"></i></button></div>`; return item; },
    createCategoryItem(category) { const item = document.createElement('div'); item.className = 'category-item'; item.innerHTML = `<div class="item-icon" style="background-color: ${category.color};"></div><div class="item-details"><p class="item-name">${utils.escapeHTML(category.name)}</p></div><div class="item-actions"><button class="btn-icon delete-category" data-id="${category.id}"><i data-lucide="trash-2"></i></button></div>`; return item; },
    toggleModal(modal, show) { this.elements.modalBackdrop.classList.toggle('hidden', !show); modal.classList.toggle('hidden', !show); },
    setupExpenseModal(expense, categories) { state.isEditing = expense ? { type: 'expense', id: expense.id } : null; this.elements.expenseModalTitle.textContent = expense ? 'تعديل المصروف' : 'إضافة مصروف'; this.elements.expenseNameInput.value = expense ? expense.name : ''; this.elements.expenseAmountInput.value = expense ? expense.amount : ''; if (categories.length === 0) { this.elements.expenseCategorySelect.innerHTML = `<option disabled>لا توجد فئات</option>`; } else { this.elements.expenseCategorySelect.innerHTML = categories.map(c => `<option value="${c.id}" ${expense && expense.categoryId === c.id ? 'selected' : ''}>${utils.escapeHTML(c.name)}</option>`).join(''); } this.toggleModal(this.elements.expenseModal, true); },
    showToast(message, type = 'success', duration = 3000) { const { toast, toastMessage, toastIcon } = this.elements; toast.className = ``; toast.classList.add(type, 'show'); toastMessage.textContent = message; toastIcon.setAttribute('data-lucide', type === 'error' ? 'x-circle' : 'check-circle'); lucide.createIcons(); setTimeout(() => toast.classList.remove('show'), duration); },
    showConfirmation(title, message, onConfirm) { this.elements.confirmTitle.textContent = title; this.elements.confirmMessage.textContent = message; this.toggleModal(this.elements.confirmModal, true); const yesHandler = () => { onConfirm(); cleanup(); }; const noHandler = () => cleanup(); const cleanup = () => { this.toggleModal(this.elements.confirmModal, false); this.elements.confirmYesBtn.removeEventListener('click', yesHandler); this.elements.confirmNoBtn.removeEventListener('click', noHandler); }; this.elements.confirmYesBtn.addEventListener('click', yesHandler, { once: true }); this.elements.confirmNoBtn.addEventListener('click', noHandler, { once: true }); },
    handleTheme(isDark) { document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light'); this.elements.themeToggleBtn.innerHTML = isDark ? `<i data-lucide="sun"></i>` : `<i data-lucide="moon"></i>`; lucide.createIcons(); }
};

// --- 4. API & Data Logic (Unchanged) ---
const api = {
    expensesCol: (uid) => db.collection('users').doc(uid).collection('expenses'),
    categoriesCol: (uid) => db.collection('users').doc(uid).collection('categories'),
    addExpense: (uid, expense) => api.expensesCol(uid).add({ ...expense, createdAt: firebase.firestore.FieldValue.serverTimestamp(), date: new Date().toISOString().slice(0, 10) }),
    updateExpense: (uid, id, expense) => api.expensesCol(uid).doc(id).update(expense),
    deleteExpense: (uid, id) => api.expensesCol(uid).doc(id).delete(),
    addCategory: (uid, category) => api.categoriesCol(uid).add(category),
    deleteCategory: (uid, id) => api.categoriesCol(uid).doc(id).delete(),
    async deleteAllUserData(uid) { const expensesQuery = await this.expensesCol(uid).get(); const categoriesQuery = await this.categoriesCol(uid).get(); const batch = db.batch(); expensesQuery.forEach(doc => batch.delete(doc.ref)); categoriesQuery.forEach(doc => batch.delete(doc.ref)); return batch.commit(); },
    listenToExpenses: (uid, callback) => api.expensesCol(uid).orderBy('createdAt', 'desc').onSnapshot(snapshot => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
    listenToCategories: (uid, callback) => api.categoriesCol(uid).onSnapshot(snapshot => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
    async ensureDefaultCategories(uid, currentCategories) { if (currentCategories.length > 0) return; const defaultCats = [{ name: 'طعام', color: '#ef4444' }, { name: 'مواصلات', color: '#3b82f6' }, { name: 'فواتير', color: '#f97316' }, { name: 'تسوق', color: '#10b981' },]; for (const cat of defaultCats) { await this.addCategory(uid, cat); } }
};

// --- 5. Authentication Logic ---
const authLogic = {
    init() {
        try {
            auth.onAuthStateChanged(user => {
                state.cleanupListeners();
                if (user) {
                    const unsubExpenses = api.listenToExpenses(user.uid, expenses => state.setState({ expenses }));
                    const unsubCategories = api.listenToCategories(user.uid, categories => {
                        api.ensureDefaultCategories(user.uid, categories);
                        state.setState({ categories });
                    });
                    state.unsubscribe.push(unsubExpenses, unsubCategories);
                    state.setState({ user: user, isLoading: false });
                } else {
                    state.setState({ user: null, expenses: [], categories: [], isLoading: false });
                }
            });
        } catch (error) {
            console.error("Auth observer setup failed:", error);
            ui.elements.loadingText.textContent = "خطأ في المصادقة. حاول تحديث الصفحة.";
            // We don't set isLoading to false, so the user stays on the loading screen with an error.
        }
    },

    signInWithGoogle: () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(err => ui.showToast("فشل تسجيل الدخول", "error")),
    signInAnonymously: () => auth.signInAnonymously().catch(err => ui.showToast("فشل تسجيل الدخول كمجهول", "error")),
    signOut: () => auth.signOut().catch(err => ui.showToast("فشل تسجيل الخروج", "error")),
};

// --- 6. Utilities (Unchanged) ---
const utils = {
    formatCurrency: (amount) => new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED' }).format(amount || 0),
    escapeHTML: (str) => str.replace(/[&<>'"]/g, tag => ({'&':'&', '<':'<', '>':'>', "'":''', '"':'"'}[tag] || tag)),
};

// --- 7. Event Handlers & Business Logic ---
function setupEventListeners() {
    const { elements } = ui;
    elements.googleSigninBtn.addEventListener('click', authLogic.signInWithGoogle);
    elements.anonSigninBtn.addEventListener('click', authLogic.signInAnonymously);
    elements.logoutBtn.addEventListener('click', authLogic.signOut);
    
    // ... [ The rest of the event listeners are identical to the previous version ] ...
    elements.navButtons.forEach(btn => btn.addEventListener('click', () => { elements.navButtons.forEach(b => b.classList.remove('active')); btn.classList.add('active'); state.setState({ currentPage: btn.dataset.page }); }));
    elements.themeToggleBtn.addEventListener('click', () => { const isDark = document.documentElement.getAttribute('data-theme') === 'dark'; localStorage.setItem('theme', !isDark ? 'dark' : 'light'); ui.handleTheme(!isDark); });
    elements.fabAddExpense.addEventListener('click', () => ui.setupExpenseModal(null, state.categories));
    elements.cancelExpenseBtn.addEventListener('click', () => ui.toggleModal(elements.expenseModal, false));
    elements.saveExpenseBtn.addEventListener('click', handleSaveExpense);
    elements.mainApp.addEventListener('click', (e) => { const editBtn = e.target.closest('.edit-expense'); if (editBtn) { const expense = state.expenses.find(ex => ex.id === editBtn.dataset.id); ui.setupExpenseModal(expense, state.categories); } const deleteBtn = e.target.closest('.delete-expense'); if (deleteBtn) { ui.showConfirmation('حذف المصروف', 'هل أنت متأكد؟', () => { api.deleteExpense(state.user.uid, deleteBtn.dataset.id).then(() => ui.showToast('تم الحذف')).catch(() => ui.showToast('فشل الحذف', 'error')); }); } const addCatBtn = e.target.closest('#add-category-btn'); if(addCatBtn) handleAddCategory(); const deleteCatBtn = e.target.closest('.delete-category'); if(deleteCatBtn) { ui.showConfirmation('حذف الفئة', 'هل أنت متأكد؟', () => { api.deleteCategory(state.user.uid, deleteCatBtn.dataset.id).then(() => ui.showToast('تم حذف الفئة')).catch(() => ui.showToast('فشل حذف الفئة', 'error')); }); } const clearDataBtn = e.target.closest('#clear-data-btn'); if(clearDataBtn) { ui.showConfirmation('مسح جميع البيانات', 'تحذير! سيتم حذف جميع المصروفات والفئات نهائياً.', () => { api.deleteAllUserData(state.user.uid).then(() => ui.showToast('تم مسح جميع البيانات')).catch(() => ui.showToast('حدث خطأ', 'error')); }); } });
    window.addEventListener('online', () => elements.offlineIndicator.classList.add('hidden')); window.addEventListener('offline', () => elements.offlineIndicator.classList.remove('hidden'));
}
async function handleSaveExpense() { const { elements } = ui; const name = elements.expenseNameInput.value.trim(); const amount = parseFloat(elements.expenseAmountInput.value); const categoryId = elements.expenseCategorySelect.value; if (!name || isNaN(amount) || !categoryId) return ui.showToast("يرجى ملء جميع الحقول", "error"); const expenseData = { name, amount, categoryId }; try { const action = state.isEditing ? api.updateExpense(state.user.uid, state.isEditing.id, expenseData) : api.addExpense(state.user.uid, expenseData); await action; ui.showToast(state.isEditing ? "تم تحديث المصروف" : "تمت إضافة المصروف"); ui.toggleModal(elements.expenseModal, false); } catch (error) { ui.showToast("حدث خطأ أثناء الحفظ", "error"); } }
async function handleAddCategory() { const nameInput = document.getElementById('new-category-name'); const colorInput = document.getElementById('new-category-color'); const name = nameInput.value.trim(); if (!name) return ui.showToast('اسم الفئة مطلوب', 'error'); try { await api.addCategory(state.user.uid, { name, color: colorInput.value }); ui.showToast('تمت إضافة الفئة'); nameInput.value = ''; } catch(error) { ui.showToast('فشل إضافة الفئة', 'error'); } }


// --- 8. Initialization ---
function initializeApp() {
    // This is the bulletproof check
    if (typeof firebase === 'undefined' || typeof firebase.app === 'undefined') {
        console.error('Firebase SDK not loaded. Cannot initialize app.');
        ui.elements.loadingText.textContent = "فشل تحميل الخدمات. يرجى التحقق من اتصالك بالإنترنت وتحديث الصفحة.";
        // We leave isLoading as true to keep the loading screen with the error message.
        return;
    }
    
    try {
        // Initialize Firebase services now that we know they exist.
        app = firebase.app(); // Use existing app if already initialized
        auth = firebase.auth();
        db = firebase.firestore();
        
        // Setup UI and event listeners
        ui.handleTheme(localStorage.getItem('theme') === 'dark');
        ui.elements.offlineIndicator.classList.toggle('hidden', navigator.onLine);
        setupEventListeners();
        
        // Start listening for authentication changes. This is the main entry point.
        authLogic.init();

        // Initial render based on the default loading state
        ui.render(state);
        
        console.log("Expense App Initialized Successfully");
    } catch(error) {
        console.error("Critical initialization error:", error);
        ui.elements.loadingText.textContent = "حدث خطأ فادح أثناء تشغيل التطبيق.";
    }
}

// Start the app after the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', initializeApp);
