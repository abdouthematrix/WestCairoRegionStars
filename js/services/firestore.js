export class FirestoreService {
    constructor(authService) {
        this.authService = authService;
    }

    // Teams
    async getTeams() {
        try {
            const snapshot = await db.collection('teams').orderBy('number').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting teams:', error);
            throw error;
        }
    }

    async getTeam(teamId) {
        try {
            const doc = await db.collection('teams').doc(teamId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting team:', error);
            throw error;
        }
    }

    async createTeam(teamData) {
        if (!this.authService.hasPermission('manage_teams')) {
            throw new Error('Unauthorized');
        }

        try {
            // Generate custom team ID
            const teamId = await this.generateTeamId();

            // Use set() instead of add() to specify custom ID
            await db.collection('teams').doc(teamId).set({
                ...teamData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: this.authService.getCurrentUser().uid
            });

            // Return the team object with the custom ID
            return {
                id: teamId,
                ...teamData
            };
        } catch (error) {
            console.error('Error creating team:', error);
            throw error;
        }
    }
    // Helper function to generate custom team ID
    async generateTeamId() {
        try {
            // Get existing teams to determine the next number
            const teamsSnapshot = await db.collection('teams').get();

            const teamCount = teamsSnapshot.size;
            const nextTeamNumber = teamCount + 1;

            // Format: team_number
            // Example: team_1, team_2, etc.
            return `team_${nextTeamNumber}`;
        } catch (error) {
            console.error('Error generating team ID:', error);
            // Fallback to timestamp-based ID if there's an error
            return `team_${Date.now()}`;
        }
    }

    async updateTeam(teamId, teamData) {
        if (!this.authService.canManageTeam(teamId)) {
            throw new Error('Unauthorized');
        }

        try {
            await db.collection('teams').doc(teamId).update({
                ...teamData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: this.authService.getCurrentUser().uid
            });
        } catch (error) {
            console.error('Error updating team:', error);
            throw error;
        }
    }

    async deleteTeam(teamId) {
        if (!this.authService.canManageTeam(teamId)) {
            throw new Error('Unauthorized');
        }

        try {
            // Delete all subteams and members first
            const subTeamsSnapshot = await db.collection('teams').doc(teamId)
                .collection('subTeams').get();

            for (const subTeamDoc of subTeamsSnapshot.docs) {
                await this.deleteSubTeam(teamId, subTeamDoc.id);
            }

            await db.collection('teams').doc(teamId).delete();
        } catch (error) {
            console.error('Error deleting team:', error);
            throw error;
        }
    }
    // SubTeams
    async getSubTeams(teamId) {
        try {
            const snapshot = await db.collection('teams').doc(teamId)
                .collection('subTeams').orderBy('number').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                teamId,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting subteams:', error);
            throw error;
        }
    }
    // Helper function to generate custom subteam ID
    async generateSubTeamId(teamId) {
        try {
            // Get existing subteams to determine the next number
            const subTeamsSnapshot = await db.collection('teams').doc(teamId)
                .collection('subTeams').get();

            const subTeamCount = subTeamsSnapshot.size;
            const nextSubTeamNumber = subTeamCount + 1;

            // Format: teamId_subteam_number
            // Example: team_1_subteam_1, team_1_subteam_2, etc.
            return `${teamId}_${nextSubTeamNumber}`;
        } catch (error) {
            console.error('Error generating subteam ID:', error);
            // Fallback to timestamp-based ID if there's an error
            return `${teamId}_${Date.now()}`;
        }
    }

    async getSubTeam(teamId, subTeamId) {
        try {
            const doc = await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId).get();
            if (doc.exists) {
                return { id: doc.id, teamId, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting subteam:', error);
            throw error;
        }
    }

    async createSubTeam(teamId, subTeamData) {
        if (!this.authService.hasPermission('manage_subteams') ||
            !this.authService.canManageTeam(teamId)) {
            throw new Error('Unauthorized');
        }

        try {
            // Generate custom subteam ID
            const subTeamId = await this.generateSubTeamId(teamId);

            // Use set() instead of add() to specify custom ID
            await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId).set({
                    ...subTeamData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: this.authService.getCurrentUser().uid
                });

            // Return the subteam object with the custom ID
            return {
                id: subTeamId,
                ...subTeamData
            };
        } catch (error) {
            console.error('Error creating subteam:', error);
            throw error;
        }
    }

    async updateSubTeam(teamId, subTeamId, subTeamData) {
        if (!this.authService.canManageSubTeam(subTeamId)) {
            throw new Error('Unauthorized');
        }

        try {
            await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId).update({
                    ...subTeamData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: this.authService.getCurrentUser().uid
                });
        } catch (error) {
            console.error('Error updating subteam:', error);
            throw error;
        }
    }

    async deleteSubTeam(teamId, subTeamId) {
        if (!this.authService.canManageSubTeam(subTeamId)) {
            throw new Error('Unauthorized');
        }

        try {
            // Delete all members first
            const membersSnapshot = await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId)
                .collection('members').get();

            for (const memberDoc of membersSnapshot.docs) {
                await memberDoc.ref.delete();
            }

            await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId).delete();
        } catch (error) {
            console.error('Error deleting subteam:', error);
            throw error;
        }
    }
    // Members
    async getMembers(teamId, subTeamId) {
        try {
            const snapshot = await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId)
                .collection('members').orderBy('name').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                teamId,
                subTeamId,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting members:', error);
            throw error;
        }
    }

    async getMember(teamId, subTeamId, memberId) {
        try {
            const doc = await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId)
                .collection('members').doc(memberId).get();
            if (doc.exists) {
                return { id: doc.id, teamId, subTeamId, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting member:', error);
            throw error;
        }
    }

    async createMember(teamId, subTeamId, memberData) {
        if (!this.authService.canManageSubTeam(subTeamId)) {
            throw new Error('Unauthorized');
        }
        try {
            // Generate custom member ID
            const memberId = await this.generateMemberId(teamId, subTeamId);

            // Use set() instead of add() to specify custom ID
            await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId)
                .collection('members').doc(memberId).set({
                    ...memberData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: this.authService.getCurrentUser().uid
                });

            // Return the member object with the custom ID
            return {
                id: memberId,
                ...memberData
            };
        } catch (error) {
            console.error('Error creating member:', error);
            throw error;
        }
    }
    // Helper function to generate custom member ID
    async generateMemberId(teamId, subTeamId) {
        try {
            // Get existing members to determine the next number
            const membersSnapshot = await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId)
                .collection('members').get();

            const memberCount = membersSnapshot.size;
            const nextMemberNumber = memberCount + 1;

            // Format: teamId_subTeamId_member_number
            // Example: sheraton_707_member_1
            return `${subTeamId}_member_${nextMemberNumber}`;
        } catch (error) {
            console.error('Error generating member ID:', error);
            // Fallback to timestamp-based ID if there's an error
            return `${subTeamId}_member_${Date.now()}`;
        }
    }

    async updateMember(teamId, subTeamId, memberId, memberData) {
        if (!this.authService.canManageSubTeam(subTeamId)) {
            throw new Error('Unauthorized');
        }

        try {
            await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId)
                .collection('members').doc(memberId).update({
                    ...memberData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: this.authService.getCurrentUser().uid
                });
        } catch (error) {
            console.error('Error updating member:', error);
            throw error;
        }
    }

    async deleteMember(teamId, subTeamId, memberId) {
        if (!this.authService.canManageSubTeam(subTeamId)) {
            throw new Error('Unauthorized');
        }

        try {
            await db.collection('teams').doc(teamId)
                .collection('subTeams').doc(subTeamId)
                .collection('members').doc(memberId).delete();
        } catch (error) {
            console.error('Error deleting member:', error);
            throw error;
        }
    }

    // Leaders
    async getLeaders() {
        try {
            const snapshot = await db.collection('leaders').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting leaders:', error);
            throw error;
        }
    }

    async getLeader(leaderId) {
        try {
            const doc = await db.collection('leaders').doc(leaderId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting leader:', error);
            throw error;
        }
    }

    // Scores
    async getScores(filters = {}) {
        try {
            let query = db.collection('scores');

            if (filters.date) {
                query = query.where('date', '==', filters.date);
            }
            if (filters.teamId) {
                query = query.where('teamId', '==', filters.teamId);
            }
            if (filters.subTeamId) {
                query = query.where('subTeamId', '==', filters.subTeamId);
            }
            if (filters.memberId) {
                query = query.where('memberId', '==', filters.memberId);
            }

            const snapshot = await query.orderBy('date', 'desc').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting scores:', error);
            throw error;
        }
    }

    async createScore(scoreData) {
        if (!this.authService.canSubmitScores(scoreData.teamId, scoreData.subTeamId)) {
            throw new Error('Unauthorized');
        }

        try {
            const docRef = await db.collection('scores').add({
                ...scoreData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: this.authService.getCurrentUser().uid,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating score:', error);
            throw error;
        }
    }

    async updateScore(scoreId, scoreData) {
        try {
            // Get existing score to check permissions
            const existingScore = await this.getScore(scoreId);
            if (!existingScore) {
                throw new Error('Score not found');
            }

            // Check if user can update this score
            if (!this.authService.canSubmitScores(existingScore.teamId, existingScore.subTeamId)) {
                throw new Error('Unauthorized');
            }

            await db.collection('scores').doc(scoreId).update({
                ...scoreData,
                updatedBy: this.authService.getCurrentUser().uid,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating score:', error);
            throw error;
        }
    }

    async updateReviewedScore(scoreId, reviewedScores) {
        if (!this.authService.hasPermission('review_scores')) {
            throw new Error('Unauthorized');
        }

        try {
            await db.collection('scores').doc(scoreId).update({
                reviewedScores,
                reviewedBy: this.authService.getCurrentUser().uid,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating reviewed score:', error);
            throw error;
        }
    }

    async getScore(scoreId) {
        try {
            const doc = await db.collection('scores').doc(scoreId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting score:', error);
            throw error;
        }
    }

    async deleteScore(scoreId) {
        try {
            const existingScore = await this.getScore(scoreId);
            if (!existingScore) {
                throw new Error('Score not found');
            }

            if (!this.authService.canSubmitScores(existingScore.teamId, existingScore.subTeamId)) {
                throw new Error('Unauthorized');
            }

            await db.collection('scores').doc(scoreId).delete();
        } catch (error) {
            console.error('Error deleting score:', error);
            throw error;
        }
    }

    // Leaderboard data aggregation
    async getLeaderboardData() {
        try {
            // Get all scores, teams, subteams, members, and leaders
            const [scores, teams, leaders] = await Promise.all([
                this.getScores(),
                this.getTeams(),
                this.getLeaders()
            ]);

            // Get all subteams and members for each team
            const teamsWithSubTeams = await Promise.all(
                teams.map(async (team) => {
                    const subTeams = await this.getSubTeams(team.id);
                    const subTeamsWithMembers = await Promise.all(
                        subTeams.map(async (subTeam) => {
                            const members = await this.getMembers(team.id, subTeam.id);
                            return { ...subTeam, members };
                        })
                    );
                    return { ...team, subTeams: subTeamsWithMembers };
                })
            );

            return this.buildLeaderboard(scores, teamsWithSubTeams, leaders);
        } catch (error) {
            console.error('Error getting leaderboard data:', error);
            throw error;
        }
    }

    buildLeaderboard(scores, teams, leaders) {
        const memberScores = new Map();
        const leadersMap = new Map(leaders.map(l => [l.id, l]));

        // Filter and aggregate scores
        const validScores = scores.filter(score =>
            !score.unavailable &&
            score.reviewedScores &&
            Object.keys(score.reviewedScores).length > 0
        );

        // Group scores by member
        validScores.forEach(score => {
            const key = `${score.teamId}-${score.subTeamId}-${score.memberId}`;
            if (!memberScores.has(key)) {
                memberScores.set(key, {
                    teamId: score.teamId,
                    subTeamId: score.subTeamId,
                    memberId: score.memberId,
                    totalScore: 0,
                    scores: {}
                });
            }

            const memberScore = memberScores.get(key);
            Object.entries(score.reviewedScores).forEach(([product, points]) => {
                if (typeof points === 'number') {
                    memberScore.scores[product] = (memberScore.scores[product] || 0) + points;
                    memberScore.totalScore += points;
                }
            });
        });

        // Build leaderboard entries with member, team, and leader info
        const leaderboardEntries = [];

        teams.forEach(team => {
            const teamLeader = leadersMap.get(team.leaderId?.id);

            team.subTeams?.forEach(subTeam => {
                const subTeamLeader = leadersMap.get(subTeam.leaderId?.id);

                subTeam.members?.forEach(member => {
                    const key = `${team.id}-${subTeam.id}-${member.id}`;
                    const memberScore = memberScores.get(key);

                    leaderboardEntries.push({
                        member: {
                            id: member.id,
                            name: member.name,
                            position: member.position,
                            imageBase64: member.imageBase64
                        },
                        subTeam: {
                            id: subTeam.id,
                            name: subTeam.name,
                            color: subTeam.color,
                            leader: subTeamLeader ? {
                                id: subTeamLeader.id,
                                name: subTeamLeader.name,
                                imageBase64: subTeamLeader.imageBase64
                            } : null
                        },
                        team: {
                            id: team.id,
                            name: team.name,
                            number: team.number,
                            leader: teamLeader ? {
                                id: teamLeader.id,
                                name: teamLeader.name,
                                imageBase64: teamLeader.imageBase64
                            } : null
                        },
                        totalScore: memberScore?.totalScore || 0,
                        scores: memberScore?.scores || {}
                    });
                });
            });
        });

        // Sort by total score (descending)
        leaderboardEntries.sort((a, b) => b.totalScore - a.totalScore);

        return leaderboardEntries;
    }
}