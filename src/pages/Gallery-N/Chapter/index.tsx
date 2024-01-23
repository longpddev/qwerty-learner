import type { IChapterStats } from '../hooks/useChapterStats'
import { useChapterStats } from '../hooks/useChapterStats'
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import clsx from 'clsx'
import { Rating } from 'fsrs.js'
import { useEffect, useRef } from 'react'
import IconCheckCircle from '~icons/heroicons/check-circle-solid'

export default function Chapter({
  index,
  checked,
  onChange,
  chapterStatus,
}: {
  index: number
  checked: boolean
  chapterStatus?: IChapterStats
  onChange: (index: number) => void
}) {
  const ref = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    if (checked && ref.current !== null) {
      const button = ref.current
      const container = button.parentElement?.parentElement?.parentElement
      container?.scroll({
        top: button.offsetTop - container.offsetTop - 300,
        behavior: 'smooth',
      })
    }
  }, [checked])

  const reviewlog = chapterStatus?.schedule?.schedule?.reviewLog
  const card = chapterStatus?.schedule?.schedule?.card
  const now = new Date()
  return (
    <div
      ref={ref}
      className={clsx(
        'relative flex h-16 w-40 cursor-pointer  flex-col items-start justify-center overflow-hidden rounded-xl border border-solid bg-slate-100 px-3 py-2 dark:bg-slate-800',
        {
          'border-slate-100': !reviewlog || reviewlog.rating === Rating.Again,
          'border-green-400': reviewlog && reviewlog.rating === Rating.Good,
          'border-red-400': reviewlog && reviewlog.rating === Rating.Hard,
          'border-blue-400': reviewlog && reviewlog.rating === Rating.Easy,
          'pointer-events-none opacity-50': card && card.due > now,
        },
      )}
      onClick={() => onChange(index)}
    >
      <h1>Chapter {index + 1}</h1>
      <p className="pt-[2px] text-xs text-slate-600">
        {/* {chapterStatus ? (chapterStatus.exerciseCount > 0 ? `Exercise ${chapterStatus.exerciseCount} times` : 'Not practiced') : ''} */}
        {card?.due.toDateString()}
      </p>
      {checked && (
        <IconCheckCircle className="absolute -bottom-4 -right-4 h-18 w-18 text-6xl text-green-500 opacity-40 dark:text-green-300" />
      )}
    </div>
  )
}

// export default function Chapter({
//   index,
//   checked,
//   dictID,
//   onChange,
// }: {
//   index: number
//   checked: boolean
//   dictID: string
//   onChange: (index: number) => void
// }) {
//   const ref = useRef<HTMLTableRowElement>(null)

//   const entry = useIntersectionObserver(ref, {})
//   const isVisible = !!entry?.isIntersecting
//   const chapterStatus = useChapterStats(index, dictID, isVisible)

//   useEffect(() => {
//     if (checked && ref.current !== null) {
//       const button = ref.current
//       const container = button.parentElement?.parentElement?.parentElement
//       container?.scroll({
//         top: button.offsetTop - container.offsetTop - 300,
//         behavior: 'smooth',
//       })
//     }
//   }, [checked])

//   const reviewlog = chapterStatus?.schedule?.review_log
//   const card = chapterStatus?.schedule?.card
//   const now = new Date()
//   return (
//     <div
//       ref={ref}
//       className={clsx(
//         'relative flex h-16 w-40 cursor-pointer  flex-col items-start justify-center overflow-hidden rounded-xl border border-solid bg-slate-100 px-3 py-2 dark:bg-slate-800',
//         {
//           'border-slate-100': !reviewlog || reviewlog.rating === Rating.Again,
//           'border-green-400': reviewlog && reviewlog.rating === Rating.Good,
//           'border-red-400': reviewlog && reviewlog.rating === Rating.Hard,
//           'border-blue-400': reviewlog && reviewlog.rating === Rating.Easy,
//           'pointer-events-none opacity-50': card && card.due > now,
//         },
//       )}
//       onClick={() => onChange(index)}
//     >
//       <h1>Chapter {index + 1}</h1>
//       <p className="pt-[2px] text-xs text-slate-600">
//         {chapterStatus
//           ? chapterStatus.exerciseCount > 0
//             ? `Exercise ${chapterStatus.exerciseCount} times`
//             : 'Not practiced'
//           : 'loading...'}
//       </p>
//       {checked && (
//         <IconCheckCircle className="absolute -bottom-4 -right-4 h-18 w-18 text-6xl text-green-500 opacity-40 dark:text-green-300" />
//       )}
//     </div>
//   )
// }
