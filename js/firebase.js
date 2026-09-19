// firebase.js - Conexão com o Backend (Google Firebase)

// Configuração do projeto (Gerado pelo Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyAoRj6-bDRMjSdxhBdfHaGcl8Hfvc6s2gc",
  authDomain: "site-sistema-d6d2d.firebaseapp.com",
  projectId: "site-sistema-d6d2d",
  storageBucket: "site-sistema-d6d2d.firebasestorage.app",
  messagingSenderId: "150899926023",
  appId: "1:150899926023:web:1393e12dd8a655acbdb6a2"
};

// Inicializa o Firebase (a ponte entre o site e o Google)
firebase.initializeApp(firebaseConfig);

// Atalhos para os serviços que vamos usar
const auth = firebase.auth(); // Serviço de Login (Authentication)
const db = firebase.firestore(); // Serviço de Banco de Dados (Firestore)

console.log('Firebase conectado ao projeto 7Site!');