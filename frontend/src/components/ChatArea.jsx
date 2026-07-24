import { useEffect } from "react";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";
import Nav from "./Nav";
import ArtifactPanel from "./Artifact";
import PdfPanel from "./PdfPanel";
import PptPanel from "./PptPanel";
import ImagePanel from "./ImagePanel";
import { useDispatch, useSelector } from "react-redux";
import getMessages from "../features/getMessages";
import { setMessages, setMessagesLoading } from "../redux/messageSlice";
import { clearArtifact } from "../redux/artifactSlice";

const ChatArea = () => {
  const { selecedConversation } = useSelector(state => state.conversation);

  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(clearArtifact())
    dispatch(setMessages([]))
    let cancelled = false;

    const getMsg = async () => {
      if (selecedConversation?._id) {
        dispatch(setMessagesLoading(true))
        const data = await getMessages(selecedConversation._id);
        if (!cancelled) {
          dispatch(setMessages(data || []))
          dispatch(setMessagesLoading(false))
        }
      }
    };

    getMsg()

    return () => { cancelled = true; };
  }, [selecedConversation]);

  return (
    <div className="flex-1 min-w-0">
      <div className="flex h-full">
        <div className="flex-1 flex flex-col min-w-0">
          <Nav />
          <MessageList />
          <ChatInput />
        </div>
        <ArtifactPanel />
        <PdfPanel />
        <PptPanel />
        <ImagePanel />
      </div>
    </div>
  );
};

export default ChatArea;
