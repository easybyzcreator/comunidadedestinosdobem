import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBGlEnDLoVBGKlBWxesJUT1_AdU46Go5bY",
  authDomain: "app-tour-juridico-brasilia.firebaseapp.com",
  projectId: "app-tour-juridico-brasilia",
  storageBucket: "app-tour-juridico-brasilia.firebasestorage.app",
  messagingSenderId: "828700732997",
  appId: "1:828700732997:web:078d45f9bed4773a43bd2c",
  measurementId: "G-3JVDKFK9TG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Analytics only works in the browser
let analytics;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch {
    // Analytics might not be supported in some iframe or sandbox environments
  }
}

export { app, analytics, db };
