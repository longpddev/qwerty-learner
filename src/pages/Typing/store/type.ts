import type { WordWithIndex } from '@/typings'
import type { LetterMistakes } from '@/utils/db/record'
import type { Rating, SchedulingInfo, State } from 'fsrs.js'

export type IFlatSchedule = {
  card_due: string
  card_stability: number
  card_difficulty: number
  card_elapsed_days: number
  card_scheduled_days: number
  card_reps: number
  card_lapses: number
  card_state: State
  card_last_review: string
  review_rating: Rating
  review_scheduled_days: number
  review_elapsed_days: number
  review_review: string
  review_state: State
}

export type ChapterData = {
  // warning: 因为有章节内随机的存在，所有记录 index 的场景都应该使用 WordWithIndex.index
  words: WordWithIndex[]
  // chapter index
  index: number
  // 输入的单词数
  wordCount: number
  // 输入正确的单词数
  correctCount: number
  // 输入错误的单词数
  wrongCount: number
  // 每个单词的输入记录
  userInputLogs: UserInputLog[]
  // 本章节用户输入的单词的 record id 列表
  wordRecordIds: number[]
  schedule?: SchedulingInfo
}

export type UserInputLog = {
  // the index in ChapterData.words, not the index in WordWithIndex
  index: number
  correctCount: number
  wrongCount: number
  LetterMistakes: LetterMistakes
}

export type TimerData = {
  time: number
  accuracy: number
  wpm: number
}

export type WrongWordData = {
  name: string
  wrongCount: number
  wrongLetters: Array<{
    letter: string
    count: number
  }>
}

export type TypingState = {
  chapterData: ChapterData
  prevSchedule?: SchedulingInfo
  timerData: TimerData
  isTyping: boolean
  isFinished: boolean
  isShowSkip: boolean
  isTransVisible: boolean
  isLoopSingleWord: boolean
  // 是否正在保存数据
  isSavingRecord: boolean
}
