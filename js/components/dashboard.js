import { DateUtils } from '../utils/date-utils.js';

export class DashboardComponent {
    constructor(firestoreService, authService, i18n) {
        this.firestoreService = firestoreService;
        this.authService = authService;
        this.i18n = i18n;
        this.stats = {};
    }

    async render(container) {
        try {
            const userRole = this.authService.getCurrentRole();

            if (!this.authService.hasPermission('view_dashboard')) {
                container.innerHTML = this.getUnauthorizedHTML();
                return;
            }

            // Show loading
            container.innerHTML = this.getLoadingHTML();

            // Load dashboard data
            await this.loadDashboardData();

            // Render dashboard
            container.innerHTML = this.getHTML();
            this.i18n.updateTranslations();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            container.innerHTML = this.getErrorHTML();
        }
    }

    async loadDashboardData() {
        const userRole = this.authService.getCurrentRole();

        try {
            let teams, scores, leaders;

            if (userRole.type === 'admin') {
                // Admin can see all data
                [teams, scores, leaders] = await Promise.all([
                    this.firestoreService.getTeams(),
                    this.firestoreService.getScores(),
                    this.firestoreService.getLeaders()
                ]);
            } else if (userRole.type === 'branch') {
                // Branch leader can see their team data
                const team = await this.firestoreService.getTeam(userRole.teamId);
                teams = team ? [team] : [];
                scores = await this.firestoreService.getScores({ teamId: userRole.teamId });
                leaders = await this.firestoreService.getLeaders();
            } else if (userRole.type === 'subTeam') {
                // Sub-team leader can see their sub-team data
                const team = await this.firestoreService.getTeam(userRole.teamId);
                teams = team ? [team] : [];
                scores = await this.firestoreService.getScores({
                    teamId: userRole.teamId,
                    subTeamId: userRole.subTeamId
                });
                leaders = await this.firestoreService.getLeaders();
            }

            this.stats = this.calculateStats(teams, scores, leaders);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        }
    }

    calculateStats(teams, scores, leaders) {
        const stats = {
            totalTeams: teams.length,
            totalSubTeams: 0,
            totalMembers: 0,
            totalLeaders: leaders.length,
            todayScores: 0,
            pendingReviews: 0,
            totalScore: 0,
            avgScore: 0
        };

        const today = DateUtils.getTodayString();
        const todayScores = scores.filter(score => score.date === today);
        const pendingScores = scores.filter(score => !score.reviewedScores && !score.unavailable);

        stats.todayScores = todayScores.length;
        stats.pendingReviews = pendingScores.length;

        // Calculate total scores from reviewed scores
        const reviewedScores = scores.filter(score => score.reviewedScores && !score.unavailable);
        stats.totalScore = reviewedScores.reduce((total, score) => {
            const scoreSum = Object.values(score.reviewedScores)
                .filter(val => typeof val === 'number')
                .reduce((sum, val) => sum + val, 0);
            return total + scoreSum;
        }, 0);

        stats.avgScore = reviewedScores.length > 0 ? Math.round(stats.totalScore / reviewedScores.length) : 0;

        return stats;
    }

    getHTML() {
        const userRole = this.authService.getCurrentRole();

        return `
            <div class="container fade-in">
                <div class="mb-4">
                    <h1>
                        <i class="fas fa-tachometer-alt"></i>
                        <span data-i18n="dashboard">Dashboard</span>
                    </h1>
                    <p class="text-secondary">
                        <span data-i18n="welcome">Welcome</span>, ${userRole.name}
                        <span class="badge badge-info ml-2">${userRole.type}</span>
                    </p>
                </div>

                <!-- Stats Cards -->
                <div class="grid grid-4 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-secondary text-sm mb-1" data-i18n="totalScore">Total Score</p>
                                    <h3 class="mb-0">${this.stats.totalScore.toLocaleString()}</h3>
                                </div>
                                <i class="fas fa-chart-line fa-2x text-primary"></i>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-body">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-secondary text-sm mb-1" data-i18n="todayScores">Today's Scores</p>
                                    <h3 class="mb-0">${this.stats.todayScores}</h3>
                                </div>
                                <i class="fas fa-calendar-day fa-2x text-success"></i>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-body">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-secondary text-sm mb-1" data-i18n="pendingReviews">Pending Reviews</p>
                                    <h3 class="mb-0">${this.stats.pendingReviews}</h3>
                                </div>
                                <i class="fas fa-clock fa-2x text-warning"></i>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-body">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-secondary text-sm mb-1" data-i18n="avgScore">Average Score</p>
                                    <h3 class="mb-0">${this.stats.avgScore}</h3>
                                </div>
                                <i class="fas fa-chart-bar fa-2x text-info"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="mb-0" data-i18n="quickActions">Quick Actions</h3>
                    </div>
                    <div class="card-body">
                        <div class="grid grid-3 gap-3">
                            ${this.renderQuickActions()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderQuickActions() {
        const userRole = this.authService.getCurrentRole();
        const actions = [];

        if (this.authService.hasPermission('manage_teams')) {
            actions.push({
                icon: 'fas fa-users',
                title: 'Manage Teams',
                titleKey: 'manageTeams',
                route: 'teams',
                color: 'primary'
            });
        }

        if (this.authService.hasPermission('submit_scores')) {
            actions.push({
                icon: 'fas fa-plus',
                title: 'Add Scores',
                titleKey: 'addScores',
                route: 'scores',
                color: 'success'
            });
        }

        if (this.authService.hasPermission('review_scores')) {
            actions.push({
                icon: 'fas fa-check-circle',
                title: 'Review Scores',
                titleKey: 'reviewScores',
                route: 'scores',
                color: 'warning'
            });
        }

        actions.push({
            icon: 'fas fa-trophy',
            title: 'View Leaderboard',
            titleKey: 'viewLeaderboard',
            route: 'leaderboard',
            color: 'info'
        });

        return actions.map(action => `
            <button class="btn btn-${action.color} btn-block quick-action-btn" data-route="${action.route}">
                <i class="${action.icon} fa-2x mb-2"></i>
                <div data-i18n="${action.titleKey}">${action.title}</div>
            </button>
        `).join('');
    }

    attachEventListeners() {
        const actionButtons = document.querySelectorAll('.quick-action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const route = btn.getAttribute('data-route');
                window.app.router.navigate(route);
            });
        });
    }

    getLoadingHTML() {
        return `
            <div class="container">
                <div class="text-center">
                    <div class="spinner"></div>
                    <p class="mt-3" data-i18n="loading">Loading...</p>
                </div>
            </div>
        `;
    }

    getErrorHTML() {
        return `
            <div class="container">
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                        <h3 data-i18n="error.networkError">Network error. Please try again.</h3>
                    </div>
                </div>
            </div>
        `;
    }

    getUnauthorizedHTML() {
        return `
            <div class="container">
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas fa-lock text-error fa-3x mb-3"></i>
                        <h3 data-i18n="error.unauthorized">You are not authorized to view this page.</h3>
                        <button class="btn btn-primary mt-3" onclick="window.app.router.navigate('leaderboard')">
                            <span data-i18n="viewLeaderboard">View Leaderboard</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}