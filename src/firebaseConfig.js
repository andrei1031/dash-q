// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAR8TbEXRuYTX8_6UAx2DBa9BD1a7LK6U0",
  authDomain: "dash-q.firebaseapp.com",
  projectId: "dash-q",
  storageBucket: "dash-q.firebasestorage.app",
  messagingSenderId: "172404162598",
  appId: "1:172404162598:web:f086600da40973430a66e7",
  measurementId: "G-017W5GCMWL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);