import { toFixedNumber } from '..'
import range from '../range'
import './firebase'
import { getDocRef } from './firebase'
import type { IChapterRecord, IReviewRecord, IRevisionDictRecord, IWordRecord, LetterMistakes } from './record'
import { ChapterRecord, ReviewRecord, ScheduleHandle, WordRecord } from './record'
import type { IChapterStats } from '@/pages/Gallery-N/hooks/useChapterStats'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import type { TypingState } from '@/pages/Typing/store/type'
import { currentChapterAtom, currentDictIdAtom, currentDictInfoAtom, isReviewModeAtom } from '@/store'
import type { Dictionary } from '@/typings'
import type { Table } from 'dexie'
import Dexie from 'dexie'
import { deleteDoc, getDoc, setDoc } from 'firebase/firestore/lite'
import { useAtomValue } from 'jotai'
import { maxBy } from 'lodash'
import { useCallback, useContext } from 'react'
import useSWR from 'swr'

class RecordDB extends Dexie {
  wordRecords!: Table<IWordRecord, number>
  chapterRecords!: Table<IChapterRecord, string>
  reviewRecords!: Table<IReviewRecord, number>

  revisionDictRecords!: Table<IRevisionDictRecord, number>
  revisionWordRecords!: Table<IWordRecord, number>

  constructor() {
    super('RecordDB')
    this.version(1).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,errorCount,[dict+chapter]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,[dict+chapter]',
    })
    this.version(2).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,[dict+chapter]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,[dict+chapter]',
    })
    this.version(3).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,[dict+chapter]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,[dict+chapter]',
      reviewRecords: '++id,dict,createTime,isFinished',
    })
  }
}

export const db = new RecordDB()

db.wordRecords.mapToClass(WordRecord)
db.chapterRecords.mapToClass(ChapterRecord)
db.reviewRecords.mapToClass(ReviewRecord)

function groupArray<T>(arr: T[], by: number): T[][] {
  return arr.reduce((acc, item) => {
    const lastIndex = acc.length - 1
    if (lastIndex < 0 || acc[lastIndex].length >= by) {
      acc.push([item])
    } else {
      acc[lastIndex].push(item)
    }

    return acc
  }, [] as T[][])
}

async function saveRecords(data: string, name: string) {
  const docref = await getDocRef(name, 'rawData')
  // await deleteDoc(docref)
  await setDoc(docref, { content: data })
}

export async function pushRecords(name: string, data: string) {
  const docref = await getDocRef(name, 'rawData')
  await setDoc(docref, { content: data })
  console.log('pushed record', name)
}

export async function pullRecords(name: string) {
  const docref = await getDocRef(name, 'rawData')
  const doc = await getDoc(docref)
  const json = doc.data()?.content ?? '[]'

  return JSON.parse(json)
}

export async function deleteAllRecords() {
  await db.wordRecords.clear()
  await db.chapterRecords.clear()
  await db.reviewRecords.clear()
}

window._db = db
window._clear = async () => {
  await db.wordRecords.clear()
  await db.chapterRecords.clear()
  await db.reviewRecords.clear()
}

export async function pullAllRecords() {
  const [wordRecords, chapterRecords, reviewRecords] = (await Promise.all(
    ['wordRecords', 'chapterRecords', 'reviewRecords'].map(pullRecords),
  )) as [IWordRecord[], IChapterRecord[], IReviewRecord[]]

  if (wordRecords.length > 0) {
    await db.wordRecords.clear()
    await Promise.all(wordRecords.map((item) => db.wordRecords.add(item, (item as unknown as { id: number }).id)))
  }

  if (chapterRecords.length > 0) {
    await db.chapterRecords.clear()
    await Promise.all(chapterRecords.map((item) => db.chapterRecords.add(item, (item as unknown as { id: number }).id.toString())))
  }

  if (reviewRecords.length > 0) {
    await db.reviewRecords.clear()
    await Promise.all(reviewRecords.map((item) => db.reviewRecords.add(item)))
  }

  alert('pullAllRecords done')
}

export async function pushAllRecords() {
  await pushRecords('wordRecords', JSON.stringify(await db.wordRecords.toArray()))
  await pushRecords('chapterRecords', JSON.stringify(await db.chapterRecords.toArray()))
  await pushRecords('reviewRecords', JSON.stringify(await db.reviewRecords.toArray()))

  alert('pushAllRecords done')
}

export async function getChapterById(id: string) {
  return db.chapterRecords.get(id)
}

export async function getChapterByDict(dict: string) {
  const records = await db.chapterRecords.where({ dict }).toArray()
  records.sort((a, b) => {
    return new Date(a.card_due).getTime() - new Date(b.card_due).getTime()
  })

  return records
}

window.getChapterByDict = getChapterByDict

export interface IChapterDetail {
  stats?: IChapterStats
  chapter: number
}

