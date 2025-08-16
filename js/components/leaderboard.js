import { ImageUtils } from '../utils/image-utils.js';
import { DateUtils } from '../utils/date-utils.js';

export class LeaderboardComponent {
    constructor(firestoreService, i18n) {
        this.firestoreService = firestoreService;
        this.i18n = i18n;
        this.data = [];
        this.selectedDate = DateUtils.getTodayString();
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
            const filters = {};
            if (this.selectedDate) {
                filters.date = this.selectedDate;
            }
            this.data = await this.firestoreService.getLeaderboardData(filters);

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

                    <!-- ADD THIS FILTER SECTION -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="flex items-center gap-3">
                                <div class="form-group">
                                    <label data-i18n="date">Date</label>
                                    <input type="date" id="date-filter" value="${this.selectedDate}">
                                </div>
                                <button class="btn btn-secondary" id="filter-leaderboard">
                                    <i class="fas fa-filter"></i>
                                    <span data-i18n="filter">Filter</span>
                                </button>
                                <button class="btn btn-primary" id="clear-filter">
                                    <i class="fas fa-times"></i>
                                    <span data-i18n="clear">clear</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <!-- END FILTER SECTION -->
                    
                    <div class="card">                       
                        <div class="card-body p-0">
                            ${this.renderLeaderboard()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderLeaderboard() {
        if (!this.data || !this.data.all || this.data.all.length === 0) {
            return `
            <div class="text-center p-4">
                <i class="fas fa-chart-line fa-3x text-secondary mb-3"></i>
                <h3 data-i18n="noData">No data available</h3>
            </div>
        `;
        }

        return `
    <!-- Achievers Section -->
    <div class="mb-4">
        <h4 class="bg-success text-white p-2 mb-2">
            <i class="fas fa-star"></i> 
            <span data-i18n="achieversTitle">Achievers</span> (${this.data.achievers.length}) - 
            <span data-i18n="achieversCondition">2+ Products</span>
        </h4>
        ${this.data.achievers.length > 0 ?
                this.data.achievers.slice(0, 10).map((entry, index) => this.renderMemberRow(entry, index)).join('') :
                '<p class="text-center p-2 text-secondary" data-i18n="noAchievers">No achievers found</p>'
            }
    </div>

    <!-- Team Leaders Section -->
<div class="mb-4">
    <h4 class="bg-info text-white p-2 mb-2">
        <i class="fas fa-crown"></i>
        <span data-i18n="qualifiedLeadersTitle">Qualified Team Leaders</span> (${this.data.teamLeaders.length})
    </h4>
    ${this.data.teamLeaders.length > 0 ?
                this.data.teamLeaders.slice(0, 10).map((leader, index) => this.renderLeaderRow(leader, index)).join('') :
                '<p class="text-center p-2 text-secondary" data-i18n="noQualifiedLeaders">No qualified team leaders</p>'
        }
</div>

    <!-- Active Teams Section -->
    <div class="mb-4">
        <h4 class="bg-primary text-white p-2 mb-2">
            <i class="fas fa-users"></i> 
            <span data-i18n="qualifiedTeamsTitle">Qualified Teams</span> (${this.data.activeTeams.length}) - 
            <span data-i18n="qualifiedTeamsCondition">All Available Members Active</span>
        </h4>
        ${this.data.activeTeams.length > 0 ?
                this.data.activeTeams.map(team => `
                <div class="border p-3 mb-2">
                    <div class="flex justify-between items-center">
                        <div>
                            <strong>${team.name}</strong>
                            <div class="text-sm text-secondary">
                                ${team.activeMembers}/${team.availableMembers} <span data-i18n="active">active</span>
                                ${team.unavailableCount > 0 ? ` (${team.unavailableCount} <span data-i18n="unavailable">unavailable</span>)` : ''}
                            </div>
                        </div>
                        <div class="score-badge">${team.totalScore.toLocaleString()}</div>
                    </div>
                </div>
            `).join('') :
                '<p class="text-center p-2 text-secondary" data-i18n="noQualifiedTeams">No qualified teams</p>'
            }
    </div>




    <!-- Teams with Zero Score Members -->
    <div class="mb-4">
        <h4 class="bg-warning text-white p-2 mb-2">
            <i class="fas fa-exclamation-triangle"></i> 
            <span data-i18n="zeroScoreTeamsTitle">Zero Score Teams</span> (${this.data.teamsWithZeroScoreMembers.length})
        </h4>
        ${this.data.teamsWithZeroScoreMembers.length > 0 ? `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th data-i18n="team">Team</th>
                            <th data-i18n="subTeam">Sub-Team</th>
                            <th data-i18n="leader">Leader</th>
                            <th data-i18n="count">Count</th>
                            <th data-i18n="zeroScoreMembers">Zero Score Members</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.teamsWithZeroScoreMembers.map(teamStat => {
                const groupedBySubTeam = teamStat.zeroScoreMembers.reduce((groups, member) => {
                    if (!groups[member.subTeam]) {
                        groups[member.subTeam] = [];
                    }
                    groups[member.subTeam].push(member);
                    return groups;
                }, {});

                const subTeamRows = Object.entries(groupedBySubTeam).map(([subTeamName, members], index) => {
                    const subTeamData = this.getSubTeamData(teamStat.team.id, subTeamName);
                    let leader = null;
                    let isTeamLeaderFallback = false;

                    if (subTeamData?.leaderId?.id) {
                        leader = this.data.leaders?.find(l => l.id === subTeamData.leaderId.id);
                    }

                    if (!leader && teamStat.team.leader) {
                        leader = teamStat.team.leader;
                        isTeamLeaderFallback = true;
                    }

                    return `
                                    <tr>
                                        ${index === 0 ? `
                                            <td rowspan="${Object.keys(groupedBySubTeam).length}">
                                                <strong>${teamStat.team.name}</strong>
                                            </td>
                                        ` : ''}
                                        <td>
                                            <div class="flex items-center gap-2">
                                                <div class="w-3 h-3 rounded-full" style="background-color: ${subTeamData?.color || '#f59e0b'}"></div>
                                                <span>${subTeamName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            ${leader ? `
                                                <div class="flex items-center gap-2">
                                                    <img src="${leader.imageBase64 || ImageUtils.getDefaultAvatar(leader.name)}" 
                                                         alt="${leader.name}" 
                                                         class="member-image">
                                                    <div>
                                                        <span>${leader.name}</span>
                                                        ${isTeamLeaderFallback ? `
                                                            <div class="text-xs text-secondary" data-i18n="teamLeader">Team Leader</div>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                            ` : '<span class="text-secondary" data-i18n="noLeader">No Leader</span>'}
                                        </td>
                                        <td>
                                            <span class="badge badge-warning">${members.length}</span>
                                        </td>
                                        <td>
                                            <div class="member-list">
                                                ${members.map(member => `
                                                    <span class="member-tag">${member.name}</span>
                                                `).join('')}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                });

                return subTeamRows.join('');
            }).join('')}
                    </tbody>
                </table>
            </div>
        ` : `
            <div class="text-center p-4 text-secondary" data-i18n="allActive">All teams are fully active! 🎉</div>
        `}
    </div>
    `;
    }

    getSubTeamData(teamId, subTeamName) {
        // Use the teams data from the leaderboard data
        const team = this.data.teams?.find(t => t.id === teamId);
        if (!team?.subTeams) return null;

        // Find the sub-team by name
        return team.subTeams.find(st => st.name === subTeamName);
    }

    renderMemberRow(entry, index) {
        const memberImage = entry.member.imageBase64 ||
            ImageUtils.getDefaultAvatar(entry.member.name);

        return `
        <div class="leaderboard-item">
            <div class="flex items-center gap-4 w-full">
                <div class="flex items-center gap-3">
                    <img src="${memberImage}" alt="${entry.member.name}" class="member-image">
                    <div class="member-info">
                        <div class="member-name">${entry.member.name}</div>
                        <div class="text-sm text-secondary">${entry.productCount} products</div>
                    </div>
                </div>
                <div class="flex-1 text-center">${entry.subTeam.name}</div>
                <div class="flex-1 text-center">${entry.team.name}</div>
                <div class="score-badge">
                    ${entry.totalScore.toLocaleString()}
                </div>
            </div>
        </div>
    `;
    }

    renderLeaderRow(leader, index) {
        const leaderImage = leader.imageBase64 ||
            ImageUtils.getDefaultAvatar(leader.name);

        return `
    <div class="leaderboard-item">
        <div class="flex items-center gap-4 w-full">
            <div class="flex items-center gap-3">

                <img src="${leaderImage}" alt="${leader.name}" class="member-image">
                <div>
                    <strong>${leader.name}</strong>
                    <div class="text-sm text-secondary">
                        ${leader.team.name} - ${leader.teamMembers} <span data-i18n="availableMembers">available members</span>
                        ${leader.unavailableMembers > 0 ?
                ` (${leader.unavailableMembers} <span data-i18n="unavailable">unavailable</span>)` : ''}
                    </div>
                </div>
            </div>
            <div class="score-badge">
                ${leader.teamScore.toLocaleString()}
            </div>
        </div>
    </div>
    `;
    }

    attachEventListeners() {
        // ADD THESE EVENT LISTENERS
        const dateFilter = document.getElementById('date-filter');
        const filterBtn = document.getElementById('filter-leaderboard');
        const clearBtn = document.getElementById('clear-filter');

        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.selectedDate = dateFilter.value;
            });
        }

        if (filterBtn) {
            filterBtn.addEventListener('click', async () => {
                await this.render(document.getElementById('main-content'));
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                this.selectedDate = '';
                await this.render(document.getElementById('main-content'));
            });
        }       
    }
}