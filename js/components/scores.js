import { DateUtils } from '../utils/date-utils.js';

export class ScoresComponent {
    constructor(firestoreService, authService, i18n) {
        this.firestoreService = firestoreService;
        this.authService = authService;
        this.i18n = i18n;
        this.teams = [];
        this.scores = [];
        this.selectedDate = DateUtils.getTodayString();
        this.selectedTeamId = '';
        this.selectedSubTeamId = '';
        this.products = ['securedLoan', 'unsecuredLoan', 'securedCreditCard', 'unsecuredCreditCard', 'bancassurance'];
    }

    async render(container) {
        try {
            if (!this.authService.hasPermission('view_dashboard')) {
                container.innerHTML = this.getUnauthorizedHTML();
                return;
            }

            // Show loading
            container.innerHTML = this.getLoadingHTML();

            // Load data
            await this.loadData();

            // Render scores view
            container.innerHTML = this.getHTML();
            this.i18n.updateTranslations();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error rendering scores:', error);
            container.innerHTML = this.getErrorHTML();
        }
    }

    async loadData() {
        const userRole = this.authService.getCurrentRole();

        // Load teams based on user role
        if (userRole.type === 'admin') {
            this.teams = await this.firestoreService.getTeams();
        } else if (userRole.type === 'branch') {
            const team = await this.firestoreService.getTeam(userRole.teamId);
            this.teams = team ? [team] : [];
            this.selectedTeamId = userRole.teamId;
        } else if (userRole.type === 'subTeam') {
            const team = await this.firestoreService.getTeam(userRole.teamId);
            this.teams = team ? [team] : [];
            this.selectedTeamId = userRole.teamId;
            this.selectedSubTeamId = userRole.subTeamId;
        }

        // Load sub-teams and members for each team
        for (const team of this.teams) {
            team.subTeams = await this.firestoreService.getSubTeams(team.id);
            for (const subTeam of team.subTeams) {
                subTeam.members = await this.firestoreService.getMembers(team.id, subTeam.id);
            }
        }

        // Load scores
        await this.loadScores();
    }

    async loadScores() {
        const filters = { date: this.selectedDate };

        if (this.selectedTeamId) {
            filters.teamId = this.selectedTeamId;
        }
        if (this.selectedSubTeamId) {
            filters.subTeamId = this.selectedSubTeamId;
        }

        this.scores = await this.firestoreService.getScores(filters);
    }

    getHTML() {
        return `
            <div class="container fade-in">
                <div class="mb-4">
                    <h1>
                        <i class="fas fa-chart-line"></i>
                        <span data-i18n="scores">Scores</span>
                    </h1>
                </div>

                <!-- Filters -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="grid grid-3">
                            <div class="form-group">
                                <label data-i18n="date">Date</label>
                                <input type="date" id="date-filter" value="${this.selectedDate}">
                            </div>
                            ${this.authService.getCurrentRole().type === 'admin' ? `
                                <div class="form-group">
                                    <label data-i18n="team">Team</label>
                                    <select id="team-filter">
                                        <option value="">All Teams</option>
                                        ${this.teams.map(team => `
                                        <option value="${team.id}" ${this.selectedTeamId === team.id ? 'selected' : ''}>
                                               ${team.name}
                                           </option>
                                       `).join('')}
                                   </select>
                               </div>
                           ` : ''}
                           <div class="form-group">
                               <label data-i18n="subTeam">Sub Team</label>
                               <select id="subteam-filter">
                                   <option value="">All Sub Teams</option>
                                   ${this.getSubTeamOptions()}
                               </select>
                           </div>
                       </div>
                       <div class="flex gap-2 mt-3">
                           <button class="btn btn-secondary" id="filter-scores">
                               <i class="fas fa-filter"></i>
                               <span data-i18n="filter">Filter</span>
                           </button>
                           <button class="btn btn-primary" id="add-score-btn">
                               <i class="fas fa-plus"></i>
                               <span data-i18n="addScore">Add Score</span>
                           </button>
                       </div>
                   </div>
               </div>

               <!-- Scores Table -->
               <div class="card">
                   <div class="card-header">
                       <h3 class="mb-0">
                           <span data-i18n="scores">Scores</span> - ${DateUtils.formatDate(this.selectedDate, this.i18n.getCurrentLanguage())}
                       </h3>
                   </div>
                   <div class="card-body p-0">
                       ${this.renderScoresTable()}
                   </div>
               </div>

               ${this.renderModals()}
           </div>
       `;
    }

