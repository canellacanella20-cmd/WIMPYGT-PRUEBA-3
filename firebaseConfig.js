// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE FIREBASE
// ─────────────────────────────────────────────────────────────
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto nuevo (gratis) llamado, por ejemplo, "wimpy-app"
// 3. Dentro del proyecto: Configuración del proyecto (⚙️) > tus apps > "</>" (Web)
// 4. Registra la app (no necesitas hosting) y copia el objeto firebaseConfig
//    que te da Firebase, y pégalo abajo reemplazando estos valores de ejemplo.
// 5. En el menú lateral de Firebase, entra a "Firestore Database" > "Crear
//    base de datos" > modo producción > elige la región más cercana
//    (nam5 o southamerica-east1 están bien para Guatemala).
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCpQOkkjiaLH9orz0noP4i5uA_PmSjXGsE',
  authDomain: 'app-caja-wimpygt.firebaseapp.com',
  projectId: 'app-caja-wimpygt',
  storageBucket: 'app-caja-wimpygt.firebasestorage.app',
  messagingSenderId: '394844693752',
  appId: '1:394844693752:web:ff9e02d7d5c35ed53a470d',
};

const app = initializeApp(firebaseConfig);

// initializeFirestore con long polling evita problemas de conexión
// comunes en React Native / Expo Go.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export default app;
