import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA05v8RYPGv72LN9ZuGXKnrQGz6f66wT_g",
  authDomain: "campuskart-1545d.firebaseapp.com",
  projectId: "campuskart-1545d",
  storageBucket: "campuskart-1545d.firebasestorage.app",
  messagingSenderId: "380134811918",
  appId: "1:380134811918:web:cde714e3cc59edced00f5f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