    getSubTeamOptions() {
        if (!this.selectedTeamId) {
            // Show all subteams from all teams
            return this.teams.flatMap(team =>
                team.subTeams?.map(subTeam => `
                   <option value="${subTeam.id}" ${this.selectedSubTeamId === subTeam.id ? 'selected' : ''}>
                       ${team.name} - ${subTeam.name}
                   </option>
               `) || []
            ).join('');
        } else {
            // Show subteams from selected team only
            const selectedTeam = this.teams.find(t => t.id === this.selectedTeamId);
            if (!selectedTeam?.subTeams) return '';

            return selectedTeam.subTeams.map(subTeam => `
               <option value="${subTeam.id}" ${this.selectedSubTeamId === subTeam.id ? 'selected' : ''}>
                   ${subTeam.name}
               </option>
           `).join('');
        }
    }

    renderScoresTable() {
        if (this.scores.length === 0) {
            return `
               <div class="text-center py-4">
                   <i class="fas fa-chart-line fa-3x text-secondary mb-3"></i>
                   <p data-i18n="noData">No scores available for selected criteria</p>
               </div>
           `;
        }

        return `
           <div class="table-container">
               <table class="table">
                   <thead>
                       <tr>
                           <th data-i18n="member">Member</th>
                           <th data-i18n="team">Team</th>
                           <th data-i18n="subTeam">Sub Team</th>
                           ${this.products.map(product => `
                               <th data-i18n="${product}">${this.i18n.t(product)}</th>
                           `).join('')}
                           <th data-i18n="totalScore">Total</th>
                           <th data-i18n="status">Status</th>
                           <th data-i18n="actions">Actions</th>
                       </tr>
                   </thead>
                   <tbody>
                       ${this.scores.map(score => this.renderScoreRow(score)).join('')}
                   </tbody>
               </table>
           </div>
       `;
    }

    renderScoreRow(score) {
        const team = this.teams.find(t => t.id === score.teamId);
        const subTeam = team?.subTeams?.find(st => st.id === score.subTeamId);
        const member = subTeam?.members?.find(m => m.id === score.memberId);

        if (!member || !subTeam || !team) {
            return ''; // Skip if data is incomplete
        }

        const scores = score.reviewedScores || score.scores || {};
        const totalScore = Object.values(scores)
            .filter(val => typeof val === 'number')
            .reduce((sum, val) => sum + val, 0);

        const status = score.unavailable ? 'unavailable' :
            score.reviewedScores ? 'approved' : 'pending';

        const canEdit = this.authService.canSubmitScores(score.teamId, score.subTeamId);
        const canReview = this.authService.hasPermission('review_scores');

        return `
           <tr>
               <td>${member.name}</td>
               <td>${team.name}</td>
               <td>
                   <div class="flex items-center gap-2">
                       <div class="w-3 h-3 rounded-full" style="background: ${subTeam.color || '#3182ce'}"></div>
                       ${subTeam.name}
                   </div>
               </td>
               ${this.products.map(product => `
                   <td>${scores[product] || 0}</td>
               `).join('')}
               <td class="font-bold">${totalScore}</td>
               <td>
                   <span class="badge badge-${this.getStatusColor(status)}" data-i18n="${status}">
                       ${this.i18n.t(status)}
                   </span>
               </td>
               <td>
                   <div class="flex gap-1">
                       ${canEdit && !score.reviewedScores ? `
                           <button class="btn btn-sm btn-secondary edit-score-btn" 
                                   data-score-id="${score.id}" title="Edit">
                               <i class="fas fa-edit"></i>
                           </button>
                       ` : ''}
                       ${canReview && !score.reviewedScores ? `
                           <button class="btn btn-sm btn-warning review-score-btn" 
                                   data-score-id="${score.id}" title="Review">
                               <i class="fas fa-check"></i>
                           </button>
                       ` : ''}
                       ${(canEdit || canReview) ? `
                           <button class="btn btn-sm btn-error delete-score-btn" 
                                   data-score-id="${score.id}" title="Delete">
                               <i class="fas fa-trash"></i>
                           </button>
                       ` : ''}
                   </div>
               </td>
           </tr>
       `;
    }

