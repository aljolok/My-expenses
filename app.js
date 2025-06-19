// =================================================================
// Expense App - Rich, Bulletproof, and Feature-Packed
// =================================================================

// --- 1. Modules & Initialization ---
const DOMElements = {
    appContainer: document.getElementById('app-container'),
    modalBackdrop: document.getElementById('modal-backdrop'),
    expenseModal: document.getElementById('expense-modal'),
    confirmModal: document.getElementById('confirm-modal'),
    toast: document.getElementById('toast'),
    offlineIndicator: document.getElementById('offline-indicator'),
};

const templates = {
    loading: document.getElementById('loading-template'),
    auth: document.getElementById('auth-template'),
    main: document.getElementById('main-app-template'),
};

const firebaseConfig = {
    apiKey: "AIzaSyCD6TOeIO7g6RGp89YtA1maduwMfyTE1VQ",
    authDomain: "my-expenses-81714.firebaseapp.com",
    projectId: "my-expenses-81714",
    storageBucket: "my-expenses-81714.firebasestorage.app",
    messagingSenderId: "672207051964",
    appId: "1:672207051964:web:b6e0cedc143bd06fd584b9",
};
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


// --- 3. UI Module ---
const ui = {
    defaultAvatarSVG: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xOCAyMHYtMWMwLTIuMi0xLjgtNC00LTRoLTRjLTIuMiAwLTQgMS44LTQgNHYxIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+",

    render(appState) {
        DOMElements.appContainer.innerHTML = ''; // Clear previous content

        if (appState.isLoading) {
            DOMElements.appContainer.appendChild(templates.loading.content.cloneNode(true));
        } else if (appState.user) {
            const mainAppNode = templates.main.content.cloneNode(true);
            DOMElements.appContainer.appendChild(mainAppNode);
            this.setupMainAppUI(appState);
            this.renderPage(appState);
        } else {
            DOMElements.appContainer.appendChild(templates.auth.content.cloneNode(true));
            this.setupAuthUI();
        }
        lucide.createIcons();
    },

    setupMainAppUI(appState) {
        // This function sets up dynamic parts of the main app shell
        const user = appState.user;
        document.getElementById('user-avatar').src = user.photoURL || this.defaultAvatarSVG;
        document.getElementById('user-name').textContent = user.isAnonymous ? 'مستخدم مجهول' : (user.displayName || 'مستخدم جديد');
        document.getElementById('user-email').textContent = user.isAnonymous ? `ID: ${user.uid.slice(0, 6)}...` : user.email;
        this.handleTheme(localStorage.getItem('theme') === 'dark');
    },

    setupAuthUI() {
        // Attaches events to auth buttons after they are rendered
        document.getElementById('google-signin-btn').addEventListener('click', logic.auth.signInWithGoogle);
        document.getElementById('anon-signin-btn').addEventListener('click', logic.auth.signInAnonymously);
    },

    renderPage({ currentPage, expenses, categories }) {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        mainContent.innerHTML = '';
        let pageContent;
        switch (currentPage) {
            case 'daily': pageContent = this.createDailyPage(expenses, categories); break;
            case 'monthly': pageContent = this.createMonthlyPage(expenses, categories); break;
            case 'categories': pageContent = this.createCategoriesPage(categories); break;
            case 'settings': pageContent = this.createSettingsPage(); break;
        }
        mainContent.appendChild(pageContent);
        lucide.createIcons();
    },

    createDailyPage(expenses, categories) {
        const page = document.createElement('div');
        page.className = 'page';
        const today = new Date().toISOString().slice(0, 10);
        const dailyExpenses = expenses.filter(e => e.date === today);
        const total = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);

        page.innerHTML = `
            <div class="card">
                <h3><i data-lucide="sun"></i>مصروفات اليوم</h3>
                <p class="amount">${utils.formatCurrency(total)}</p>
            </div>
            <div id="daily-list" class="item-list"></div>`;
        
        const list = page.querySelector('#daily-list');
        if (dailyExpenses.length > 0) {
            dailyExpenses.forEach(exp => list.appendChild(this.createExpenseItem(exp, categories)));
        } else {
            list.innerHTML = `<p class="empty-state">لا توجد مصروفات مسجلة اليوم.</p>`;
        }
        return page;
    },

    createMonthlyPage(expenses, categories) {
        const page = document.createElement('div');
        page.className = 'page';
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const monthlyExpenses = expenses.filter(e => e.date >= startOfMonth);
        const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
        const categoryTotals = {};
        
        monthlyExpenses.forEach(exp => {
            categoryTotals[exp.categoryId] = (categoryTotals[exp.categoryId] || 0) + exp.amount;
        });
        const sortedCategories = Object.entries(categoryTotals).sort(([,a],[,b]) => b - a);

        page.innerHTML = `
            <div class="card"><h3><i data-lucide="calendar-month"></i>ملخص الشهر</h3><p class="amount">${utils.formatCurrency(total)}</p></div>
            <div class="card"><h3><i data-lucide="pie-chart"></i>الأعلى إنفاقًا</h3><div id="monthly-list" class="item-list"></div></div>`;
        
        const catList = page.querySelector('#monthly-list');
        if (sortedCategories.length > 0) {
            sortedCategories.forEach(([catId, catTotal]) => catList.appendChild(this.createCategorySummaryItem(catId, catTotal, total, categories)));
        } else {
            catList.innerHTML = `<p class="empty-state">لا توجد بيانات لهذا الشهر.</p>`;
        }
        return page;
    },

    createCategoriesPage(categories) {
        const page = document.createElement('div');
        page.className = 'page';
        page.innerHTML = `
            <div class="card">
                <h3><i data-lucide="tags"></i>إدارة الفئات</h3>
                <div class="form-group"><label for="new-category-name">اسم الفئة</label><input type="text" id="new-category-name" placeholder="مثال: تعليم"></div>
                <div class="form-group"><label for="new-category-color">اللون</label><input type="color" id="new-category-color" value="#8b5cf6"></div>
                <button id="add-category-btn" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">إضافة فئة</button>
            </div>
            <div id="category-list" class="item-list"></div>`;

        const list = page.querySelector('#category-list');
        if (categories.length > 0) {
            categories.forEach(cat => list.appendChild(this.createCategoryItem(cat)));
        } else {
            list.innerHTML = `<p class="empty-state">لا توجد فئات مخصصة.</p>`;
        }
        return page;
    },
    
    createSettingsPage() {
        const page = document.createElement('div');
        page.className = 'page';
        page.innerHTML = `<div class="card"><h3><i data-lucide="settings"></i>الإعدادات</h3><button id="logout-btn" class="btn btn-secondary" style="width: 100%;">تسجيل الخروج</button><br><button id="clear-data-btn" class="btn btn-danger" style="width: 100%; margin-top: 1rem;">مسح جميع البيانات</button></div>`;
        return page;
    },

    createExpenseItem(expense, categories) {
        const item = document.createElement('div');
        item.className = 'expense-item';
        const category = categories.find(c => c.id === expense.categoryId) || { name: 'غير محدد', color: '#9ca3af', icon: 'help-circle' };
        item.innerHTML = `<div class="item-icon" style="background-color: ${category.color};"><i data-lucide="${category.icon || 'tag'}"></i></div><div class="item-details"><p class="item-name">${utils.escapeHTML(expense.name)}</p><p class="item-category">${utils.escapeHTML(category.name)}</p></div><p class="item-amount">${utils.formatCurrency(expense.amount)}</p><div class="item-actions"><button class="btn-icon edit-expense" data-id="${expense.id}"><i data-lucide="edit-3"></i></button><button class="btn-icon delete-expense" data-id="${expense.id}"><i data-lucide="trash-2"></i></button></div>`;
        return item;
    },
    
    createCategoryItem(category) {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `<div class="item-icon" style="background-color: ${category.color};"><i data-lucide="${category.icon || 'tag'}"></i></div><div class="item-details"><p class="item-name">${utils.escapeHTML(category.name)}</p></div><div class="item-actions"><button class="btn-icon delete-category" data-id="${category.id}"><i data-lucide="trash-2"></i></button></div>`;
        return item;
    },
    
    createCategorySummaryItem(catId, catTotal, total, categories) {
        const item = document.createElement('div');
        item.className = 'category-summary-item';
        const category = categories.find(c => c.id === catId);
        if (!category) return item;
        const percentage = total > 0 ? (catTotal / total) * 100 : 0;
        item.innerHTML = `<span style="width: 80px; text-align: right;">${category.name}</span><div class="progress-bar"><div class="progress-fill" style="width:${percentage}%; background-color:${category.color};"></div></div><span>${utils.formatCurrency(catTotal)}</span>`;
        return item;
    },

    toggleModal(modal, show) {
        DOMElements.modalBackdrop.classList.toggle('active', show);
        modal.classList.toggle('hidden', !show);
    },

    setupExpenseModal(expense, categories) {
        state.isEditing = expense ? { type: 'expense', id: expense.id } : null;
        const modal = DOMElements.expenseModal;
        modal.querySelector('#expense-modal-title').textContent = expense ? 'تعديل المصروف' : 'إضافة مصروف';
        modal.querySelector('#expense-name').value = expense ? expense.name : '';
        modal.querySelector('#expense-amount').value = expense ? expense.amount : '';
        
        const categorySelect = modal.querySelector('#expense-category');
        if (categories.length === 0) {
            categorySelect.innerHTML = `<option disabled>أضف فئة أولاً</option>`;
        } else {
             categorySelect.innerHTML = categories
                .map(c => `<option value="${c.id}" ${expense && expense.categoryId === c.id ? 'selected' : ''}>${utils.escapeHTML(c.name)}</option>`)
                .join('');
        }
        this.toggleModal(modal, true);
    },
    
    showToast(message, type = 'success') {
        const { toast, toastMessage, toastIcon } = DOMElements;
        toast.className = ``;
        toast.classList.add(type, 'show');
        toastMessage.textContent = message;
        toastIcon.setAttribute('data-lucide', type === 'error' ? 'x-circle' : 'check-circle');
        lucide.createIcons();
        setTimeout(() => toast.classList.remove('show'), 3000);
    },
    
    showConfirmation(title, message, onConfirm) {
        const modal = DOMElements.confirmModal;
        modal.querySelector('#confirm-title').textContent = title;
        modal.querySelector('#confirm-message').textContent = message;
        this.toggleModal(modal, true);
        const yesHandler = () => { onConfirm(); this.toggleModal(modal, false); };
        modal.querySelector('#confirm-yes-btn').addEventListener('click', yesHandler, { once: true });
    },
    
    handleTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = isDark ? `<i data-lucide="sun"></i>` : `<i data-lucide="moon"></i>`;
            lucide.createIcons();
        }
    }
};

