import { chapterRecordsAtom } from '@/firebase'
import { db } from '@/utils/db'
import type { IChapterRecord } from '@/utils/db/record'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

export function useDictStats(dictID: string, isStartLoad: boolean) {
  const [dictStats, setDictStats] = useState<IDictStats | null>(null)
  const chapterRecordsControl = useAtomValue(chapterRecordsAtom)
  useEffect(() => {
    if (isStartLoad && !dictStats) {
      return chapterRecordsControl?.getByDict(dictID, (records) => {
        setDictStats(getDictStats(records))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictID, isStartLoad, chapterRecordsControl])

  return dictStats
}

interface IDictStats {
  exercisedChapterCount: number
}

function getDictStats(records: IChapterRecord[]): IDictStats {
  const allChapter = records.map(({ chapter }) => chapter).filter((item) => item !== null) as number[]
  const uniqueChapter = allChapter.filter((value, index, self) => {
    return self.indexOf(value) === index
  })
  const exercisedChapterCount = uniqueChapter.length

  return { exercisedChapterCount }
}
