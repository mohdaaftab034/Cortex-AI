import { signInWithPopup } from "@firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { api } from "../../utils/axios";
import { auth, googleProvider } from "../../utils/firebase";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../redux/userSlice";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import Artifact from "../components/Artifact";

const Home = () => {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch()
  console.log(userData);

  const handleLogin = async (token) => {
    try {
      const { data } = await api.post("/api/auth/login", { token });
      dispatch(setUserData(data))
      console.log(data);
    } catch (error) {
      console.log(error);
    }
  };

  const googleLogin = async () => {
    const data = await signInWithPopup(auth, googleProvider);
    console.log(data);
    const token = await data.user.getIdToken();
    console.log(token);
    await handleLogin(token);
  };

  return (
    <div className="h-screen flex bg-[#0d0f14] text-white overflow-hidden ">

      <Sidebar />
      <ChatArea />
      <Artifact />



      {!userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text[17px] font-semibold text-slate-100 tracking-tight">
                Welcome to CortexAI
              </h2>
              <p className="text-[13px] text-slate-500">
                Please login to continue using he app.
              </p>
            </div>

            <button
              onClick={googleLogin}
              className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-black bg-white hover:bg-gray-200   shadow-lg transition-all duration-150 cursor-pointer"
              onClick={googleLogin}
            >
              <FcGoogle className="text-white" /> Continue with Google
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
