import { auth, getProvider, getRef } from './setup'
import type { groupedWordRecords } from '@/pages/ErrorBook/type'
import type { TErrorWordData } from '@/pages/Gallery-N/hooks/useErrorWords'
import type { Word } from '@/typings'
import { ChapterRecord, type IChapterRecord, type IReviewRecord, type IWordRecord, ReviewRecord, WordRecord } from '@/utils/db/record'
import { signInWithPopup, signOut } from 'firebase/auth'
import type { DataSnapshot, Unsubscribe } from 'firebase/database'
import {
  type DatabaseReference,
  child,
  endAt,
  equalTo,
  get,
  increment,
  limitToFirst,
  limitToLast,
  onValue,
  orderByChild,
  orderByKey,
  push,
  query,
  remove,
  set,
  startAt,
  update,
} from 'firebase/database'
import { atom, useAtom } from 'jotai'

interface AnyClass<T> {
  new (...args: any): T
}

function debug(cb: () => void, ...args: any) {
  const startTime = performance.now()
  cb()
  const endTime = performance.now() - startTime
  console.log('🚀 ~ debug ~ endTime:', endTime)
  if (endTime > 100) {
    console.log(`%cExecute time: ${endTime}ms`, 'color: red;font-size:20px', args)
    console.trace('Trace debug')
  }
}
export abstract class RefControl<T extends object, K extends string | number = string | number> {
  public ref: DatabaseReference
  public refLastIndex: DatabaseReference
  public refCount: DatabaseReference
  constructor(protected userId: string, public dbName: string, public schema: AnyClass<T>) {
    this.ref = getRef(this.userId, dbName)
    this.refLastIndex = getRef(this.userId, dbName + 'LastIndex')
    this.refCount = getRef(this.userId, dbName + 'Count')
  }

  applySchema(data: T): T {
    const instance = Object.create(this.schema.prototype)
    Object.assign(instance, data)
    return instance
  }

  getDataFromSnapShot(snapshot: DataSnapshot): T[] {
    return (Object.values(snapshot.val() ?? {}) as T[]).map((item) => this.applySchema(item))
  }

  count(): Promise<number>
  count(cb: (c: number) => void): Unsubscribe
  count(cb?: (c: number) => void): Unsubscribe | Promise<number> {
    const getCount = async (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) {
        const count = await this.realCount()
        set(this.refCount, count)
        return count
      }

      return snapshot.val() ?? 0
    }
    if (!cb) return get(this.refCount).then(getCount)
    const unsubscribe = onValue(this.refCount, async (snapshot) => cb(await getCount(snapshot)))
    return () => debug(unsubscribe)
  }

  clear() {
    return remove(this.ref)
  }

  async getLastKey() {
    const snapshot = await get(this.refLastIndex)
    if (snapshot.exists()) return snapshot.val()
    const formquery = await get(query(this.ref, orderByKey(), limitToLast(1)))

    return Object.keys(formquery.val() ?? {}).at(0)
  }

  async realCount() {
    const all = (await this.get()) ?? {}
    return set(this.refCount, Object.keys(all).length)
  }

  async initFieldCount() {
    const all = (await this.get()) ?? {}
    return set(this.refCount, Object.keys(all).length)
  }

  async add(data: T, id?: K) {
    let newKey: K
    if (id === undefined) {
      const lastKey = ((await this.getLastKey()) as string) ?? '-1'

      const lastKeyNum = parseInt(lastKey)
      if (isNaN(lastKeyNum)) {
        const key = push(this.ref).key
        if (key === null) {
          console.error('can not save data', data)
          throw new Error('can not save data')
        }
        newKey = key as K
      } else {
        newKey = (lastKeyNum + 1) as K
      }

      set(this.refLastIndex, newKey)
    } else {
      newKey = id
    }

    const unknownData = data as unknown as any
    unknownData[id] = newKey
    update(this.ref, { [newKey]: data })
    set(this.refCount, increment(1))
    return newKey
  }

  async remove(id: K) {
    await remove(child(this.ref, id.toString()))
    await set(this.refCount, increment(-1))
  }
  get(): Promise<T[]>
  get(cb: (s: T[]) => void): Unsubscribe
  get(cb?: (s: T[]) => void): Promise<T[]> | Unsubscribe {
    console.trace('get function called')
    if (cb === undefined) {
      return get(this.ref).then((snapshot) => this.getDataFromSnapShot(snapshot))
    } else {
      const unsubscribe = onValue(this.ref, (snapshot) => cb(this.getDataFromSnapShot(snapshot)))

      return () => debug(unsubscribe)
    }
  }

  getById(id: K): Promise<T | null>
  getById(id: K, cb?: (s: T | null) => void): Unsubscribe
  getById(id: K, cb?: (s: T | null) => void): Promise<T | null> | Unsubscribe {
    const _query = child(this.ref, id.toString())
    if (cb === undefined) {
      return get(_query).then((snapshot) => {
        const val = snapshot.val()
        if (!val) return null
        return this.applySchema(val)
      })
    } else {
      const unsubscribe = onValue(_query, (snapshot) => {
        const val = snapshot.val()
        if (!val) return cb(null)
        return cb(this.applySchema(val))
      })

      return () => debug(unsubscribe)
    }
  }
}

