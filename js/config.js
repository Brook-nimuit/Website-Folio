// ==========================================
// CONFIGURATION: GLOBAL SYSTEM CONSTANTS
// ==========================================

const APP_CONFIG = {
  githubUsername: 'Brook-nimuit',
  discordId: '1035876890126336061',
  chessUsername: 'Balandor_Nacho',
  spotifyCacheKey: 'banimut_recent_tracks',
  loaderDurationMs: 250,
  firebaseConfig: {
    apiKey: 'AIzaSyCzAi7U8V5rOgOXaX0LUTKXJoGwElL7mCU',
    authDomain: 'portfolio-telemetry.firebaseapp.com',
    projectId: 'portfolio-telemetry',
    storageBucket: 'portfolio-telemetry.appspot.com',
    messagingSenderId: '784832183274',
    appId: '1:784832183274:web:639177394bedf08530d093'
  }
};

const CALENDAR_CONFIG = {
  apiKey: 'AIzaSyDReXA4LBLtDAakYX7z3V50koNNPCk_gog',
  calendarId: 'brook2022nets@gmail.com', // or group calendar ID
  maxResults: 6
};

// Export to window scope so other modules can consume it cleanly
window.APP_CONFIG = APP_CONFIG;