// --- 4. API (Firebase) Module ---
const api = {
    expensesCol: (uid) => db.collection('users').doc(uid).collection('expenses'),
    categoriesCol: (uid) => db.collection('users').doc(uid).collection('categories'),
    addExpense: (uid, expense) => api.expensesCol(uid).add({ ...expense, createdAt: firebase.firestore.FieldValue.serverTimestamp(), date: new Date().toISOString().slice(0, 10) }),
    updateExpense: (uid, id, expense) => api.expensesCol(uid).doc(id).update(expense),
    deleteExpense: (uid, id) => api.expensesCol(uid).doc(id).delete(),
    addCategory: (uid, category) => api.categoriesCol(uid).add(category),
    deleteCategory: (uid, id) => api.categoriesCol(uid).doc(id).delete(),
    deleteAllUserData: async (uid) => { const expensesQuery = await api.expensesCol(uid).get(); const categoriesQuery = await api.categoriesCol(uid).get(); const batch = db.batch(); expensesQuery.forEach(doc => batch.delete(doc.ref)); categoriesQuery.forEach(doc => batch.delete(doc.ref)); return batch.commit(); },
    listenToExpenses: (uid, callback) => api.expensesCol(uid).orderBy('createdAt', 'desc').onSnapshot(snapshot => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
    listenToCategories: (uid, callback) => api.categoriesCol(uid).onSnapshot(snapshot => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
    ensureDefaultCategories: async (uid, currentCategories) => { if (currentCategories.length > 0) return; const defaultCats = [{ name: 'طعام', color: '#ef4444', icon: 'utensils-crossed' }, { name: 'مواصلات', color: '#3b82f6', icon: 'car' }, { name: 'فواتير', color: '#f97316', icon: 'receipt' }, { name: 'تسوق', color: '#10b981', icon: 'shopping-bag' }]; for (const cat of defaultCats) { await api.addCategory(uid, cat); } }
};

// --- 5. Logic & Event Handlers Module ---
const logic = {
    auth: {
        init() { auth.onAuthStateChanged(user => { state.cleanupListeners(); if (user) { const unsubExpenses = api.listenToExpenses(user.uid, expenses => state.setState({ expenses })); const unsubCategories = api.listenToCategories(user.uid, categories => { api.ensureDefaultCategories(user.uid, categories); state.setState({ categories }); }); state.unsubscribe.push(unsubExpenses, unsubCategories); state.setState({ user, isLoading: false }); } else { state.setState({ user: null, expenses: [], categories: [], isLoading: false }); } }); },
        signInWithGoogle: () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(err => ui.showToast("فشل تسجيل الدخول", "error")),
        signInAnonymously: () => auth.signInAnonymously().catch(err => ui.showToast("فشل تسجيل الدخول كمجهول", "error")),
        signOut: () => auth.signOut(),
    },
    
    handleSaveExpense: async () => {
        const modal = DOMElements.expenseModal;
        const name = modal.querySelector('#expense-name').value.trim();
        const amount = parseFloat(modal.querySelector('#expense-amount').value);
        const categoryId = modal.querySelector('#expense-category').value;
        if (!name || isNaN(amount) || !categoryId) return ui.showToast("يرجى ملء جميع الحقول", "error");
        
        const expenseData = { name, amount, categoryId };
        const action = state.isEditing ? api.updateExpense(state.user.uid, state.isEditing.id, expenseData) : api.addExpense(state.user.uid, expenseData);
        
        try { await action; ui.showToast("تم الحفظ بنجاح"); ui.toggleModal(modal, false); }
        catch (error) { ui.showToast("حدث خطأ", "error"); }
    },

    handleAddCategory: async () => {
        const nameInput = document.getElementById('new-category-name');
        const colorInput = document.getElementById('new-category-color');
        if (!nameInput || !colorInput) return;
        const name = nameInput.value.trim();
        if (!name) return ui.showToast('اسم الفئة مطلوب', 'error');

        try { await api.addCategory(state.user.uid, { name, color: colorInput.value }); ui.showToast('تمت إضافة الفئة'); nameInput.value = ''; }
        catch(error) { ui.showToast('فشل إضافة الفئة', 'error'); }
    },
    
    setupEventListeners() {
        DOMElements.appContainer.addEventListener('click', e => {
            const target = e.target;
            const navBtn = target.closest('.nav-btn');
            const fabBtn = target.closest('#fab-add-expense');
            const editExpenseBtn = target.closest('.edit-expense');
            const deleteExpenseBtn = target.closest('.delete-expense');
            const addCatBtn = target.closest('#add-category-btn');
            const deleteCatBtn = target.closest('.delete-category');
            const logoutBtn = target.closest('#logout-btn');
            const clearDataBtn = target.closest('#clear-data-btn');
            const themeToggleBtn = target.closest('#theme-toggle-btn');
            const saveExpenseBtn = target.closest('#save-expense-btn');
            const modalCancelBtn = target.closest('.modal-cancel');

            if (navBtn) {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                navBtn.classList.add('active');
                state.setState({ currentPage: navBtn.dataset.page });
            }
            else if (fabBtn) ui.setupExpenseModal(null, state.categories);
            else if (editExpenseBtn) ui.setupExpenseModal(state.expenses.find(ex => ex.id === editExpenseBtn.dataset.id), state.categories);
            else if (deleteExpenseBtn) ui.showConfirmation('حذف المصروف', 'هل أنت متأكد؟', () => api.deleteExpense(state.user.uid, deleteExpenseBtn.dataset.id));
            else if (addCatBtn) this.handleAddCategory();
            else if (deleteCatBtn) ui.showConfirmation('حذف الفئة', 'هل أنت متأكد؟', () => api.deleteCategory(state.user.uid, deleteCatBtn.dataset.id));
            else if (logoutBtn) this.auth.signOut();
            else if (clearDataBtn) ui.showConfirmation('مسح جميع البيانات', 'سيتم حذف كل شيء نهائياً!', () => api.deleteAllUserData(state.user.uid));
            else if (themeToggleBtn) { const isDark = document.documentElement.getAttribute('data-theme') === 'dark'; localStorage.setItem('theme', !isDark ? 'dark' : 'light'); ui.handleTheme(!isDark); }
            else if (saveExpenseBtn) this.handleSaveExpense();
            else if (modalCancelBtn) ui.toggleModal(target.closest('.modal'), false);
        });
        window.addEventListener('online', () => DOMElements.offlineIndicator.classList.add('hidden'));
        window.addEventListener('offline', () => DOMElements.offlineIndicator.classList.remove('hidden'));
    }
};

// --- 6. Utilities ---
const utils = {
    formatCurrency: (amount) => new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED' }).format(amount || 0),
    escapeHTML: (str) => str.replace(/[&<>'"]/g, tag => ({'&':'&', '<':'<', '>':'>', "'":''', '"':'"'}[tag] || tag)),
};

// --- 7. App Initialization ---
function initializeApp() {
    const authTimeout = setTimeout(() => {
        if (state.isLoading) {
            const loadingText = document.querySelector('#loading-screen p');
            if (loadingText) loadingText.textContent = "فشل الاتصال. يرجى تحديث الصفحة.";
        }
    }, 10000);

    if (typeof firebase === 'undefined') {
        clearTimeout(authTimeout);
        document.querySelector('#loading-screen p').textContent = "فشل تحميل الخدمات. يرجى التحقق من اتصالك بالإنترنت وتحديث الصفحة.";
        return;
    }
    
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        
        logic.setupEventListeners();
        logic.auth.init();
        
        auth.onAuthStateChanged(() => clearTimeout(authTimeout));
        
        console.log("Expense App Initialized");
    } catch(error) {
        clearTimeout(authTimeout);
        console.error("Critical Initialization Error:", error);
        document.querySelector('#loading-screen p').textContent = "حدث خطأ فادح أثناء تشغيل التطبيق.";
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);