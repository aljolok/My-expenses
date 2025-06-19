// =================================================================
// Expense App - Final, Bulletproof, and Feature-Rich Version
// =================================================================

// This script will only run after the entire HTML document is loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Modules & Initialization ---
    const DOMElements = {
        appContainer: document.getElementById('app-container'),
        modalBackdrop: document.getElementById('modal-backdrop'),
        toast: document.getElementById('toast'),
        offlineIndicator: document.getElementById('offline-indicator'),
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
            DOMElements.appContainer.innerHTML = '';
            let screenNode;

            if (appState.user) {
                screenNode = this.createMainAppShell(appState);
                this.renderPageContent(screenNode, appState);
            } else {
                screenNode = this.createAuthScreen();
            }
            DOMElements.appContainer.appendChild(screenNode);
            lucide.createIcons();
            this.handleTheme(localStorage.getItem('theme') === 'dark'); // Apply theme after render
        },

        createAuthScreen() {
            const screen = document.createElement('div');
            screen.className = 'screen active';
            screen.innerHTML = `
                <div class="auth-card">
                    <div class="logo"><i data-lucide="wallet"></i></div>
                    <h1>المصروفات الذكية</h1>
                    <p>تتبع نفقاتك بسهولة وأناقة.</p>
                    <div class="auth-buttons">
                        <button id="google-signin-btn" class="btn btn-primary"><i data-lucide="log-in"></i><span>تسجيل الدخول بـ Google</span></button>
                        <button id="anon-signin-btn" class="btn btn-secondary"><i data-lucide="user-x"></i><span>التصفح كمجهول</span></button>
                    </div>
                </div>`;
            screen.querySelector('#google-signin-btn').addEventListener('click', logic.auth.signInWithGoogle);
            screen.querySelector('#anon-signin-btn').addEventListener('click', logic.auth.signInAnonymously);
            return screen;
        },

        createMainAppShell(appState) {
            const screen = document.createElement('div');
            screen.className = 'screen active';
            screen.id = 'main-app';
            const { user } = appState;
            screen.innerHTML = `
                <header class="app-header">
                    <div class="user-profile">
                        <img id="user-avatar" src="${user.photoURL || this.defaultAvatarSVG}" alt="User Avatar">
                        <div>
                            <h2 id="user-name">${user.isAnonymous ? 'مستخدم مجهول' : (user.displayName || 'مستخدم جديد')}</h2>
                            <p id="user-email">${user.isAnonymous ? `ID: ${user.uid.slice(0, 6)}...` : user.email}</p>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button id="theme-toggle-btn" class="btn-icon"><i data-lucide="${localStorage.getItem('theme') === 'dark' ? 'sun' : 'moon'}"></i></button>
                    </div>
                </header>
                <main id="main-content"></main>
                <nav class="app-nav">
                    <button class="nav-btn ${state.currentPage === 'daily' ? 'active' : ''}" data-page="daily"><i data-lucide="calendar-day"></i><span>يومي</span></button>
                    <button class="nav-btn ${state.currentPage === 'monthly' ? 'active' : ''}" data-page="monthly"><i data-lucide="bar-chart-3"></i><span>شهري</span></button>
                    <button id="fab-add-expense" class="nav-fab"><i data-lucide="plus"></i></button>
                    <button class="nav-btn ${state.currentPage === 'categories' ? 'active' : ''}" data-page="categories"><i data-lucide="tags"></i><span>فئات</span></button>
                    <button class="nav-btn ${state.currentPage === 'settings' ? 'active' : ''}" data-page="settings"><i data-lucide="settings"></i><span>إعدادات</span></button>
                </nav>`;
            return screen;
        },

        renderPageContent(screenNode, appState) {
            const mainContent = screenNode.querySelector('#main-content');
            if (!mainContent) return;
            mainContent.innerHTML = '';
            let pageContent;
            switch (appState.currentPage) {
                case 'daily': pageContent = this.createDailyPage(appState); break;
                case 'monthly': pageContent = this.createMonthlyPage(appState); break;
                case 'categories': pageContent = this.createCategoriesPage(appState); break;
                case 'settings': pageContent = this.createSettingsPage(appState); break;
            }
            mainContent.appendChild(pageContent);
        },

        // --- All page creation and UI helper functions below are safe to call now ---
        createDailyPage({ expenses, categories }) { /* ... same as before ... */ },
        createMonthlyPage({ expenses, categories }) { /* ... same as before ... */ },
        createCategoriesPage({ categories }) { /* ... same as before ... */ },
        createSettingsPage() { /* ... same as before ... */ },
        createExpenseItem(expense, categories) { /* ... same as before ... */ },
        createCategoryItem(category) { /* ... same as before ... */ },
        createCategorySummaryItem(catId, catTotal, total, categories) { /* ... same as before ... */ },
        toggleModal(modalName, show) { /* ... same as before ... */ },
        setupExpenseModal(expense, categories) { /* ... same as before ... */ },
        showToast(message, type = 'success') { /* ... same as before ... */ },
        showConfirmation(title, message, onConfirm) { /* ... same as before ... */ },
        handleTheme(isDark) { /* ... same as before ... */ }
    };
    
    // To save space, we will merge the identical helper functions into the main object
    Object.assign(ui, {
        createDailyPage({ expenses, categories }) { const page = document.createElement('div'); page.className = 'page'; const today = new Date().toISOString().slice(0, 10); const dailyExpenses = expenses.filter(e => e.date === today); const total = dailyExpenses.reduce((sum, e) => sum + e.amount, 0); page.innerHTML = `<div class="card"><h3><i data-lucide="sun"></i>مصروفات اليوم</h3><p class="amount">${utils.formatCurrency(total)}</p></div><div id="daily-list" class="item-list"></div>`; const list = page.querySelector('#daily-list'); if (dailyExpenses.length > 0) { dailyExpenses.forEach(exp => list.appendChild(this.createExpenseItem(exp, categories))); } else { list.innerHTML = `<p class="empty-state">لا توجد مصروفات مسجلة اليوم.</p>`; } return page; },
        createMonthlyPage({ expenses, categories }) { const page = document.createElement('div'); page.className = 'page'; const now = new Date(); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); const monthlyExpenses = expenses.filter(e => e.date >= startOfMonth); const total = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0); const categoryTotals = {}; monthlyExpenses.forEach(exp => { categoryTotals[exp.categoryId] = (categoryTotals[exp.categoryId] || 0) + exp.amount; }); const sortedCategories = Object.entries(categoryTotals).sort(([,a],[,b]) => b - a); page.innerHTML = `<div class="card"><h3><i data-lucide="calendar-month"></i>ملخص الشهر</h3><p class="amount">${utils.formatCurrency(total)}</p></div><div class="card"><h3><i data-lucide="pie-chart"></i>الأعلى إنفاقًا</h3><div id="monthly-list" class="item-list"></div></div>`; const catList = page.querySelector('#monthly-list'); if (sortedCategories.length > 0) { sortedCategories.forEach(([catId, catTotal]) => catList.appendChild(this.createCategorySummaryItem(catId, catTotal, total, categories))); } else { catList.innerHTML = `<p class="empty-state">لا توجد بيانات لهذا الشهر.</p>`; } return page; },
        createCategoriesPage({ categories }) { const page = document.createElement('div'); page.className = 'page'; page.innerHTML = `<div class="card"><h3><i data-lucide="tags"></i>إدارة الفئات</h3><div class="form-group"><label for="new-category-name">اسم الفئة</label><input type="text" id="new-category-name" placeholder="مثال: تعليم"></div><div class="form-group"><label for="new-category-color">اللون</label><input type="color" id="new-category-color" value="#8b5cf6"></div><button id="add-category-btn" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">إضافة فئة</button></div><div id="category-list" class="item-list"></div>`; const list = page.querySelector('#category-list'); if (categories.length > 0) { categories.forEach(cat => list.appendChild(this.createCategoryItem(cat))); } else { list.innerHTML = `<p class="empty-state">لا توجد فئات مخصصة.</p>`; } return page; },
        createSettingsPage() { const page = document.createElement('div'); page.className = 'page'; page.innerHTML = `<div class="card"><h3><i data-lucide="settings"></i>الإعدادات</h3><button id="logout-btn" class="btn btn-secondary" style="width: 100%;">تسجيل الخروج</button><br><button id="clear-data-btn" class="btn btn-danger" style="width: 100%; margin-top: 1rem;">مسح جميع البيانات</button></div>`; return page; },
        createExpenseItem(expense, categories) { const item = document.createElement('div'); item.className = 'expense-item'; const category = categories.find(c => c.id === expense.categoryId) || { name: 'غير محدد', color: '#9ca3af', icon: 'help-circle' }; item.innerHTML = `<div class="item-icon" style="background-color: ${category.color};"><i data-lucide="${category.icon || 'tag'}"></i></div><div class="item-details"><p class="item-name">${utils.escapeHTML(expense.name)}</p><p class="item-category">${utils.escapeHTML(category.name)}</p></div><p class="item-amount">${utils.formatCurrency(expense.amount)}</p><div class="item-actions"><button class="btn-icon edit-expense" data-id="${expense.id}"><i data-lucide="edit-3"></i></button><button class="btn-icon delete-expense" data-id="${expense.id}"><i data-lucide="trash-2"></i></button></div>`; return item; },
        createCategoryItem(category) { const item = document.createElement('div'); item.className = 'category-item'; item.innerHTML = `<div class="item-icon" style="background-color: ${category.color};"><i data-lucide="${category.icon || 'tag'}"></i></div><div class="item-details"><p class="item-name">${utils.escapeHTML(category.name)}</p></div><div class="item-actions"><button class="btn-icon delete-category" data-id="${category.id}"><i data-lucide="trash-2"></i></button></div>`; return item; },
        createCategorySummaryItem(catId, catTotal, total, categories) { const item = document.createElement('div'); item.className = 'category-summary-item'; const category = categories.find(c => c.id === catId); if (!category) return item; const percentage = total > 0 ? (catTotal / total) * 100 : 0; item.innerHTML = `<span style="width: 80px; text-align: right;">${category.name}</span><div class="progress-bar"><div class="progress-fill" style="width:${percentage}%; background-color:${category.color};"></div></div><span>${utils.formatCurrency(catTotal)}</span>`; return item; },
        toggleModal(modalName, show) { const modal = document.getElementById(modalName); if(modal) { DOMElements.modalBackdrop.classList.toggle('active', show); modal.classList.toggle('hidden', !show); } },
        setupExpenseModal(expense, categories) {
            DOMElements.modalBackdrop.innerHTML = `
            <div id="expense-modal" class="modal">
                <h3 id="expense-modal-title">${expense ? 'تعديل المصروف' : 'إضافة مصروف'}</h3>
                <div class="form-group"><label for="expense-name">اسم المصروف</label><input type="text" id="expense-name" value="${expense ? utils.escapeHTML(expense.name) : ''}" placeholder="مثال: قهوة صباحية"></div>
                <div class="form-group"><label for="expense-amount">المبلغ</label><input type="number" id="expense-amount" value="${expense ? expense.amount : ''}" placeholder="0.00"></div>
                <div class="form-group"><label for="expense-category">الفئة</label><select id="expense-category">${categories.map(c => `<option value="${c.id}" ${expense && expense.categoryId === c.id ? 'selected' : ''}>${utils.escapeHTML(c.name)}</option>`).join('')}</select></div>
                <div class="modal-actions"><button id="save-expense-btn" class="btn btn-primary">حفظ</button><button class="btn btn-secondary modal-cancel">إلغاء</button></div>
            </div>`;
            state.isEditing = expense ? { type: 'expense', id: expense.id } : null;
            this.toggleModal('expense-modal', true);
        },
        showToast(message, type = 'success') { const { toast } = DOMElements; toast.innerHTML = `<i data-lucide="${type === 'error' ? 'x-circle' : 'check-circle'}"></i><p>${message}</p>`; toast.className = ``; toast.classList.add(type, 'show'); lucide.createIcons(); setTimeout(() => toast.classList.remove('show'), 3000); },
        showConfirmation(title, message, onConfirm) {
            DOMElements.modalBackdrop.innerHTML = `
            <div id="confirm-modal" class="modal">
                 <h3>${title}</h3><p>${message}</p>
                 <div class="modal-actions">
                     <button id="confirm-yes-btn" class="btn btn-danger">نعم</button>
                     <button class="btn btn-secondary modal-cancel">لا</button>
                 </div>
            </div>`;
            const modal = document.getElementById('confirm-modal');
            this.toggleModal('confirm-modal', true);
            modal.querySelector('#confirm-yes-btn').addEventListener('click', () => { onConfirm(); this.toggleModal('confirm-modal', false); }, { once: true });
        },
        handleTheme(isDark) { document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light'); const themeToggleBtn = document.getElementById('theme-toggle-btn'); if (themeToggleBtn) { themeToggleBtn.innerHTML = isDark ? `<i data-lucide="sun"></i>` : `<i data-lucide="moon"></i>`; lucide.createIcons(); } }
    });

    // --- API & Logic Modules (Simplified for single file) ---
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
    const logic = {
        auth: {
            init() { auth.onAuthStateChanged(user => { state.cleanupListeners(); if (user) { const unsubExpenses = api.listenToExpenses(user.uid, expenses => state.setState({ expenses })); const unsubCategories = api.listenToCategories(user.uid, categories => { api.ensureDefaultCategories(user.uid, categories); state.setState({ categories }); }); state.unsubscribe.push(unsubExpenses, unsubCategories); state.setState({ user }); } else { state.setState({ user: null, expenses: [], categories: [] }); } }); },
            signInWithGoogle: () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(err => ui.showToast("فشل تسجيل الدخول", "error")),
            signInAnonymously: () => auth.signInAnonymously().catch(err => ui.showToast("فشل تسجيل الدخول كمجهول", "error")),
            signOut: () => auth.signOut(),
        },
        handleSaveExpense: async () => { /* ... same as before ... */ },
        handleAddCategory: async () => { /* ... same as before ... */ },
        setupEventListeners() { DOMElements.appContainer.addEventListener('click', e => { const target = e.target; const navBtn = target.closest('.nav-btn'); if (navBtn) { state.setState({ currentPage: navBtn.dataset.page }); } /* ... other events ... */}); /* ... other listeners ... */ }
    };
    Object.assign(logic, {
        handleSaveExpense: async () => { const modal = document.getElementById('expense-modal'); const name = modal.querySelector('#expense-name').value.trim(); const amount = parseFloat(modal.querySelector('#expense-amount').value); const categoryId = modal.querySelector('#expense-category').value; if (!name || isNaN(amount) || !categoryId) return ui.showToast("يرجى ملء جميع الحقول", "error"); const expenseData = { name, amount, categoryId }; const action = state.isEditing ? api.updateExpense(state.user.uid, state.isEditing.id, expenseData) : api.addExpense(state.user.uid, expenseData); try { await action; ui.showToast("تم الحفظ بنجاح"); ui.toggleModal('expense-modal', false); } catch (error) { ui.showToast("حدث خطأ", "error"); } },
        handleAddCategory: async () => { const nameInput = document.getElementById('new-category-name'); const colorInput = document.getElementById('new-category-color'); if (!nameInput || !colorInput) return; const name = nameInput.value.trim(); if (!name) return ui.showToast('اسم الفئة مطلوب', 'error'); try { await api.addCategory(state.user.uid, { name, color: colorInput.value }); ui.showToast('تمت إضافة الفئة'); nameInput.value = ''; } catch(error) { ui.showToast('فشل إضافة الفئة', 'error'); } },
        setupEventListeners() {
            DOMElements.appContainer.addEventListener('click', e => {
                const target = e.target;
                if (target.closest('.nav-btn')) state.setState({ currentPage: target.closest('.nav-btn').dataset.page });
                else if (target.closest('#fab-add-expense')) ui.setupExpenseModal(null, state.categories);
                else if (target.closest('.edit-expense')) ui.setupExpenseModal(state.expenses.find(ex => ex.id === target.closest('.edit-expense').dataset.id), state.categories);
                else if (target.closest('.delete-expense')) ui.showConfirmation('حذف المصروف', 'هل أنت متأكد؟', () => api.deleteExpense(state.user.uid, target.closest('.delete-expense').dataset.id));
                else if (target.closest('#add-category-btn')) this.handleAddCategory();
                else if (target.closest('.delete-category')) ui.showConfirmation('حذف الفئة', 'هل أنت متأكد؟', () => api.deleteCategory(state.user.uid, target.closest('.delete-category').dataset.id));
                else if (target.closest('#logout-btn')) this.auth.signOut();
                else if (target.closest('#clear-data-btn')) ui.showConfirmation('مسح جميع البيانات', 'سيتم حذف كل شيء نهائياً!', () => api.deleteAllUserData(state.user.uid));
                else if (target.closest('#theme-toggle-btn')) { const isDark = document.documentElement.getAttribute('data-theme') === 'dark'; localStorage.setItem('theme', !isDark ? 'dark' : 'light'); ui.handleTheme(!isDark); }
            });
            DOMElements.modalBackdrop.addEventListener('click', e => {
                if (e.target.closest('.modal-cancel') || e.target === DOMElements.modalBackdrop) {
                    ui.toggleModal('expense-modal', false);
                    ui.toggleModal('confirm-modal', false);
                } else if (e.target.closest('#save-expense-btn')) {
                    this.handleSaveExpense();
                }
            });
            window.addEventListener('online', () => DOMElements.offlineIndicator.classList.add('hidden')); window.addEventListener('offline', () => DOMElements.offlineIndicator.classList.remove('hidden'));
        }
    });

    // --- Utilities ---
    const utils = { formatCurrency: (amount) => new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED' }).format(amount || 0), escapeHTML: (str) => str.replace(/[&<>'"]/g, tag => ({'&':'&', '<':'<', '>':'>', "'":''', '"':'"'}[tag] || tag)), };
    
    // --- App Initialization ---
    function initializeApp() {
        const authTimeout = setTimeout(() => {
            const loadingText = document.querySelector('#initial-loading-screen p');
            if (loadingText) loadingText.textContent = "فشل الاتصال. يرجى تحديث الصفحة.";
        }, 10000);

        if (typeof firebase === 'undefined') {
            document.querySelector('#initial-loading-screen p').textContent = "فشل تحميل الخدمات.";
            return;
        }
        
        try {
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            
            logic.setupEventListeners();
            auth.onAuthStateChanged(user => {
                clearTimeout(authTimeout);
                state.cleanupListeners();
                if (user) {
                    const unsubExpenses = api.listenToExpenses(user.uid, expenses => state.setState({ expenses }));
                    const unsubCategories = api.listenToCategories(user.uid, categories => { api.ensureDefaultCategories(user.uid, categories); state.setState({ categories }); });
                    state.unsubscribe.push(unsubExpenses, unsubCategories);
                    state.setState({ user });
                } else {
                    state.setState({ user: null, expenses: [], categories: [] });
                }
            });
            
            console.log("Expense App Initialized");
        } catch(error) {
            clearTimeout(authTimeout);
            console.error("Critical Initialization Error:", error);
            document.querySelector('#initial-loading-screen p').textContent = "حدث خطأ فادح.";
        }
    }

    initializeApp();
});
