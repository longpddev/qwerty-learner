import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MarkdownComponent = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown className={'markdown'} remarkPlugins={[remarkGfm]}>
      {children}
    </ReactMarkdown>
  )
}

export default MarkdownComponent
