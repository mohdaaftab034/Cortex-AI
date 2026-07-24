import { MessageSquare, Code2, Search, FileText, Monitor, Image, Sparkles, Send, Loader2, Check, ChevronUp } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import sendMessage from "../features/sendMessage"
import { useDispatch, useSelector } from "react-redux"
import { appendMessage, updateLastAssistantContent, setAiLoading } from "../redux/messageSlice"
import { addConversation, setSelectConversation, updateConversationTitle } from "../redux/conversationSlice"
import { openPdf } from "../redux/pdfSlice"
import { openPpt } from "../redux/pptSlice"
import { openImage } from "../redux/imageSlice"
import { createConversation } from "../features/createConversation"

const AGENTS = [
  { id: "auto", label: "Auto", icon: Sparkles },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "coding", label: "Coding", icon: Code2 },
  { id: "search", label: "Search", icon: Search },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "ppt", label: "PPT", icon: Monitor },
  { id: "vision", label: "Vision", icon: Image },
]

const ChatInput = () => {
  const [value, setValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState("auto")
  const [isSheetOpen, setSheetOpen] = useState(false)
  const cancelRef = useRef(false)
  const { selecedConversation } = useSelector(state => state.conversation)
  const dispatch = useDispatch()

  useEffect(() => {
    if (isSheetOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isSheetOpen])

  const handleSendMessage = async () => {
    const prompt = value.trim()
    if (!prompt || isLoading) return

    cancelRef.current = true
    await new Promise(r => setTimeout(r, 0))
    cancelRef.current = false
    setIsLoading(true)
    let conversation = selecedConversation

    if (!conversation?._id) {
      conversation = await createConversation()
      if (!conversation?._id) {
        setIsLoading(false)
        return
      }
      dispatch(addConversation(conversation))
      dispatch(setSelectConversation(conversation))
    }

    dispatch(appendMessage({ role: "user", content: `[${selectedAgent.toUpperCase()}] ${prompt}`, agent: selectedAgent }))
    dispatch(setAiLoading(true))
    setValue("")

    try {
      const data = await sendMessage({ prompt, conversationId: conversation._id, agent: selectedAgent })
      if (!data) {
        dispatch(appendMessage({ role: "assistant", content: "Sorry, I encountered an error. Please try again.", agent: selectedAgent }))
        return
      }

      const fullContent = typeof data === "string" ? data : data?.aiResponse || ""
      const pdfUrl = data?.pdfUrl || null
      const pptUrl = data?.pptUrl || null
      const imageUrl = data?.imageUrl || null
      const resolvedAgent = data?.agent || selectedAgent

      dispatch(appendMessage({ role: "assistant", content: "", agent: resolvedAgent, pdfUrl, pptUrl, imageUrl }))

      const segments = fullContent.match(/\S+\s*/g) || [fullContent]
      let idx = 0

      const revealNext = () => {
        if (cancelRef.current) return

        if (idx >= segments.length) {
          if (pdfUrl) dispatch(openPdf(pdfUrl))
          if (pptUrl) dispatch(openPpt(pptUrl))
          if (imageUrl) dispatch(openImage(imageUrl))
          if (data?.title) {
            dispatch(updateConversationTitle({ id: conversation._id, title: data.title }))
          }
          return
        }

        const remaining = segments.length - idx
        const batchSize = remaining > 150 ? 2 : 1
        const batch = segments.slice(idx, idx + batchSize).join("")
        idx += batchSize
        dispatch(updateLastAssistantContent(batch))

        let delay = 35
        if (batch.includes("\n")) {
          delay = 160
        } else if (/[.!?:;]/.test(batch)) {
          delay = 80
        }
        setTimeout(revealNext, delay)
      }

      revealNext()
    } catch {
      dispatch(appendMessage({ role: "assistant", content: "Sorry, something went wrong. Please try again." }))
    } finally {
      dispatch(setAiLoading(false))
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const ActiveIcon = AGENTS.find(a => a.id === selectedAgent)?.icon || Sparkles

  return (
    <div className="w-full px-4 md:px-6 py-4 border-t border-white/[0.06] bg-gradient-to-t from-[#0d0f14] via-[#0d0f14] to-transparent">
      <div className="max-w-3xl mx-auto flex flex-col gap-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 pt-3 pb-3 shadow-lg shadow-black/20 focus-within:border-white/[0.14] focus-within:bg-white/[0.04] transition-all duration-200">

        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
          {AGENTS.map((agent) => {
            const Icon = agent.icon
            const isActive = selectedAgent === agent.id
            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                disabled={isLoading}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300 shadow-sm"
                    : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                } disabled:opacity-50`}
              >
                <Icon size={13} />
                {agent.label}
              </button>
            )
          })}
        </div>

        <div className="flex lg:hidden items-center gap-1.5">
          <button
            onClick={() => setSheetOpen(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border bg-indigo-500/15 border-indigo-500/30 text-indigo-300 shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            <ActiveIcon size={13} />
            {AGENTS.find(a => a.id === selectedAgent)?.label || "Auto"}
            <ChevronUp size={12} className="opacity-60" />
          </button>
        </div>

        <div className="flex items-end gap-3">
          <textarea
            onChange={(e) => setValue(e.target.value)}
            value={value}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-[14px] text-slate-200 placeholder:text-slate-600 leading-relaxed scrollbar-none [&::-webkit-scrollbar]:hidden disabled:opacity-50 py-1.5 max-h-40"
            onInput={(e) => {
              e.target.style.height = "auto"
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!value.trim() || isLoading}
            className={`flex items-center justify-center w-9 h-9 rounded-xl border-none cursor-pointer transition-all duration-150 shrink-0 ${
              value.trim() && !isLoading
                ? "bg-linear-to-br from-indigo-500 to-violet-700 hover:opacity-90 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
            }`}
          >
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>

      <div
        onClick={() => setSheetOpen(false)}
        className={`fixed inset-0 z-50 flex flex-col justify-end transition-all duration-300 ease-out ${
          isSheetOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isSheetOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full h-[75vh] bg-[#0d0f14] border-t border-white/[0.06] rounded-t-2xl shadow-2xl shadow-black/50 flex flex-col transition-transform duration-300 ease-out ${
            isSheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/[0.12]" />
          </div>

          <div className="flex items-center justify-between px-5 pb-3 shrink-0">
            <span className="text-sm font-semibold text-slate-200">Select Agent</span>
            <button
              onClick={() => setSheetOpen(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronUp size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
            {AGENTS.map((agent) => {
              const Icon = agent.icon
              const isActive = selectedAgent === agent.id
              return (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgent(agent.id)
                    setSheetOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-indigo-500/15 text-indigo-300"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-left">{agent.label}</span>
                  {isActive && <Check size={16} className="text-indigo-400" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
