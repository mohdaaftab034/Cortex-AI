import { useEffect } from "react"
import { useSelector } from "react-redux"

const usePageTitle = () => {
  const { selecedConversation } = useSelector(state => state.conversation)

  useEffect(() => {
    if (selecedConversation?.title) {
      document.title = `${selecedConversation.title} — CortexAI`
    } else {
      document.title = "CortexAI"
    }
  }, [selecedConversation?.title])
}

export default usePageTitle
