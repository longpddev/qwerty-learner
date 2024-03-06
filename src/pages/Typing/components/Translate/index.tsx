import { TypingContext } from '../../store'
import Popup from '../Popup'
import { LoadingUI } from '@/components/Loading'
import Markdown from '@/components/Markdown'
import { useContext, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import useSWR from 'swr'
import IconX from '~icons/tabler/x'

const translateFetch = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .then((data) => data.translated_text)

const dictionaryFetch = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .then((data) => data.result as string | null)

const TranslateText = ({ onClose }: { onClose: () => void }) => {
  const { state } = useContext(TypingContext)!
  const currentWord = state.chapterData.words[state.chapterData.index]

  const { data, isLoading } = useSWR(`${import.meta.env.VITE_API_URI}/explain?text=${currentWord?.name ?? ''}`, translateFetch)
  const { data: dictionary } = useSWR(`${import.meta.env.VITE_API_URI}/dictionary?text=${currentWord?.name ?? ''}`, dictionaryFetch)
  // const bg = currentWord?.name ? `${import.meta.env.VITE_API_URI}/visualize?text=${currentWord.name ?? ''}` : ''
  console.log('🚀 ~ TranslateText ~ dictionary:', dictionary)
  return (
    <div className="flex max-h-[95vh] flex-col">
      <div className="relative flex items-end justify-between rounded-t-lg  bg-stone-50 px-6 py-3 dark:bg-gray-900">
        <span className="text-3xl font-bold text-gray-600">{currentWord?.name}</span>
        <button type="button" onClick={onClose} title="Close dialog">
          <IconX className="absolute right-7 top-5 cursor-pointer text-gray-400" />
        </button>
      </div>
      <div className="relative min-h-32 overflow-auto p-4 text-left">
        {/* <img
          src={bg}
          alt=""
          className="pointer-events-none absolute inset-0 block h-full w-full object-cover object-center opacity-20"
          style={{ filter: 'blur(2px) brightness(0.5)' }}
        /> */}
        {dictionary && (
          <div>
            <Markdown>{dictionary}</Markdown>
          </div>
        )}
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <LoadingUI />
          </div>
        ) : (
          <Markdown>{data}</Markdown>
        )}
      </div>
    </div>
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
