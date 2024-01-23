import { getUTCUnixTimestamp } from '../index'
import type { IFlatSchedule } from '@/pages/Typing/store/type'
import type { Word } from '@/typings'
import { Card, type Rating, ReviewLog, SchedulingInfo, type State } from 'fsrs.js'

export interface IWordRecord {
  word: string
  timeStamp: number
  // 正常章节为 dictKey, 其他功能则为对应的类型
  dict: string
  // 用户可能是在 错题/其他类似组件中 进行的练习则为 null, start from 0
  chapter: number | null
  // 正确次数中输入每个字母的时间差，可以据此计算出总时间
  timing: number[]
  // 出错的次数
  wrongCount: number
  // 每个字母被错误输入成什么, index 为字母的索引, 数组内为错误的 e.key
  mistakes: LetterMistakes
}

export interface LetterMistakes {
  // 每个字母被错误输入成什么, index 为字母的索引, 数组内为错误的 e.key
  [index: number]: string[]
}

export class WordRecord implements IWordRecord {
  word: string
  timeStamp: number
  dict: string
  chapter: number | null
  timing: number[]
  wrongCount: number
  mistakes: LetterMistakes

  constructor(word: string, dict: string, chapter: number | null, timing: number[], wrongCount: number, mistakes: LetterMistakes) {
    this.word = word
    this.timeStamp = getUTCUnixTimestamp()
    this.dict = dict
    this.chapter = chapter
    this.timing = timing
    this.wrongCount = wrongCount
    this.mistakes = mistakes
  }

  get totalTime() {
    return this.timing.reduce((acc, curr) => acc + curr, 0)
  }
}

export interface IChapterRecord extends IFlatSchedule {
  // 正常章节为 dictKey, 其他功能则为对应的类型
  dict: string

  chapter: number
  timeStamp: number
  // 单位为 s，章节的记录没必要到毫秒级
  time: number
  // 正确按键次数，输对一个字母即记录
  correctCount: number
  // 错误的按键次数。 出错会清空整个输入，但只记录一次错误
  wrongCount: number
  // 用户输入的单词总数，可能会使用循环等功能使输入总数大于 20
  wordCount: number
  // 一次打对未犯错的单词列表, 可以和 wordNumber 对比得出出错的单词 indexes
  correctWordIndexes: number[]
  // 章节总单词数
  wordNumber: number
  // 单词 record 的 id 列表
  wordRecordIds: number[]

  card: Card
  reviewLog: ReviewLog
  schedule: SchedulingInfo
}

export class ScheduleHandle {
  constructor(public schedule: IChapterRecord) {}

  isDueDate() {
    return this.schedule.card.due <= new Date()
  }
}

export class ChapterRecord implements IChapterRecord {
  id: string
  dict: string
  chapter: number
  timeStamp: number
  time: number
  correctCount: number
  wrongCount: number
  wordCount: number
  correctWordIndexes: number[]
  wordNumber: number
  wordRecordIds: number[]
  card_difficulty: number
  card_due: string
  card_elapsed_days: number
  card_lapses: number
  card_last_review: string
  card_reps: number
  card_scheduled_days: number
  card_stability: number
  card_state: State
  review_elapsed_days: number
  review_rating: Rating
  review_review: string
  review_scheduled_days: number
  review_state: State

  static createId(dict: string, chapter: number | null) {
    return dict + '_' + chapter
  }

  constructor(
    dict: string,
    chapter: number,
    time: number,
    correctCount: number,
    wrongCount: number,
    wordCount: number,
    correctWordIndexes: number[],
    wordNumber: number,
    wordRecordIds: number[],
    schedule: SchedulingInfo,
  ) {
    this.id = ChapterRecord.createId(dict, chapter)
    this.dict = dict
    this.chapter = chapter
    this.timeStamp = getUTCUnixTimestamp()
    this.time = time
    this.correctCount = correctCount
    this.wrongCount = wrongCount
    this.wordCount = wordCount
    this.correctWordIndexes = correctWordIndexes
    this.wordNumber = wordNumber
    this.wordRecordIds = wordRecordIds

    this.card_difficulty = schedule.card.difficulty
    this.card_due = schedule.card.due.toISOString()
    this.card_elapsed_days = schedule.card.elapsed_days
    this.card_lapses = schedule.card.lapses
    this.card_last_review = schedule.card.last_review.toISOString()
    this.card_reps = schedule.card.reps
    this.card_scheduled_days = schedule.card.scheduled_days
    this.card_stability = schedule.card.stability
    this.card_state = schedule.card.state

    this.review_elapsed_days = schedule.review_log.elapsed_days
    this.review_rating = schedule.review_log.rating
    this.review_review = schedule.review_log.review.toISOString()
    this.review_scheduled_days = schedule.review_log.scheduled_days
    this.review_state = schedule.review_log.state
  }

  get wpm() {
    return Math.round((this.wordCount / this.time) * 60)
  }

  get inputAccuracy() {
    return Math.round((this.correctCount / this.correctCount + this.wrongCount) * 100)
  }

  get wordAccuracy() {
    return Math.round((this.correctWordIndexes.length / this.wordNumber) * 100)
  }

  get card() {
    const _card = new Card()
    _card.difficulty = this.card_difficulty
    _card.due = new Date(this.card_due)
    _card.elapsed_days = this.card_elapsed_days
    _card.lapses = this.card_lapses
    _card.last_review = new Date(this.card_last_review)
    _card.reps = this.card_reps
    _card.scheduled_days = this.card_scheduled_days
    _card.stability = this.card_stability
    _card.state = this.card_state
    return _card
  }

  get reviewLog() {
    const review_elapsed_days = this.review_elapsed_days
    const review_rating = this.review_rating
    const review_review = this.review_review
    const review_scheduled_days = this.review_scheduled_days
    const review_state = this.review_state

    return new ReviewLog(review_rating, review_scheduled_days, review_elapsed_days, new Date(review_review), review_state)
  }

  get schedule() {
    return new SchedulingInfo(this.card, this.reviewLog)
  }
}

export interface IReviewRecord {
  id?: number
  dict: string
  // 当前练习进度
  index: number
  // 创建时间
  createTime: number
  // 是否已经完成
  isFinished: boolean
  // 单词列表, 根据复习算法生成和修改，可能会有重复值
  words: Word[]
}

export class ReviewRecord implements IReviewRecord {
  id?: number
  dict: string
  index: number
  createTime: number
  isFinished: boolean
  words: Word[]

  constructor(dict: string, words: Word[]) {
    this.dict = dict
    this.index = 0
    this.createTime = getUTCUnixTimestamp()
    this.words = words
    this.isFinished = false
  }
}

export interface IRevisionDictRecord {
  dict: string
  revisionIndex: number
  createdTime: number
}

export class RevisionDictRecord implements IRevisionDictRecord {
  dict: string
  revisionIndex: number
  createdTime: number

  constructor(dict: string, revisionIndex: number, createdTime: number) {
    this.dict = dict
    this.revisionIndex = revisionIndex
    this.createdTime = createdTime
  }
}

export interface IRevisionWordRecord {
  word: string
  timeStamp: number
  dict: string
  errorCount: number
}

export class RevisionWordRecord implements IRevisionWordRecord {
  word: string
  timeStamp: number
  dict: string
  errorCount: number

  constructor(word: string, dict: string, errorCount: number) {
    this.word = word
    this.timeStamp = getUTCUnixTimestamp()
    this.dict = dict
    this.errorCount = errorCount
  }
}
