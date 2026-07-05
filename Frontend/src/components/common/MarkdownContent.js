import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const markdownComponents = {
  h1: ({ children, ...props }) => (
    <h3 className="mt-6 text-xl font-bold text-stone-900 first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h2: ({ children, ...props }) => (
    <h4 className="mt-5 text-lg font-semibold text-stone-900 first:mt-0" {...props}>
      {children}
    </h4>
  ),
  h3: ({ children, ...props }) => (
    <h5 className="mt-4 text-base font-semibold text-stone-900 first:mt-0" {...props}>
      {children}
    </h5>
  ),
  p: ({ children, ...props }) => (
    <p className="mt-3 text-base leading-relaxed text-stone-600 first:mt-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mt-3 list-disc space-y-1 pl-5 text-stone-600 first:mt-0" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mt-3 list-decimal space-y-1 pl-5 text-stone-600 first:mt-0" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="font-medium text-indigo-600 underline hover:text-indigo-500"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-stone-800" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-stone-700" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="mt-3 border-l-4 border-stone-200 pl-4 italic text-stone-500 first:mt-0"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: (props) => <hr className="my-5 border-stone-200" {...props} />,
  code: ({ inline, children, ...props }) =>
    inline ? (
      <code
        className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm text-stone-800"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code
        className="block overflow-x-auto rounded-lg bg-stone-100 p-3 font-mono text-sm text-stone-800"
        {...props}
      >
        {children}
      </code>
    ),
  pre: ({ children, ...props }) => (
    <pre className="mt-3 overflow-x-auto first:mt-0" {...props}>
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="mt-3 overflow-x-auto first:mt-0">
      <table className="min-w-full border-collapse text-sm text-stone-600" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-stone-200 bg-stone-50 px-3 py-2 text-left font-semibold text-stone-800"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-stone-200 px-3 py-2" {...props}>
      {children}
    </td>
  ),
}

export default function MarkdownContent({ children, className = '' }) {
  const source = typeof children === 'string' ? children : ''
  if (!source.trim()) return null

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {source}
      </ReactMarkdown>
    </div>
  )
}
