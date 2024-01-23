import { autoSaveConfigAtom } from '@/store'
import { db } from '@/utils/db'
import { backupData, getBackupData, isLogin } from '@/utils/db/firebase'
import { useAtom } from 'jotai'
import React, { useEffect } from 'react'

function useAutoSave() {
  const [{ active }] = useAtom(autoSaveConfigAtom)
  useEffect(() => {
    let timer: number
    let prevData = ''
    let isDestroy = false
    const run = () =>
      (timer = setTimeout(async () => {
        if (!active) return
        await import('dexie-export-import')
        const data = await db.export()
        const text = await data.text()
        if (prevData === text) return
        if (isDestroy) return
        prevData = text
        await backupData({ data: text })
        run()
      }, 1000) as unknown as number)

    run()
    return () => {
      isDestroy = true
      clearTimeout(timer)
    }
  }, [active])
}
const AutoSave = () => {
  useAutoSave()

  useEffect(() => {
    const run = async () => {
      const data = await getBackupData()
      if (!data) return
      const blob = new Blob([data.data])

      await db.import(blob, {
        acceptVersionDiff: true,
        acceptMissingTables: true,
        acceptNameDiff: false,
        acceptChangedPrimaryKey: false,
        overwriteValues: true,
        clearTablesBeforeImport: true,
      })
    }

    run()
  }, [])
  return null
}

export default AutoSave
