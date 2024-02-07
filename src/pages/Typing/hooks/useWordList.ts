import { CHAPTER_LENGTH } from '@/constants'
import { chapterRecordsAtom } from '@/firebase'
import { currentChapterAtom, currentDictInfoAtom, reviewModeInfoAtom } from '@/store'
import type { Word, WordWithIndex } from '@/typings/index'
import type { IChapterRecord } from '@/utils/db/record'
import { ChapterRecord } from '@/utils/db/record'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'

export type UseWordListResult = {
  words: WordWithIndex[]
  isLoading: boolean
  error: Error | undefined
}

/**
 * Use word lists from the current selected dictionary.
 */
export function useWordList() {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const { isReviewMode, reviewRecord } = useAtomValue(reviewModeInfoAtom)
  const chapterRecordControl = useAtomValue(chapterRecordsAtom)
  // Reset current chapter to 0, when currentChapter is greater than chapterCount.
  if (currentChapter >= currentDictInfo.chapterCount) {
    setCurrentChapter(0)
  }

  const isFirstChapter = !isReviewMode && currentDictInfo.id === 'cet4' && currentChapter === 0
  const { data: wordList, error, isLoading } = useSWR(currentDictInfo.url, wordListFetcher)
  const [schedule, scheduleSet] = useState<IChapterRecord>()

  useEffect(() => {
    console.log(
      '🚀 ~ useWordList ~ ChapterRecord.createId(currentDictInfo.id, currentChapter):',
      ChapterRecord.createId(currentDictInfo.id, currentChapter),
    )
    return chapterRecordControl?.getById(ChapterRecord.createId(currentDictInfo.id, currentChapter), (data) => {
      return data && scheduleSet(data)
    })
  }, [chapterRecordControl, currentDictInfo.id, currentChapter])

  const words: WordWithIndex[] = useMemo(() => {
    let newWords: Word[]
    if (isFirstChapter) {
      newWords = firstChapter
    } else if (isReviewMode) {
      newWords = reviewRecord?.words ?? []
    } else if (wordList) {
      newWords = wordList.slice(currentChapter * CHAPTER_LENGTH, (currentChapter + 1) * CHAPTER_LENGTH)
    } else {
      newWords = []
    }

    // 记录原始 index, 并对 word.trans 做兜底处理
    return newWords.map((word, index) => {
      let trans: string[]
      if (Array.isArray(word.trans)) {
        trans = word.trans.filter((item) => typeof item === 'string')
      } else if (word.trans === null || word.trans === undefined || typeof word.trans === 'object') {
        trans = []
      } else {
        trans = [String(word.trans)]
      }
      return {
        ...word,
        index,
        trans,
      }
    })
  }, [isFirstChapter, isReviewMode, wordList, reviewRecord?.words, currentChapter])

  return { words, isLoading, error, schedule, isScheduleLoading: isLoading }
}

const firstChapter = [
  {
    name: 'cancel',
    trans: ['Cancel; Revoke; Delete'],
    usphone: "'kænsl",
    ukphone: "'kænsl",
  },
  {
    name: 'explosive',
    trans: ['Explosive; Highly controversial', 'Explosives'],
    usphone: "ɪk'splosɪv; ɪk'splozɪv",
    ukphone: "ɪk'spləusɪv",
  },
  {
    name: 'numerous',
    trans: ['Numerous'],
    usphone: "'numərəs",
    ukphone: "'njuːmərəs",
  },
  {
    name: 'govern',
    trans: ['Hold a dominant position; Rule; Govern'],
    usphone: "'ɡʌvɚn",
    ukphone: "'gʌvn",
  },
  {
    name: 'analyse',
    trans: ['Analyze; Decompose; Parse'],
    usphone: "'æn(ə)laɪz",
    ukphone: "'ænəlaɪz",
  },
  {
    name: 'discourage',
    trans: ['Demoralize; Deter; Dissuade'],
    usphone: "dɪs'kɝɪdʒ",
    ukphone: "dɪs'kʌrɪdʒ",
  },
  {
    name: 'resemble',
    trans: ['Resemble; Be similar to'],
    usphone: "rɪ'zɛmbl",
    ukphone: "rɪ'zembl",
  },
  {
    name: 'remote',
    trans: ['Distant; Remote; Isolated; Estranged; Negligible; Aloof; Remote-controlled'],
    usphone: "rɪ'mot",
    ukphone: "rɪ'məut",
  },
  {
    name: 'salary',
    trans: ['Salary; Wages'],
    usphone: "'sæləri",
    ukphone: "'sæləri",
  },
  {
    name: 'pollution',
    trans: ['Pollution; Pollutant'],
    usphone: "pə'luʃən",
    ukphone: "pə'luːʃn",
  },
  {
    name: 'pretend',
    trans: ['Pretend; Act as if'],
    usphone: "prɪ'tɛnd",
    ukphone: "prɪ'tend",
  },
  { name: 'kettle', trans: ['Kettle'], usphone: "'kɛtl", ukphone: "'ketl" },
  {
    name: 'wreck',
    trans: ['Accident; Wreckage; Person mentally or physically broken down', 'Destroy'],
    usphone: 'rɛk',
    ukphone: 'rek',
  },
  {
    name: 'drunk',
    trans: ['Drunk; Intoxicated'],
    usphone: 'drʌŋk',
    ukphone: 'drʌŋk',
  },
  {
    name: 'calculate',
    trans: ['Calculate; Estimate; Plan'],
    usphone: "'kælkjulet",
    ukphone: "'kælkjuleɪt",
  },
  {
    name: 'persistent',
    trans: ['Persistent; Unyielding; Continuous; Repeatedly occurring'],
    usphone: "pə'zɪstənt",
    ukphone: "pə'sɪstənt",
  },
  { name: 'sake', trans: ['Reason; Cause'], usphone: 'sek', ukphone: 'seɪk' },
  {
    name: 'conceal',
    trans: ['Conceal; Cover up; Withhold'],
    usphone: "kən'sil",
    ukphone: "kən'siːl",
  },
  {
    name: 'audience',
    trans: ['Audience; Spectators; Readers'],
    usphone: "'ɔdɪəns",
    ukphone: "'ɔːdiəns",
  },
  {
    name: 'meanwhile',
    trans: ['Meanwhile'],
    usphone: "'minwaɪl",
    ukphone: "'miːnwaɪl",
  },
]
