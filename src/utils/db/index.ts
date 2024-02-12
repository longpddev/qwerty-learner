import { toFixedNumber } from '..'
import range from '../range'
import type { IChapterRecord, LetterMistakes } from './record'
import { ChapterRecord, ScheduleHandle, WordRecord } from './record'
import { chapterRecordsAtom, wordRecordsAtom } from '@/firebase'
import type { IChapterStats } from '@/pages/Gallery-N/hooks/useChapterStats'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import type { TypingState } from '@/pages/Typing/store/type'
import { currentChapterAtom, currentDictIdAtom, isReviewModeAtom } from '@/store'
import type { Dictionary } from '@/typings'
import { useAtomValue } from 'jotai'
import maxBy from 'lodash/maxBy'
import { useCallback, useContext, useEffect, useState } from 'react'

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
  const [allChapter, allChapterSet] = useState<IChapterDetail[]>([])
  const chapterRecordsControl = useAtomValue(chapterRecordsAtom)

  const getNext = useCallback((index: number) => getNextChapter(allChapter ?? [], index), [allChapter])

  useEffect(
    () =>
      chapterRecordsControl?.getByDict(dict.id, (chapterRecorded) => {
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

        allChapterSet(stats.concat(last))
      }),
    [chapterRecordsControl, dict.id, dict.chapterCount],
  )

  return { getNext, allChapter: allChapter ?? [] }
}

export function useSaveChapterRecord() {
  const currentChapter = useAtomValue(currentChapterAtom)
  const chapterRecordsControl = useAtomValue(chapterRecordsAtom)
  const dictID = useAtomValue(currentDictIdAtom)
  const saveChapterRecord = useCallback(
    async (typingState: TypingState) => {
      if (!chapterRecordsControl) return
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
      // console.log('chapterRecord.card_due', chapterRecord.card_due)
      const oldRecord = await chapterRecordsControl.getById(chapterRecord.id)

      console.log('🚀 ~ chapterRecord:', chapterRecord)
      if (oldRecord) {
        chapterRecord.practiceTime += oldRecord.practiceTime
      }
      await chapterRecordsControl.add(chapterRecord, chapterRecord.id)
    },
    [currentChapter, dictID, chapterRecordsControl],
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
  const wordRecordControl = useAtomValue(wordRecordsAtom)
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
      if (!wordRecordControl) return
      const timing = []
      for (let i = 1; i < letterTimeArray.length; i++) {
        const diff = letterTimeArray[i] - letterTimeArray[i - 1]
        timing.push(diff)
      }

      const wordRecord = new WordRecord(word, dictID, isRevision ? -1 : currentChapter, timing, wrongCount, letterMistake)

      const dbID = await wordRecordControl.add(wordRecord)

      if (dispatch) {
        dbID > 0 && dispatch({ type: TypingStateActionType.ADD_WORD_RECORD_ID, payload: dbID })
        dispatch({ type: TypingStateActionType.SET_IS_SAVING_RECORD, payload: false })
      }
    },
    [currentChapter, dictID, dispatch, isRevision, wordRecordControl],
  )

  return saveWordRecord
}
