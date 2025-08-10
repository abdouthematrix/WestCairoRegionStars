import { ImageUtils } from '../utils/image-utils.js';
import { DateUtils } from '../utils/date-utils.js';

export class TeamsComponent {
    constructor(firestoreService, authService, i18n) {
        this.firestoreService = firestoreService;
        this.authService = authService;
        this.i18n = i18n;
        this.teams = [];
        this.selectedTeam = null;
        this.selectedSubTeam = null;
        this.currentView = 'teams'; // teams, subteams, members
        this.currentImageBase64 = null;
    }

    async render(container) {
        try {
            if (!this.authService.hasPermission('view_dashboard')) {
                container.innerHTML = this.getUnauthorizedHTML();
                return;
            }

            // Show loading
            container.innerHTML = this.getLoadingHTML();

            // Load teams data
            await this.loadTeamsData();

            // Render teams view
            container.innerHTML = this.getHTML();
            this.i18n.updateTranslations();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error rendering teams:', error);
            container.innerHTML = this.getErrorHTML();
        }
    }

    async loadTeamsData() {
        const userRole = this.authService.getCurrentRole();

        if (userRole.type === 'admin') {
            this.teams = await this.firestoreService.getTeams();
        } else if (userRole.type === 'branch') {
            const team = await this.firestoreService.getTeam(userRole.teamId);
            this.teams = team ? [team] : [];
        } else {
            this.teams = [];
        }

        // Load sub-teams and members for each team
        for (const team of this.teams) {
            team.subTeams = await this.firestoreService.getSubTeams(team.id);
            for (const subTeam of team.subTeams) {
                subTeam.members = await this.firestoreService.getMembers(team.id, subTeam.id);
            }
        }
    }

    getHTML() {
        return `
            <div class="container fade-in">
                ${this.renderBreadcrumb()}
                ${this.renderCurrentView()}
                ${this.renderModals()}
            </div>
        `;
    }

