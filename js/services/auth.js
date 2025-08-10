export class AuthService {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.listeners = [];
    }

    async login(username, password) {
        try {
            const email = `${username}@westcairo.com`;
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;

            // Get user role from leaders collection
            const userRole = await this.getUserRole(this.currentUser.uid);
            this.userRole = userRole;

            this.notifyListeners();
            return { success: true, user: this.currentUser, role: userRole };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.userRole = null;
            this.notifyListeners();
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserRole(uid) {
        try {
            const leadersQuery = db.collection('leaders').where('userId', '==', uid);
            const snapshot = await leadersQuery.get();

            if (!snapshot.empty) {
                const leaderDoc = snapshot.docs[0];
                const leaderData = leaderDoc.data();
                return {
                    type: leaderData.type,
                    leaderId: leaderDoc.id,
                    name: leaderData.name,
                    teamId: leaderData.teamId,
                    subTeamId: leaderData.subTeamId,
                    ...leaderData
                };
            }

            return { type: 'guest' };
        } catch (error) {
            console.error('Error getting user role:', error);
            return { type: 'guest' };
        }
    }

    onAuthStateChanged(callback) {
        this.listeners.push(callback);
        return auth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            if (user) {
                this.userRole = await this.getUserRole(user.uid);
            } else {
                this.userRole = { type: 'guest' };
            }
            callback(user, this.userRole);
        });
    }

    notifyListeners() {
        this.listeners.forEach(callback => {
            callback(this.currentUser, this.userRole);
        });
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentRole() {
        return this.userRole;
    }

    hasPermission(action, resource) {
        if (!this.userRole) return false;

        const { type } = this.userRole;

        switch (action) {
            case 'view_leaderboard':
                return true; // Everyone can view leaderboard

            case 'view_dashboard':
                return ['admin', 'branch', 'subTeam'].includes(type);

            case 'manage_teams':
                return type === 'admin';

            case 'manage_subteams':
                return ['admin', 'branch'].includes(type);

            case 'manage_members':
                return ['admin', 'branch', 'subTeam'].includes(type);

            case 'submit_scores':
                return ['admin', 'branch', 'subTeam'].includes(type);

            case 'review_scores':
                return type === 'admin';

            case 'edit_reviewed_scores':
                return type === 'admin';

            default:
                return false;
        }
    }

    canManageTeam(teamId) {
        if (!this.userRole) return false;

        const { type } = this.userRole;

        if (type === 'admin') return true;
        if (type === 'branch' && this.userRole.teamId === teamId) return true;

        return false;
    }

    canManageSubTeam(subTeamId) {
        if (!this.userRole) return false;

        const { type } = this.userRole;

        if (type === 'admin') return true;
        if (type === 'branch' && this.userRole.teamId) return true; // Branch leaders can manage their subteams
        if (type === 'subTeam' && this.userRole.subTeamId === subTeamId) return true;

        return false;
    }

    canSubmitScores(teamId, subTeamId) {
        if (!this.userRole) return false;

        const { type } = this.userRole;

        if (type === 'admin') return true;
        if (type === 'branch' && this.userRole.teamId === teamId) return true;
        if (type === 'subTeam' && this.userRole.subTeamId === subTeamId) return true;

        return false;
    }
}