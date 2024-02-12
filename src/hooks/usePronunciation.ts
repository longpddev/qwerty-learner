import { pronunciationConfigAtom } from '@/store'
import type { PronunciationType } from '@/typings'
import { groupArray } from '@/utils/groupBy'
import { romajiToHiragana } from '@/utils/kana'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const pronunciationApi = `${import.meta.env.VITE_API_URI}/dictvoice?audio=`
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

function silenceOffset(buffer: AudioBuffer) {
  const threshold = 0.01 // Adjust this threshold value based on your audio characteristics
  const length = buffer.length
  const data = buffer.getChannelData(0) // Assuming mono audio

  // Trim from the start
  let start = 0
  while (start < length && Math.abs(data[start]) < threshold) {
    start++
  }

  // Trim from the end
  let end = length - 1
  while (end > start && Math.abs(data[end]) < threshold) {
    end--
  }

  return { start, end }
}

async function loadAudio(url: string): Promise<ArrayBuffer> {
  return new Promise((res, rej) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'arraybuffer'
    xhr.withCredentials = true
    xhr.onload = function () {
      if (xhr.status === 200) {
        // Decode the audio data
        res(xhr.response)
      } else {
        rej("can't load data")
      }
    }

    xhr.send()
  })
}

async function fetchAudio(url: string) {
  const response = await fetch(url)

  const buffer = await response.arrayBuffer()
  const audioContext = new AudioContext()
  const arrayBuffer = await audioContext.decodeAudioData(buffer)
  const { numberOfChannels: channels, sampleRate: rate } = arrayBuffer
  const { start, end } = silenceOffset(arrayBuffer)

  const frameCount = end - start
  const anotherArray = new Float32Array(frameCount)
  const newArrayBuffer = audioContext.createBuffer(channels, frameCount, rate)

  for (let channel = 0; channel < channels; channel++) {
    arrayBuffer.copyFromChannel(anotherArray, channel, start)
    newArrayBuffer.copyToChannel(anotherArray, channel, 0)
  }

  let source: AudioBufferSourceNode | undefined

  return {
    init() {
      const source = audioContext.createBufferSource()
      source.buffer = newArrayBuffer
      source.connect(audioContext.destination)
      return source
    },
    loop() {
      this.stop()
      source = this.init()
      source.loop = true
      source.start()
      return source
    },
    play() {
      this.stop()
      source = this.init()
      source.start()
      return source
    },
    stop() {
      source?.stop()
      source = undefined
    },
    audioContext,
  }
}

export default function usePronunciationSound(word: string, isLoop?: boolean) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const loop = useMemo(() => (typeof isLoop === 'boolean' ? isLoop : pronunciationConfig.isLoop), [isLoop, pronunciationConfig.isLoop])
  const [isPlaying, setIsPlaying] = useState(false)
  const isStarted = useRef(false)
  const audioUrl = generateWordSoundSrc(word, pronunciationConfig.type)
  const [play, stop] = useMemo(() => {
    const fetching = fetchAudio(audioUrl)
    async function play() {
      const audio = await fetching
      if (isStarted.current) return
      const audioNode = loop ? audio.loop() : audio.play()
      setIsPlaying(true)
      audioNode.addEventListener('ended', function handle() {
        setIsPlaying(false)
        audioNode.removeEventListener('ended', handle)
      })
      isStarted.current = true
    }

    async function stop() {
      if (!isStarted.current) return
      setIsPlaying(false)
      const audio = await fetching
      audio.stop()
      isStarted.current = false
    }

    return [play, stop]
  }, [audioUrl, loop])

  useEffect(
    () => () => {
      stop()
      isStarted.current = false
    },
    [stop],
  )
  return { play, stop, isPlaying }
}

// export default function usePronunciationSound(word: string, isLoop?: boolean) {
//   const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
//   const loop = useMemo(() => (typeof isLoop === 'boolean' ? isLoop : pronunciationConfig.isLoop), [isLoop, pronunciationConfig.isLoop])
//   const [isPlaying, setIsPlaying] = useState(false)

//   const [play, { stop, sound }] = useSound(generateWordSoundSrc(word, pronunciationConfig.type), {
//     html5: true,
//     format: ['mp3'],
//     loop,
//     volume: pronunciationConfig.volume,
//     rate: pronunciationConfig.rate,
//     interrupt: true,
//     xhr: {
//       headers: {
//         'Cache-Control': 'max-age=3600',
//       },
//     },
//   } as HookOptions)

//   useEffect(() => {
//     if (!sound) return
//     sound.loop(loop)
//     return noop
//   }, [loop, sound])

//   useEffect(() => {
//     if (!sound) return
//     const unListens: Array<() => void> = []

//     unListens.push(
//       addHowlListener(sound, 'play', () => {
//         setIsPlaying(true)
//       }),
//     )
//     unListens.push(addHowlListener(sound, 'end', () => setIsPlaying(false)))
//     unListens.push(addHowlListener(sound, 'pause', () => setIsPlaying(false)))
//     unListens.push(addHowlListener(sound, 'playerror', () => setIsPlaying(false)))

//     return () => {
//       setIsPlaying(false)
//       unListens.forEach((unListen) => unListen())
//       ;(sound as Howl).unload()
//     }
//   }, [sound])

//   return { play, stop, isPlaying }
// }

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

    const createPrefetchLink = (soundUrl: string): Promise<HTMLLinkElement> => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = soundUrl
      document.head.appendChild(link)
      return new Promise((res, rej) => {
        link.onload = () => res(link)
        link.onerror = (e) => {
          rej(e)
          link.remove()
        }
      })
    }

    let cleared = false
    async function execute() {
      for (const group of groupArray(words, 10)) {
        if (cleared) return
        await Promise.allSettled(
          group.map(async (link) => {
            const soundUrl = getSoundUrl(link)
            if (!preWords.current.has(soundUrl)) {
              const link = await createPrefetchLink(soundUrl)
              if (cleared) return
              preWords.current.set(soundUrl, link)
            }
          }),
        )
      }
    }

    execute()

    return () => {
      cleared = true
      removeAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSoundUrl, isChange()])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // useEffect(() => () => Array.from(currentList.current?.values() ?? []).forEach(el => el.remove()), [])
}
