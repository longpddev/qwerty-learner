import { TypingContext } from '../../store'
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

  const { data, isLoading } = useSWR(`https://hono-proxy.longpddev.workers.dev/translate?text=${currentWord?.name ?? ''}`, translateFetch)
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

  useHotkeys('ctrl+s', () => isOpenSet(true))
  useHotkeys('esc', () => closeModal)
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="flex w-200 flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-xl dark:bg-gray-800">
                <TranslateText onClose={closeModal} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default Translate
