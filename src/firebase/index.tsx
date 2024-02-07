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
  limitToFirst,
  limitToLast,
  onValue,
  orderByChild,
  orderByKey,
  push,
  query,
  remove,
  startAt,
  update,
} from 'firebase/database'
import { atom, useAtom } from 'jotai'

interface AnyClass<T> {
  new (...args: any): T
}
export abstract class RefControl<T extends object, K extends string | number = string | number> {
  public ref: DatabaseReference
  public refLastIndex: DatabaseReference
  constructor(protected userId: string, public dbName: string, public schema: AnyClass<T>) {
    this.ref = getRef(this.userId, dbName)
    this.refLastIndex = getRef(this.userId, dbName + 'LastIndex')
  }

  applySchema(data: T): T {
    const instance = Object.create(this.schema.prototype)
    Object.assign(instance, data)
    return instance
  }

  getDataFromSnapShot(snapshot: DataSnapshot): T[] {
    return (Object.values(snapshot.val() ?? {}) as T[]).map((item) => this.applySchema(item))
  }

  count(cb: (c: number) => void) {
    return onValue(this.ref, (snapshot) => cb(snapshot.size))
  }

  clear() {
    return remove(this.ref)
  }

  async add(data: T, id?: K) {
    let newKey: K
    console.log(`${this.dbName} adding ${id} starting`)
    console.time(`${this.dbName} adding ${id}`)
    if (id === undefined) {
      const lastKey = ((await get(this.refLastIndex)).val() as string) ?? '-1'
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
    } else {
      newKey = id
    }

    const unknownData = data as unknown as any
    unknownData[id] = newKey
    update(this.ref, { [newKey]: data })
    console.timeEnd(`${this.dbName} adding ${id}`)
    console.log(`${this.dbName} adding ${id} ended`)
    return newKey
  }

  remove(id: K) {
    return remove(child(this.ref, id.toString()))
  }
  get(): Promise<T[]>
  get(cb: (s: T[]) => void): Unsubscribe
  get(cb?: (s: T[]) => void): Promise<T[]> | Unsubscribe {
    if (cb === undefined) {
      return get(this.ref).then((snapshot) => this.getDataFromSnapShot(snapshot))
    } else {
      return onValue(this.ref, (snapshot) => cb(this.getDataFromSnapShot(snapshot)))
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
      return onValue(_query, (snapshot) => {
        const val = snapshot.val()
        if (!val) return cb(null)
        return cb(this.applySchema(val))
      })
    }
  }
}

export class ChapterRecordsControl extends RefControl<IChapterRecord, string> {
  constructor(protected userId: string) {
    super(userId, 'chapterRecords', ChapterRecord)
  }

  sort(a: IChapterRecord, b: IChapterRecord) {
    return new Date(a.card_due).getTime() - new Date(b.card_due).getTime()
  }

  getByDict(dict: string, cb: (s: IChapterRecord[]) => void) {
    return onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) =>
      cb(this.getDataFromSnapShot(snapshot).sort(this.sort)),
    )
  }
}

export class WordRecordsControl extends RefControl<IWordRecord, number> {
  constructor(protected userId: string) {
    super(userId, 'wordRecords', WordRecord)
  }

  getFirstWord(cb: (s: IWordRecord | undefined) => void) {
    return onValue(query(this.ref, orderByChild('timeStamp'), limitToFirst(1)), (snapshot) => cb(this.getDataFromSnapShot(snapshot).at(0)))
  }

  getBetween(startTimeStamp: number, endTimeStamp: number, cb: (s: IWordRecord[]) => void) {
    return onValue(query(this.ref, orderByChild('timeStamp'), startAt(startTimeStamp), endAt(endTimeStamp)), (snapshot) =>
      cb(this.getDataFromSnapShot(snapshot)),
    )
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
    return onValue(query(this.ref, orderByChild('wrongCount'), startAt(0)), (snapshot) => {
      const records = this.getDataFromSnapShot(snapshot)
      cb(this.createGroupRecord(records))
    })
  }

  getGroupRecordsByDict(dict: string, cb: (s: groupedWordRecords[]) => void) {
    return onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) => {
      const records = this.getDataFromSnapShot(snapshot)

      cb(this.createGroupRecord(records.filter((item) => item.dict === dict)))
    })
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
    return onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) => cb(this.getDataFromSnapShot(snapshot)))
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
    return onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) => cb(this.getDataFromSnapShot(snapshot)))
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
  return new ChapterRecordsControl(user.uid)
})

export const wordRecordsAtom = atom((get) => {
  const user = get(userAtom)
  if (!user) return null
  return new WordRecordsControl(user.uid)
})

export const reviewRecordsAtom = atom((get) => {
  const user = get(userAtom)
  if (!user) return null
  return new ReviewRecordsControl(user.uid)
})

export async function login() {
  return await signInWithPopup(auth, getProvider())
}

export async function logout() {
  await signOut(auth)
}
