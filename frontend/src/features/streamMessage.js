const streamMessage = async (payload, { onToken, onComplete, onError }) => {
  try {
    const baseURL = import.meta.env.VITE_SERVER_URL || "http://localhost:8000"
    const response = await fetch(`${baseURL}/api/agent/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6))
            if (data.token) onToken(data.token)
            if (data.done) onComplete(data)
          } catch (e) {
            console.error("SSE parse error:", e)
          }
        }
      }
    }
  } catch (error) {
    onError?.(error)
  }
}

export default streamMessage
