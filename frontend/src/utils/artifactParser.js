export function parseArtifact(content) {
  const files = []
  const blockRegex = /```(\w+)(?::(\S+))?\n([\s\S]*?)```/g
  let match

  while ((match = blockRegex.exec(content)) !== null) {
    const language = match[1]
    const filename = match[2] || guessFilename(language, files.length)
    const code = match[3].replace(/\n$/, "")

    if (language && code.trim()) {
      files.push({ name: filename, language, code })
    }
  }

  if (files.length < 1) return null

  const explanation = content
    .replace(/```[\s\S]*?```/g, "")
    .trim()

  return { files, explanation }
}

function guessFilename(language, index) {
  const map = {
    html: "index.html",
    css: "style.css",
    javascript: "script.js",
    js: "script.js",
    jsx: "App.jsx",
    tsx: "App.tsx",
    typescript: "index.ts",
    ts: "index.ts",
    python: "main.py",
    py: "main.py",
    json: "data.json",
    bash: "run.sh",
    sh: "run.sh",
    sql: "query.sql",
    xml: "data.xml",
    svg: "image.svg",
  }
  return map[language] || `file-${index + 1}.${language || "txt"}`
}