export function produceChapterStats(record: IChapterRecord): IChapterStats {
  const exerciseCount = 1
  const totalWrongWordCount = record.wordNumber - record.correctWordIndexes.length

  const avgWrongWordCount = exerciseCount > 0 ? toFixedNumber(totalWrongWordCount / exerciseCount, 2) : 0
  const totalWrongInputCount = record.wordCount ?? 0
  const avgWrongInputCount = exerciseCount > 0 ? toFixedNumber(totalWrongInputCount / exerciseCount, 2) : 0

  return { exerciseCount, avgWrongWordCount, avgWrongInputCount, schedule: record ? new ScheduleHandle(record) : undefined }
}

export async function getAllChapterDetailByDict(dict: Dictionary) {
  const chapterRecorded = await getChapterByDict(dict.id)
  chapterRecorded.sort((a, b) => new Date(a.card_due).getTime() - new Date(b.card_due).getTime())
  const stats: Array<IChapterDetail> = chapterRecorded.map((record) => ({
    stats: produceChapterStats(record),
    chapter: record.chapter as number,
  }))
  const chapterMaxIndex = maxBy(stats, (item) => item.chapter)
  if (chapterMaxIndex && chapterMaxIndex.chapter) {
    return stats.concat(range(chapterMaxIndex.chapter + 1, dict.chapterCount, 1).map((item) => ({ chapter: item, stats: undefined })))
  }
  return stats
}

export function getNextChapter(chapters: Array<IChapterDetail>, chapter: number) {
  const chapterIndex = chapters.findIndex((item) => item.chapter === chapter)
  if (chapterIndex === -1) throw new Error(`Chap ${chapter} do not exist`)

  for (let i = 0; i < chapters.length; i++) {
    const chapterDetail = chapters[i]
    const canLearn = !chapterDetail.stats || !chapterDetail.stats.schedule || chapterDetail.stats.schedule.isDueDate()
    if (i === chapterIndex || !canLearn) continue
    return chapterDetail
  }

  throw new Error('can not get next chap')
}

export function useAllChapterDetail() {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const { data: allChapter, isLoading, error } = useSWR(currentDictInfo, getAllChapterDetailByDict)

  const getNext = useCallback((index: number) => getNextChapter(allChapter ?? [], index), [allChapter])

  return { getNext, isLoading, error, allChapter: allChapter ?? [] }
}

export function useSaveChapterRecord() {
  const currentChapter = useAtomValue(currentChapterAtom)
  const isRevision = useAtomValue(isReviewModeAtom)

  const dictID = useAtomValue(currentDictIdAtom)
  const saveChapterRecord = useCallback(
    (typingState: TypingState) => {
      const {
        chapterData: { correctCount, wrongCount, userInputLogs, wordCount, words, wordRecordIds, schedule },
        timerData: { time },
      } = typingState
      const correctWordIndexes = userInputLogs.filter((log) => log.correctCount > 0 && log.wrongCount === 0).map((log) => log.index)

      if (!schedule) throw new Error('schedule do not setup')

      const chapterRecord = new ChapterRecord(
        dictID,
        currentChapter,
        time,
        correctCount,
        wrongCount,
        wordCount,
        correctWordIndexes,
        words.length,
        wordRecordIds ?? [],
        schedule,
      )
      db.chapterRecords.put(chapterRecord, chapterRecord.id)
    },
    [currentChapter, dictID, isRevision],
  )

  return saveChapterRecord
}

export type WordKeyLogger = {
  letterTimeArray: number[]
  letterMistake: LetterMistakes
}

export function useSaveWordRecord() {
  const isRevision = useAtomValue(isReviewModeAtom)
  const currentChapter = useAtomValue(currentChapterAtom)
  const dictID = useAtomValue(currentDictIdAtom)

  const { dispatch } = useContext(TypingContext) ?? {}

  const saveWordRecord = useCallback(
    async ({
      word,
      wrongCount,
      letterTimeArray,
      letterMistake,
    }: {
      word: string
      wrongCount: number
      letterTimeArray: number[]
      letterMistake: LetterMistakes
    }) => {
      const timing = []
      for (let i = 1; i < letterTimeArray.length; i++) {
        const diff = letterTimeArray[i] - letterTimeArray[i - 1]
        timing.push(diff)
      }

      const wordRecord = new WordRecord(word, dictID, isRevision ? -1 : currentChapter, timing, wrongCount, letterMistake)

      let dbID = -1
      try {
        dbID = await db.wordRecords.add(wordRecord)
      } catch (e) {
        console.error(e)
      }
      if (dispatch) {
        dbID > 0 && dispatch({ type: TypingStateActionType.ADD_WORD_RECORD_ID, payload: dbID })
        dispatch({ type: TypingStateActionType.SET_IS_SAVING_RECORD, payload: false })
      }
    },
    [currentChapter, dictID, dispatch, isRevision],
  )

  return saveWordRecord
}
