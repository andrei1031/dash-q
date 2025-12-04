importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// ---------------------------------------------------------------------------
// DEBUG: Log that the script has started loading
console.log('[SW] Service Worker script is loading...');
// ---------------------------------------------------------------------------

try {
  // -------------------------------------------------------------------------
  // PASTE YOUR REAL KEYS BELOW.
  // ⚠️ IMPORTANT: Ensure every line except the last one ends with a COMMA (,)
  // -------------------------------------------------------------------------
  const firebaseConfig = {
    apiKey: "AIzaSyAR8TbEXRuYTX8_6UAx2DBa9BD1a7LK6U0",             // <--- Comma required
    authDomain: "dash-q.firebaseapp.com", // <--- Comma required
    projectId: "dash-q",            // <--- Comma required
    storageBucket: "dash-q.firebasestorage.app",  // <--- Comma required
    messagingSenderId: "172404162598",     // <--- Comma required
    appId: "1:172404162598:web:f086600da40973430a66e7"                     // <--- Last one: Comma optional
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  console.log('[SW] Firebase Initialized successfully.');

  const messaging = firebase.messaging();

  // Background Message Handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background message: ', payload);
    
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/icon.png' // Ensure this file exists in public/
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });

} catch (error) {
  // This will catch the "No Firebase App" or syntax errors and log them clearly
  console.error('[SW] CRITICAL ERROR during initialization:', error);
}