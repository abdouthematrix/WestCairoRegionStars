import { ImageUtils } from '../utils/image-utils.js';

export class LeaderboardComponent {
    constructor(firestoreService, i18n) {
        this.firestoreService = firestoreService;
        this.i18n = i18n;
        this.data = [];
    }

    async render(container) {
        try {
            // Show loading
            container.innerHTML = `
                <div class="container">
                    <div class="text-center">
                        <div class="spinner"></div>
                        <p class="mt-3" data-i18n="loading">Loading...</p>
                    </div>
                </div>
            `;

            // Load leaderboard data
            this.data = await this.firestoreService.getLeaderboardData();

            // Render leaderboard
            container.innerHTML = this.getHTML();
            this.i18n.updateTranslations();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error rendering leaderboard:', error);
            container.innerHTML = `
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
    }

    getHTML() {
        return `
            <div class="container fade-in">
                <div class="mb-4">
                    <h1 class="text-center mb-4">
                        <i class="fas fa-trophy text-warning"></i>
                        <span data-i18n="leaderboard">Leaderboard</span>
                    </h1>
                    
                    <div class="card">
                        <div class="card-header">
                            <div class="flex items-center justify-between">
                                <h3 class="mb-0" data-i18n="leaderboard">Leaderboard</h3>
                                <button class="btn btn-secondary btn-sm" id="refresh-leaderboard">
                                    <i class="fas fa-sync-alt"></i>
                                    <span>R</span>
                                </button>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            ${this.renderLeaderboard()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderLeaderboard() {
        if (!this.data || this.data.length === 0) {
            return `
                <div class="text-center p-4">
                    <i class="fas fa-chart-line fa-3x text-secondary mb-3"></i>
                    <h3 data-i18n="noData">No data available</h3>
                </div>
            `;
        }

        return this.data.map((entry, index) => {
            const memberImage = entry.member.imageBase64 ||
                ImageUtils.getDefaultAvatar(entry.member.name);
            const subTeamLeaderImage = entry.subTeam.leader?.imageBase64 ||
                ImageUtils.getDefaultAvatar(entry.subTeam.leader?.name || 'Leader');
            const teamLeaderImage = entry.team.leader?.imageBase64 ||
                ImageUtils.getDefaultAvatar(entry.team.leader?.name || 'Leader');

            return `
                <div class="leaderboard-item ${index < 3 ? 'top-performer' : ''}">
                    <div class="flex items-center gap-4 w-full">
                        <!-- Member Info -->
                        <div class="flex items-center gap-3">
                            <img src="${memberImage}" alt="${entry.member.name}" class="member-image">
                            <div class="member-info">
                                <div class="member-name">${entry.member.name}</div>
                                <div class="text-sm text-secondary">${entry.member.position || ''}</div>
                            </div>
                        </div>

                        <!-- Sub-Team Info -->
                        <div class="flex items-center gap-2 flex-1">
                            <div class="sub-team-color" style="background: ${entry.subTeam.color || '#3182ce'}; width: 12px; height: 12px; border-radius: 50%;"></div>
                            <div>
                                <div class="font-medium">${entry.subTeam.name}</div>
                                ${entry.subTeam.leader ? `
                                    <div class="flex items-center gap-1 text-sm text-secondary">
                                        <img src="${subTeamLeaderImage}" alt="${entry.subTeam.leader.name}" class="leader-image" style="width: 20px; height: 20px;">
                                        <span>${entry.subTeam.leader.name}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Team Info -->
                        <div class="flex items-center gap-2">
                            <div>
                                <div class="font-medium">${entry.team.name}</div>
                                ${entry.team.leader ? `
                                    <div class="flex items-center gap-1 text-sm text-secondary">
                                        <img src="${teamLeaderImage}" alt="${entry.team.leader.name}" class="leader-image" style="width: 20px; height: 20px;">
                                        <span>${entry.team.leader.name}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Score -->
                        <div class="score-badge ${index < 3 ? `rank-${index + 1}` : ''}">
                            ${entry.totalScore.toLocaleString()}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    attachEventListeners() {
        const refreshBtn = document.getElementById('refresh-leaderboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                await this.render(document.getElementById('main-content'));
            });
        }
    }
}