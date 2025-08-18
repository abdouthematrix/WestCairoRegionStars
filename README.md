# West Cairo Bank - Sales Leaderboard

A bilingual (Arabic/English) Firebase web application for managing bank sales leaderboards with role-based access control.

## Features

- **Bilingual Support**: Arabic and English with RTL support
- **Firebase Authentication**: Email/password using username@westcairo.com format
- **Role-Based Access Control**: Admin, Branch Leader, Sub-Team Leader, and Guest roles
- **Dynamic SPA**: Single-page application with modular components
- **Leaderboard System**: Real-time leaderboard without ranking
- **Score Management**: Submit, review, and approve scores
- **Team Management**: Hierarchical team structure with sub-teams and members
- **Image Support**: Base64 image storage for members and leaders
- **Responsive Design**: Mobile-friendly interface

## Project Structure
├── index.html                 # Main HTML file
├── styles/
│   └── main.css              # Main stylesheet with RTL support
├── js/
│   ├── app.js                # Main application entry point
│   ├── config/
│   │   └── firebase-config.js # Firebase configuration
│   ├── services/
│   │   ├── auth.js           # Authentication service
│   │   └── firestore.js      # Firestore CRUD operations
│   ├── components/
│   │   ├── leaderboard.js    # Leaderboard component
│   │   ├── dashboard.js      # Dashboard component
│   │   ├── teams.js          # Teams management component
│   │   └── scores.js         # Scores management component
│   ├── utils/
│   │   ├── i18n.js           # Internationalization utility
│   │   ├── image-utils.js    # Image processing utilities
│   │   └── date-utils.js     # Date formatting utilities
│   ├── locales/
│   │   ├── en.json           # English translations
│   │   └── ar.json           # Arabic translations
│   └── router.js             # Client-side routing
└── README.md                 # This file


## Idea
```
Build a bilingual (Arabic/English) Firebase web app for a bank sales leaderboard. Use:
✅ Firebase Auth (Email/Password using username@westcairo.com format)
✅ Firebase Firestore (for teams, leaders, members, scores)
✅ Modular JavaScript (ES Modules)
✅ Dynamic loading of components/views (SPA-style, no full-page reloads)
✅ Leaderboard logic showing achievers, their team leaders, and teams — without rank
✅ Role-based dashboards and CRUD permissions
✅ Compressed Base64 image support for members and leaders (resize + compress before storing)
📁 Firestore Structure:
teams/{teamId}
  - name, number, isAdmin, leaderId (ref: leaders)
  - subTeams/{subTeamId}
      - name, number, color, targetQuota, leaderId (ref: leaders)
      - members/{memberId}
          - name, position, imageBase64, createdAt
leaders/{leaderId}
  - userId (Firebase UID)
  - type: 'admin' | 'branch' | 'subTeam'
  - name, contact, position, imageBase64
  - teamId or subTeamId
scores/{scoreId}
  - date (YYYY-MM-DD)
  - teamId, subTeamId, memberId
  - scores: { product1, product2, ... }
  - reviewedScores: { product1, product2, ... }
  - unavailable: boolean
  - updatedBy, lastUpdated
🎯 Role-based Access & Permissions:
- Admins:
  - Full access
  - Can review and edit reviewedScores
  - Can add/edit/remove teams, sub-teams, members
- Branch Leaders:
  - Manage own team and sub-teams
  - Can add/edit/remove sub-teams and members
  - Can submit scores (not reviewedScores)
- Sub-Team Leaders:
  - Manage only their sub-team
  - Can add/edit/remove members
  - Can submit scores (not reviewedScores)
- Guest (Unauthenticated)
  - Read-only access to the public leaderboard
  - Can filter by date, team, sub-team, product
  - No CRUD, no dashboards, no private breakdowns if restricted by admin
🏆 Leaderboard Logic (No Rank):
- Public view (guest included)
- Read from reviewedScores
- Exclude scores where unavailable = true
- Group by date then group by memberId for that date
- Aggregate numeric fields in reviewedScores for that day
- Display per day:
  - Member name + image
  - Sub-Team name + leader name + image
  - Team name + leader name + image
  - Total Score
🔄 Modular JS Structure:
- Auth: Handles Firebase login/logout and role-based redirection
- Firestore: Contains all reads/writes (CRUD) with permission guards
- Views/Components: Dynamically loaded into main content container
- Leaderboard Builder: Aggregates scores and renders UI
- Utilities: image compression, Score calculator, date formatting, i18n loader, etc.
🌐 Dynamic View Loading:
- Load views and components dynamically using ES Modules or HTML injection
- Use routing (hash) to switch views without reloading
- All Firebase calls and UI logic are modular and decoupled
🔒 Firestore Rules:
- Auth required for all read/write
- Leaders can only write to their own team/sub-team
- Only admins can write to reviewedScores
- Users can only manage teams/members/scores they own based on Firestore relationships
🌍 Notes:
- All user images are stored as imageBase64 in Firestore
- All user images must be compressed before being stored as base64 in Firestore.
- Emails follow username@westcairo.com format
- App supports Arabic/English via dynamic translation JSON
Ensure the app supports role-based routing, secure CRUD operations, efficient leaderboard calculation, and smooth dynamic transitions.
take your time to generate all project then send the files to avoid reptation
send file formatted as:
// Filename: <YourFileNameHere>
<code block with file contents>
```