import { I18n } from './utils/i18n.js';
import { AuthService } from './services/auth.js';
import { FirestoreService } from './services/firestore.js';
import { Router } from './router.js';
import { LeaderboardComponent } from './components/leaderboard.js';
import { DashboardComponent } from './components/dashboard.js';
import { TeamsComponent } from './components/teams.js';
import { ScoresComponent } from './components/scores.js';

class App {
    constructor() {
        this.i18n = new I18n();
        this.authService = new AuthService();
        this.firestoreService = new FirestoreService(this.authService);
        this.router = new Router();

        this.components = {};
        this.isInitialized = false;

        // Make app globally accessible for components
        window.app = this;
    }

    async init() {
        try {
            // Initialize i18n
            await this.i18n.setLanguage(this.i18n.getCurrentLanguage());

            // Initialize components
            this.initializeComponents();

            // Setup router
            this.setupRouting();

            // Setup authentication
            this.setupAuthentication();

            // Setup event listeners
            this.setupEventListeners();

            this.router.handleRouteChange();

            // Hide loading screen
            this.hideLoadingScreen();

            this.isInitialized = true;

        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    initializeComponents() {
        this.components = {
            leaderboard: new LeaderboardComponent(this.firestoreService, this.i18n),
            dashboard: new DashboardComponent(this.firestoreService, this.authService, this.i18n),
            teams: new TeamsComponent(this.firestoreService, this.authService, this.i18n),
            scores: new ScoresComponent(this.firestoreService, this.authService, this.i18n)
        };
    }

    setupRouting() {
        this.router.setAuthService(this.authService);

        // Add routes
        this.router.addRoute('leaderboard', this.components.leaderboard);
        this.router.addRoute('dashboard', this.components.dashboard, true);
        this.router.addRoute('teams', this.components.teams, true);
        this.router.addRoute('scores', this.components.scores, true);
    }

    setupAuthentication() {
        // Listen for auth state changes
        this.authService.onAuthStateChanged((user, userRole) => {
            this.updateUIForAuth(user, userRole);
            this.router.updateNavigationVisibility(userRole);
        });
    }

    setupEventListeners() {
        // Language toggle
        const languageToggle = document.getElementById('language-toggle');
        if (languageToggle) {
            languageToggle.addEventListener('click', () => {
                this.toggleLanguage();
            });
        }

        // Login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.showLoginModal();
            });
        }

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await this.handleLogout();
            });
        }

        // User menu toggle
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                this.router.navigate(route);
            });
        });

        // Close login modal
        const closeLoginModal = document.getElementById('close-login-modal');
        if (closeLoginModal) {
            closeLoginModal.addEventListener('click', () => {
                this.hideLoginModal();
            });
        }

        // Close modal when clicking outside
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) {
                    this.hideLoginModal();
                }
            });
        }
    }

    async toggleLanguage() {
        const currentLang = this.i18n.getCurrentLanguage();
        const newLang = currentLang === 'en' ? 'ar' : 'en';

        await this.i18n.setLanguage(newLang);

        // Re-render current component if needed
        if (this.router.currentRoute && this.components[this.router.currentRoute]) {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                await this.components[this.router.currentRoute].render(mainContent);
            }
        }
    }

    updateUIForAuth(user, userRole) {
        const loginBtn = document.getElementById('login-btn');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');
        const userRoleSpan = document.getElementById('user-role');
        const header = document.getElementById('app-header');

        if (user && userRole) {
            // User is logged in
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (userName) userName.textContent = userRole.name || user.email.split('@')[0];
            if (userRoleSpan) userRoleSpan.textContent = this.i18n.t(userRole.type);
            if (header) header.style.display = 'block';
        } else {
            // User is not logged in
            if (loginBtn) loginBtn.style.display = 'block';
            if (userMenu) userMenu.style.display = 'none';
            if (header) header.style.display = 'block';
        }
    }

    showLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.add('show');

            // Focus on username field
            const usernameField = document.getElementById('username');
            if (usernameField) {
                setTimeout(() => usernameField.focus(), 100);
            }
        }
    }

    hideLoginModal() {
        const loginModal = document.getElementById('login-modal');
        const loginError = document.getElementById('login-error');
        const loginForm = document.getElementById('login-form');

        if (loginModal) {
            loginModal.classList.remove('show');
        }

        if (loginError) {
            loginError.style.display = 'none';
        }

        if (loginForm) {
            loginForm.reset();
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('login-error');
        const submitBtn = document.querySelector('#login-form button[type="submit"]');

        // Validate input
        if (!username || !password) {
            this.showLoginError(this.i18n.t('error.loginFailed'));
            return;
        }

        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const result = await this.authService.login(username, password);

            if (result.success) {
                this.hideLoginModal();

                // Navigate to dashboard if user has permission, otherwise stay on leaderboard
                if (this.authService.hasPermission('view_dashboard')) {
                    this.router.navigate('dashboard');
                }
            } else {
                this.showLoginError(this.i18n.t('error.loginFailed'));
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError(this.i18n.t('error.networkError'));
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    showLoginError(message) {
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
    }

    async handleLogout() {
        try {
            await this.authService.logout();

            // Navigate to leaderboard
            this.router.navigate('leaderboard');

            // Close user dropdown
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown) {
                userDropdown.classList.remove('show');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert(this.i18n.t('error.unknown'));
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
    }

    showError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-exclamation-triangle fa-3x text-error mb-3"></i>
                    <p class="text-error">${message}</p>
                    <button class="btn btn-primary mt-3" onclick="window.location.reload()">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.init();
});

// Export for global access
window.App = App;