import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase web config is public by design (it identifies the project; it is not a secret).
const firebaseConfig = {
  apiKey: "AIzaSyD-nwZOw1rA67JSLbp5vYWnPEb9PlwiGMk",
  authDomain: "portfolio-neha-pandit.firebaseapp.com",
  projectId: "portfolio-neha-pandit",
  storageBucket: "portfolio-neha-pandit.firebasestorage.app",
  messagingSenderId: "271402406231",
  appId: "1:271402406231:web:774db7f642c1558980ee12",
  measurementId: "G-PXS31W832Y",
};

// Exposed as a function (not a side-effect import) because package.json sets
// "sideEffects": false, which would let the bundler drop a bare import.
export function initAnalytics() {
  // Only track in production builds, and only where the browser supports it.
  if (!import.meta.env.PROD) return;
  const app = initializeApp(firebaseConfig);
  isSupported().then((ok) => {
    if (ok) getAnalytics(app);
  });
}
