import { parseArtifact } from "./artifactParser"

function generateTitle(type, assistantContent, files) {
  const text = assistantContent || ""

  if (type === "code" && files?.length) {
    const names = files.map(f => f.name).filter(Boolean)
    const firstLine = files[0].code.split("\n")[0] || ""

    const htmlTitle = files.find(f =>
      f.language === "html" && /<title>(.*?)<\/title>/i.test(f.code)
    )
    if (htmlTitle) {
      const m = htmlTitle.code.match(/<title>(.*?)<\/title>/i)
      if (m) return m[1].trim().slice(0, 50)
    }

    const jsxName = files.find(f =>
      /jsx?$/.test(f.language) && /export\s+default\s+function\s+(\w+)/.test(f.code)
    )
    if (jsxName) {
      const m = jsxName.code.match(/export\s+default\s+function\s+(\w+)/)
      if (m) return m[1]
    }

    const pyDef = files.find(f =>
      f.language === "python" && /^class\s+(\w+)/m.test(f.code)
    )
    if (pyDef) {
      const m = pyDef.code.match(/^class\s+(\w+)/m)
      if (m) return m[1]
    }

    if (names.length === 1) {
      return names[0].replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")
    }
    if (names.length > 1) {
      const base = names[0].replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")
      return `${base} +${names.length - 1}`
    }
  }

  const sentences = text
    .replace(/```[\s\S]*?```/g, "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)

  for (const s of sentences) {
    const lowered = s.toLowerCase()

    if (type === "pdf") {
      const phrases = [
        /i['"]?ve (created|generated|made|built|prepared) (a|an|the|this) (pdf|document|report)/i,
        /here['"]?s (a|your|the) (pdf|document|report)/i,
        /(pdf|document|report) (has been|is) (created|generated|ready)/i,
      ]
      for (const p of phrases) {
        const m = s.match(p)
        if (m) return s.slice(m.index + m[0].length).replace(/^[:\s]+/, "").replace(/[.:!?].*$/, "").trim().slice(0, 50) || "Generated PDF"
      }

      const afterPrep = lowered.match(/^(?:i['"]?ve created |here['"]?s |the )?(?:pdf |document |report )(?:about |on |for |of |summarizing |covering |titled )["“]?(.+?)["”]?[.:!]?/i)
      if (afterPrep) return afterPrep[1].slice(0, 50)
    }

    if (type === "ppt") {
      const phrases = [
        /i['"]?ve (created|generated|made|built|prepared) (a|an|the|this) (presentation|slides|ppt|powerpoint)/i,
        /here['"]?s (a|your|the) (presentation|slides|ppt|powerpoint)/i,
        /(presentation|slides|ppt|powerpoint) (has been|is) (created|generated|ready)/i,
      ]
      for (const p of phrases) {
        const m = s.match(p)
        if (m) return s.slice(m.index + m[0].length).replace(/^[:\s]+/, "").replace(/[.:!?].*$/, "").trim().slice(0, 50) || "Generated Presentation"
      }

      const afterPrep = lowered.match(/^(?:i['"]?ve created |here['"]?s |the )?(?:presentation |slides |ppt )?(?:about |on |for |of |covering |titled )["“]?(.+?)["”]?[.:!]?/i)
      if (afterPrep) return afterPrep[1].slice(0, 50)
    }

    if (type === "code") {
      const phrases = [
        /i['"]?ve (created|generated|made|built|written|implemented) (a|an|the|this) (component|app|application|function|script|tool|project|page|widget)/i,
        /here['"]?s (a|your|the) (component|app|application|function|script|tool|project|page|widget)/i,
      ]
      for (const p of phrases) {
        const m = s.match(p)
        if (m) return s.slice(m.index + m[0].length).replace(/^[:\s]+/, "").replace(/[.:!?].*$/, "").trim().slice(0, 50) || "Generated Code"
      }
    }
  }

  if (type === "pdf") return "Generated PDF"
  if (type === "ppt") return "Generated Presentation"
  return "Generated Code"
}

export function getDocuments(messages) {
  if (!messages?.length) return []

  const docs = []
  const seen = new Set()

  for (let i = 0; i < messages.length; i++) {
    const next = messages[i + 1]
    if (!next || next.role !== "assistant") continue

    const hasPdf = next.pdfUrl && !seen.has(next.pdfUrl)
    const hasPpt = next.pptUrl && !seen.has(next.pptUrl)
    let codeArtifact = null

    if (next.agent === "coding") {
      codeArtifact = parseArtifact(next.content)
    }

    if (!hasPdf && !hasPpt && !codeArtifact) continue

    const assistantContent = next.content || ""

    if (hasPdf) {
      seen.add(next.pdfUrl)
      docs.push({
        type: "pdf",
        title: generateTitle("pdf", assistantContent),
        url: next.pdfUrl,
        messageId: next._id,
      })
    }
    if (hasPpt) {
      seen.add(next.pptUrl)
      docs.push({
        type: "ppt",
        title: generateTitle("ppt", assistantContent),
        url: next.pptUrl,
        messageId: next._id,
      })
    }
    if (codeArtifact) {
      docs.push({
        type: "code",
        title: generateTitle("code", assistantContent, codeArtifact.files),
        files: codeArtifact.files,
        messageId: next._id,
      })
    }
  }

  return docs
}
