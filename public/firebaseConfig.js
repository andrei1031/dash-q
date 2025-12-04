// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

// REPLACE THE VALUES BELOW WITH YOUR FIREBASE PROJECT SETTINGS
// You can find these in Firebase Console > Project Settings > General > Your Apps > SDK Setup and Configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Messaging and export it
export const messaging = getMessaging(app);