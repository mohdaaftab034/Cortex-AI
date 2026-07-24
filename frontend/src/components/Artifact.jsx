import { useState, useMemo, useEffect } from "react"
import { Check, Copy, FileCode, X, Eye, Code2 } from "lucide-react"
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism/index.js"
import { useDispatch, useSelector } from "react-redux"
import { closeArtifactPanel } from "../redux/artifactSlice"

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
SyntaxHighlighter.registerLanguage("html", jsx)
SyntaxHighlighter.registerLanguage("xml", jsx)
SyntaxHighlighter.registerLanguage("svg", jsx)

const languageMap = {
  html: "html", css: "css", javascript: "js", js: "js",
  jsx: "jsx", typescript: "ts", ts: "ts",
  python: "py", py: "py", bash: "sh", sh: "sh",
  shell: "sh", json: "json", sql: "sql", xml: "xml",
  svg: "xml",
}

const languageColors = {
  js: "text-yellow-400", jsx: "text-cyan-400", ts: "text-blue-400",
  html: "text-orange-400", css: "text-pink-400", py: "text-green-400",
  sh: "text-slate-400", json: "text-amber-400", sql: "text-purple-400",
  xml: "text-indigo-400", svg: "text-rose-400",
}

const previewableLangs = new Set(["html", "css", "js", "javascript", "jsx", "svg"])

const CopyButton = ({ code, label }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-white/[0.08] bg-white/[0.06] hover:bg-white/[0.1] text-slate-400 hover:text-slate-200 transition-all duration-150 cursor-pointer"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      {copied ? "Copied!" : label}
    </button>
  )
}

function buildPreviewHtml(files) {
  const htmlParts = []
  const cssParts = []
  const jsParts = []

  for (const f of files) {
    const lang = languageMap[f.language] || f.language
    if (lang === "html") htmlParts.push(f.code)
    else if (lang === "css") cssParts.push(f.code)
    else if (lang === "js" || lang === "jsx") jsParts.push(f.code)
  }

  const bodyContent = htmlParts.join("\n")
  const styleContent = cssParts.join("\n")
  const scriptContent = jsParts.join("\n")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${styleContent ? `<style>${styleContent}</style>` : ""}
</head>
<body>
  ${bodyContent}
  ${scriptContent ? `<script>${scriptContent}<\/script>` : ""}
</body>
</html>`
}

const ArtifactPanel = () => {
  const dispatch = useDispatch()
  const { files, isOpen } = useSelector((state) => state.artifact)
  const [activeIndex, setActiveIndex] = useState(0)
  const [viewMode, setViewMode] = useState("source")

  useEffect(() => {
    setViewMode("source")
  }, [files])

  const canPreview = files && files.some((f) => previewableLangs.has(f.language))
  const previewHtml = useMemo(() => canPreview ? buildPreviewHtml(files) : "", [files, canPreview])

  const hasContent = isOpen && files?.length > 0
  const activeFile = hasContent ? (files[activeIndex] || files[0]) : null
  const allCode = hasContent ? files.map((f) => `// ${f.name}\n${f.code}`).join("\n\n") : ""

  return (
    <div className={`h-full border-l border-white/[0.06] bg-[#0d0f14] flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
      hasContent
        ? "w-full lg:w-[500px] lg:xl:w-[580px] fixed inset-0 z-50 lg:static lg:z-auto"
        : "w-0"
    }`}>
      {hasContent && <><div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 shrink-0">
            <FileCode size={14} className="text-indigo-400" />
          </div>
          <span className="text-[14px] font-semibold text-slate-100">Code</span>
          <span className="text-[11px] font-medium text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full shrink-0">
            {files.length} file{files.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {canPreview && (
            <button
              onClick={() => setViewMode(viewMode === "source" ? "preview" : "source")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border cursor-pointer transition-all duration-150 ${
                viewMode === "preview"
                  ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                  : "border-white/[0.08] bg-white/[0.06] hover:bg-white/[0.1] text-slate-400 hover:text-slate-200"
              }`}
              title={viewMode === "preview" ? "Show source code" : "Show live preview"}
            >
              {viewMode === "preview" ? <Code2 size={13} /> : <Eye size={13} />}
              {viewMode === "preview" ? "Source" : "Preview"}
            </button>
          )}
          <button
            onClick={() => dispatch(closeArtifactPanel())}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-[#0a0c10] border-b border-white/[0.06] overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden shrink-0">
        <div className="flex">
          {files.map((file, i) => {
            const langColor = languageColors[languageMap[file.language]] || "text-slate-400"
            return (
              <button
                key={file.name}
                onClick={() => { setActiveIndex(i); setViewMode("source") }}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium border-r border-white/[0.06] transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  i === activeIndex
                    ? "bg-white/[0.07] text-slate-100 shadow-[inset_0_-2px_0_0_#6366f1]"
                    : "bg-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                }`}
              >
                <FileCode size={13} className={i === activeIndex ? langColor : "text-slate-600"} />
                {file.name}
              </button>
            )
          })}
        </div>
        {files.length > 1 && viewMode === "source" && (
          <div className="pr-2 shrink-0">
            <CopyButton code={allCode} label="Copy All" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {viewMode === "preview" ? (
          <iframe
            title="preview"
            srcDoc={previewHtml}
            className="w-full h-full bg-white"
            sandbox="allow-scripts"
          />
        ) : (
          <>
            <div className="absolute top-3 right-3 z-10">
              <CopyButton code={activeFile.code} label="Copy" />
            </div>
            <div className="h-full overflow-auto">
              <SyntaxHighlighter
                style={oneDark}
                language={languageMap[activeFile.language] || activeFile.language}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  fontSize: "13px",
                  lineHeight: 1.7,
                  minHeight: "100%",
                  paddingTop: "16px",
                  paddingBottom: "24px",
                }}
                showLineNumbers={activeFile.code.split("\n").length > 1}
              >
                {activeFile.code}
              </SyntaxHighlighter>
            </div>
          </>
        )}
      </div>
    </>}
    </div>
  )
}

export default ArtifactPanel
