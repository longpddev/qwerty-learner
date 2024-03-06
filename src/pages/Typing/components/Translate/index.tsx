import { TypingContext } from '../../store'
import Popup from '../Popup'
import { LoadingUI } from '@/components/Loading'
import Markdown from '@/components/Markdown'
import { useContext, useEffect, useState } from 'react'
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

function parseSSE<T>(callback?: (d: T) => void) {
  return async (stream: ReadableStream<Uint8Array>) => {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const result: T[] = []

    let done = false

    while (!done) {
      const { value, done: streamDone } = await reader.read()
      done = streamDone

      if (done) break

      const decodedData = decoder.decode(value, { stream: true })
      buffer += decodedData

      const lines = buffer.split('\n')
      console.log('🚀 ~ return ~ lines:', lines)
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim() !== '') {
          if (line.startsWith('data:')) {
            const data = JSON.parse(line.slice(5))
            result.push(data)
            callback?.(data)
          }
        }
      }
    }

    return result
  }
}
function useTranslateFetch(word: string) {
  const [content, contentSet] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    contentSet('')
    fetch(`${import.meta.env.VITE_API_URI}/explain?text=${word}`, { signal: controller.signal })
      .then((response) => response.body!)
      .then(
        parseSSE<{ text: string }>((data) => {
          contentSet((prev) => prev + data.text)
        }),
      )

    return () => controller.abort()
  }, [word])

  return content
}

const TranslateText = ({ onClose }: { onClose: () => void }) => {
  const { state } = useContext(TypingContext)!
  const currentWord = state.chapterData.words[state.chapterData.index]

  const { data: dictionary } = useSWR(`${import.meta.env.VITE_API_URI}/dictionary?text=${currentWord?.name ?? ''}`, dictionaryFetch)

  const content = useTranslateFetch(currentWord?.name ?? '')
  return (
    <div className="flex max-h-[95vh] flex-col">
      <div className="relative flex items-end justify-between rounded-t-lg  bg-stone-50 px-6 py-3 dark:bg-gray-900">
        <span className="text-3xl font-bold text-gray-600">{currentWord?.name}</span>
        <button type="button" onClick={onClose} title="Close dialog">
          <IconX className="absolute right-7 top-5 cursor-pointer text-gray-400" />
        </button>
      </div>
      <div className="relative min-h-32 overflow-auto p-4 text-left">
        <Markdown>{dictionary ?? ''}</Markdown>
        <Markdown>{content}</Markdown>
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
