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
├── firestore.rules           # Firestore security rules
└── README.md                 # This file

