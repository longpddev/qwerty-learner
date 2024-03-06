import { lazy, Suspense } from 'react'

const MarkdownLazy = lazy(() => import('./MarkdownComponent'))
const Markdown = ({ children }: { children: string }) => {
  return (
    <Suspense fallback={null}>
      <MarkdownLazy>{children}</MarkdownLazy>
    </Suspense>
  )
}

export default Markdown
