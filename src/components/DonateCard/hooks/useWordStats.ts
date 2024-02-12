import { chapterRecordsAtom, wordRecordsAtom } from '@/firebase'
import safePromise from '@/utils/safePromise'
import dayjs from 'dayjs'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

export function useChapterNumber() {
  const [chapterNumber, setChapterNumber] = useState<number>(0)
  const chapterRecordsControl = useAtomValue(chapterRecordsAtom)
  useEffect(() => {
    if (!chapterRecordsControl) return

    return safePromise(
      () => chapterRecordsControl.get(),
      (records) => {
        setChapterNumber(records.reduce((total, item) => total + item.practiceTime, 0))
      },
    )
  }, [chapterRecordsControl])

  return chapterNumber
}

export function useDayFromFirstWordRecord() {
  const [dayFromFirstWordRecord, setDayFromFirstWordRecord] = useState<number>(0)
  const wordRecordControl = useAtomValue(wordRecordsAtom)
  useEffect(() => {
    if (!wordRecordControl) return

    return safePromise(
      () => wordRecordControl.getFirstWord(),
      (firstWordRecord) => {
        if (!firstWordRecord) return
        const firstWordRecordTimeStamp = firstWordRecord?.timeStamp || 0
        const now = dayjs()
        const timestamp = dayjs.unix(firstWordRecordTimeStamp)
        const daysPassed = now.diff(timestamp, 'day')
        setDayFromFirstWordRecord(daysPassed)
      },
    )
  }, [wordRecordControl])

  return dayFromFirstWordRecord
}

export function useWordNumber() {
  const [wordNumber, setWordNumber] = useState<number>(0)
  const wordRecordControl = useAtomValue(wordRecordsAtom)
  useEffect(() => {
    if (!wordRecordControl) return
    return safePromise(() => wordRecordControl.count(), setWordNumber)
  }, [wordRecordControl])

  return wordNumber
}

export function useSumWrongCount() {
  const [sumWrongCount, setSumWrongCount] = useState<number>(0)
  const chapterRecordsControl = useAtomValue(chapterRecordsAtom)
  useEffect(() => {
    if (!chapterRecordsControl) return
    return safePromise(
      () => chapterRecordsControl.get(),
      (records) => setSumWrongCount(records.reduce((total, item) => total + item.wrongCount, 0)),
    )
  }, [chapterRecordsControl])

  return sumWrongCount
}
