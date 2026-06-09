import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyBbTmQQEn0ghv5YQiX0H9_nHMZRJTyfEA4",
  authDomain: "rosatv-2baed.firebaseapp.com",
  projectId: "rosatv-2baed",
  storageBucket: "rosatv-2baed.firebasestorage.app",
  messagingSenderId: "472207459062",
  appId: "1:472207459062:web:90489e540d334ffdf022d7",
  measurementId: "G-BMDJFRLSCV"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
