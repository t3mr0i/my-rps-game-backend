import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBy7h2IqsRmcUnss6mst-Zd1tCMM0Z4HE0",
  authDomain: "rps-game-6b432.firebaseapp.com",
  databaseURL: "https://rps-game-6b432-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "rps-game-6b432",
  storageBucket: "rps-game-6b432.appspot.com",
  messagingSenderId: "789772515371",
  appId: "1:789772515371:web:8e56f3e0e3601421b5526e",
  measurementId: "G-Q2PHBHJRG4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
