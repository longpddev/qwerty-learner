import InfoPanel from '@/components/InfoPanel'
import { useCallback, useState } from 'react'
import IconBook2 from '~icons/tabler/book-2'

export default function DictRequest() {
  const [showPanel, setShowPanel] = useState(false)

  const onOpenPanel = useCallback(() => {
    setShowPanel(true)
  }, [])

  const onClosePanel = useCallback(() => {
    setShowPanel(false)
  }, [])

  return (
    <>
      {showPanel && (
        <InfoPanel
          openState={showPanel}
          title="Apply for a dictionary"
          icon={IconBook2}
          buttonClassName="bg-indigo-500 hover:bg-indigo-400"
          iconClassName="text-indigo-500 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-500"
          onClose={onClosePanel}
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            If you have relevant programming foundation, you can refer to
            <a
              href="https://github.com/Kaiyiwing/qwerty-learner/blob/master/docs/toBuildDict.md"
              className="px-2 text-blue-500"
              target="_blank"
              rel="noreferrer"
            >
              Import dictionary
            </a>
            , contribute new dictionaries to the project.
            <br />
            <br />
            If you have no relevant programming background, you can send your dictionary requirements to{' '}
            <a href="mailto:me@kaiyi.cool" className="px-2 text-blue-500" aria-label="Send email to me@kaiyi.cool">
              me@kaiyi.cool
            </a>
            , or add our user community at the bottom of the page for feedback.
          </p>
          <br />
        </InfoPanel>
      )}
      <button className="cursor-pointer pr-6 text-sm text-indigo-500" onClick={onOpenPanel}>
        Didn't find the dictionary you were looking for?
      </button>
    </>
  )
}
