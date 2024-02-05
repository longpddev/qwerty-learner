import { initializeApp } from 'firebase/app'
import type { User } from 'firebase/auth'
import { GoogleAuthProvider, browserSessionPersistence, getAuth, signInWithPopup } from 'firebase/auth'
import { child, getDatabase, onValue, push, ref, update } from 'firebase/database'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore/lite'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_authDomain,
  projectId: import.meta.env.VITE_FIREBASE_projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_appId,
  databaseURL: 'https://robotic-tiger-332407-default-rtdb.asia-southeast1.firebasedatabase.app/',
}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig)
const database = getDatabase(firebaseApp)
const db = getFirestore(firebaseApp)
const auth = getAuth()
auth.onAuthStateChanged((data) => {
  console.log(data)
})

export const isLogin = auth.setPersistence(browserSessionPersistence).then((): Promise<User> => {
  const currentUser = auth.currentUser
  if (currentUser) return Promise.resolve(currentUser)

  const btn = document.createElement('button')
  btn.setAttribute('class', 'my-btn-primary fixed bottom-4 right-4 w-20 bg-indigo-500 shadow z-[1000]')

  btn.innerHTML = 'Login'
  document.body.appendChild(btn)

  return new Promise((res) => {
    btn.onclick = async () => {
      const provider = new GoogleAuthProvider()
      provider.addScope('https://www.googleapis.com/auth/admin.directory.user.readonly')
      const result = await signInWithPopup(auth, provider)
      btn.remove()
      res(result.user)
    }
  })
})
export async function getDocRef(...paths: string[]) {
  const userId = await isLogin
  return doc(db, 'test', userId.uid, ...paths)
}

export async function backupData(data: any) {
  const docRef = await getDocRef('backup')
  return setDoc(docRef, data)
}

export async function getBackupData() {
  const docRef = await getDocRef('backup')
  return (await getDoc(docRef)).data()
}

export async function refPath(...args: string[]) {
  const user = await isLogin
  return ref(database, ['users', user.uid].concat(args).join('/') || undefined)
}

// async function run() {
//   const user = await isLogin

//   const testRef = refPath('users', user.uid, 'word-count')
//   window.test = () => {
//     push(child(testRef, 'posts'), 123)
//   }
//   onValue(testRef, (snapshot) => {
//     snapshot
//     console.log(snapshot.val())
//   })
// }
// run()

export default firebaseApp
