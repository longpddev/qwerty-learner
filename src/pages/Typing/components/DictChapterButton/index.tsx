import Tooltip from '@/components/Tooltip'
import { currentChapterAtom, currentDictInfoAtom, isReviewModeAtom } from '@/store'
import { useAllChapterDetail } from '@/utils/db'
import range from '@/utils/range'
import { Listbox, Transition } from '@headlessui/react'
import clsx from 'clsx'
import { useAtom, useAtomValue } from 'jotai'
import { Fragment } from 'react'
import { NavLink } from 'react-router-dom'
import IconCheck from '~icons/tabler/check'

export const DictChapterButton = () => {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const { allChapter } = useAllChapterDetail(currentDictInfo)
  return (
    <>
      <Tooltip content="Dictionary switch">
        <NavLink
          className="block rounded-lg px-3 py-1 text-lg transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white focus:outline-none dark:text-white dark:text-opacity-60 dark:hover:text-opacity-100"
          to="/gallery"
        >
          {currentDictInfo.name} {isReviewMode && 'Review of wrong questions'}
        </NavLink>
      </Tooltip>
      {!isReviewMode && (
        <Tooltip content="Chapter switch">
          <Listbox value={currentChapter} onChange={setCurrentChapter}>
            <Listbox.Button className="rounded-lg px-3 py-1 text-lg transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white focus:outline-none dark:text-white dark:text-opacity-60 dark:hover:text-opacity-100">
              Chapter {currentChapter + 1}
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="listbox-options z-10 w-min">
                {allChapter.map((chap) => {
                  const canSelect = !chap.stats?.schedule || (chap.stats?.schedule && chap.stats.schedule.isDueDate())
                  return (
                    <Listbox.Option key={chap.chapter} value={chap.chapter} disabled={!canSelect}>
                      {({ selected }) => (
                        <div
                          className={clsx('group flex cursor-pointer items-center justify-between whitespace-nowrap', {
                            'pointer-events-none opacity-50': !canSelect,
                          })}
                        >
                          {selected ? (
                            <span className="listbox-options-icon">
                              <IconCheck className="focus:outline-none" />
                            </span>
                          ) : null}
                          <span>Chapter {chap.chapter + 1}</span>
                        </div>
                      )}
                    </Listbox.Option>
                  )
                })}
              </Listbox.Options>
            </Transition>
          </Listbox>
        </Tooltip>
      )}
    </>
  )
}
