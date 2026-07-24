import { useSelector } from "react-redux";
import MessageBubble from "./MessageBubble";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

const MessageList = () => {
  const { selecedConversation } = useSelector((state) => state.conversation);
  const { messages, isAiLoading, isMessagesLoading } = useSelector((state) => state.message);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isAiLoading])

  return (
    <div className="flex-1 overflow-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 scrollbar-none [&::-webkit-scrollbar]:hidden">
      {!selecedConversation ? (
        <div className="h-full flex flex-col items-center justify-center gap-5 text-center px-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/25 shadow-lg shadow-indigo-500/5">
            <Sparkles className="w-7 h-7 text-indigo-400" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-[22px] font-semibold text-slate-100 tracking-tight">
              CortexAI
            </h1>
            <p className="text-[14px] text-slate-400 font-medium">
              How can I help you today?
            </p>
            <p className="text-[12px] text-slate-600 max-w-72 leading-relaxed">
              Ask me anything — code, ideas, explanations, or just a quick question.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 mt-2">
            {[
              "Write a Netflix clone",
              "Explain Redis",
              "Build a dashboard",
            ].map((s, i) => (
              <button key={i} className="text-[12px] text-slate-400 bg-white/[0.04] border border-white/[0.07] px-3.5 py-2 rounded-lg hover:bg-white/[0.08] hover:text-slate-200 hover:border-white/[0.12] transition-all duration-150 cursor-pointer">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {isMessagesLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-[13px] text-slate-500">Loading messages...</span>
              </div>
            </div>
          ) : !messages?.length ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[15px] font-semibold text-slate-300">Type your message to get started</p>
                <p className="text-[12px] text-slate-600 max-w-64 leading-relaxed">
                  Ask me anything — code, ideas, explanations, or just a quick question.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {messages?.map((msg, i) => (
                <MessageBubble key={msg?._id || `msg-${i}`} role={msg?.role} content={msg?.content} pdfUrl={msg?.pdfUrl} pptUrl={msg?.pptUrl} imageUrl={msg?.imageUrl} agent={msg?.agent} />
              ))}
            </div>
          )}

          {isAiLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="max-w-[72%] px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] rounded-tl-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.06]">
                    <Loader2 size={13} className="text-slate-400 animate-spin" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};

export default MessageList;