    getStatusColor(status) {
        switch (status) {
            case 'approved': return 'success';
            case 'pending': return 'warning';
            case 'unavailable': return 'error';
            default: return 'info';
        }
    }

    renderModals() {
        return `
           <!-- Add/Edit Score Modal -->
           <div class="modal" id="score-modal">
               <div class="modal-content" style="max-width: 600px;">
                   <div class="modal-header">
                       <h2 id="score-modal-title" data-i18n="addScore">Add Score</h2>
                       <button class="btn-close" id="close-score-modal">
                           <i class="fas fa-times"></i>
                       </button>
                   </div>
                   <form id="score-form">
                       <div class="modal-body">
                           <div class="grid grid-2 mb-4">
                               <div class="form-group">
                                   <label data-i18n="date">Date</label>
                                   <input type="date" id="score-date" required>
                               </div>
                               <div class="form-group">
                                   <label data-i18n="team">Team</label>
                                   <select id="score-team" required>
                                       <option value="">Select Team</option>
                                       ${this.teams.map(team => `
                                           <option value="${team.id}">${team.name}</option>
                                       `).join('')}
                                   </select>
                               </div>
                               <div class="form-group">
                                   <label data-i18n="subTeam">Sub Team</label>
                                   <select id="score-subteam" required>
                                       <option value="">Select Sub Team</option>
                                   </select>
                               </div>
                               <div class="form-group">
                                   <label data-i18n="member">Member</label>
                                   <select id="score-member" required>
                                       <option value="">Select Member</option>
                                   </select>
                               </div>
                           </div>

                           <div class="form-group">
                               <div class="flex items-center gap-2 mb-2">
                                   <input type="checkbox" id="score-unavailable">
                                   <label for="score-unavailable" data-i18n="unavailable">Member Unavailable</label>
                               </div>
                           </div>

                           <div id="score-inputs">
                               <h4 class="mb-3" data-i18n="productScores">Product Scores</h4>
                               <div class="grid grid-2">
                                   ${this.products.map(product => `
                                       <div class="form-group">
                                           <label data-i18n="${product}">${this.i18n.t(product)}</label>
                                           <input type="number" id="score-${product}" min="0" value="0">
                                       </div>
                                   `).join('')}
                               </div>
                           </div>
                       </div>
                       <div class="modal-footer">
                           <button type="button" class="btn btn-secondary" id="cancel-score">
                               <span data-i18n="cancel">Cancel</span>
                           </button>
                           <button type="submit" class="btn btn-primary">
                               <span data-i18n="save">Save</span>
                           </button>
                       </div>
                   </form>
               </div>
           </div>

           <!-- Review Score Modal -->
           <div class="modal" id="review-modal">
               <div class="modal-content" style="max-width: 600px;">
                   <div class="modal-header">
                       <h2 data-i18n="reviewScore">Review Score</h2>
                       <button class="btn-close" id="close-review-modal">
                           <i class="fas fa-times"></i>
                       </button>
                   </div>
                   <form id="review-form">
                       <div class="modal-body">
                           <div id="review-member-info" class="mb-4">
                               <!-- Member info will be populated here -->
                           </div>

                           <div class="mb-4">
                               <h4 data-i18n="originalScores">Original Scores</h4>
                               <div id="original-scores" class="grid grid-2">
                                   <!-- Original scores will be populated here -->
                               </div>
                           </div>

                           <div>
                               <h4 data-i18n="reviewedScores">Reviewed Scores</h4>
                               <div class="grid grid-2">
                                   ${this.products.map(product => `
                                       <div class="form-group">
                                           <label data-i18n="${product}">${this.i18n.t(product)}</label>
                                           <input type="number" id="review-${product}" min="0" value="0">
                                       </div>
                                   `).join('')}
                               </div>
                           </div>
                       </div>
                       <div class="modal-footer">
                           <button type="button" class="btn btn-secondary" id="cancel-review">
                               <span data-i18n="cancel">Cancel</span>
                           </button>
                           <button type="submit" class="btn btn-success">
                               <span data-i18n="approve">Approve</span>
                           </button>
                       </div>
                   </form>
               </div>
           </div>
       `;
    }

