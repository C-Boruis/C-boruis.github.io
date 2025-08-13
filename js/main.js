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
        await this.loadConfig(); // Load config first
        this.startClock();
        // Login screen is shown by default, no need to call showLogin()
    }

    // =================================================================
    // --- 1. CORE LOGIC: State and Config Management ---
    // =================================================================

    /**
     * Loads the configuration from a 'config.json' file in the GitHub repo.
     * Falls back to default if not found.
     */
    async loadConfig() {
        // NOTE: For local testing, this will fail. It's designed for GitHub Pages.
        // You can uncomment the line below to test locally with default config.
        // return this.loadDefaultConfig(); 

        try {
            // Replace with your GitHub username and repository name
            const GITHUB_USERNAME = "C-Boruis";
            const GITHUB_REPO = "C-Boruis";
            const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/config.json`);
            
            if (!response.ok) {
                this.showNotification("설정 파일을 찾을 수 없습니다. 기본 설정을 로드합니다.", "error");
                this.loadDefaultConfig();
                return;
            }

            const data = await response.json();
            this.state = JSON.parse(atob(data.content));
            this.state.sha = data.sha; // Store SHA for updates
            console.log("Loaded config from GitHub:", this.state);
            this.renderLoginScreen();
        } catch (error) {
            console.error("Error loading config from GitHub:", error);
            this.showNotification("설정 로딩 중 오류 발생. 기본 설정을 사용합니다.", "error");
            this.loadDefaultConfig();
        }
    }

    loadDefaultConfig() {
        this.state = this.getDefaultConfig();
        console.log("Loaded default config:", this.state);
        this.renderLoginScreen();
    }

    /**
     * Provides a default configuration object.
     */
    getDefaultConfig() {
        return {
            account: {
                username: "kbs0829",
                passwordHash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3" // SHA-256 hash of '3046'
            },
            settings: {
                loginScreen: { message: "Personal Dashboard", font: "Arial", color: "#FFFFFF", fontSize: "24px", align: "center", image: "" },
                design: { theme: "dark-blue", customTheme: { background: "#121212", fontColor: "#EAEAEA" } },
                layout: { frameRatio: "20" }, // Percentage for left frame
                weather: { apiKey: "", city: "Seoul" }
            },
            menu: [
                { id: `menu-${Date.now()}`, title: "환영합니다", target: "frame", type: "html", content: "<h1>대시보드에 오신 것을 환영합니다!</h1><p>왼쪽 메뉴를 클릭하여 시작하거나, 우측 상단의 톱니바퀴 아이콘을 눌러 설정을 변경하세요.</p>" }
            ]
        };
    }

    /**
     * Saves the current state to the 'config.json' file on GitHub.
     */
    async saveConfig() {
        this.showNotification("저장 중...", "info");
        // NOTE: This requires a Personal Access Token with 'repo' scope.
        // It should be kept secure and not exposed client-side in a real public app.
        // For this personal project, it's a viable approach.
        const GITHUB_TOKEN = prompt("GitHub Personal Access Token을 입력하세요:");
        if (!GITHUB_TOKEN) {
            this.showNotification("토큰이 없어 저장할 수 없습니다.", "error");
            return;
        }

        const GITHUB_USERNAME = "C-Boruis"; // Replace
        const GITHUB_REPO = "C-Boruis";   // Replace
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/config.json`;

        const contentToSave = { ...this.state };
        delete contentToSave.sha; // Don't save the sha inside the file content

        const updatedContent = btoa(JSON.stringify(contentToSave, null, 2)); // Base64 encode

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
                    sha: this.state.sha // Must provide the blob SHA of the file being replaced
                })
            });

            if (!response.ok) {
                throw new Error(`GitHub API responded with status ${response.status}`);
            }

            const data = await response.json();
            this.state.sha = data.content.sha; // Update with the new SHA
            this.isDirty = false;
            this.dom.saveBtn.classList.remove('dirty');
            this.showNotification("성공적으로 저장되었습니다!", "success");

        } catch (error) {
            console.error("Error saving config:", error);
            this.showNotification("저장 실패. 콘솔을 확인하세요.", "error");
        }
    }
    
    markAsDirty() {
        this.isDirty = true;
        this.dom.saveBtn.classList.add('dirty');
    }

    // =================================================================
    // --- 2. UI RENDERING ---
    // =================================================================

    renderLoginScreen() {
        const { message, font, color, fontSize, align, image } = this.state.settings.loginScreen;
        this.dom.loginPreview.innerHTML = `<h1 style="font-family: ${font}; color: ${color}; font-size: ${fontSize}; text-align: ${align};">${message}</h1>`;
        if (image) {
            this.dom.loginScreen.style.backgroundImage = `url(${image})`;
            this.dom.loginScreen.style.backgroundSize = 'cover';
        }
    }

    render() {
        this.renderMenu();
        this.updateWeather();
        // Apply layout
        this.dom.leftMenu.style.width = `${this.state.settings.layout.frameRatio}%`;
        const rightWidth = 100 - parseFloat(this.state.settings.layout.frameRatio);
        this.dom.rightContent.style.width = `${rightWidth}%`;
    }
    
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
        const rightContent = this.dom.rightContent;

        const onMouseMove = (e) => {
            let leftWidth = e.clientX;
            if (leftWidth < 150) leftWidth = 150;
            if (leftWidth > window.innerWidth - 300) leftWidth = window.innerWidth - 300;
            const leftPercent = (leftWidth / window.innerWidth) * 100;
            
            leftMenu.style.width = `${leftPercent}%`;
            rightContent.style.width = `${100 - leftPercent}%`;
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
    // --- 4. WIDGETS AND FEATURES ---
    // =================================================================

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
        // Dynamically create settings content to ensure it's always up-to-date
        this.dom.settingsModal.innerHTML = `
            <div class="modal-content settings-panel">
                <span class="modal-close-btn">&times;</span>
                <h2><i class="fa-solid fa-gear"></i> 설정</h2>
                <div class="settings-body">
                    <div class="settings-nav">
                        <a href="#" class="settings-nav-item active" data-target="account">계정 관리</a>
                        <a href="#" class="settings-nav-item" data-target="menu">메뉴 관리</a>
                        <a href="#" class="settings-nav-item" data-target="appearance">디자인/레이아웃</a>
                        <a href="#" class="settings-nav-item" data-target="api">API 키 관리</a>
                    </div>
                    <div class="settings-content">
                        <!-- Content will be injected here -->
                    </div>
                </div>
            </div>
        `;
        this.dom.settingsModal.style.display = 'flex';
        
        const contentArea = this.dom.settingsModal.querySelector('.settings-content');
        const nav = this.dom.settingsModal.querySelector('.settings-nav');

        // Setup navigation
        nav.addEventListener('click', e => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                nav.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                this.renderSettingsContent(e.target.dataset.target);
            }
        });

        // Initial render
        this.renderSettingsContent('account');

        // Close button
        this.dom.settingsModal.querySelector('.modal-close-btn').addEventListener('click', () => {
            this.dom.settingsModal.style.display = 'none';
            this.render(); // Re-render main UI in case settings changed
        });
    }

    renderSettingsContent(target) {
        const contentArea = this.dom.settingsModal.querySelector('.settings-content');
        let html = '';
        switch(target) {
            case 'account':
                html = `
                    <h3>계정 관리</h3>
                    <p>아이디: ${this.state.account.username}</p>
                    <div class="form-group">
                        <label>새 비밀번호</label>
                        <input type="password" id="new-password" placeholder="새 비밀번호 입력">
                    </div>
                     <div class="form-group">
                        <label>새 비밀번호 확인</label>
                        <input type="password" id="confirm-password" placeholder="새 비밀번호 다시 입력">
                    </div>
                    <button id="save-password-btn">비밀번호 변경</button>
                `;
                break;
            case 'menu':
                html = `<h3>메뉴 관리</h3><div id="menu-editor-list"></div><button id="add-menu-item-btn">+ 새 메뉴 추가</button>`;
                break;
            case 'appearance':
                 html = `
                    <h3>디자인/레이아웃</h3>
                    <div class="form-group">
                        <label>레이아웃 비율 (왼쪽: ${this.state.settings.layout.frameRatio}%)</label>
                        <input type="range" id="layout-slider" min="15" max="40" value="${this.state.settings.layout.frameRatio}">
                    </div>
                    <h4>로그인 화면</h4>
                     <div class="form-group">
                        <label>환영 메시지</label>
                        <input type="text" id="login-msg-input" value="${this.state.settings.loginScreen.message}">
                    </div>
                `;
                break;
            case 'api':
                html = `
                    <h3>API 키 관리</h3>
                    <div class="form-group">
                        <label>날씨 API 키 (OpenWeatherMap)</label>
                        <input type="text" id="weather-api-key" value="${this.state.settings.weather.apiKey}">
                    </div>
                     <div class="form-group">
                        <label>날씨 도시 (영문)</label>
                        <input type="text" id="weather-city" value="${this.state.settings.weather.city}">
                    </div>
                    <button id="save-api-btn">API 정보 저장</button>
                `;
                break;
        }
        contentArea.innerHTML = html;
        this.setupSettingsEventListeners(target);
    }
    
    setupSettingsEventListeners(target) {
        switch(target) {
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
            case 'menu':
                // This is complex, will be implemented later
                break;
            case 'appearance':
                document.getElementById('layout-slider').addEventListener('input', e => {
                    this.state.settings.layout.frameRatio = e.target.value;
                    this.markAsDirty();
                    this.render();
                });
                document.getElementById('login-msg-input').addEventListener('input', e => {
                    this.state.settings.loginScreen.message = e.target.value;
                    this.markAsDirty();
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
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
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
