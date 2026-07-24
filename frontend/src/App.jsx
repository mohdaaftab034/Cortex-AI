import Home from './pages/Home'
import { useEffect } from 'react'
import getCurrentUser from './features/getCurrentUser'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'
import usePageTitle from './hooks/usePageTitle'

const App = () => {
  usePageTitle()

  const dispatch = useDispatch()

  useEffect(() => {
    const getUser = async () => {
      const data = await getCurrentUser();
      dispatch(setUserData(data))
    }

    getUser();
  }, []);

  return (
    <>
      <Home />
    </>
  )
}

export default App