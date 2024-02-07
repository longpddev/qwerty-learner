import { reviewRecordsAtom } from '@/firebase'
import type { ReviewRecord } from '@/utils/db/record'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

type TReviewInfoAtomData = {
  isReviewMode: boolean
  reviewRecord: ReviewRecord | undefined
}

export function reviewInfoAtom(initialValue: TReviewInfoAtomData) {
  const storageAtom = atomWithStorage('reviewModeInfo', initialValue)

  return atom(
    (get) => {
      return get(storageAtom)
    },
    (get, set, updater: TReviewInfoAtomData | ((oldValue: TReviewInfoAtomData) => TReviewInfoAtomData)) => {
      const newValue = typeof updater === 'function' ? updater(get(storageAtom)) : updater
      const reviewRecordControl = get(reviewRecordsAtom)
      // update reviewRecord to indexdb
      const id = newValue.reviewRecord?.id
      const reviewRecord = newValue.reviewRecord
      if (reviewRecord && id) {
        reviewRecordControl?.add(reviewRecord, id)
      }
      set(storageAtom, newValue)
    },
  )
}
