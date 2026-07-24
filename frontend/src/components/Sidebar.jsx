import {
  Coins,
  LogOut,
  MessageSquare,
  PanelRight,
  PenSquare,
  Plus,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { getConversation } from "../features/getConversations.js";
import { useDispatch, useSelector } from "react-redux";
import {
  addConversation,
  setConversations,
  setSelectConversation,
  setConversationsLoading,
} from "../redux/conversationSlice.js";
import { useEffect } from "react";
import { createConversation } from "../features/createConversation.js";
import logout from "../features/logout.js";
import { setUserData } from "../redux/userSlice.js";
import PlansModal from "./PlansModal";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
  const [showPlans, setShowPlans] = useState(false);
  const dispatch = useDispatch();
  const { conversations, selecedConversation, isConversationsLoading } = useSelector(
    (state) => state.conversation,
  );
  const { userData } = useSelector((state) => state.user);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const getConv = async () => {
      dispatch(setConversationsLoading(true))
      const data = await getConversation();
      dispatch(setConversations(data));
      dispatch(setConversationsLoading(false))
    };
    getConv();
  }, [userData?._id]);

  const handleCreateConversation = async () => {
    const data = await createConversation();
    if (!data?._id) return;
    dispatch(addConversation(data));
    dispatch(setSelectConversation(data));
  };

  return (
    <>
      {/* Mobile backdrop */}
      {!collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Mobile toggle button */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed top-3 left-3 z-40 flex lg:hidden items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 transition-all duration-150 border-none cursor-pointer"
        >
          <PanelRight size={16} />
        </button>
      )}

      <div
        className={`h-screen bg-[#0d0f14] border-r border-white/[0.06] shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
          collapsed
            ? "w-0 lg:w-[56px]"
            : "w-[270px] fixed inset-y-0 left-0 z-50 lg:static lg:z-auto"
        }`}
      >
        <div className="flex flex-col h-full w-[270px]">
          <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06] min-h-[57px] shrink-0">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer shrink-0"
            >
              {collapsed ? <PanelRight size={18} /> : <X size={18} />}
            </button>

          <div
            className={`flex items-center gap-2.5 overflow-hidden transition-all duration-200 ${
              collapsed
                ? "opacity-0 invisible w-0"
                : "opacity-100 visible"
            }`}
          >
            <span className="text-[16px] font-semibold text-slate-100 tracking-tight whitespace-nowrap">
              CortexAI
            </span>
            <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap">
              {(userData?.credits?.plan || "free").charAt(0).toUpperCase() + (userData?.credits?.plan || "free").slice(1)}
            </span>

            <button
              onClick={handleCreateConversation}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer shrink-0"
            >
              <PenSquare size={16} />
            </button>
          </div>
        </div>

        {/* New Chat */}
        <div className="px-4 pt-4 pb-1 shrink-0">
          <button
            onClick={handleCreateConversation}
            className={`flex items-center justify-center text-sm font-medium text-white bg-linear-to-br from-indigo-500 to-violet-700 rounded-xl border-none cursor-pointer hover:opacity-90 transition-all duration-150 ${
              collapsed ? "w-9 h-9" : "w-full gap-2 py-[10px]"
            }`}
          >
            <Plus size={15} className="shrink-0" />
            <span
              className={`overflow-hidden transition-all duration-200 whitespace-nowrap ${
                collapsed
                  ? "opacity-0 invisible w-0"
                  : "opacity-100 visible"
              }`}
            >
              New Chat
            </span>
          </button>
        </div>

        {isConversationsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-[12px] text-slate-500">Loading conversations...</span>
            </div>
          </div>
        ) : (
          <>
        {conversations.length === 0 ? (
          <div className="px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600">
            No Recent Conversations
          </div>
        ) : (
          <div
            className={`px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600 overflow-hidden transition-all duration-200 ${
              collapsed
                ? "opacity-0 invisible h-0 pt-0 pb-0"
                : "opacity-100 visible"
            }`}
          >
            Recent Conversations
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {conversations.map((conv, i) => {
            const isActive = selecedConversation?._id == conv?._id;
            return (
              <div
                key={conv?._id || i}
                onClick={() => dispatch(setSelectConversation(conv))}
                className={`flex items-center cursor-pointer mb-0.5 rounded-[10px] border transition-all duration-150 ${
                  collapsed ? "justify-center px-0 py-2.5 w-9 mx-auto" : "gap-2.5 px-3 py-2.5"
                } ${isActive ? "bg-indigo-500/10 border-indigo-500/[0.18]" : "bg-transparent border-transparent"} `}
              >
                <div
                  className={`flex items-center justify-center shrink-0 rounded-lg transition-colors duration-150 ${
                    collapsed ? "w-[20px] h-[20px]" : "w-[28px] h-[28px]"
                  } ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-white/[0.05] text-slate-500"} `}
                >
                  <MessageSquare size={13} />
                </div>
                <span
                  className={`overflow-hidden transition-all duration-200 whitespace-nowrap text-[13px] font-medium ${
                    collapsed
                      ? "opacity-0 invisible w-0"
                      : "opacity-100 visible"
                  } ${isActive ? "text-slate-100" : "text-slate-300"} `}
                >
                  {conv?.title}
                </span>
              </div>
            );
          })}
        </div>
        </>)}
        <div className="mx-2.5 h-px bg-white/[0.06] shrink-0"></div>

        <div className="px-3.5 py-3.5 shrink-0">
          {userData ? (
            <div className={`flex items-center cursor-pointer rounded-xl transition-colors duration-150 hover:bg-white/[0.05] ${
              collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-3 py-2.5"
            }`}>
              <div className="relative shrink-0">
                {userData?.avatar && !imageError ? (
                  <img
                    className="w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25"
                    src={userData?.avatar}
                    alt={"image"}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25 flex items-center justify-center">
                    <User size={15} className="text-slate-50" />
                  </div>
                )}
              </div>

              <div
                className={`flex-1 min-w-0 overflow-hidden transition-all duration-200 ${
                  collapsed
                    ? "opacity-0 invisible w-0"
                    : "opacity-100 visible"
                }`}
              >
                <p className="text-[13.5px] font-semibold text-slate-100 truncate">
                  {userData?.name || "user"}
                </p>
                <p className="text-[11px] text-slate-600 mt-px">
                  {userData?.credits?.credits ?? 0} credits
                </p>
              </div>

              <div
                className={`flex gap-1 overflow-hidden transition-all duration-200 ${
                  collapsed
                    ? "opacity-0 invisible w-0"
                    : "opacity-100 visible"
                }`}
              >
                <button
                  onClick={() => setShowPlans(true)}
                  className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-yellow-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
                >
                  <Coins size={16} />
                </button>
                <button
                  onClick={() => {
                    logout();
                    dispatch(setUserData(null));
                  }}
                  className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-200 bg-white/[0.05] border border-white/[0.08] rounded-xl py-[11px] cursor-pointer hover:bg-white/[0.08] transition-colors duration-150">
              Login
            </button>
          )}
        </div>
      </div>
    </div>

      <PlansModal open={showPlans} onClose={() => setShowPlans(false)} />
    </>
  );
};

export default Sidebar;
