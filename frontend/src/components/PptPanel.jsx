import { useState, useCallback, useRef, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { closePpt } from "../redux/pptSlice"
import {
  X, Download, Monitor, ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react"

const PptPanel = () => {
  const dispatch = useDispatch()
  const { pptUrl, isOpen } = useSelector((state) => state.ppt)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [slideCount, setSlideCount] = useState(null)
  const [currentSlide, setCurrentSlide] = useState(1)
  const [urlChecked, setUrlChecked] = useState(false)
  const iframeRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    setSlideCount(null)
    setCurrentSlide(1)
    setUrlChecked(false)
  }, [pptUrl])

  useEffect(() => {
    if (!pptUrl || urlChecked) return
    const checkUrl = async () => {
      try {
        const resp = await fetch(pptUrl, { method: "HEAD" })
        if (!resp.ok) {
          setLoadError("Presentation file is not accessible. The URL may be invalid or the file is private.")
          setLoading(false)
        }
      } catch {
        setLoadError("Cannot verify presentation file accessibility. Try downloading instead.")
        setLoading(false)
      } finally {
        setUrlChecked(true)
      }
    }
    checkUrl()
  }, [pptUrl, urlChecked])

  const handleIframeLoad = useCallback(() => {
    setLoading(false)
  }, [])

  const handleIframeError = useCallback(() => {
    setLoading(false)
    if (!loadError) {
      setLoadError("Failed to load presentation in viewer")
    }
  }, [loadError])

  const handleDownload = async () => {
    if (!pptUrl) return
    try {
      const response = await fetch(pptUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "presentation.pptx"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const officeViewerUrl = pptUrl
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(pptUrl)}`
    : null

  const hasContent = isOpen && !!pptUrl

  return (
    <div
      className={`h-full border-l border-white/[0.06] bg-[#0d0f14] flex flex-col overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${
        hasContent
          ? "w-full lg:w-[520px] lg:xl:w-[600px] fixed inset-0 z-50 lg:static lg:z-auto"
          : "w-0"
      }`}
    >
      {hasContent && <><div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/25 shrink-0">
            <Monitor size={14} className="text-violet-400" />
          </div>
          <span className="text-[14px] font-semibold text-slate-100">PPT Viewer</span>
          {slideCount ? (
            <span className="text-[11px] font-medium text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full shrink-0">
              {currentSlide} / {slideCount}
            </span>
          ) : loading ? (
            <span className="text-[11px] font-medium text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full shrink-0">
              loading...
            </span>
          ) : null}
        </div>
        <button
          onClick={() => dispatch(closePpt())}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
          title="Close panel"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentSlide((p) => Math.max(p - 1, 1))}
            disabled={currentSlide <= 1 || !slideCount}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] disabled:opacity-30 transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[12px] font-medium text-slate-400 w-16 text-center tabular-nums shrink-0">
            {currentSlide} / {slideCount || "-"}
          </span>
          <button
            onClick={() => setCurrentSlide((p) => Math.min(p + 1, slideCount || 1))}
            disabled={currentSlide >= (slideCount || 1) || !slideCount}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] disabled:opacity-30 transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
            title="Download PPT"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-[#0a0c10]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <span className="text-[12px] text-slate-500">Loading presentation...</span>
            </div>
          </div>
        )}

        {loadError && (
          <div className="flex items-center justify-center h-full px-6">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-400" />
              </div>
              <p className="text-[13px] text-slate-400">Presentation unavailable in viewer</p>
              <p className="text-[11px] text-slate-600">{loadError}</p>
              <button
                onClick={handleDownload}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-400 text-[13px] font-medium hover:bg-violet-500/25 transition-colors duration-150 cursor-pointer"
              >
                <Download size={14} />
                Download PPT
              </button>
            </div>
          </div>
        )}

        {officeViewerUrl && (
          <iframe
            ref={iframeRef}
            src={officeViewerUrl}
            className="w-full h-full border-none"
            title="PowerPoint Presentation"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            allowFullScreen
          />
        )}
      </div>
    </>}
    </div>
  )
}

export default PptPanel