export class ChapterRecordsControl extends RefControl<IChapterRecord, string> {
  public refPracticeTime: DatabaseReference
  public refWrongCount: DatabaseReference
  constructor(protected userId: string) {
    const dbname = 'chapterRecords'
    super(userId, dbname, ChapterRecord)
    this.refPracticeTime = this.refCount = getRef(this.userId, dbname + 'PracticeTime')
    this.refWrongCount = this.refCount = getRef(this.userId, dbname + 'WrongCount')
  }

  sort(a: IChapterRecord, b: IChapterRecord) {
    return new Date(a.card_due).getTime() - new Date(b.card_due).getTime()
  }

  getByDict(dict: string, cb: (s: IChapterRecord[]) => void) {
    const unsubscribe = onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) =>
      cb(this.getDataFromSnapShot(snapshot).sort(this.sort)),
    )

    return () => debug(unsubscribe)
  }

  async getRealWrongCount() {
    const total = (await this.get()).map((item) => item.wrongCount).reduce((acc, item) => acc + item, 0)
    return total
  }

  async getRealPracticeTime() {
    const total = (await this.get()).map((item) => item.practiceTime).reduce((acc, item) => acc + item, 0)
    return total
  }

  async refireWrongCount() {
    await set(this.refWrongCount, await this.getRealWrongCount())
  }

  async refirePracticeTime() {
    await set(this.refPracticeTime, await this.getRealPracticeTime())
  }

  getWrongCount(): Promise<number>
  getWrongCount(cb: (num: number) => void): Unsubscribe
  getWrongCount(cb?: (num: number) => void): Unsubscribe | Promise<number> {
    if (!cb) return get(this.refWrongCount).then((snap) => snap.val())

    return onValue(this.refWrongCount, (snap) => cb(snap.val()))
  }

  getPracticeTime(): Promise<number>
  getPracticeTime(cb: (num: number) => void): Unsubscribe
  getPracticeTime(cb?: (num: number) => void): Unsubscribe | Promise<number> {
    if (!cb) return get(this.refPracticeTime).then((snap) => snap.val())

    return onValue(this.refPracticeTime, (snap) => cb(snap.val()))
  }

  async add(data: IChapterRecord, id?: string | undefined): Promise<string> {
    if (id) {
      const oldData = await this.getById(id)
      if (oldData) {
        set(this.refPracticeTime, increment(data.practiceTime - oldData.practiceTime))
        set(this.refWrongCount, increment(data.wrongCount - oldData.wrongCount))
      } else {
        set(this.refPracticeTime, increment(data.practiceTime))
        set(this.refWrongCount, increment(data.wrongCount))
      }
    } else {
      set(this.refPracticeTime, increment(data.practiceTime))
      set(this.refWrongCount, increment(data.wrongCount))
    }
    const newId = await super.add(data, id)

    return newId
  }
}

export class WordRecordsControl extends RefControl<IWordRecord, number> {
  constructor(protected userId: string) {
    super(userId, 'wordRecords', WordRecord)
  }
  getFirstWord(): Promise<IWordRecord | undefined>
  getFirstWord(cb: (s: IWordRecord | undefined) => void): Unsubscribe
  getFirstWord(cb?: (s: IWordRecord | undefined) => void): Unsubscribe | Promise<IWordRecord | undefined> {
    const _query = query(this.ref, orderByChild('timeStamp'), limitToFirst(1))

    if (!cb) return get(_query).then((snapshot) => this.getDataFromSnapShot(snapshot).at(0))
    const unsubscribe = onValue(_query, (snapshot) => cb(this.getDataFromSnapShot(snapshot).at(0)))

    return () => debug(unsubscribe)
  }

  getBetween(startTimeStamp: number, endTimeStamp: number, cb: (s: IWordRecord[]) => void) {
    const unsubscribe = onValue(query(this.ref, orderByChild('timeStamp'), startAt(startTimeStamp), endAt(endTimeStamp)), (snapshot) =>
      cb(this.getDataFromSnapShot(snapshot)),
    )

    return () => debug(unsubscribe)
  }

