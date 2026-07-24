import { useState, useCallback, useRef, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { useDispatch, useSelector } from "react-redux"
import { closePdf } from "../redux/pdfSlice"
import {
  X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Download, FileText, Maximize2, Minimize2,
} from "lucide-react"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const PdfPanel = () => {
  const dispatch = useDispatch()
  const { pdfUrl, isOpen } = useSelector((state) => state.pdf)
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [fullWidth, setFullWidth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    setPageNumber(1)
    setNumPages(null)
    setScale(1.0)
    setLoading(true)
    setLoadError(null)
  }, [pdfUrl])

  const onDocumentLoadSuccess = useCallback(({ numPages: pages }) => {
    setNumPages(pages)
    setLoading(false)
    setLoadError(null)
  }, [])

  const onDocumentLoadError = useCallback((error) => {
    console.error("PDF load error:", error?.message || error)
    setLoading(false)
    setLoadError(error?.message || "Failed to load PDF")
  }, [])

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0))
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.4))
  const goToPrevPage = () => setPageNumber((p) => Math.max(p - 1, 1))
  const goToNextPage = () => setPageNumber((p) => Math.min(p + 1, numPages))

  const handleDownload = async () => {
    if (!pdfUrl) return
    try {
      const response = await fetch(pdfUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "document.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const hasContent = isOpen && !!pdfUrl

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
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 shrink-0">
            <FileText size={14} className="text-emerald-400" />
          </div>
          <span className="text-[14px] font-semibold text-slate-100">PDF Viewer</span>
          {numPages ? (
            <span className="text-[11px] font-medium text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full shrink-0">
              {pageNumber} / {numPages}
            </span>
          ) : loading ? (
            <span className="text-[11px] font-medium text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full shrink-0">
              loading...
            </span>
          ) : null}
        </div>
        <button
          onClick={() => dispatch(closePdf())}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
          title="Close panel"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.4}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] disabled:opacity-30 transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[12px] font-medium text-slate-400 w-12 text-center tabular-nums shrink-0">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] disabled:opacity-30 transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
          >
            <ZoomIn size={14} />
          </button>
          <div className="w-px h-5 bg-white/[0.06] mx-1.5 shrink-0" />
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || !numPages}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] disabled:opacity-30 transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[12px] font-medium text-slate-400 w-16 text-center tabular-nums shrink-0">
            {pageNumber} / {numPages || "-"}
          </span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || !numPages}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] disabled:opacity-30 transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setFullWidth((v) => !v)}
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0 ${
              fullWidth
                ? "text-emerald-400 hover:text-emerald-300"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"
            }`}
            title={fullWidth ? "Fit height" : "Fit width"}
          >
            {fullWidth ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer bg-transparent border-none shrink-0"
            title="Download PDF"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-[#0a0c10]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-[12px] text-slate-500">Loading PDF...</span>
            </div>
          </div>
        )}

        {loadError && (
          <div className="flex items-center justify-center h-full px-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <X size={20} className="text-red-400" />
              </div>
              <p className="text-[13px] text-slate-400">Failed to load PDF</p>
              <p className="text-[11px] text-slate-600 max-w-xs">{loadError}</p>
            </div>
          </div>
        )}

        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            className="flex flex-col items-center py-4 gap-3"
          >
            <Page
              pageNumber={pageNumber}
              scale={fullWidth && containerRef.current ? (containerRef.current.clientWidth - 48) / 595 : scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-xl shadow-black/40 rounded-sm overflow-hidden"
              canvasBackground="white"
            />
          </Document>
        )}
      </div>
    </>}
    </div>
  )
}

export default PdfPanel