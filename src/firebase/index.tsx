import { auth, getRef } from './setup'
import type { IChapterRecord, IWordRecord } from '@/utils/db/record'
import {
  DataSnapshot,
  type DatabaseReference,
  child,
  endAt,
  equalTo,
  limitToFirst,
  limitToLast,
  onValue,
  orderByChild,
  orderByKey,
  orderByValue,
  query,
  startAt,
} from 'firebase/database'
import { atom, useAtom } from 'jotai'

abstract class RefControl {
  public ref: DatabaseReference
  constructor(protected userId: string, dbName: string) {
    this.ref = getRef(this.userId, dbName)
  }
}

class ChapterRecordsControl extends RefControl {
  constructor(protected userId: string) {
    super(userId, 'chapterRecords')
  }

  sort(a: IChapterRecord, b: IChapterRecord) {
    return new Date(a.card_due).getTime() - new Date(b.card_due).getTime()
  }

  get(cb: (s: IChapterRecord[]) => void) {
    return onValue(this.ref, (snapshot) => cb(snapshot.val()))
  }

  getById(id: string, cb: (s: IChapterRecord[]) => void) {
    return onValue(child(this.ref, id), (snapshot) => cb(snapshot.val()))
  }

  getByDict(dict: string, cb: (s: IChapterRecord[]) => void) {
    return onValue(query(this.ref, orderByChild('dict'), equalTo(dict)), (snapshot) =>
      cb(Object.values(snapshot.val() as Record<string, IChapterRecord>).sort(this.sort)),
    )
  }
}

class WordRecordsControl extends RefControl {
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

  get(cb: (s: IWordRecord[]) => void) {
    return onValue(this.ref, (snapshot) => cb(snapshot.val()))
  }

  getById(id: string, cb: (s: IWordRecord[]) => void) {
    return onValue(child(this.ref, id), (snapshot) => cb(snapshot.val()))
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
