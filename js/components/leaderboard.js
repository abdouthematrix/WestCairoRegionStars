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

                    <!-- FILTER SECTION -->
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
                                <!-- COMBINED PRINT BUTTON -->
                                <button class="btn btn-success" id="print-all">
                                    <i class="fas fa-print"></i>
                                    <span data-i18n="printAll">Print Achievers & Leaders</span>
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

    // Generate print data for achievers
    generateAchieversPrintData() {
        if (!this.data.achievers || this.data.achievers.length === 0) {
            return [];
        }

        return this.data.achievers.map((achiever, index) => ({
            name: achiever.member.name,
            branch: achiever.team.name,
            img: achiever.member.imageBase64 || `Print/profile${index + 1}.png`
        }));
    }

    // Generate print data for leaders
    generateLeadersPrintData() {
        if (!this.data.teamLeaders || this.data.teamLeaders.length === 0) {
            return [];
        }

        return this.data.teamLeaders.map((leader, index) => ({
            name: leader.name,
            branch: leader.team.name,
            img: leader.imageBase64 || `Print/profile${index + 1}.png`
        }));
    }

    // Combined print functionality
    async printAll() {
        try {
            const achieversData = this.generateAchieversPrintData();
            const leadersData = this.generateLeadersPrintData();

            if (achieversData.length === 0 && leadersData.length === 0) {
                alert('No achievers or leaders found to print!');
                return;
            }

            // Create a new window for printing
            const printWindow = window.open('', '_blank');

            // Generate the HTML content with both sections
            const printHTML = this.generateCombinedPrintHTML(achieversData, leadersData);

            printWindow.document.write(printHTML);
            printWindow.document.close();

            // Wait for images to load then print
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    // Optionally close the window after printing
                    // printWindow.close();
                }, 1000);
            };

        } catch (error) {
            console.error('Error printing:', error);
            alert('Error preparing print data. Please try again.');
        }
    }

    // Generate HTML for combined printing
    generateCombinedPrintHTML(achieversData, leadersData) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Print Achievers & Leaders</title>
            <style>
                /* Copy all styles from your Print.html file here */
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                
                @media print {
                    body { margin: 0; padding: 0; background: white; font-size: 12pt; }
                    .page { width: 297mm; height: 210mm; margin: 0; padding: 20mm; page-break-after: always; page-break-inside: avoid; background-size: 100% 100% !important; background-repeat: no-repeat !important; background-position: center !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; }
                    .page:last-child { page-break-after: auto; }
                    @page { size: A4 landscape; margin: 0; }
                    .print-instructions { display: none; }
                }
                
                @media screen {
                    body { background: #f0f0f0; padding: 20px; }
                    .page { width: 297mm; height: 210mm; margin: 0 auto 20px; padding: 20mm; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.1); background-size: 100% 100%; background-repeat: no-repeat; background-position: center; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; }
                }
                
                .page-1 { background-image: url('Print/Page1.jpg'); }
                .page-2 { background-image: url('Print/Page2.jpg'); }
                .page-3 { background-image: url('Print/Page3.jpg'); }
                
                .print-instructions { background: #3498db; color: white; padding: 15px; text-align: center; margin-bottom: 20px; border-radius: 5px; }
                
                .date-page-1 { position: absolute; top: 400px; left: 50px; font-size: 80px; color: #ff8c00; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
                
                .title-ribbon { position: absolute; top: 15mm; left: 50%; transform: translateX(-50%); z-index: 10; text-align: center; width: 300px; height: 80px; }
                .title-ribbon img { width: 100%; height: auto; object-fit: contain; display: block; }
                .title-ribbon-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 75%; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 60%; pointer-events: none; }
                .title-ribbon-text { font-size: 24px; font-weight: bold; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); letter-spacing: 1px; line-height: 1.0; }
                .title-ribbon-fallback { background: linear-gradient(135deg, #b30000, #d40000); border-radius: 25px; border: 3px solid #800000; box-shadow: 0 4px 12px rgba(179, 0, 0, 0.4); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
                
                .badge-grid { display: grid; gap: 25px 15px; justify-items: center; align-items: center; width: 100%; max-width: 100%; margin: auto; justify-content: center; margin-top: 60px; }
                .badge-grid.cols-1 { grid-template-columns: 1fr; }
                .badge-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
                .badge-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
                .badge-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
                .badge-grid.cols-5 { grid-template-columns: repeat(5, 1fr); }
                
                .badge { text-align: center; position: relative; width: 100%; max-width: 180px; }
                .badge-grid.cols-1 .badge { max-width: 250px; }
                .badge-grid.cols-2 .badge { max-width: 220px; }
                .badge-grid.cols-3 .badge { max-width: 190px; }
                .badge-grid.cols-4 .badge { max-width: 160px; }
                .badge-grid.cols-5 .badge { max-width: 140px; }
                
                .circle { border-radius: 50%; overflow: hidden; border: 3px solid #b30000; box-shadow: 0 3px 8px rgba(0,0,0,0.3); margin: 0 auto; background: white; }
                .badge-grid.cols-1 .circle { width: 200px; height: 200px; }
                .badge-grid.cols-2 .circle { width: 170px; height: 170px; }
                .badge-grid.cols-3 .circle { width: 150px; height: 150px; }
                .badge-grid.cols-4 .circle { width: 130px; height: 130px; }
                .badge-grid.cols-5 .circle { width: 110px; height: 110px; }
                .circle img { width: 100%; height: 100%; object-fit: cover; display: block; }
                
                .ribbon { position: relative; display: block; margin: 8px auto 0; }
                .badge-grid.cols-1 .ribbon { width: 220px; height: 70px; }
                .badge-grid.cols-2 .ribbon { width: 190px; height: 60px; }
                .badge-grid.cols-3 .ribbon { width: 170px; height: 55px; }
                .badge-grid.cols-4 .ribbon { width: 150px; height: 50px; }
                .badge-grid.cols-5 .ribbon { width: 130px; height: 45px; }
                .ribbon img { width: 100%; height: auto; object-fit: contain; display: block; }
                
                .ribbon-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 75%; text-align: center; display: flex; flex-direction: column; justify-content: center; height: 60%; pointer-events: none; overflow: hidden; }
                .ribbon-name { font-weight: bold; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); line-height: 1.0; margin-bottom: 2px; word-wrap: break-word; overflow-wrap: break-word; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
                .ribbon-branch { font-weight: bold; color: rgba(255,255,255,0.95); text-shadow: 1px 1px 2px rgba(0,0,0,0.8); line-height: 1.0; word-wrap: break-word; overflow-wrap: break-word; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
                
                .badge-grid.cols-1 .ribbon-name { font-size: 14px; max-height: 28px; }
                .badge-grid.cols-2 .ribbon-name { font-size: 12px; max-height: 24px; }
                .badge-grid.cols-3 .ribbon-name { font-size: 11px; max-height: 22px; }
                .badge-grid.cols-4 .ribbon-name { font-size: 10px; max-height: 20px; }
                .badge-grid.cols-5 .ribbon-name { font-size: 9px; max-height: 18px; }
                
                .badge-grid.cols-1 .ribbon-branch { font-size: 11px; max-height: 22px; }
                .badge-grid.cols-2 .ribbon-branch { font-size: 10px; max-height: 20px; }
                .badge-grid.cols-3 .ribbon-branch { font-size: 9px; max-height: 18px; }
                .badge-grid.cols-4 .ribbon-branch { font-size: 8px; max-height: 16px; }
                .badge-grid.cols-5 .ribbon-branch { font-size: 7px; max-height: 14px; }
                
                .ribbon-fallback { background: linear-gradient(135deg, #b30000, #d40000); border-radius: 20px; border: 2px solid #800000; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
                .ribbon-fallback .ribbon-content { position: static; transform: none; width: 90%; height: 80%; }

                /* Leader-specific styles */
                .leader-circle { border: 3px solid #007bff; }
                .leader-title-ribbon-text { color: white; }
            </style>
        </head>
        <body>
            <div class="print-instructions">
                <strong>Print Instructions:</strong> Use Ctrl+P (Cmd+P on Mac) → More Settings → Paper Size: A4 → Layout: Landscape → Margins: None → Background Graphics: ON
            </div>
            
            <div class="page page-1">
                <div class="date-page-1">${this.formatDate(new Date())}</div>
            </div>
            
            <div id="content-pages"></div>
            
            <div class="page page-3"></div>

            <script>
                const achieversData = ${JSON.stringify(achieversData)};
                const leadersData = ${JSON.stringify(leadersData)};
                
                function getOptimalLayout(badgeCount) {
                    if (badgeCount === 1) return { cols: 1, rows: 1, perPage: 1 };
                    if (badgeCount === 2) return { cols: 2, rows: 1, perPage: 2 };
                    if (badgeCount <= 6) return { cols: 3, rows: 2, perPage: 6 };
                    if (badgeCount <= 8) return { cols: 4, rows: 2, perPage: 8 };
                    return { cols: 5, rows: 2, perPage: 10 };
                }
                
                function createBadgePages(badges, titleText, isLeaders = false) {
                    const pages = [];
                    
                    for (let i = 0; i < badges.length;) {
                        const remainingBadges = badges.length - i;
                        const layout = getOptimalLayout(remainingBadges);
                        const badgesToShow = Math.min(layout.perPage, remainingBadges);

                        const page = document.createElement("div");
                        page.className = "page page-2";

                        const titleRibbon = document.createElement("div");
                        titleRibbon.className = "title-ribbon";
                        titleRibbon.innerHTML = \`
                            <img src="Print/ribbon.png" alt="Title Ribbon" onerror="this.parentElement.classList.add('title-ribbon-fallback')">
                            <div class="title-ribbon-content">
                                <div class="title-ribbon-text">\${titleText}</div>
                            </div>
                        \`;
                        page.appendChild(titleRibbon);

                        const grid = document.createElement("div");
                        grid.className = \`badge-grid cols-\${layout.cols}\`;

                        badges.slice(i, i + badgesToShow).forEach(badge => {
                            const badgeElement = document.createElement("div");
                            badgeElement.className = "badge";

                            const circleClass = isLeaders ? "circle leader-circle" : "circle";

                            badgeElement.innerHTML = \`
                                <div class="\${circleClass}">
                                    <img src="\${badge.img}" alt="\${badge.name}" onerror="this.style.display='none'">
                                </div>
                                <div class="ribbon">
                                    <img src="Print/ribbon.png" alt="Ribbon" onerror="this.parentElement.classList.add('ribbon-fallback')">
                                    <div class="ribbon-content">
                                        <div class="ribbon-name">\${badge.name}</div>
                                        <div class="ribbon-branch">\${badge.branch}</div>
                                    </div>
                                </div>
                            \`;
                            grid.appendChild(badgeElement);
                        });

                        page.appendChild(grid);
                        pages.push(page);
                        i += badgesToShow;
                    }
                    
                    return pages;
                }
                
                const container = document.getElementById("content-pages");
                
                // Add achievers pages
                if (achieversData.length > 0) {
                    const achieverPages = createBadgePages(achieversData, "نجوم خدمة العملاء", false);
                    achieverPages.forEach(page => container.appendChild(page));
                }
                
                // Add leaders pages
                if (leadersData.length > 0) {
                    const leaderPages = createBadgePages(leadersData, "قادة الفرق المتميزين", true);
                    leaderPages.forEach(page => container.appendChild(page));
                }
            </script>
        </body>
        </html>
        `;
    }

    // Helper method to format date
    formatDate(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    attachEventListeners() {
        // Existing event listeners
        const dateFilter = document.getElementById('date-filter');
        const filterBtn = document.getElementById('filter-leaderboard');
        const clearBtn = document.getElementById('clear-filter');

        // Combined print button event listener
        const printAllBtn = document.getElementById('print-all');

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

        // Combined print event listener
        if (printAllBtn) {
            printAllBtn.addEventListener('click', () => {
                this.printAll();
            });
        }
    }
}