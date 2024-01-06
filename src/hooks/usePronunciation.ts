import { pronunciationConfigAtom } from '@/store'
import type { PronunciationType } from '@/typings'
import { addHowlListener } from '@/utils'
import { romajiToHiragana } from '@/utils/kana'
import noop from '@/utils/noop'
import type { Howl } from 'howler'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSound from 'use-sound'
import type { HookOptions } from 'use-sound/dist/types'

const pronunciationApi = 'https://dict.youdao.com/dictvoice?audio='
export function generateWordSoundSrc(word: string, pronunciation: Exclude<PronunciationType, false>) {
  switch (pronunciation) {
    case 'uk':
      return `${pronunciationApi}${word}&type=1`
    case 'us':
      return `${pronunciationApi}${word}&type=2`
    case 'romaji':
      return `${pronunciationApi}${romajiToHiragana(word)}&le=jap`
    case 'zh':
      return `${pronunciationApi}${word}&le=zh`
    case 'ja':
      return `${pronunciationApi}${word}&le=jap`
    case 'de':
      return `${pronunciationApi}${word}&le=de`
  }
}

export default function usePronunciationSound(word: string, isLoop?: boolean) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const loop = useMemo(() => (typeof isLoop === 'boolean' ? isLoop : pronunciationConfig.isLoop), [isLoop, pronunciationConfig.isLoop])
  const [isPlaying, setIsPlaying] = useState(false)

  const [play, { stop, sound }] = useSound(generateWordSoundSrc(word, pronunciationConfig.type), {
    html5: true,
    format: ['mp3'],
    loop,
    volume: pronunciationConfig.volume,
    rate: pronunciationConfig.rate,
    xhr: {
      headers: {
        'Cache-Control': 'max-age=3600',
      },
    },
  } as HookOptions)

  useEffect(() => {
    if (!sound) return
    sound.loop(loop)
    return noop
  }, [loop, sound])

  useEffect(() => {
    if (!sound) return
    const unListens: Array<() => void> = []

    unListens.push(addHowlListener(sound, 'play', () => setIsPlaying(true)))
    unListens.push(addHowlListener(sound, 'end', () => setIsPlaying(false)))
    unListens.push(addHowlListener(sound, 'pause', () => setIsPlaying(false)))
    unListens.push(addHowlListener(sound, 'playerror', () => setIsPlaying(false)))

    return () => {
      setIsPlaying(false)
      unListens.forEach((unListen) => unListen())
      ;(sound as Howl).unload()
    }
  }, [sound])

  return { play, stop, isPlaying }
}

export function usePrefetchPronunciationSound(word: string | undefined) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)

  useEffect(() => {
    if (!word) return
    const soundUrl = generateWordSoundSrc(word, pronunciationConfig.type)
    const head = document.head
    const isPrefetch = (Array.from(head.querySelectorAll('link[href]')) as HTMLLinkElement[]).some((el) => el.href === soundUrl)

    if (!isPrefetch) {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = soundUrl
      head.appendChild(link)

      return () => {
        head.removeChild(link)
      }
    }
  }, [pronunciationConfig.type, word])
}

export function usePrefetchPronunciationSounds(words: string[]) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const [preWords] = useState(() => ({ current: new Map<string, HTMLLinkElement>() }))
  const getSoundUrl = useCallback((url: string) => generateWordSoundSrc(url, pronunciationConfig.type), [pronunciationConfig.type])

  const isChange = () => words.map((url) => getSoundUrl(url)).some((soundUrl) => preWords.current.has(soundUrl))

  useEffect(() => {
    if (!words.length) return

    const removeAll = () => {
      Array.from(preWords.current.values()).forEach((el) => el.remove())
      preWords.current.clear()
    }

    const createPrefetchLink = (soundUrl: string) => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = soundUrl
      document.head.appendChild(link)

      return link
    }

    for (const link of words) {
      const soundUrl = getSoundUrl(link)
      if (!preWords.current.has(soundUrl)) preWords.current.set(soundUrl, createPrefetchLink(soundUrl))
    }

    return removeAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSoundUrl, isChange()])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // useEffect(() => () => Array.from(currentList.current?.values() ?? []).forEach(el => el.remove()), [])
}
