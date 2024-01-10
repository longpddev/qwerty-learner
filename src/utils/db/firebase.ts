import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, browserSessionPersistence, getAuth, signInWithPopup } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore/lite'

const firebaseConfig = {}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig)
const db = getFirestore(firebaseApp)
const auth = getAuth()
export const isLogin = auth.setPersistence(browserSessionPersistence).then(() => {
  if (auth.currentUser) return

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
      res(result)
    }
  })
})
function getDocRef(userId: string) {
  return doc(db, 'production', userId)
}

export async function backupData(data: any) {
  await isLogin
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('use id not found')

  const docRef = getDocRef(userId)
  return setDoc(docRef, data)
}

export async function getBackupData() {
  await isLogin
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('use id not found')

  const docRef = getDocRef(userId)
  return (await getDoc(docRef)).data()
}

export default firebaseApp
