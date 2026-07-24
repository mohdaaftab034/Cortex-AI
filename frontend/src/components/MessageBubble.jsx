import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism/index.js"
import { Check, Copy, FileCode, Eye, FileText, Monitor, ImageIcon } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { useDispatch } from "react-redux"
import { setArtifact, toggleArtifact } from "../redux/artifactSlice"
import { openPdf } from "../redux/pdfSlice"
import { openPpt } from "../redux/pptSlice"
import { openImage } from "../redux/imageSlice"
import { parseArtifact } from "../utils/artifactParser"

import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx.js"
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript.js"
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript.js"
import python from "react-syntax-highlighter/dist/esm/languages/prism/python.js"
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash.js"
import json from "react-syntax-highlighter/dist/esm/languages/prism/json.js"
import css from "react-syntax-highlighter/dist/esm/languages/prism/css.js"
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql.js"

SyntaxHighlighter.registerLanguage("jsx", jsx)
SyntaxHighlighter.registerLanguage("javascript", javascript)
SyntaxHighlighter.registerLanguage("js", javascript)
SyntaxHighlighter.registerLanguage("typescript", typescript)
SyntaxHighlighter.registerLanguage("ts", typescript)
SyntaxHighlighter.registerLanguage("python", python)
SyntaxHighlighter.registerLanguage("py", python)
SyntaxHighlighter.registerLanguage("bash", bash)
SyntaxHighlighter.registerLanguage("sh", bash)
SyntaxHighlighter.registerLanguage("shell", bash)
SyntaxHighlighter.registerLanguage("json", json)
SyntaxHighlighter.registerLanguage("css", css)
SyntaxHighlighter.registerLanguage("sql", sql)

const CodeBlock = ({ className, children }) => {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || "")
  const language = match ? match[1] : ""
  const code = String(children).replace(/\n$/, "")

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!language) {
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-indigo-300 text-[13px] font-mono">
        {children}
      </code>
    )
  }

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-white/[0.07]">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.07]">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors duration-150 cursor-pointer bg-transparent border-none"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "13px",
          lineHeight: 1.6,
        }}
        showLineNumbers={code.split("\n").length > 3}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

const MessageBubble = ({ role, content, agent, pdfUrl, pptUrl, imageUrl }) => {
  const dispatch = useDispatch()
  const isUser = role == "user"

  const artifact = useMemo(() => {
    if (!isUser && content) {
      return parseArtifact(content)
    }
    return null
  }, [content, isUser])

  const hasArtifact = !isUser && artifact && agent === "coding"

  useEffect(() => {
    if (hasArtifact) {
      dispatch(setArtifact(artifact.files))
    }
  }, [hasArtifact])

  return (
    <div className={`flex mb-5 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] sm:max-w-[80%] lg:max-w-[72%] px-3 sm:px-4 py-2.5 rounded-2xl text-[13.5px] sm:text-[14px] leading-relaxed ${
          isUser
            ? "bg-linear-to-br from-indigo-500 to-violet-700 text-white rounded-tr-sm"
            : "bg-white/[0.04] border border-white/[0.07] text-slate-200 rounded-tl-sm"
        }`}
      >
        {hasArtifact ? (
          <div>
            {artifact.explanation && (
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a({ href, children }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                        {children}
                      </a>
                    )
                  },
                  p({ children }) {
                    return <p className="my-2 text-slate-300 last:mb-0">{children}</p>
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
                  },
                  li({ children }) {
                    return <li className="text-slate-300">{children}</li>
                  },
                  strong({ children }) {
                    return <strong className="font-semibold text-slate-100">{children}</strong>
                  },
                }}
              >
                {artifact.explanation}
              </Markdown>
            )}

            <button
              onClick={() => dispatch(setArtifact(artifact.files))}
              className="flex items-center gap-2 w-full mt-3 px-4 py-2.5 rounded-xl border border-white/[0.1] bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/20 transition-colors duration-150 cursor-pointer text-left group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 shrink-0 group-hover:bg-indigo-500/30 transition-colors duration-150">
                <Eye size={16} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-indigo-300">
                  View {artifact.files.length} file{artifact.files.length > 1 ? "s" : ""}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {artifact.files.map((f) => f.name).join(", ")}
                </p>
              </div>
            </button>
          </div>
        ) : (
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                return <CodeBlock className={className}>{children}</CodeBlock>
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                  >
                    {children}
                  </a>
                )
              },
              table({ children }) {
                return (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full text-left text-[13px] border-collapse">
                      {children}
                    </table>
                  </div>
                )
              },
              th({ children }) {
                return (
                  <th className="border border-white/[0.1] bg-white/[0.04] px-3 py-2 font-semibold text-slate-200">
                    {children}
                  </th>
                )
              },
              td({ children }) {
                return (
                  <td className="border border-white/[0.1] px-3 py-2 text-slate-300">
                    {children}
                  </td>
                )
              },
              ul({ children }) {
                return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
              },
              ol({ children }) {
                return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
              },
              li({ children }) {
                return <li className="text-slate-300">{children}</li>
              },
              h1({ children }) {
                return <h1 className="text-lg font-bold text-slate-100 mt-4 mb-2">{children}</h1>
              },
              h2({ children }) {
                return <h2 className="text-base font-bold text-slate-100 mt-4 mb-2">{children}</h2>
              },
              h3({ children }) {
                return <h3 className="text-[15px] font-semibold text-slate-100 mt-3 mb-1.5">{children}</h3>
              },
              p({ children }) {
                return <p className="my-2 text-slate-300 last:mb-0">{children}</p>
              },
              blockquote({ children }) {
                return (
                  <blockquote className="border-l-2 border-indigo-500/50 pl-4 my-3 text-slate-400 italic">
                    {children}
                  </blockquote>
                )
              },
              hr() {
                return <hr className="my-4 border-white/[0.07]" />
              },
              img({ src, alt }) {
                return (
                  <img
                    src={src}
                    alt={alt || ""}
                    className="max-w-full rounded-lg my-3"
                    loading="lazy"
                  />
                )
              },
            }}
          >
            {content}
          </Markdown>
        )}

        {!isUser && pdfUrl && (
          <button
            onClick={() => dispatch(openPdf(pdfUrl))}
            className="flex items-center gap-2 w-full mt-3 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors duration-150 cursor-pointer text-left group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 shrink-0 group-hover:bg-emerald-500/30 transition-colors duration-150">
              <FileText size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-emerald-300">
                Review PDF
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                View generated document in the PDF reader
              </p>
            </div>
          </button>
        )}

        {!isUser && pptUrl && (
          <button
            onClick={() => dispatch(openPpt(pptUrl))}
            className="flex items-center gap-2 w-full mt-3 px-4 py-2.5 rounded-xl border border-violet-500/20 bg-violet-500/10 hover:bg-violet-500/15 transition-colors duration-150 cursor-pointer text-left group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 shrink-0 group-hover:bg-violet-500/30 transition-colors duration-150">
              <Monitor size={16} className="text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-violet-300">
                Review PPT
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                View generated presentation in the PPT viewer
              </p>
            </div>
          </button>
        )}

        {!isUser && imageUrl && (
          <button
            onClick={() => dispatch(openImage(imageUrl))}
            className="flex items-center gap-2 w-full mt-3 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors duration-150 cursor-pointer text-left group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 shrink-0 group-hover:bg-emerald-500/30 transition-colors duration-150">
              <ImageIcon size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-emerald-300">
                View Image
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                View generated image
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

export default MessageBubble