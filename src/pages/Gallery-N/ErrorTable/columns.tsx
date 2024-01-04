import type { TErrorWordData } from '../hooks/useErrorWords'
import { Button } from '@/components/ui/button'
import type { ColumnDef } from '@tanstack/react-table'
import PhArrowsDownUpFill from '~icons/ph/arrows-down-up-fill'

export type ErrorColumn = {
  word: string
  trans: string
  errorCount: number
  errorChar: string[]
}

export const errorColumns: ColumnDef<ErrorColumn>[] = [
  {
    accessorKey: 'word',
    size: 100,
    header: ({ column }) => {
      return (
        <Button variant="ghost" className="p-0" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          word
          <PhArrowsDownUpFill className="ml-1.5 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'trans',
    size: 500,
    header: 'Definition',
  },
  {
    accessorKey: 'errorCount',
    size: 40,
    header: ({ column }) => {
      return (
        <Button variant="ghost" className="p-0" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          number of errors
          <PhArrowsDownUpFill className="ml-1.5 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'errorChar',
    header: 'error-prone letters',
    size: 80,
    cell: ({ row }) => {
      return (
        <p>
          {(row.getValue('errorChar') as string[]).map((char, index) => (
            <kbd key={`${char}-${index}`}>{char + ' '}</kbd>
          ))}
        </p>
      )
    },
  },
]

export function getRowsFromErrorWordData(data: TErrorWordData[]): ErrorColumn[] {
  return data.map((item) => {
    return {
      word: item.word,
      trans: item.originData.trans.join('，') ?? '',
      errorCount: item.errorCount,
      errorChar: item.errorChar,
    }
  })
}
