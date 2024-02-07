import { chapterRecordsAtom, wordRecordsAtom } from '@/firebase'
import { toFixedNumber } from '@/utils'
import type { IChapterRecord } from '@/utils/db/record'
import { ChapterRecord, ScheduleHandle } from '@/utils/db/record'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

export function useChapterStats(chapter: number, dictID: string, isStartLoad: boolean) {
  const [chapterStats, setChapterStats] = useState<IChapterStats | null>(null)
  const chapterRecordControl = useAtomValue(chapterRecordsAtom)

  useEffect(() => {
    if (isStartLoad && !chapterStats) {
      const id = ChapterRecord.createId(dictID, chapter)
      return chapterRecordControl?.getById(id, (chapter) => {
        if (!chapter) return
        setChapterStats(getChapterStats(chapter))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictID, chapter, isStartLoad, chapterRecordControl])

  return chapterStats
}

export interface IChapterStats {
  exerciseCount: number
  avgWrongWordCount: number
  avgWrongInputCount: number
  schedule?: ScheduleHandle
}

function getChapterStats(record: IChapterRecord): IChapterStats {
  const records = record ? [record] : []
  const exerciseCount = records.length
  const totalWrongWordCount = records.reduce(
    (total, { wordNumber, correctWordIndexes }) => total + (wordNumber - correctWordIndexes.length),
    0,
  )
  const avgWrongWordCount = exerciseCount > 0 ? toFixedNumber(totalWrongWordCount / exerciseCount, 2) : 0

  const totalWrongInputCount = records.reduce((total, { wrongCount }) => total + (wrongCount ?? 0), 0)
  const avgWrongInputCount = exerciseCount > 0 ? toFixedNumber(totalWrongInputCount / exerciseCount, 2) : 0
  return { exerciseCount, avgWrongWordCount, avgWrongInputCount, schedule: record ? new ScheduleHandle(record) : undefined }
}
