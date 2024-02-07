import { login, logout, userAtom } from '@/firebase'
import { useAtomValue } from 'jotai'
import { useCallback, useState } from 'react'
import { toast } from 'react-hot-toast'

function usePromise<T extends Array<unknown>, R>(cb: (...args: T) => Promise<R>) {
  const [pending, pendingSet] = useState(false)

  return [
    useCallback(
      async (...args: T) => {
        pendingSet(true)
        try {
          const result = await cb(...args)
          return result
        } finally {
          pendingSet(false)
        }
      },
      [cb],
    ),
    pending,
  ] as const
}

const Authentication = () => {
  const user = useAtomValue(userAtom)
  console.log('🚀 ~ Authentication ~ user:', user)
  const [loginHandle, loginPending] = usePromise(login)
  const [logoutHandle, logoutPending] = usePromise(logout)
  return (
    <>
      {user ? (
        <button
          disabled={logoutPending}
          onClick={() =>
            logoutHandle()
              .then(() => toast.success('Logout success'))
              .catch(() => toast.error('Logout false'))
          }
          className="my-btn-primary fixed bottom-4 right-4 z-[1000] w-20 bg-orange-500 shadow"
        >
          Logout
        </button>
      ) : (
        <button
          disabled={loginPending}
          onClick={() =>
            loginHandle()
              .then(() => toast.success('Login success'))
              .catch(() => toast.error('Login false'))
          }
          className="my-btn-primary fixed bottom-4 right-4 z-[1000] w-20 bg-indigo-500 shadow"
        >
          Login
        </button>
      )}
    </>
  )
}

export default Authentication
