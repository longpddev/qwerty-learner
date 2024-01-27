import { TypingContext } from '../../store'
import Popup from '../Popup'
import { LoadingUI } from '@/components/Loading'
import type { IRecordName } from '@/utils/db'
import { pullRecords, pushRecords, useRecordDiff } from '@/utils/db'
import { useCallback, useContext, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import useSWR from 'swr'
import IconX from '~icons/tabler/x'

const usePromise = <P, R>(param: P, cb: (p: P) => Promise<R>) => {
  const [loading, loadingSet] = useState(false)
  const [data, dataSet] = useState<R | undefined>(undefined)

  const run = useCallback(async () => {
    loadingSet(true)
    try {
      const result = await cb(param)
      dataSet(result)
    } finally {
      loadingSet(false)
    }
  }, [param, cb])

  return [run, loading, data] as const
}
const PullPush = ({ name, onDone }: { name: IRecordName; onDone: () => void }) => {
  const [runPull, pullLoading] = usePromise(name, pullRecords)
  const [runPush, pushLoading] = usePromise(name, pushRecords)
  return (
    <div className="">
      <p className="mb-2 text-left text-xl text-indigo-500">{name}</p>
      <div className="flex gap-4 pl-4">
        <button className="my-btn-primary bg-orange-400" onClick={() => !pullLoading && runPull().finally(onDone)}>
          {pullLoading ? 'pending' : 'Download'}
        </button>
        <button className="my-btn-primary" onClick={() => !pushLoading && runPush().finally(onDone)}>
          {pushLoading ? 'pending' : 'Upload'}
        </button>
      </div>
    </div>
  )
}

const CheckDataDiff = () => {
  const [diff, diffSet] = useState([] as Array<IRecordName>)
  const closeModal = () => {
    diffSet([])
  }

  useHotkeys('esc', () => closeModal())
  const onDiff = (name: IRecordName, mode: 'add' | 'delete') => () =>
    diffSet((prev) => {
      const set = new Set(prev)
      set[mode](name)
      return Array.from(set)
    })
  useRecordDiff('chapterRecords', onDiff('chapterRecords', 'add'))
  useRecordDiff('wordRecords', onDiff('wordRecords', 'add'))
  useRecordDiff('reviewRecords', onDiff('reviewRecords', 'add'))

  return (
    <Popup isOpen={!!diff.length} closeModal={closeModal}>
      <div className="relative flex items-end justify-between rounded-t-lg border-b border-neutral-100 bg-stone-50 px-6 py-3 dark:border-neutral-700 dark:bg-gray-900">
        <span className="text-3xl font-bold text-gray-600">Update app</span>
        <button type="button" onClick={closeModal} title="Close dialog">
          <IconX className="absolute right-7 top-5 cursor-pointer text-gray-400" />
        </button>
      </div>
      <div className="flex flex-col gap-4 px-4 py-2">
        {diff.map((item) => (
          <PullPush name={item} key={item} onDone={onDiff(item, 'delete')} />
        ))}
      </div>
    </Popup>
  )
}

export default CheckDataDiff
