import { wordRecordsAtom } from '@/firebase'
import type { Dictionary, Word } from '@/typings'
import { db } from '@/utils/db'
import type { WordRecord } from '@/utils/db/record'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

type groupRecord = {
  word: string
  records: WordRecord[]
}

export type TErrorWordData = {
  word: string
  originData: Word
  errorCount: number
  errorLetters: Record<string, number>
  errorChar: string[]
  latestErrorTime: number
}

export default function useErrorWordData(dict: Dictionary) {
  const { data: wordList, error, isLoading } = useSWR(dict?.url, wordListFetcher)
  const wordRecordControl = useAtomValue(wordRecordsAtom)
  const [errorWordData, setErrorData] = useState<TErrorWordData[]>([])

  useEffect(() => {
    if (!wordList) return
    return wordRecordControl?.getErrorWordData(dict.id, wordList, (wordWrong) => setErrorData(wordWrong))
  }, [dict.id, wordList, wordRecordControl])

  return { errorWordData, isLoading, error }
}
