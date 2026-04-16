import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5eSZLCsrCCuUKXdmKwZyUxqlNbPBpZoI",
  authDomain: "eatin-map-ee417.firebaseapp.com",
  projectId: "eatin-map-ee417",
  storageBucket: "eatin-map-ee417.firebasestorage.app",
  messagingSenderId: "850029980493",
  appId: "1:850029980093:web:bd2ea9a6e942b342220ad4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