  createGroupRecord(records: Array<IWordRecord>): groupedWordRecords[] {
    const groups: groupedWordRecords[] = []

    records.forEach((record) => {
      let group = groups.find((g) => g.word === record.word && g.dict === record.dict)
      if (!group) {
        group = { word: record.word, dict: record.dict, records: [], wrongCount: 0 }
        groups.push(group)
      }
      group.records.push(record as WordRecord)
    })

    groups.forEach((group) => {
      group.wrongCount = group.records.reduce((acc, cur) => {
        acc += cur.wrongCount
        return acc
      }, 0)
    })

    return groups
  }

  getGroupRecords(cb: (s: groupedWordRecords[]) => void) {
    const unsubscribe = onValue(query(this.ref, orderByChild('wrongCount'), startAt(0)), (snapshot) => {
      const records = this.getDataFromSnapShot(snapshot)
      cb(this.createGroupRecord(records))
    })

    return () => debug(unsubscribe)
  }

  getGroupRecordsByDict(dict: string, cb: (s: groupedWordRecords[]) => void) {
    const unsubscribe = onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) => {
      const records = this.getDataFromSnapShot(snapshot)

      cb(this.createGroupRecord(records.filter((item) => item.dict === dict)))
    })

    return () => debug(unsubscribe)
  }

  getErrorWordData(dict: string, wordList: Word[], cb: (s: TErrorWordData[]) => void) {
    return this.getGroupRecordsByDict(dict, (groupRecords) => {
      const res: TErrorWordData[] = []

      groupRecords.forEach((groupRecord) => {
        const errorLetters = {} as Record<string, number>
        groupRecord.records.forEach((record) => {
          for (const index in record.mistakes) {
            const mistakes = record.mistakes[index]
            if (mistakes.length > 0) {
              errorLetters[index] = (errorLetters[index] ?? 0) + mistakes.length
            }
          }
        })

        const word = wordList.find((word) => word.name === groupRecord.word)
        if (!word) return

        const errorData: TErrorWordData = {
          word: groupRecord.word,
          originData: word,
          errorCount: groupRecord.records.reduce((acc, cur) => {
            acc += cur.wrongCount
            return acc
          }, 0),
          errorLetters,
          errorChar: Object.entries(errorLetters)
            .sort((a, b) => b[1] - a[1])
            .map(([index]) => groupRecord.word[Number(index)]),

          latestErrorTime: groupRecord.records.reduce((acc, cur) => {
            acc = Math.max(acc, cur.timeStamp)
            return acc
          }, 0),
        }
        res.push(errorData)
      })

      cb(res)
    })
  }

  getByDict(dict: string, cb: (s: IWordRecord[]) => void) {
    const unsubscribe = onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) => cb(this.getDataFromSnapShot(snapshot)))

    return () => debug(unsubscribe)
  }

  getRevisionWordCount(dict: string, cb: (s: number) => void) {
    return this.getByDict(dict, (wordRecords) => {
      const res = new Map()
      const reducedRecords = wordRecords
        .filter((item) => item.wrongCount > 0)
        .filter((item) => !res.has(item['word'] + item['dict']) && res.set(item['word'] + item['dict'], 1))
      cb(reducedRecords.length)
    })
  }
}

export class ReviewRecordsControl extends RefControl<IReviewRecord> {
  constructor(protected userId: string) {
    super(userId, 'reviewRecords', ReviewRecord)
  }

  getByDict(dict: string, cb: (s: IReviewRecord[]) => void) {
    const unsubscribe = onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) => cb(this.getDataFromSnapShot(snapshot)))
    return () => debug(unsubscribe)
  }
}

export const userAtom = atom(auth.currentUser)
userAtom.onMount = (set) =>
  auth.onAuthStateChanged(function (data) {
    set(data)
  })

export const chapterRecordsAtom = atom((get) => {
  const user = get(userAtom)
  if (!user) return null
  const control = new ChapterRecordsControl(user.uid)
  // control.refireWrongCount()
  // control.refirePracticeTime()
  window.chapterRecords = control
  return control
})

export const wordRecordsAtom = atom((get) => {
  const user = get(userAtom)
  if (!user) return null
  const control = new WordRecordsControl(user.uid)
  window.wordRecords = control
  return control
})

export const reviewRecordsAtom = atom((get) => {
  const user = get(userAtom)
  if (!user) return null
  const control = new ReviewRecordsControl(user.uid)
  window.reviewRecords = control
  return control
})

export async function login() {
  return await signInWithPopup(auth, getProvider())
}

export async function logout() {
  await signOut(auth)
}
