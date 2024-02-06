import { auth, getRef } from './setup'
import type { groupedWordRecords } from '@/pages/ErrorBook/type'
import type { TErrorWordData } from '@/pages/Gallery-N/hooks/useErrorWords'
import type { Word } from '@/typings'
import type { IChapterRecord, IWordRecord, WordRecord } from '@/utils/db/record'
import {
  type DatabaseReference,
  child,
  endAt,
  equalTo,
  limitToFirst,
  onValue,
  orderByChild,
  query,
  remove,
  startAt,
  update,
} from 'firebase/database'
import { atom, useAtom } from 'jotai'

abstract class RefControl<T> {
  public ref: DatabaseReference
  constructor(protected userId: string, dbName: string) {
    this.ref = getRef(this.userId, dbName)
  }

  count(cb: (c: number) => void) {
    return onValue(this.ref, (snapshot) => cb(snapshot.size))
  }

  clear() {
    return remove(this.ref)
  }

  add(data: Record<string | number, T>) {
    return update(this.ref, data)
  }

  remove(id: string | number) {
    return remove(child(this.ref, id.toString()))
  }

  get(cb: (s: T[]) => void) {
    return onValue(this.ref, (snapshot) => cb(snapshot.val()))
  }

  getById(id: string, cb: (s: T[]) => void) {
    return onValue(child(this.ref, id), (snapshot) => cb(snapshot.val()))
  }
}

class ChapterRecordsControl extends RefControl<IChapterRecord> {
  constructor(protected userId: string) {
    super(userId, 'chapterRecords')
  }

  sort(a: IChapterRecord, b: IChapterRecord) {
    return new Date(a.card_due).getTime() - new Date(b.card_due).getTime()
  }

  getByDict(dict: string, cb: (s: IChapterRecord[]) => void) {
    return onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) =>
      cb(Object.values(snapshot.val() as Record<string, IChapterRecord>).sort(this.sort)),
    )
  }
}

class WordRecordsControl extends RefControl<IWordRecord> {
  constructor(protected userId: string) {
    super(userId, 'wordRecords')
  }

  getFirstWord(cb: (s: IWordRecord[]) => void) {
    return onValue(query(this.ref, orderByChild('timeStamp'), limitToFirst(1)), (snapshot) => cb(snapshot.val()))
  }

  getBetween(startTimeStamp: number, endTimeStamp: number, cb: (s: IWordRecord[]) => void) {
    return onValue(query(this.ref, orderByChild('timeStamp'), startAt(startTimeStamp), endAt(endTimeStamp)), (snapshot) =>
      cb(snapshot.val()),
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
      const records = Object.values(snapshot.val() ?? {}) as Array<IWordRecord>

      cb(this.createGroupRecord(records))
    })
  }

  getGroupRecordsByDict(dict: string, cb: (s: groupedWordRecords[]) => void) {
    return onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) => {
      const records = Object.values(snapshot.val() ?? {}) as Array<IWordRecord>

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
    return onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) =>
      cb(Object.values(snapshot.val() as Record<string, IWordRecord>)),
    )
  }

  getRevisionWordCount(dict: string, cb: (s: number) => void) {
    return this.getByDict(dict, (wordRecords) => {
      wordRecords
      const res = new Map()
      const reducedRecords = wordRecords.filter((item) => !res.has(item['word'] + item['dict']) && res.set(item['word'] + item['dict'], 1))
      cb(reducedRecords.length)
    })
  }
}

const userAtom = atom(auth.currentUser)
userAtom.onMount = (set) =>
  auth.onAuthStateChanged(function (data) {
    set(data)
  })

const chapterRecordsAtom = atom((get) => {
  const user = get(userAtom)
  if (!user) return null
  return new ChapterRecordsControl(user.uid)
})

const wordRecordsAtom = atom((get) => {
  const user = get(userAtom)
  if (!user) return null
  return new WordRecordsControl(user.uid)
})

export function Testing() {
  const [chapterController] = useAtom(chapterRecordsAtom)
  const [wordController] = useAtom(wordRecordsAtom)
  window.chapterController = chapterController
  window.wordController = wordController
  return <></>
}
