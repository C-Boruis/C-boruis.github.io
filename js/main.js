// This is the main script file for the dashboard.
// It handles all logic, from user authentication to UI rendering and state management.

class DashboardApp {
    constructor() {
        // --- DOM Element Selection ---
        this.dom = {
            loginScreen: document.getElementById('login-screen'),
            loginPreview: document.getElementById('login-preview'),
            mainApp: document.getElementById('main-app'),
            usernameInput: document.getElementById('username'),
            passwordInput: document.getElementById('password'),
            loginBtn: document.getElementById('login-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            leftMenu: document.getElementById('left-menu'),
            tabContainer: document.getElementById('tab-container'),
            contentContainer: document.getElementById('content-container'),
            clockWidget: document.getElementById('clock-widget'),
            weatherWidget: document.getElementById('weather-widget'),
            saveBtn: document.getElementById('save-btn'),
            searchBtn: document.getElementById('search-btn'),
            searchModal: document.getElementById('search-modal'),
            searchInput: document.getElementById('search-input'),
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            notificationContainer: document.getElementById('notification-container'),
            resizeHandle: document.getElementById('resize-handle'),
        };

        // --- State Management ---
        this.state = null;
        this.activeTabId = null;
        this.clockInterval = null;
        this.isDirty = false; // Tracks if there are unsaved changes
    }

    /**
     * Initializes the entire application.
     */
    async init() {
        this.applySecurityMeasures();
        this.setupEventListeners();
        // For local testing, always load default config.
        // On GitHub pages, this logic should be replaced with the fetch logic.
        if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
            this.loadDefaultConfig();
        } else {
            await this.loadConfigFromGithub();
        }
        this.startClock();
    }

    // =================================================================
    // --- 1. CORE LOGIC: State and Config Management ---
    // =================================================================

