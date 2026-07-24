import { useState, useCallback, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { closeImage } from "../redux/imageSlice"
import { X, Download, ImageIcon } from "lucide-react"

const ImagePanel = () => {
  const dispatch = useDispatch()
  const { imageUrl, isOpen } = useSelector((state) => state.image)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
  }, [imageUrl])

  const handleLoad = useCallback(() => {
    setLoading(false)
  }, [])

  const handleError = useCallback(() => {
    setLoading(false)
    setLoadError("Failed to load image")
  }, [])

  const handleDownload = async () => {
    if (!imageUrl) return
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "generated-image.png"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const hasContent = isOpen && !!imageUrl

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
            <ImageIcon size={14} className="text-emerald-400" />
          </div>
          <span className="text-[14px] font-semibold text-slate-100">Generated Image</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer bg-transparent border-none"
            title="Download image"
          >
            <Download size={15} />
          </button>
          <button
            onClick={() => dispatch(closeImage())}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer bg-transparent border-none"
            title="Close panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-[#0a0c10] flex items-center justify-center p-4">
        {loading && (
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-[12px] text-slate-500">Loading image...</span>
            </div>
          </div>
        )}

        {loadError && (
          <div className="flex items-center justify-center h-full px-6">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <X size={20} className="text-red-400" />
              </div>
              <p className="text-[13px] text-slate-400">Failed to load image</p>
              <p className="text-[11px] text-slate-600">{loadError}</p>
            </div>
          </div>
        )}

        {imageUrl && (
          <img
            src={imageUrl}
            alt="Generated"
            className={`max-w-full max-h-full object-contain rounded-lg ${loading ? "hidden" : ""}`}
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </div>
    </>}
    </div>
  )
}

export default ImagePanel
