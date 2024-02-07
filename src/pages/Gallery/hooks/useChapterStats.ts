import { chapterRecordsAtom } from '@/firebase'
import { currentDictIdAtom } from '@/store'
import { db } from '@/utils/db'
import type { IChapterRecord } from '@/utils/db/record'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

export function useChapterStats(chapter: number, isStartLoad: boolean) {
  const dictID = useAtomValue(currentDictIdAtom)
  const [chapterStats, setChapterStats] = useState<IChapterStats | null>(null)
  const chapterRecordsControl = useAtomValue(chapterRecordsAtom)

  useEffect(() => {
    if (isStartLoad && !chapterStats) {
      return chapterRecordsControl?.getByDict(dictID, (records) => {
        setChapterStats(getChapterStats(records))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictID, chapter, isStartLoad, chapterRecordsControl])

  return chapterStats
}

interface IChapterStats {
  exerciseCount: number
  avgWrongCount: number
}

function getChapterStats(records: IChapterRecord[]): IChapterStats {
  const exerciseCount = records.length
  const totalWrongCount = records.reduce((total, { wrongCount }) => total + (wrongCount || 0), 0)
  const avgWrongCount = exerciseCount > 0 ? totalWrongCount / exerciseCount : 0

  return { exerciseCount, avgWrongCount }
}
