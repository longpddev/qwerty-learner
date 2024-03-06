import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MarkdownComponent = ({ children }: { children: string }) => {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
}

export default MarkdownComponent