    renderBreadcrumb() {
        let breadcrumb = `<span data-i18n="teams">Teams</span>`;

        if (this.selectedTeam) {
            breadcrumb += ` / ${this.selectedTeam.name}`;
            if (this.selectedSubTeam) {
                breadcrumb += ` / ${this.selectedSubTeam.name}`;
            }
        }

        return `
            <div class="mb-4">
                <nav class="breadcrumb">
                    ${breadcrumb}
                </nav>
            </div>
        `;
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'teams':
                return this.renderTeamsView();
            case 'subteams':
                return this.renderSubTeamsView();
            case 'members':
                return this.renderMembersView();
            default:
                return this.renderTeamsView();
        }
    }

    renderTeamsView() {
        const canManageTeams = this.authService.hasPermission('manage_teams');

        return `
            <div class="card">
                <div class="card-header">
                    <div class="flex items-center justify-between">
                        <h3 class="mb-0" data-i18n="teams">Teams</h3>
                        ${canManageTeams ? `
                            <button class="btn btn-primary" id="add-team-btn">
                                <i class="fas fa-plus"></i>
                                <span data-i18n="addTeam">Add Team</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="card-body">
                    ${this.teams.length === 0 ? `
                        <div class="text-center py-4">
                            <i class="fas fa-users fa-3x text-secondary mb-3"></i>
                            <p data-i18n="noData">No teams available</p>
                        </div>
                    ` : `
                        <div class="grid grid-2">
                            ${this.teams.map(team => this.renderTeamCard(team)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderTeamCard(team) {
        const canManage = this.authService.canManageTeam(team.id);
        const subTeamCount = team.subTeams?.length || 0;
        const memberCount = team.subTeams?.reduce((count, st) => count + (st.members?.length || 0), 0) || 0;

        return `
            <div class="card">
                <div class="card-body">
                    <div class="flex items-start justify-between mb-3">
                        <div>
                            <h4>${team.name}</h4>
                            <p class="text-secondary">${team.number ? `<span data-i18n="team">#</span>${team.number}` : ''}</p>
                        </div>
                        ${canManage ? `
                            <div class="dropdown">
                                <button class="btn-icon" onclick="this.nextElementSibling.classList.toggle('show')">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="dropdown-menu">
                                    <button class="dropdown-item edit-team-btn" data-team-id="${team.id}">
                                        <i class="fas fa-edit"></i> <span data-i18n="edit">Edit</span>
                                    </button>
                                    <button class="dropdown-item delete-team-btn" data-team-id="${team.id}">
                                     <i class="fas fa-trash"></i> <span data-i18n="delete">Delete</span>
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="flex items-center gap-4 mb-3">
                        <div class="text-center">
                            <div class="text-lg font-bold">${subTeamCount}</div>
                            <div class="text-sm text-secondary" data-i18n="subTeams">Sub Teams</div>
                        </div>
                        <div class="text-center">
                            <div class="text-lg font-bold">${memberCount}</div>
                            <div class="text-sm text-secondary" data-i18n="members">Members</div>
                        </div>
                    </div>

                    <button class="btn btn-secondary btn-block view-team-btn" data-team-id="${team.id}">
                        <span data-i18n="viewDetails">View Details</span>
                    </button>
                </div>
            </div>
        `;
    }

    renderSubTeamsView() {
        if (!this.selectedTeam) return this.renderTeamsView();

        const canManageSubTeams = this.authService.hasPermission('manage_subteams') &&
            this.authService.canManageTeam(this.selectedTeam.id);

        return `
            <div class="card">
                <div class="card-header">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <button class="btn-icon back-to-teams-btn">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <h3 class="mb-0">${this.selectedTeam.name} - <span data-i18n="subTeams">Sub Teams</span></h3>
                        </div>
                        ${canManageSubTeams ? `
                            <button class="btn btn-primary" id="add-subteam-btn">
                                <i class="fas fa-plus"></i>
                                <span data-i18n="addSubTeam">Add Sub Team</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="card-body">
                    ${!this.selectedTeam.subTeams || this.selectedTeam.subTeams.length === 0 ? `
                        <div class="text-center py-4">
                            <i class="fas fa-users fa-3x text-secondary mb-3"></i>
                            <p data-i18n="noData">No sub teams available</p>
                        </div>
                    ` : `
                        <div class="grid grid-2">
                            ${this.selectedTeam.subTeams.map(subTeam => this.renderSubTeamCard(subTeam)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderSubTeamCard(subTeam) {
        const canManage = this.authService.canManageSubTeam(subTeam.id);
        const memberCount = subTeam.members?.length || 0;

        return `
            <div class="card">
                <div class="card-body">
                    <div class="flex items-start justify-between mb-3">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <div class="w-3 h-3 rounded-full" style="background: ${subTeam.color || '#3182ce'}"></div>
                                <h4>${subTeam.name}</h4>
                            </div>
                           <p class="text-secondary">${subTeam.number ? `<span data-i18n="subTeam">Sub Team #</span>${subTeam.number}` : ''}</p>
                            ${subTeam.targetQuota ? `<p class="text-sm">Target: ${subTeam.targetQuota}</p>` : ''}
                        </div>
                        ${canManage ? `
                            <div class="dropdown">
                              <button class="btn-icon" onclick="this.nextElementSibling.classList.toggle('show')">
                                   <i class="fas fa-ellipsis-v"></i>
                               </button>
                               <div class="dropdown-menu">
                                   <button class="dropdown-item edit-subteam-btn" data-subteam-id="${subTeam.id}">
                                      <i class="fas fa-edit"></i> <span data-i18n="edit">Edit</span>
                                   </button>
                                   <button class="dropdown-item delete-subteam-btn" data-subteam-id="${subTeam.id}">
                                     <i class="fas fa-trash"></i> <span data-i18n="delete">Delete</span>
                                   </button>
                               </div>
                           </div>
                       ` : ''}
                   </div>
                   
                   <div class="text-center mb-3">
                       <div class="text-lg font-bold">${memberCount}</div>
                       <div class="text-sm text-secondary" data-i18n="members">Members</div>
                   </div>

                   <button class="btn btn-secondary btn-block view-subteam-btn" data-subteam-id="${subTeam.id}">
                       <span data-i18n="viewMembers">View Members</span>
                   </button>
               </div>
           </div>
       `;
    }

    renderMembersView() {
        if (!this.selectedTeam || !this.selectedSubTeam) return this.renderTeamsView();

        const canManageMembers = this.authService.canManageSubTeam(this.selectedSubTeam.id);

        return `
           <div class="card">
               <div class="card-header">
                   <div class="flex items-center justify-between">
                       <div class="flex items-center gap-2">
                           <button class="btn-icon back-to-subteams-btn">
                               <i class="fas fa-arrow-left"></i>
                           </button>
                           <h3 class="mb-0">${this.selectedSubTeam.name} - <span data-i18n="members">Members</span></h3>
                       </div>
                       ${canManageMembers ? `
                           <button class="btn btn-primary" id="add-member-btn">
                               <i class="fas fa-plus"></i>
                               <span data-i18n="addMember">Add Member</span>
                           </button>
                       ` : ''}
                   </div>
               </div>
               <div class="card-body">
                   ${!this.selectedSubTeam.members || this.selectedSubTeam.members.length === 0 ? `
                       <div class="text-center py-4">
                           <i class="fas fa-user fa-3x text-secondary mb-3"></i>
                           <p data-i18n="noData">No members available</p>
                       </div>
                   ` : `
                       <div class="grid grid-3">
                           ${this.selectedSubTeam.members.map(member => this.renderMemberCard(member)).join('')}
                       </div>
                   `}
               </div>
           </div>
       `;
    }

    renderMemberCard(member) {
        const canManage = this.authService.canManageSubTeam(this.selectedSubTeam.id);
        const memberImage = member.imageBase64 || ImageUtils.getDefaultAvatar(member.name);

        return `
           <div class="card">
               <div class="card-body text-center">
                   <div class="relative mb-3">
                       <img src="${memberImage}" alt="${member.name}" class="member-image mx-auto">
                       ${canManage ? `
                           <div class="absolute top-0 right-0">
                               <div class="dropdown">
                                   <button class="btn-icon btn-sm" onclick="this.nextElementSibling.classList.toggle('show')">
                                       <i class="fas fa-ellipsis-v"></i>
                                   </button>
                                   <div class="dropdown-menu">
                                       <button class="dropdown-item edit-member-btn" data-member-id="${member.id}">
                                        <i class="fas fa-edit"></i> <span data-i18n="edit">Edit</span>
                                       </button>
                                       <button class="dropdown-item delete-member-btn" data-member-id="${member.id}">
                                   <i class="fas fa-trash"></i> <span data-i18n="delete">Delete</span>
                                       </button>
                                   </div>
                               </div>
                           </div>
                       ` : ''}
                   </div>
                   <h4>${member.name}</h4>
                   <p class="text-secondary">${member.position || ''}</p>
                   ${member.createdAt ? `
                       <p class="text-sm text-secondary">
                           ${DateUtils.formatDate(member.createdAt.toDate(), this.i18n.getCurrentLanguage())}
                       </p>
                   ` : ''}
               </div>
           </div>
       `;
    }

    renderModals() {
        return `
           <!-- Add/Edit Team Modal -->
           <div class="modal" id="team-modal">
               <div class="modal-content">
                   <div class="modal-header">
                       <h2 id="team-modal-title" data-i18n="addTeam">Add Team</h2>
                       <button class="btn-close" id="close-team-modal">
                           <i class="fas fa-times"></i>
                       </button>
                   </div>
                   <form id="team-form">
                       <div class="modal-body">
                           <div class="form-group">
                               <label data-i18n="teamName">Team Name</label>
                               <input type="text" id="team-name" required>
                           </div>
                           <div class="form-group">
                               <label data-i18n="teamNumber">Team Number</label>
                               <input type="number" id="team-number">
                           </div>
                       </div>
                       <div class="modal-footer">
                           <button type="button" class="btn btn-secondary" id="cancel-team">
                               <span data-i18n="cancel">Cancel</span>
                           </button>
                           <button type="submit" class="btn btn-primary">
                               <span data-i18n="save">Save</span>
                           </button>
                       </div>
                   </form>
               </div>
           </div>

           <!-- Add/Edit SubTeam Modal -->
           <div class="modal" id="subteam-modal">
               <div class="modal-content">
                   <div class="modal-header">
                       <h2 id="subteam-modal-title" data-i18n="addSubTeam">Add Sub Team</h2>
                       <button class="btn-close" id="close-subteam-modal">
                           <i class="fas fa-times"></i>
                       </button>
                   </div>
                   <form id="subteam-form">
                       <div class="modal-body">
                           <div class="form-group">
                               <label data-i18n="subTeamName">Sub Team Name</label>
                               <input type="text" id="subteam-name" required>
                           </div>
                           <div class="form-group">
                               <label data-i18n="teamNumber">Sub Team Number</label>
                               <input type="number" id="subteam-number">
                           </div>
                           <div class="form-group">
                               <label data-i18n="color">Color</label>
                               <input type="color" id="subteam-color" value="#3182ce">
                           </div>
                           <div class="form-group">
                               <label data-i18n="targetQuota">Target Quota</label>
                               <input type="number" id="subteam-quota">
                           </div>
                       </div>
                       <div class="modal-footer">
                           <button type="button" class="btn btn-secondary" id="cancel-subteam">
                               <span data-i18n="cancel">Cancel</span>
                           </button>
                           <button type="submit" class="btn btn-primary">
                               <span data-i18n="save">Save</span>
                           </button>
                       </div>
                   </form>
               </div>
           </div>

           <!-- Add/Edit Member Modal -->
           <div class="modal" id="member-modal">
               <div class="modal-content">
                   <div class="modal-header">
                       <h2 id="member-modal-title" data-i18n="addMember">Add Member</h2>
                       <button class="btn-close" id="close-member-modal">
                           <i class="fas fa-times"></i>
                       </button>
                   </div>
                   <form id="member-form">
                       <div class="modal-body">
                           <div class="form-group">
                               <label data-i18n="memberName">Member Name</label>
                               <input type="text" id="member-name" required>
                           </div>
                           <div class="form-group">
                               <label data-i18n="position">Position</label>
                               <input type="text" id="member-position">
                           </div>
                           <div class="form-group">
                               <label data-i18n="image">Image</label>
                               <input type="file" id="member-image" accept="image/*">
                               <img id="member-image-preview" class="image-preview mt-2">
                           </div>
                       </div>
                       <div class="modal-footer">
                           <button type="button" class="btn btn-secondary" id="cancel-member">
                               <span data-i18n="cancel">Cancel</span>
                           </button>
                           <button type="submit" class="btn btn-primary">
                               <span data-i18n="save">Save</span>
                           </button>
                       </div>
                   </form>
               </div>
           </div>
       `;
    }

    attachEventListeners() {
        // Navigation event listeners
        const backToTeamsBtn = document.querySelector('.back-to-teams-btn');
        if (backToTeamsBtn) {
            backToTeamsBtn.addEventListener('click', () => {
                this.currentView = 'teams';
                this.selectedTeam = null;
                this.selectedSubTeam = null;
                this.render(document.getElementById('main-content'));
            });
        }

        const backToSubTeamsBtn = document.querySelector('.back-to-subteams-btn');
        if (backToSubTeamsBtn) {
            backToSubTeamsBtn.addEventListener('click', () => {
                this.currentView = 'subteams';
                this.selectedSubTeam = null;
                this.render(document.getElementById('main-content'));
            });
        }

        // View team buttons
        const viewTeamBtns = document.querySelectorAll('.view-team-btn');
        viewTeamBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const teamId = btn.getAttribute('data-team-id');
                this.selectedTeam = this.teams.find(t => t.id === teamId);
                this.currentView = 'subteams';
                this.render(document.getElementById('main-content'));
            });
        });

        // View subteam buttons
        const viewSubTeamBtns = document.querySelectorAll('.view-subteam-btn');
        viewSubTeamBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const subTeamId = btn.getAttribute('data-subteam-id');
                this.selectedSubTeam = this.selectedTeam.subTeams.find(st => st.id === subTeamId);
                this.currentView = 'members';
                this.render(document.getElementById('main-content'));
            });
        });

        // Add buttons
        this.attachAddButtonListeners();

        // Edit/Delete buttons
        this.attachEditDeleteListeners();

        // Modal event listeners
        this.attachModalListeners();
    }

    attachAddButtonListeners() {
        const addTeamBtn = document.getElementById('add-team-btn');
        if (addTeamBtn) {
            addTeamBtn.addEventListener('click', () => {
                this.openTeamModal();
            });
        }

        const addSubTeamBtn = document.getElementById('add-subteam-btn');
        if (addSubTeamBtn) {
            addSubTeamBtn.addEventListener('click', () => {
                this.openSubTeamModal();
            });
        }

        const addMemberBtn = document.getElementById('add-member-btn');
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', () => {
                this.openMemberModal();
            });
        }
    }

    attachEditDeleteListeners() {
        // Edit team buttons
        const editTeamBtns = document.querySelectorAll('.edit-team-btn');
        editTeamBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const teamId = btn.getAttribute('data-team-id');
                const team = this.teams.find(t => t.id === teamId);
                this.openTeamModal(team);
            });
        });

        // Delete team buttons
        const deleteTeamBtns = document.querySelectorAll('.delete-team-btn');
        deleteTeamBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const teamId = btn.getAttribute('data-team-id');
                if (confirm(this.i18n.t('confirm.delete'))) {
                    await this.deleteTeam(teamId);
                }
            });
        });

        // Edit subteam buttons
        const editSubTeamBtns = document.querySelectorAll('.edit-subteam-btn');
        editSubTeamBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const subTeamId = btn.getAttribute('data-subteam-id');
                const subTeam = this.selectedTeam.subTeams.find(st => st.id === subTeamId);
                this.openSubTeamModal(subTeam);
            });
        });

        // Delete subteam buttons
        const deleteSubTeamBtns = document.querySelectorAll('.delete-subteam-btn');
        deleteSubTeamBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const subTeamId = btn.getAttribute('data-subteam-id');
                if (confirm(this.i18n.t('confirm.delete'))) {
                    await this.deleteSubTeam(subTeamId);
                }
            });
        });

        // Edit member buttons
        const editMemberBtns = document.querySelectorAll('.edit-member-btn');
        editMemberBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const memberId = btn.getAttribute('data-member-id');
                const member = this.selectedSubTeam.members.find(m => m.id === memberId);
                this.openMemberModal(member);
            });
        });

        // Delete member buttons
        const deleteMemberBtns = document.querySelectorAll('.delete-member-btn');
        deleteMemberBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const memberId = btn.getAttribute('data-member-id');
                if (confirm(this.i18n.t('confirm.delete'))) {
                    await this.deleteMember(memberId);
                }
            });
        });
    }

    attachModalListeners() {
        // Team modal
        const teamForm = document.getElementById('team-form');
        if (teamForm) {
            teamForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleTeamSubmit();
            });
        }

        // SubTeam modal
        const subTeamForm = document.getElementById('subteam-form');
        if (subTeamForm) {
            subTeamForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSubTeamSubmit();
            });
        }

        // Member modal
        const memberForm = document.getElementById('member-form');
        if (memberForm) {
            memberForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleMemberSubmit();
            });
        }

        // Close modal buttons
        this.attachCloseModalListeners();

        // Image upload
        ImageUtils.setupImageUpload('member-image', 'member-image-preview', (base64) => {
            this.currentImageBase64 = base64;
        });
    }

    attachCloseModalListeners() {
        const modals = ['team-modal', 'subteam-modal', 'member-modal'];

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
    openTeamModal(team = null) {
        const modal = document.getElementById('team-modal');
        const title = document.getElementById('team-modal-title');
        const nameInput = document.getElementById('team-name');
        const numberInput = document.getElementById('team-number');

        if (team) {
            title.textContent = this.i18n.t('edit') + ' ' + this.i18n.t('team');
            nameInput.value = team.name;
            numberInput.value = team.number || '';
            modal.setAttribute('data-edit-id', team.id);
        } else {
            title.textContent = this.i18n.t('addTeam');
            nameInput.value = '';
            numberInput.value = '';
            modal.removeAttribute('data-edit-id');
        }

        modal.classList.add('show');
    }

    openSubTeamModal(subTeam = null) {
        const modal = document.getElementById('subteam-modal');
        const title = document.getElementById('subteam-modal-title');
        const nameInput = document.getElementById('subteam-name');
        const numberInput = document.getElementById('subteam-number');
        const colorInput = document.getElementById('subteam-color');
        const quotaInput = document.getElementById('subteam-quota');

        if (subTeam) {
            title.textContent = this.i18n.t('edit') + ' ' + this.i18n.t('subTeam');
            nameInput.value = subTeam.name;
            numberInput.value = subTeam.number || '';
            colorInput.value = subTeam.color || '#3182ce';
            quotaInput.value = subTeam.targetQuota || '';
            modal.setAttribute('data-edit-id', subTeam.id);
        } else {
            title.textContent = this.i18n.t('addSubTeam');
            nameInput.value = '';
            numberInput.value = '';
            colorInput.value = '#3182ce';
            quotaInput.value = '';
            modal.removeAttribute('data-edit-id');
        }

        modal.classList.add('show');
    }

    openMemberModal(member = null) {
        const modal = document.getElementById('member-modal');
        const title = document.getElementById('member-modal-title');
        const nameInput = document.getElementById('member-name');
        const positionInput = document.getElementById('member-position');
        const preview = document.getElementById('member-image-preview');

        if (member) {
            title.textContent = this.i18n.t('edit') + ' ' + this.i18n.t('member');
            nameInput.value = member.name;
            positionInput.value = member.position || '';

            if (member.imageBase64) {
                preview.src = member.imageBase64;
                preview.classList.add('show');
                this.currentImageBase64 = member.imageBase64;
            } else {
                preview.classList.remove('show');
                this.currentImageBase64 = null;
            }

            modal.setAttribute('data-edit-id', member.id);
        } else {
            title.textContent = this.i18n.t('addMember');
            nameInput.value = '';
            positionInput.value = '';
            preview.classList.remove('show');
            this.currentImageBase64 = null;
            modal.removeAttribute('data-edit-id');
        }

        modal.classList.add('show');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');

        // Reset form
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }

        // Reset image
        if (modalId === 'member-modal') {
            const preview = document.getElementById('member-image-preview');
            preview.classList.remove('show');
            this.currentImageBase64 = null;
        }
    }

    // Form submission handlers
    async handleTeamSubmit() {
        const modal = document.getElementById('team-modal');
        const editId = modal.getAttribute('data-edit-id');
        const name = document.getElementById('team-name').value;
        const number = parseInt(document.getElementById('team-number').value) || null;

        const teamData = { name, number };

        try {
            if (editId) {
                await this.firestoreService.updateTeam(editId, teamData);
            } else {
                await this.firestoreService.createTeam(teamData);
            }

            this.closeModal('team-modal');
            await this.render(document.getElementById('main-content'));
        } catch (error) {
            console.error('Error saving team:', error);
            alert(this.i18n.t('error.unknown'));
        }
    }

    async handleSubTeamSubmit() {
        const modal = document.getElementById('subteam-modal');
        const editId = modal.getAttribute('data-edit-id');
        const name = document.getElementById('subteam-name').value;
        const number = parseInt(document.getElementById('subteam-number').value) || null;
        const color = document.getElementById('subteam-color').value;
        const targetQuota = parseInt(document.getElementById('subteam-quota').value) || null;

        const subTeamData = { name, number, color, targetQuota };

        try {
            if (editId) {
                await this.firestoreService.updateSubTeam(this.selectedTeam.id, editId, subTeamData);
            } else {
                await this.firestoreService.createSubTeam(this.selectedTeam.id, subTeamData);
            }

            this.closeModal('subteam-modal');
            await this.render(document.getElementById('main-content'));
        } catch (error) {
            console.error('Error saving subteam:', error);
            alert(this.i18n.t('error.unknown'));
        }
    }

    async handleMemberSubmit() {
        const modal = document.getElementById('member-modal');
        const editId = modal.getAttribute('data-edit-id');
        const name = document.getElementById('member-name').value;
        const position = document.getElementById('member-position').value;

        const memberData = {
            name,
            position,
            imageBase64: this.currentImageBase64
        };

        try {
            if (editId) {
                await this.firestoreService.updateMember(
                    this.selectedTeam.id,
                    this.selectedSubTeam.id,
                    editId,
                    memberData
                );
            } else {
                await this.firestoreService.createMember(
                    this.selectedTeam.id,
                    this.selectedSubTeam.id,
                    memberData
                );
            }

            this.closeModal('member-modal');
            await this.render(document.getElementById('main-content'));
        } catch (error) {
            console.error('Error saving member:', error);
            alert(this.i18n.t('error.unknown'));
        }
    }

    // Delete operations
    async deleteTeam(teamId) {
        try {
            await this.firestoreService.deleteTeam(teamId);
            await this.render(document.getElementById('main-content'));
        } catch (error) {
            console.error('Error deleting team:', error);
            alert(this.i18n.t('error.unknown'));
        }
    }

    async deleteSubTeam(subTeamId) {
        try {
            await this.firestoreService.deleteSubTeam(this.selectedTeam.id, subTeamId);
            await this.render(document.getElementById('main-content'));
        } catch (error) {
            console.error('Error deleting subteam:', error);
            alert(this.i18n.t('error.unknown'));
        }
    }

    async deleteMember(memberId) {
        try {
            await this.firestoreService.deleteMember(
                this.selectedTeam.id,
                this.selectedSubTeam.id,
                memberId
            );
            await this.render(document.getElementById('main-content'));
        } catch (error) {
            console.error('Error deleting member:', error);
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