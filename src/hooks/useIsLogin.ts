import { isLogin } from '@/utils/db/firebase'
import { useEffect, useState } from 'react'

export default function useIsLogin() {
  const [state, stateSet] = useState(false)

  useEffect(() => {
    isLogin.then(() => stateSet(true))
  }, [])

  return state
}
