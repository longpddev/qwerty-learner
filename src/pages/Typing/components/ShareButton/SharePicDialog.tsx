import { TypingContext } from '../../store'
import shareImage1 from '@/assets/sharePic/image-1.png'
import shareImage2 from '@/assets/sharePic/image-2.png'
import shareImage3 from '@/assets/sharePic/image-3.png'
import shareImage4 from '@/assets/sharePic/image-4.png'
import shareImage5 from '@/assets/sharePic/image-5.png'
import shareImage6 from '@/assets/sharePic/image-6.png'
import shareImage7 from '@/assets/sharePic/image-7.png'
import shareImage8 from '@/assets/sharePic/image-8.png'
import shareImage9 from '@/assets/sharePic/image-9.png'
import keyboardSvg from '@/assets/sharePic/keyBackground.svg'
import { currentChapterAtom, currentDictInfoAtom } from '@/store'
import { recordShareAction } from '@/utils'
import { Dialog, Transition } from '@headlessui/react'
import { useAtomValue } from 'jotai'
import { Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import IconXMark from '~icons/heroicons/x-mark-solid'

const PIC_RATIO = 3
const PIC_LIST = [shareImage1, shareImage2, shareImage3, shareImage4, shareImage5, shareImage6, shareImage7, shareImage8, shareImage9]
// 我知道有些有点怪，但怪的有趣(狗头)，powered by chatGPT
const PROMOTE_LIST = [
  { word: 'Swift Hand', sentence: "Speed so fast it's like having an extra hand." },
  { word: 'Thunderous Techniques', sentence: 'Thunder-like skill, captivating the audience.' },
  { word: 'Swift as Lightning', sentence: 'Typing speed extremely fast, like lightning traversing the keyboard.' },
  { word: 'Hands like the Wind', sentence: 'Remarkably fast typing speed, just like the wind.' },
  { word: 'Precision like an Arrow', sentence: 'Typing accuracy extremely high, hitting the target like an arrow.' },
  { word: 'Rapid Advance', sentence: 'Typing speed so fast it feels like a rapid advance.' },
  { word: 'Speedy as the Wind', sentence: 'Typing at godly speed, as swift as the wind.' },
  { word: 'Spot-on Every Move', sentence: 'Both typing accuracy and speed are impeccable, without any mistakes.' },
  { word: 'Effortless Mastery', sentence: 'Proficient typing technique, effortless and flowing like walking on flat ground.' },
  { word: 'Diversionary Tactics', sentence: 'Superb typing skills, employing diversionary tactics to achieve surprising victories.' },
  { word: 'Sorcerer of Speed', sentence: 'Typing speed unbelievably fast, like a sorcerer casting spells.' },
  { word: 'Adaptable and Flexible', sentence: "Typing with flexible and varied movements, like a snake's agility." },
  { word: 'Like a Soaring Bird', sentence: 'Typing speed extremely fast, like a bird soaring over the keyboard.' },
  { word: 'Artful Expressions', sentence: 'Skillful typing, delivering a string of artful and witty expressions.' },
  { word: 'Invulnerable', sentence: 'High typing speed and accuracy, as if immune to any errors.' },
  { word: 'Both Offense and Defense', sentence: 'Outstanding in both typing speed and accuracy, excelling in both offense and defense.' },
  { word: 'Leaping onto Paper', sentence: 'Flexible and varied typing techniques, vivid and interesting like leaping onto paper.' },
]

export type SharePicDialogProps = {
  showState: boolean
  setShowState: (showState: boolean) => void
  randomChoose: {
    picRandom: number
    promoteRandom: number
  }
}

export default function SharePicDialog({ showState, setShowState, randomChoose }: SharePicDialogProps) {
  // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
  const { state } = useContext(TypingContext)!
  const imageRef = useRef<HTMLDivElement>(null)
  const [imageURL, setImageURL] = useState<string | null>(null)
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const currentChapter = useAtomValue(currentChapterAtom)

  const dialogFocusRef = useRef<HTMLButtonElement>(null)

  const shareImage = useMemo(() => PIC_LIST[Math.floor(randomChoose.picRandom * PIC_LIST.length)], [randomChoose.picRandom])
  const promote = useMemo(() => PROMOTE_LIST[Math.floor(randomChoose.promoteRandom * PROMOTE_LIST.length)], [randomChoose.promoteRandom])

  useEffect(() => {
    async function loadToPng() {
      const { toPng } = await import('html-to-image')

      if (imageRef.current) {
        const width = imageRef.current.offsetWidth
        const height = imageRef.current.offsetHeight
        toPng(imageRef.current, { canvasWidth: width * PIC_RATIO, canvasHeight: height * PIC_RATIO }).then((url) => {
          setImageURL(url)
        })
      }
    }

    loadToPng()
  }, [])

  const handleDownload = useCallback(async () => {
    const { saveAs } = await import('file-saver')

    if (imageURL) {
      saveAs(imageURL, 'Qwerty-learner.png')
      recordShareAction('download')
    }
  }, [imageURL])

  const handleClose = useCallback(() => {
    setShowState(false)
  }, [setShowState])

  return (
    <>
      <Transition.Root show={showState}>
        <Dialog as="div" className="relative z-50" onClose={handleClose} initialFocus={dialogFocusRef}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all  dark:bg-gray-700">
                  <div className="flex flex-col items-center justify-center pb-10 pl-20 pr-14 pt-20">
                    <button className="absolute right-7 top-5" type="button" onClick={handleClose} title="Close dialog">
                      <IconXMark className="h-6 w-6 text-gray-400" />
                    </button>
                    <div className="h-152 w-116">
                      {imageURL ? (
                        <img src={imageURL} className="h-auto w-full" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-solid border-white">
                          <svg
                            className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-50" cx="12" cy="12" r="10" stroke="rgb(129 140 248)" strokeWidth="4"></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        </div>
                      )}
                    </div>
                    <button
                      ref={dialogFocusRef}
                      className="my-btn-primary mr-9 mt-10 h-10"
                      type="button"
                      onClick={handleDownload}
                      title="keep"
                    >
                      keep
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      <div style={{ position: 'absolute', left: '-999px', zIndex: -1 }}>
        <div ref={imageRef} className=" box-content w-85 bg-white p-4">
          <div
            className="relative flex h-112 w-75 flex-col items-start justify-start rounded-xl shadow-lg"
            style={{ backgroundColor: '#F8F8FF' }}
          >
            <div className=" w-full ">
              <KeyboardPanel description={promote.word} />
              <div className="text-center text-xs text-gray-500">{promote.sentence}</div>
              <div className="mx-4 mt-6 flex rounded-xl bg-white px-4 py-3 opacity-50 shadow-xl">
                <DataBox data={state.timerData.time + ''} description="time cost" />
                <DataBox data={state.timerData.accuracy + '%'} description="Correct rate" />
                <DataBox data={state.timerData.wpm + ''} description="WPM" />
              </div>
              <div className="ml-5 mt-4 self-start text-base text-gray-800">{currentDictInfo.name}</div>
              <div className="ml-5 mt-2 self-start text-xs text-gray-600">{`第 ${currentChapter + 1} 章`}</div>
            </div>
            <div className="mb-3 ml-5 mt-auto">
              <div className="text-xs">Qwerty.kaiyi.cool</div>
              <div className="mt-1 text-xs font-normal text-gray-400">
                Word and muscle memory exercise software designed for keyboard workers
              </div>
            </div>
            <div className="absolute -right-9 bottom-10 ">
              <img src={shareImage} className="w-48" width={186} height={122} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function DataBox({ data, description }: { data: string; description: string }) {
  return (
    <div className="flex w-20 flex-1 flex-col items-center justify-center">
      <span className="w-4/5 text-center text-base font-normal text-gray-600 ">{data}</span>
      <span className="pt-2 text-xs text-gray-400">{description}</span>
    </div>
  )
}

function KeyboardPanel({ description }: { description: string }) {
  return (
    <div className="mt-10 flex flex-wrap justify-center gap-0">
      {description.split('').map((char, index) => (
        <KeyboardKey key={`${index}-${char}`} char={char} />
      ))}
    </div>
  )
}

function KeyboardKey({ char }: { char: string }) {
  return (
    <div className="relative -mx-1 h-18 w-18">
      <div className="absolute bottom-0 left-0 right-0 top-0">
        <img src={keyboardSvg} className="h-full w-full" />
      </div>
      <div className="absolute left-0 right-0 top-2.5 flex items-center justify-center">
        <span className="text-base font-normal text-white" style={{ fontSize: '20px', transform: 'rotateX(30deg) ' }}>
          {char}
        </span>
      </div>
    </div>
  )
}
