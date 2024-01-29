import { TypingContext } from '../../store'
import Popup from '../Popup'
import { LoadingUI } from '@/components/Loading'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useContext, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import useSWR from 'swr'
import IconX from '~icons/tabler/x'

const translateFetch = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .then((data) => data.translated_text)

const TranslateText = ({ onClose }: { onClose: () => void }) => {
  const { state } = useContext(TypingContext)!
  const currentWord = state.chapterData.words[state.chapterData.index]

  const { data, isLoading } = useSWR(`https://hono-proxy.longpddev.workers.dev/explain?text=${currentWord?.name ?? ''}`, translateFetch)
  return (
    <>
      <div className="relative flex items-end justify-between rounded-t-lg border-b border-neutral-100 bg-stone-50 px-6 py-3 dark:border-neutral-700 dark:bg-gray-900">
        <span className="text-3xl font-bold text-gray-600">{currentWord?.name}</span>
        <button type="button" onClick={onClose} title="Close dialog">
          <IconX className="absolute right-7 top-5 cursor-pointer text-gray-400" />
        </button>
      </div>
      <div className="min-h-32 p-4 text-left">
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <LoadingUI />
          </div>
        ) : (
          data
        )}
      </div>
    </>
  )
}

const Translate = () => {
  const [isOpen, isOpenSet] = useState(false)
  const closeModal = () => {
    isOpenSet(false)
  }

  useHotkeys('ctrl+s', () => isOpenSet(true), { preventDefault: true })
  useHotkeys('esc', () => closeModal)

  return (
    <Popup isOpen={isOpen} closeModal={closeModal}>
      <TranslateText onClose={closeModal} />
    </Popup>
  )
}

export default Translate