    attachEventListeners() {
        // Filter controls
        const dateFilter = document.getElementById('date-filter');
        const teamFilter = document.getElementById('team-filter');
        const subTeamFilter = document.getElementById('subteam-filter');
        const filterBtn = document.getElementById('filter-scores');

        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.selectedDate = dateFilter.value;
            });
        }

        if (teamFilter) {
            teamFilter.addEventListener('change', () => {
                this.selectedTeamId = teamFilter.value;
                this.selectedSubTeamId = '';
                this.updateSubTeamFilter();
            });
        }

        if (subTeamFilter) {
            subTeamFilter.addEventListener('change', () => {
                this.selectedSubTeamId = subTeamFilter.value;
            });
        }

        if (filterBtn) {
            filterBtn.addEventListener('click', async () => {
                await this.render(document.getElementById('main-content'));
            });
        }

        // Action buttons
        const addScoreBtn = document.getElementById('add-score-btn');
        if (addScoreBtn) {
            addScoreBtn.addEventListener('click', () => {
                this.openScoreModal();
            });
        }

        // Table action buttons
        this.attachTableActionListeners();

        // Modal listeners
        this.attachModalListeners();
    }

    attachTableActionListeners() {
        // Edit score buttons
        const editScoreBtns = document.querySelectorAll('.edit-score-btn');
        editScoreBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const scoreId = btn.getAttribute('data-score-id');
                const score = this.scores.find(s => s.id === scoreId);
                this.openScoreModal(score);
            });
        });

        // Review score buttons
        const reviewScoreBtns = document.querySelectorAll('.review-score-btn');
        reviewScoreBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const scoreId = btn.getAttribute('data-score-id');
                const score = this.scores.find(s => s.id === scoreId);
                this.openReviewModal(score);
            });
        });

        // Delete score buttons
        const deleteScoreBtns = document.querySelectorAll('.delete-score-btn');
        deleteScoreBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const scoreId = btn.getAttribute('data-score-id');
                if (confirm(this.i18n.t('confirm.delete'))) {
                    await this.deleteScore(scoreId);
                }
            });
        });
    }

    attachModalListeners() {
        // Score modal
        const scoreForm = document.getElementById('score-form');
        if (scoreForm) {
            scoreForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleScoreSubmit();
            });
        }

        // Review modal
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleReviewSubmit();
            });
        }

        // Close modal buttons
        this.attachCloseModalListeners();

        // Score modal cascading dropdowns
        this.attachScoreModalCascading();

        // Unavailable checkbox
        const unavailableCheckbox = document.getElementById('score-unavailable');
        if (unavailableCheckbox) {
            unavailableCheckbox.addEventListener('change', () => {
                const scoreInputs = document.getElementById('score-inputs');
                if (unavailableCheckbox.checked) {
                    scoreInputs.style.display = 'none';
                } else {
                    scoreInputs.style.display = 'block';
                }
            });
        }
    }

    attachScoreModalCascading() {
        const teamSelect = document.getElementById('score-team');
        const subTeamSelect = document.getElementById('score-subteam');
        const memberSelect = document.getElementById('score-member');

        if (teamSelect) {
            teamSelect.addEventListener('change', () => {
                const teamId = teamSelect.value;
                this.updateScoreSubTeams(teamId);
                this.updateScoreMembers('', '');
            });
        }

        if (subTeamSelect) {
            subTeamSelect.addEventListener('change', () => {
                const teamId = teamSelect.value;
                const subTeamId = subTeamSelect.value;
                this.updateScoreMembers(teamId, subTeamId);
            });
        }
    }

    updateSubTeamFilter() {
        const subTeamFilter = document.getElementById('subteam-filter');
        if (!subTeamFilter) return;

        subTeamFilter.innerHTML = '<option value="">All Sub Teams</option>';
        subTeamFilter.innerHTML += this.getSubTeamOptions();
    }

    updateScoreSubTeams(teamId) {
        const subTeamSelect = document.getElementById('score-subteam');
        if (!subTeamSelect) return;

        subTeamSelect.innerHTML = '<option value="">Select Sub Team</option>';

        if (teamId) {
            const team = this.teams.find(t => t.id === teamId);
            if (team?.subTeams) {
                team.subTeams.forEach(subTeam => {
                    const option = document.createElement('option');
                    option.value = subTeam.id;
                    option.textContent = subTeam.name;
                    subTeamSelect.appendChild(option);
                });
            }
        }
    }

    updateScoreMembers(teamId, subTeamId) {
        const memberSelect = document.getElementById('score-member');
        if (!memberSelect) return;

        memberSelect.innerHTML = '<option value="">Select Member</option>';

        if (teamId && subTeamId) {
            const team = this.teams.find(t => t.id === teamId);
            const subTeam = team?.subTeams?.find(st => st.id === subTeamId);
            if (subTeam?.members) {
                subTeam.members.forEach(member => {
                    const option = document.createElement('option');
                    option.value = member.id;
                    option.textContent = member.name;
                    memberSelect.appendChild(option);
                });
            }
        }
    }

    attachCloseModalListeners() {
        const modals = ['score-modal', 'review-modal'];

        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            const closeBtn = document.getElementById(`close-${modalId.replace('-modal', '')}-modal`);
            const cancelBtn = document.getElementById(`cancel-${modalId.replace('-modal', '')}`);

            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModal(modalId);
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.closeModal(modalId);
                });
            }

            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modalId);
                    }
                });
            }
        });
    }

    // Modal operations
    openScoreModal(score = null) {
        const modal = document.getElementById('score-modal');
        const title = document.getElementById('score-modal-title');

        if (score) {
            title.textContent = this.i18n.t('edit') + ' ' + this.i18n.t('score');
            this.populateScoreModal(score);
            modal.setAttribute('data-edit-id', score.id);
        } else {
            title.textContent = this.i18n.t('addScore');
            this.resetScoreModal();
            modal.removeAttribute('data-edit-id');
        }

        modal.classList.add('show');
    }

    populateScoreModal(score) {
        document.getElementById('score-date').value = score.date;
        document.getElementById('score-team').value = score.teamId;
        document.getElementById('score-unavailable').checked = score.unavailable || false;

        this.updateScoreSubTeams(score.teamId);
        setTimeout(() => {
            document.getElementById('score-subteam').value = score.subTeamId;
            this.updateScoreMembers(score.teamId, score.subTeamId);
            setTimeout(() => {
                document.getElementById('score-member').value = score.memberId;
            }, 100);
        }, 100);

        const scores = score.scores || {};
        this.products.forEach(product => {
            const input = document.getElementById(`score-${product}`);
            if (input) {
                input.value = scores[product] || 0;
            }
        });

        // Handle unavailable state
        const scoreInputs = document.getElementById('score-inputs');
        if (score.unavailable) {
            scoreInputs.style.display = 'none';
        } else {
            scoreInputs.style.display = 'block';
        }
    }

    resetScoreModal() {
        document.getElementById('score-date').value = DateUtils.getTodayString();
        document.getElementById('score-team').value = this.selectedTeamId || '';
        document.getElementById('score-unavailable').checked = false;

        if (this.selectedTeamId) {
            this.updateScoreSubTeams(this.selectedTeamId);
            if (this.selectedSubTeamId) {
                setTimeout(() => {
                    document.getElementById('score-subteam').value = this.selectedSubTeamId;
                    this.updateScoreMembers(this.selectedTeamId, this.selectedSubTeamId);
                }, 100);
            }
        }

        this.products.forEach(product => {
            const input = document.getElementById(`score-${product}`);
            if (input) {
                input.value = 0;
            }
        });

        document.getElementById('score-inputs').style.display = 'block';
    }

    openReviewModal(score) {
        const modal = document.getElementById('review-modal');
        modal.setAttribute('data-score-id', score.id);

        // Populate member info
        this.populateReviewMemberInfo(score);

        // Populate original scores
        this.populateOriginalScores(score);

        // Initialize reviewed scores with original values
        const scores = score.scores || {};
        this.products.forEach(product => {
            const input = document.getElementById(`review-${product}`);
            if (input) {
                input.value = scores[product] || 0;
            }
        });

        modal.classList.add('show');
    }

    populateReviewMemberInfo(score) {
        const team = this.teams.find(t => t.id === score.teamId);
        const subTeam = team?.subTeams?.find(st => st.id === score.subTeamId);
        const member = subTeam?.members?.find(m => m.id === score.memberId);

        const memberInfo = document.getElementById('review-member-info');
        if (memberInfo && member && subTeam && team) {
            memberInfo.innerHTML = `
               <div class="card bg-light">
                   <div class="card-body">
                       <h5>${member.name}</h5>
                       <p class="mb-1"><strong>Team:</strong> ${team.name}</p>
                       <p class="mb-1"><strong>Sub Team:</strong> ${subTeam.name}</p>
                       <p class="mb-0"><strong>Date:</strong> ${DateUtils.formatDate(score.date, this.i18n.getCurrentLanguage())}</p>
                   </div>
               </div>
           `;
        }
    }

    populateOriginalScores(score) {
        const originalScoresContainer = document.getElementById('original-scores');
        if (!originalScoresContainer) return;

        const scores = score.scores || {};
        originalScoresContainer.innerHTML = this.products.map(product => `
           <div class="form-group">
               <label data-i18n="${product}">${this.i18n.t(product)}</label>
               <input type="number" value="${scores[product] || 0}" disabled>
           </div>
       `).join('');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');

        // Reset form
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }

    // Form submission handlers
    async handleScoreSubmit() {
        const modal = document.getElementById('score-modal');
        const editId = modal.getAttribute('data-edit-id');

        const scoreData = {
            date: document.getElementById('score-date').value,
            teamId: document.getElementById('score-team').value,
            subTeamId: document.getElementById('score-subteam').value,
            memberId: document.getElementById('score-member').value,
            unavailable: document.getElementById('score-unavailable').checked,
            scores: {}
        };

        // Only collect product scores if member is available
        if (!scoreData.unavailable) {
            this.products.forEach(product => {
                const input = document.getElementById(`score-${product}`);
                scoreData.scores[product] = parseInt(input.value) || 0;
            });
        }

        try {
            if (editId) {
                await this.firestoreService.updateScore(editId, scoreData);
            } else {
                await this.firestoreService.createScore(scoreData);
            }

            this.closeModal('score-modal');
            await this.render(document.getElementById('main-content'));
        } catch (error) {
            console.error('Error saving score:', error);
            alert(this.i18n.t('error.unknown'));
        }
    }

    async handleReviewSubmit() {
        const modal = document.getElementById('review-modal');
        const scoreId = modal.getAttribute('data-score-id');

        const reviewedScores = {};
        this.products.forEach(product => {
            const input = document.getElementById(`review-${product}`);
            reviewedScores[product] = parseInt(input.value) || 0;
        });

        try {
            await this.firestoreService.updateReviewedScore(scoreId, reviewedScores);
            this.closeModal('review-modal');
            await this.render(document.getElementById('main-content'));
        } catch (error) {
            console.error('Error reviewing score:', error);
            alert(this.i18n.t('error.unknown'));
        }
    }

    async deleteScore(scoreId) {
        try {
            await this.firestoreService.deleteScore(scoreId);
            await this.render(document.getElementById('main-content'));
        } catch (error) {
            console.error('Error deleting score:', error);
            alert(this.i18n.t('error.unknown'));
        }
    }

    // Utility methods
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