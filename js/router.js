export class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.authService = null;

        // Initialize router
        this.init();
    }

    init() {
        // Listen to hash changes
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        // Listen to popstate for browser back/forward
        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });
    }

    setAuthService(authService) {
        this.authService = authService;
    }

    addRoute(path, component, requireAuth = false, roles = []) {
        this.routes.set(path, {
            component,
            requireAuth,
            roles
        });
    }

    navigate(path) {
        window.location.hash = path;
    }

    getCurrentRoute() {
        const hash = window.location.hash.slice(1) || 'leaderboard';
        return hash.split('/')[0];
    }

    getRouteParams() {
        const hash = window.location.hash.slice(1);
        const parts = hash.split('/');
        return parts.slice(1);
    }

    async handleRouteChange() {
        const routePath = this.getCurrentRoute();
        const route = this.routes.get(routePath);

        if (!route) {
            // Route not found, redirect to leaderboard
            this.navigate('leaderboard');
            return;
        }

        // Check authentication if required
        if (route.requireAuth && this.authService) {
            const currentUser = this.authService.getCurrentUser();
            const currentRole = this.authService.getCurrentRole();

            if (!currentUser) {
                // Not authenticated, redirect to leaderboard
                this.navigate('leaderboard');
                return;
            }

            // Check role permissions
            if (route.roles.length > 0 && !route.roles.includes(currentRole?.type)) {
                // Insufficient permissions, redirect to dashboard or leaderboard
                if (this.authService.hasPermission('view_dashboard')) {
                    this.navigate('dashboard');
                } else {
                    this.navigate('leaderboard');
                }
                return;
            }
        }

        // Update navigation
        this.updateNavigation(routePath);

        // Render component
        // Render component
        const mainContent = document.getElementById('main-content');
        if (mainContent && route.component) {
            try {
                await route.component.render(mainContent);
                this.currentRoute = routePath;
            } catch (error) {
                console.error('Error rendering component:', error);
                mainContent.innerHTML = `
                   <div class="container">
                       <div class="card">
                           <div class="card-body text-center">
                               <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                               <h3>Error loading page</h3>
                               <p>Please try again or contact support.</p>
                               <button class="btn btn-primary" onclick="window.location.reload()">
                                   Reload Page
                               </button>
                           </div>
                       </div>
                   </div>
               `;
            }
        }
    }

    updateNavigation(currentRoute) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const route = link.getAttribute('data-route');
            if (route === currentRoute) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    updateNavigationVisibility(userRole) {
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            const route = link.getAttribute('data-route');
            let shouldShow = true;

            switch (route) {
                case 'leaderboard':
                    shouldShow = true; // Always visible
                    break;
                case 'dashboard':
                    shouldShow = this.authService?.hasPermission('view_dashboard') || false;
                    break;
                case 'teams':
                    shouldShow = this.authService?.hasPermission('manage_teams') ||
                        this.authService?.hasPermission('manage_subteams') ||
                        this.authService?.hasPermission('manage_members') || false;
                    break;
                case 'scores':
                    shouldShow = this.authService?.hasPermission('submit_scores') ||
                        this.authService?.hasPermission('review_scores') || false;
                    break;
            }

            link.style.display = shouldShow ? 'block' : 'none';
        });
    }
}