    async loadConfigFromGithub() {
        try {
            const GITHUB_USERNAME = "YOUR_GITHUB_USERNAME"; // Replace
            const GITHUB_REPO = "YOUR_REPOSITORY_NAME";   // Replace
            const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/config.json?t=${new Date().getTime()}`);
            
            if (!response.ok) {
                this.showNotification("설정 파일을 찾을 수 없습니다. 기본 설정을 로드합니다.", "error");
                this.loadDefaultConfig();
                return;
            }

            const data = await response.json();
            this.state = JSON.parse(atob(data.content));
            this.state.sha = data.sha;
            this.applyTheme();
            this.renderLoginScreen();
        } catch (error) {
            console.error("Error loading config from GitHub:", error);
            this.showNotification("설정 로딩 중 오류 발생. 기본 설정을 사용합니다.", "error");
            this.loadDefaultConfig();
        }
    }

    loadDefaultConfig() {
        this.state = this.getDefaultConfig();
        this.applyTheme();
        this.renderLoginScreen();
    }

    getDefaultConfig() {
        return {
            account: {
                username: "kbs0829",
                passwordHash: "3a1e774a8ea4f3f402fb14450653c20d4643489b3bd77e8cc22690b879a41635"
            },
            settings: {
                loginScreen: { message: "Personal Dashboard", font: "Arial", color: "#FFFFFF", fontSize: "24px", align: "center", image: "" },
                design: { theme: "dark-blue", custom: { bg: "#1a1a1d", text: "#ffffff", accent: "#7289da" } },
                layout: { frameRatio: "20" },
                weather: { apiKey: "", city: "Seoul" }
            },
            menu: [
                { id: `menu-${Date.now()}`, title: "환영합니다", target: "frame", type: "html", content: "<h1>대시보드에 오신 것을 환영합니다!</h1><p>왼쪽 메뉴를 클릭하여 시작하거나, 우측 상단의 톱니바퀴 아이콘을 눌러 설정을 변경하세요.</p>" }
            ]
        };
    }

    async saveConfig() {
        this.showNotification("저장 중...", "info");
        const GITHUB_TOKEN = prompt("GitHub Personal Access Token을 입력하세요:");
        if (!GITHUB_TOKEN) {
            this.showNotification("토큰이 없어 저장할 수 없습니다.", "error");
            return;
        }

        const GITHUB_USERNAME = "YOUR_GITHUB_USERNAME"; // Replace
        const GITHUB_REPO = "YOUR_REPOSITORY_NAME";   // Replace
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/config.json`;

        const contentToSave = { ...this.state };
        delete contentToSave.sha;

        const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(contentToSave, null, 2))));

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Dashboard config update: ${new Date().toISOString()}`,
                    content: updatedContent,
                    sha: this.state.sha
                })
            });

            if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);

            const data = await response.json();
            this.state.sha = data.content.sha;
            this.isDirty = false;
            this.dom.saveBtn.classList.remove('dirty');
            this.showNotification("성공적으로 저장되었습니다!", "success");

        } catch (error) {
            console.error("Error saving config:", error);
            this.showNotification("저장 실패. 콘솔을 확인하세요.", "error");
        }
    }
    
    markAsDirty() {
        if (!this.isDirty) {
            this.isDirty = true;
            this.dom.saveBtn.classList.add('dirty');
        }
    }

    // =================================================================
    // --- 2. UI RENDERING & THEME ---
    // =================================================================

    applyTheme() {
        const themes = {
            'dark-blue': { bg: '#1a1a1d', text: '#ffffff', accent: '#7289da' },
            'light-solar': { bg: '#fdf6e3', text: '#657b83', accent: '#268bd2' },
            'nord': { bg: '#2e3440', text: '#d8dee9', accent: '#88c0d0' },
            'dracula': { bg: '#282a36', text: '#f8f8f2', accent: '#bd93f9' },
            'gruvbox': { bg: '#282828', text: '#ebdbb2', accent: '#fabd2f' },
            'monokai': { bg: '#272822', text: '#f8f8f2', accent: '#a6e22e' },
            'rose-pine': { bg: '#191724', text: '#e0def4', accent: '#eb6f92' },
        };
        const design = this.state.settings.design;
        let theme = themes[design.theme] || design.custom;
        if (design.theme === 'custom') {
            theme = design.custom;
        }
        
        const root = document.documentElement;
        root.style.setProperty('--primary-bg', theme.bg);
        root.style.setProperty('--primary-text', theme.text);
        root.style.setProperty('--accent-color', theme.accent);
        // Derive other colors
        // This is a simplistic approach; a real theme engine would be more complex.
        root.style.setProperty('--secondary-bg', this.adjustColor(theme.bg, 20));
        root.style.setProperty('--tertiary-bg', this.adjustColor(theme.bg, 40));
        root.style.setProperty('--secondary-text', this.adjustColor(theme.text, -60));
        root.style.setProperty('--border-color', this.adjustColor(theme.bg, 30));
        root.style.setProperty('--accent-hover', this.adjustColor(theme.accent, -20));
    }

    adjustColor(hex, amount) {
        let color = hex.startsWith('#') ? hex.slice(1) : hex;
        let num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        if (r > 255) r = 255;
        else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amount;
        if (b > 255) b = 255;
        else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amount;
        if (g > 255) g = 255;
        else if (g < 0) g = 0;
        return "#" + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }

    renderLoginScreen() {
        const { message, font, color, fontSize, align, image } = this.state.settings.loginScreen;
        this.dom.loginPreview.innerHTML = `<h1 style="font-family: '${font}', sans-serif; color: ${color}; font-size: ${fontSize}; text-align: ${align};">${message}</h1>`;
        this.dom.loginScreen.style.backgroundImage = image ? `url(${image})` : 'none';
    }

    render() {
        this.applyTheme();
        this.renderMenu();
        this.updateWeather();
        this.dom.leftMenu.style.width = `${this.state.settings.layout.frameRatio}%`;
    }
    
    // ... (rest of the render functions like renderMenu, renderTabs are mostly the same)
    renderMenu() {
        this.dom.leftMenu.innerHTML = '';
        this.state.menu.forEach(item => {
            const menuItem = document.createElement('a');
            menuItem.href = '#';
            menuItem.className = 'menu-item';
            menuItem.textContent = item.title;
            menuItem.dataset.menuId = item.id;
            this.dom.leftMenu.appendChild(menuItem);
        });
    }

    renderTabs() {
        this.dom.tabContainer.innerHTML = '';
        const openFrames = Array.from(this.dom.contentContainer.children);
        
        openFrames.forEach(frame => {
            const tabId = frame.dataset.tabId;
            const menuItem = this.state.menu.find(m => m.id === tabId);
            if (!menuItem) return;

            const tabEl = document.createElement('div');
            tabEl.className = 'tab';
            tabEl.dataset.tabId = tabId;
            tabEl.textContent = menuItem.title;
            
            if (tabId === this.activeTabId) tabEl.classList.add('active');

            const closeBtn = document.createElement('span');
            closeBtn.className = 'tab-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.dataset.tabId = tabId;
            tabEl.appendChild(closeBtn);

            this.dom.tabContainer.appendChild(tabEl);
        });
    }

    // =================================================================
    // --- 3. EVENT HANDLING ---
    // =================================================================

    // ... (setupEventListeners and other handlers are mostly the same)
    setupEventListeners() {
        this.dom.loginBtn.addEventListener('click', () => this.handleLogin());
        this.dom.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        this.dom.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.dom.saveBtn.addEventListener('click', () => this.saveConfig());

        this.dom.leftMenu.addEventListener('click', e => {
            if (e.target.classList.contains('menu-item')) {
                e.preventDefault();
                this.handleMenuClick(e.target.dataset.menuId);
            }
        });

        this.dom.tabContainer.addEventListener('click', e => {
            const tab = e.target.closest('.tab');
            const closeBtn = e.target.closest('.tab-close-btn');

            if (closeBtn) {
                e.stopPropagation();
                this.closeTab(closeBtn.dataset.tabId);
            } else if (tab) {
                this.switchTab(tab.dataset.tabId);
            }
        });

        this.setupResize();
        this.setupSearchModal();
        
        this.dom.settingsBtn.addEventListener('click', () => this.showSettingsModal());
    }

    async handleLogin() {
        const username = this.dom.usernameInput.value;
        const password = this.dom.passwordInput.value;

        if (!username || !password) {
            this.showNotification("아이디와 비밀번호를 입력해주세요.", "error");
            return;
        }

        const inputHash = await this.hashPassword(password);
        if (username === this.state.account.username && inputHash === this.state.account.passwordHash) {
            this.showNotification(`환영합니다, ${username}님!`, "success");
            this.showDashboard();
        } else {
            this.showNotification("아이디 또는 비밀번호가 올바르지 않습니다.", "error");
        }
    }

    handleLogout() {
        this.dom.mainApp.style.display = 'none';
        this.dom.loginScreen.style.display = 'flex';
        this.dom.usernameInput.value = '';
        this.dom.passwordInput.value = '';
        this.showNotification("로그아웃 되었습니다.", "info");
    }

    showDashboard() {
        this.dom.loginScreen.style.display = 'none';
        this.dom.mainApp.style.display = 'flex';
        this.render();
    }

    handleMenuClick(menuId) {
        const menuItem = this.state.menu.find(item => item.id === menuId);
        if (!menuItem) return;

        if (menuItem.target === 'new_window') {
            window.open(menuItem.content, '_blank');
        } else {
            this.openTab(menuId);
        }
    }

    openTab(menuId) {
        const existingContent = this.dom.contentContainer.querySelector(`.content-frame[data-tab-id="${menuId}"]`);
        if (existingContent) {
            this.switchTab(menuId);
            return;
        }

        const menuItem = this.state.menu.find(item => item.id === menuId);
        const contentEl = document.createElement('iframe');
        contentEl.className = 'content-frame';
        contentEl.dataset.tabId = menuId;
        contentEl.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
        
        if (menuItem.type === 'html') {
            contentEl.srcdoc = menuItem.content;
        } else if (menuItem.type === 'url') {
            contentEl.src = menuItem.content;
        } else if (menuItem.type === 'google_calendar') {
            contentEl.srcdoc = `<h1>Google Calendar</h1><p>Google API 연동은 개발자 설정이 필요합니다.</p>`;
        }
        
        this.dom.contentContainer.appendChild(contentEl);
        this.switchTab(menuId);
    }
    
    switchTab(tabId) {
        this.activeTabId = tabId;
        this.dom.contentContainer.querySelectorAll('.content-frame').forEach(frame => {
            frame.style.display = 'none';
        });
        const activeContent = this.dom.contentContainer.querySelector(`.content-frame[data-tab-id="${tabId}"]`);
        if (activeContent) activeContent.style.display = 'block';
        this.renderTabs();
    }

    closeTab(tabId) {
        const contentToRemove = this.dom.contentContainer.querySelector(`.content-frame[data-tab-id="${tabId}"]`);
        if (contentToRemove) contentToRemove.remove();

        if (this.activeTabId === tabId) {
            const firstTab = this.dom.tabContainer.querySelector('.tab');
            this.activeTabId = firstTab ? firstTab.dataset.tabId : null;
            if (this.activeTabId) this.switchTab(this.activeTabId);
        }
        
        this.renderTabs();
    }
    
    setupResize() {
        const handle = this.dom.resizeHandle;
        const leftMenu = this.dom.leftMenu;

        const onMouseMove = (e) => {
            let leftWidth = e.clientX;
            if (leftWidth < 150) leftWidth = 150;
            if (leftWidth > window.innerWidth - 300) leftWidth = window.innerWidth - 300;
            const leftPercent = (leftWidth / window.innerWidth) * 100;
            
            leftMenu.style.width = `${leftPercent}%`;
            this.state.settings.layout.frameRatio = leftPercent.toFixed(2);
            this.markAsDirty();
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
    
    // =================================================================
    // --- 4. WIDGETS AND FEATURES (Settings Modal is the big change) ---
    // =================================================================

    // ... (startClock, updateWeather, setupSearchModal are the same)
    startClock() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.clockInterval = setInterval(() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');
            const day = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            this.dom.clockWidget.textContent = `${year}.${month}.${date}(${day}) ${hours}:${minutes}:${seconds}`;
        }, 1000);
    }

    async updateWeather() {
        const { apiKey, city } = this.state.settings.weather;
        if (!apiKey || !city) {
            this.dom.weatherWidget.textContent = "날씨 (키 필요)";
            return;
        }
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=kr`);
            if (!response.ok) throw new Error('Weather API request failed');
            const data = await response.json();
            this.dom.weatherWidget.textContent = `${data.name} ${Math.round(data.main.temp)}℃ ${data.weather[0].description}`;
        } catch (error) {
            this.dom.weatherWidget.textContent = "날씨 정보 실패";
            console.error("Weather fetch error:", error);
        }
    }

    setupSearchModal() {
        this.dom.searchBtn.addEventListener('click', () => this.dom.searchModal.style.display = 'flex');
        this.dom.searchModal.querySelector('.modal-close-btn').addEventListener('click', () => this.dom.searchModal.style.display = 'none');
        
        const searchURLs = {
            google: 'https://www.google.com/search?q=',
            naver_search: 'https://search.naver.com/search.naver?query=',
            naver_ko_dic: 'https://ko.dict.naver.com/#/search?query=',
            naver_en_dic: 'https://en.dict.naver.com/#/search?query=',
            naver_hanja_dic: 'https://hanja.dict.naver.com/#/search?query='
        };

        this.dom.searchModal.addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                const engine = e.target.dataset.engine;
                const query = this.dom.searchInput.value;
                if (query && engine) {
                    window.open(searchURLs[engine] + encodeURIComponent(query), '_blank');
                    this.dom.searchInput.value = '';
                    this.dom.searchModal.style.display = 'none';
                }
            }
        });
    }

    showSettingsModal() {
        this.dom.settingsModal.innerHTML = `
            <div class="modal-content settings-panel">
                <span class="modal-close-btn">&times;</span>
                <h2><i class="fa-solid fa-gear"></i> 설정</h2>
                <div class="settings-body">
                    <div class="settings-nav">
                        <a href="#" class="settings-nav-item active" data-target="menu">메뉴 관리</a>
                        <a href="#" class="settings-nav-item" data-target="appearance">디자인/레이아웃</a>
                        <a href="#" class="settings-nav-item" data-target="login-screen">로그인 화면</a>
                        <a href="#" class="settings-nav-item" data-target="account">계정 관리</a>
                        <a href="#" class="settings-nav-item" data-target="api">API 키 관리</a>
                    </div>
                    <div class="settings-content"></div>
                </div>
            </div>
        `;
        this.dom.settingsModal.style.display = 'flex';
        
        const nav = this.dom.settingsModal.querySelector('.settings-nav');
        nav.addEventListener('click', e => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                nav.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                this.renderSettingsContent(e.target.dataset.target);
            }
        });

        this.renderSettingsContent('menu'); // Default view

        this.dom.settingsModal.querySelector('.modal-close-btn').addEventListener('click', () => {
            this.dom.settingsModal.style.display = 'none';
            this.render();
        });
    }

    renderSettingsContent(target) {
        const contentArea = this.dom.settingsModal.querySelector('.settings-content');
        let html = '';
        switch(target) {
            case 'menu':
                html = `<h3>메뉴 관리</h3><p>드래그하여 순서를 변경할 수 있습니다.</p><div id="menu-editor-list"></div><button id="add-menu-item-btn" class="full-width">+ 새 메뉴 추가</button>`;
                break;
            case 'appearance':
                const themes = ['dark-blue', 'light-solar', 'nord', 'dracula', 'gruvbox', 'monokai', 'rose-pine'];
                html = `
                    <h3>디자인/레이아웃</h3>
                    <div class="form-group">
                        <label>추천 테마</label>
                        <div class="theme-selector">
                            ${themes.map(t => `<button class="theme-btn" data-theme="${t}">${t}</button>`).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>레이아웃 비율 (왼쪽: ${parseFloat(this.state.settings.layout.frameRatio).toFixed(0)}%)</label>
                        <input type="range" id="layout-slider" min="15" max="40" value="${this.state.settings.layout.frameRatio}">
                    </div>`;
                break;
            case 'login-screen':
                const s = this.state.settings.loginScreen;
                html = `
                    <h3>로그인 화면 설정</h3>
                    <div class="form-group"><label>환영 메시지</label><input type="text" id="login-msg-input" value="${s.message}"></div>
                    <div class="form-group"><label>배경 이미지 URL</label><input type="url" id="login-bg-input" value="${s.image}"></div>
                    <div class="form-group"><label>폰트 색상</label><input type="color" id="login-font-color" value="${s.color}"></div>
                `;
                break;
            case 'account':
                html = `
                    <h3>계정 관리</h3><p>현재 아이디: ${this.state.account.username}</p>
                    <div class="form-group"><label>새 비밀번호</label><input type="password" id="new-password"></div>
                    <div class="form-group"><label>새 비밀번호 확인</label><input type="password" id="confirm-password"></div>
                    <button id="save-password-btn">비밀번호 변경</button>`;
                break;
            case 'api':
                html = `
                    <h3>API 키 관리</h3>
                    <div class="form-group"><label>날씨 API 키 (OpenWeatherMap)</label><input type="text" id="weather-api-key" value="${this.state.settings.weather.apiKey}"></div>
                    <div class="form-group"><label>날씨 도시 (영문)</label><input type="text" id="weather-city" value="${this.state.settings.weather.city}"></div>
                    <button id="save-api-btn">API 정보 저장</button>`;
                break;
        }
        contentArea.innerHTML = html;
        this.setupSettingsEventListeners(target);
    }
    
    setupSettingsEventListeners(target) {
        switch(target) {
            case 'menu':
                this.renderMenuEditor();
                document.getElementById('add-menu-item-btn').addEventListener('click', () => this.showMenuEditForm());
                break;
            case 'appearance':
                document.getElementById('layout-slider').addEventListener('input', e => {
                    this.state.settings.layout.frameRatio = e.target.value;
                    this.markAsDirty();
                    this.render();
                });
                document.querySelectorAll('.theme-btn').forEach(btn => {
                    btn.addEventListener('click', e => {
                        this.state.settings.design.theme = e.target.dataset.theme;
                        this.markAsDirty();
                        this.applyTheme();
                    });
                });
                break;
            case 'login-screen':
                document.getElementById('login-msg-input').addEventListener('input', e => { this.state.settings.loginScreen.message = e.target.value; this.markAsDirty(); });
                document.getElementById('login-bg-input').addEventListener('input', e => { this.state.settings.loginScreen.image = e.target.value; this.markAsDirty(); });
                document.getElementById('login-font-color').addEventListener('input', e => { this.state.settings.loginScreen.color = e.target.value; this.markAsDirty(); });
                break;
            case 'account':
                document.getElementById('save-password-btn').addEventListener('click', async () => {
                    const newPass = document.getElementById('new-password').value;
                    const confirmPass = document.getElementById('confirm-password').value;
                    if (newPass && newPass === confirmPass) {
                        this.state.account.passwordHash = await this.hashPassword(newPass);
                        this.markAsDirty();
                        this.showNotification("비밀번호가 변경되었습니다. '저장'을 눌러주세요.", "success");
                    } else {
                        this.showNotification("비밀번호가 일치하지 않습니다.", "error");
                    }
                });
                break;
            case 'api':
                document.getElementById('save-api-btn').addEventListener('click', () => {
                    this.state.settings.weather.apiKey = document.getElementById('weather-api-key').value;
                    this.state.settings.weather.city = document.getElementById('weather-city').value;
                    this.markAsDirty();
                    this.showNotification("API 정보가 업데이트되었습니다. '저장'을 눌러주세요.", "success");
                    this.updateWeather();
                });
                break;
        }
    }

    renderMenuEditor() {
        const listEl = document.getElementById('menu-editor-list');
        listEl.innerHTML = '';
        this.state.menu.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'menu-editor-item';
            itemEl.innerHTML = `
                <span>${item.title}</span>
                <button class="edit-menu-btn" data-id="${item.id}"><i class="fa-solid fa-pen"></i></button>
                <button class="delete-menu-btn" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
            `;
            listEl.appendChild(itemEl);
        });

        listEl.querySelectorAll('.edit-menu-btn').forEach(btn => btn.addEventListener('click', e => this.showMenuEditForm(e.currentTarget.dataset.id)));
        listEl.querySelectorAll('.delete-menu-btn').forEach(btn => btn.addEventListener('click', e => this.deleteMenuItem(e.currentTarget.dataset.id)));
    }

    showMenuEditForm(id = null) {
        const item = id ? this.state.menu.find(m => m.id === id) : {};
        const isNew = !id;
        const formHtml = `
            <div class="modal-wrapper" id="menu-edit-modal">
                <div class="modal-content">
                    <span class="modal-close-btn">&times;</span>
                    <h2>${isNew ? '새 메뉴 추가' : '메뉴 수정'}</h2>
                    <div class="form-group"><label>메뉴 제목</label><input type="text" id="menu-title" value="${item.title || ''}"></div>
                    <div class="form-group"><label>표시 방법</label><select id="menu-target"><option value="frame" ${item.target === 'frame' ? 'selected' : ''}>프레임</option><option value="new_window" ${item.target === 'new_window' ? 'selected' : ''}>새 창</option></select></div>
                    <div class="form-group"><label>콘텐츠 종류</label><select id="menu-type"><option value="html" ${item.type === 'html' ? 'selected' : ''}>HTML</option><option value="url" ${item.type === 'url' ? 'selected' : ''}>URL</option></select></div>
                    <div class="form-group"><label>콘텐츠</label><textarea id="menu-content">${item.content || ''}</textarea></div>
                    <button id="save-menu-btn">저장</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', formHtml);
        
        const modal = document.getElementById('menu-edit-modal');
        modal.querySelector('.modal-close-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('#save-menu-btn').addEventListener('click', () => {
            const updatedItem = {
                id: id || `menu-${Date.now()}`,
                title: document.getElementById('menu-title').value,
                target: document.getElementById('menu-target').value,
                type: document.getElementById('menu-type').value,
                content: document.getElementById('menu-content').value
            };
            if (isNew) {
                this.state.menu.push(updatedItem);
            } else {
                const index = this.state.menu.findIndex(m => m.id === id);
                this.state.menu[index] = updatedItem;
            }
            this.markAsDirty();
            this.renderMenuEditor();
            this.renderMenu();
            modal.remove();
        });
    }

    deleteMenuItem(id) {
        if (confirm('정말 이 메뉴를 삭제하시겠습니까?')) {
            this.state.menu = this.state.menu.filter(m => m.id !== id);
            this.markAsDirty();
            this.renderMenuEditor();
            this.renderMenu();
        }
    }

    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.dom.notificationContainer.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3000);
    }
    
    // =================================================================
    // --- 5. SECURITY & UTILITIES ---
    // =================================================================
    
    applySecurityMeasures() {
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase()))) {
                e.preventDefault();
            }
        });
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// --- App Initialization ---
const app = new DashboardApp();
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
