import { toFixedNumber } from '..'
import range from '../range'
import './firebase'
import { getDocRef, refPath } from './firebase'
import type { IChapterRecord, IReviewRecord, IRevisionDictRecord, IWordRecord, LetterMistakes } from './record'
import { ChapterRecord, ReviewRecord, ScheduleHandle, WordRecord } from './record'
import type { IChapterStats } from '@/pages/Gallery-N/hooks/useChapterStats'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import type { TypingState } from '@/pages/Typing/store/type'
import { currentChapterAtom, currentDictIdAtom, currentDictInfoAtom, isReviewModeAtom } from '@/store'
import type { Dictionary } from '@/typings'
import type { Table } from 'dexie'
import Dexie from 'dexie'
import { child, get, onValue, push, remove, update } from 'firebase/database'
import { getDoc, setDoc } from 'firebase/firestore/lite'
import { useAtomValue } from 'jotai'
import maxBy from 'lodash/maxBy'
import { useCallback, useContext, useEffect, useRef } from 'react'
import useSWR from 'swr'

export interface IRecordDB {
  wordRecords: Table<IWordRecord, number>
  chapterRecords: Table<IChapterRecord, string>
  reviewRecords: Table<IReviewRecord, number>
  revisionDictRecords: Table<IRevisionDictRecord, number>
  revisionWordRecords: Table<IWordRecord, number>
}

export type IRecordName = keyof IRecordDB

class RecordDB extends Dexie implements IRecordDB {
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
type ArrayOf<T extends Array<any>> = T extends Array<infer R> ? R : never
export async function pushRecords(name: IRecordName) {
  const data = await db[name].toArray()

  const ref = await refPath(name)
  await remove(ref)
  const dataOb = data.reduce((acc, item) => {
    const id = (item as unknown as { id: number }).id
    acc[id] = item
    return acc
  }, {} as Record<number, ArrayOf<typeof data>>)
  await update(ref, dataOb)
  console.log('pushed record', name)
}

export async function updateRecord<D>(name: IRecordName, data: Record<string | number, D>) {
  const ref = await refPath(name)
  await update(ref, data)
}

export function onRecordDiff(name: IRecordName, cb: () => void) {
  let isClean = false
  let cleaner: (() => void) | undefined
  const run = async () => {
    const ref = await refPath(name)
    cleaner = onValue(ref, async (snapshot) => {
      const counted = await db[name].count()
      if (isClean) return
      if (counted !== snapshot.size) cb()
    })

    if (isClean) {
      cleaner()
      cleaner = undefined
    }
  }

  run()

  return () => {
    isClean = true
    cleaner?.()
  }
}

export function useRecordDiff(name: IRecordName, cb: () => void) {
  const forward = useRef({ cb })
  forward.current.cb = cb
  useEffect(() => {
    return onRecordDiff(name, () => forward.current.cb())
  }, [name])
}

export async function getRecords(name: IRecordName) {
  const ref = await refPath(name)
  const data = (await get(ref)).val()
  if (!data) return {}
  if (Array.isArray(data))
    return data.reduce((acc, item, index) => {
      acc[index] = item
      return acc
    }, {})

  return data
}

export async function pullRecords(name: IRecordName) {
  const records = await getRecords(name)
  await db[name].clear()
  await Promise.all(Object.entries(records).map(([key, value]) => db[name].add(value as any, key as unknown as undefined)))
}

export async function deleteAllRecords() {
  await db.wordRecords.clear()
  await db.chapterRecords.clear()
  await db.reviewRecords.clear()
}

export async function pullAllRecords() {
  await Promise.all((['wordRecords', 'chapterRecords', 'reviewRecords'] as const).map(pullRecords))

  alert('pullAllRecords done')
}

export async function pushAllRecords() {
  await Promise.all([pushRecords('wordRecords'), pushRecords('chapterRecords'), pushRecords('reviewRecords')])

  alert('pushAllRecords done')
}
window.db = db
window.pushAllRecords = pushAllRecords
window.pullAllRecords = pullAllRecords
window.getRecords = getRecords
window.pullRecords = pullRecords

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

export async function getAllChapterDetailByDict(dictJson: string) {
  const dict = JSON.parse(dictJson) as { id: string; chapterCount: number; currentChapter: number }
  const chapterRecorded = await getChapterByDict(dict.id)
  chapterRecorded.sort((a, b) => new Date(a.card_due).getTime() - new Date(b.card_due).getTime())
  const stats: Array<IChapterDetail> = chapterRecorded.map((record) => ({
    stats: produceChapterStats(record),
    chapter: record.chapter as number,
  }))
  const chapterMaxIndex = maxBy(stats, (item) => item.chapter)
  const last = range(chapterMaxIndex ? chapterMaxIndex.chapter + 1 : 0, dict.chapterCount, 1).map((item) => ({
    chapter: item,
    stats: undefined,
  }))

  return stats.concat(last)
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

export function useAllChapterDetail(dict: Dictionary) {
  const currentChapter = useAtomValue(currentChapterAtom)
  const {
    data: allChapter,
    isLoading,
    error,
  } = useSWR(JSON.stringify({ id: dict.id, chapterCount: dict.chapterCount, currentChapter }), getAllChapterDetailByDict)

  const getNext = useCallback((index: number) => getNextChapter(allChapter ?? [], index), [allChapter])

  return { getNext, isLoading, error, allChapter: allChapter ?? [] }
}

export function useSaveChapterRecord() {
  const currentChapter = useAtomValue(currentChapterAtom)
  const isRevision = useAtomValue(isReviewModeAtom)

  const dictID = useAtomValue(currentDictIdAtom)
  const saveChapterRecord = useCallback(
    async (typingState: TypingState) => {
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

      const oldRecord = await db.chapterRecords.get(chapterRecord.id)

      if (oldRecord) {
        chapterRecord.practiceTime += oldRecord.practiceTime
      }

      db.chapterRecords.put(chapterRecord, chapterRecord.id)
      await updateRecord('chapterRecords', { [chapterRecord.id]: chapterRecord })
    },
    [currentChapter, dictID],
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
        await updateRecord('wordRecords', { [dbID]: wordRecord })
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
