import { wordRecordsAtom } from '@/firebase'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

export function useRevisionWordCount(dictID: string) {
  const [wordCount, setWordCount] = useState<number>(0)
  const wordRecordControl = useAtomValue(wordRecordsAtom)
  useEffect(() => {
    if (dictID) {
      return wordRecordControl?.getRevisionWordCount(dictID, (num) => setWordCount(num))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictID])

  return wordCount
}
