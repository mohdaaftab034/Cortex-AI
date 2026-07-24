import { useState, useMemo } from "react"
import { FileText, Monitor, FileCode, ChevronDown, MessageSquare } from "lucide-react"
import { useSelector, useDispatch } from "react-redux"
import { setArtifact } from "../redux/artifactSlice"
import { openPdf } from "../redux/pdfSlice"
import { openPpt } from "../redux/pptSlice"
import { getDocuments } from "../utils/getDocuments"

const typeConfig = {
  pdf: { icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  ppt: { icon: Monitor, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  code: { icon: FileCode, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
}

const Logo = () => (
  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm shadow-indigo-500/20">
    <span className="text-white font-bold text-[15px] leading-none">C</span>
  </div>
)

const Nav = () => {
  const dispatch = useDispatch()
  const { selecedConversation } = useSelector(state => state.conversation)
  const { messages } = useSelector(state => state.message)
  const [showDocs, setShowDocs] = useState(false)

  const documents = useMemo(() => getDocuments(messages), [messages])

  const handleOpen = (doc) => {
    setShowDocs(false)
    if (doc.type === "pdf") dispatch(openPdf(doc.url))
    else if (doc.type === "ppt") dispatch(openPpt(doc.url))
    else if (doc.type === "code") dispatch(setArtifact(doc.files))
  }

  return (
    <div className="h-14 flex items-center gap-3 px-3 sm:px-4 md:px-6 border-b border-white/[0.06] bg-[#0d0f14]/80 backdrop-blur-sm">
      {selecedConversation ? (
        <>
          <Logo />
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h1 className="text-[14px] font-semibold text-slate-100 tracking-tight truncate">
              {selecedConversation.title || "New Chat"}
            </h1>
            <span className="text-[10px] font-medium text-slate-500 bg-white/[0.04] border border-white/[0.06] py-0.5 px-2.5 rounded-full shrink-0 hidden sm:inline">
              {messages?.length || 0} msg{messages?.length !== 1 ? "s" : ""}
            </span>
          </div>

          {documents.length > 0 && (
            <div className="relative z-[100]">
              <button
                onClick={() => setShowDocs(!showDocs)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-150 cursor-pointer whitespace-nowrap"
              >
                <FileText size={13} />
                <span className="hidden sm:inline">Documents</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${showDocs ? "rotate-180" : ""}`} />
              </button>

              {showDocs && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setShowDocs(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 bg-[#13151c] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                    <div className="px-3.5 py-2.5 border-b border-white/[0.06]">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        Documents ({documents.length})
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {documents.map((doc, i) => {
                        const cfg = typeConfig[doc.type]
                        const Icon = cfg.icon
                        return (
                          <button
                            key={i}
                            onClick={() => handleOpen(doc)}
                            className="w-full flex items-center gap-3 px-3.5 py-3 text-left border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer"
                          >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${cfg.bg} border ${cfg.border} shrink-0`}>
                              <Icon size={14} className={cfg.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-slate-200 truncate">{doc.title}</p>
                              <p className="text-[10px] text-slate-500 mt-px uppercase tracking-wider">{doc.type}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-[14px] font-semibold text-slate-100 tracking-tight">CortexAI</h1>
        </div>
      )}
    </div>
  )
}

export default Nav
