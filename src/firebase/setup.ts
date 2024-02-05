import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, browserSessionPersistence, getAuth, signInWithPopup } from 'firebase/auth'
import { child, getDatabase, onValue, push, ref, update } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_authDomain,
  projectId: import.meta.env.VITE_FIREBASE_projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_appId,
  databaseURL: 'https://robotic-tiger-332407-default-rtdb.asia-southeast1.firebasedatabase.app/',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const database = getDatabase(firebaseApp)
export const auth = getAuth()

auth.setPersistence(browserSessionPersistence)

export async function login() {
  const provider = new GoogleAuthProvider()
  provider.addScope('https://www.googleapis.com/auth/admin.directory.user.readonly')
  return await signInWithPopup(auth, provider)
}

export function getRef(userId: string, ...paths: string[]) {
  return ref(database, ['users', userId].concat(paths).join('/') || undefined)
}
