import { useEffect } from 'react';
import AppRouter from './routes/AppRouter.jsx';
import { useSchoolStore } from './store/schoolStore.js';
import { useAuthContext } from './contexts/AuthContext.jsx';

export default function App() {
  const { user, profile } = useAuthContext();
  const { setActiveSchool } = useSchoolStore();

  useEffect(() => {
    if (profile?.school_id) {
      setActiveSchool(profile.school_id);
    }
  }, [profile, setActiveSchool]);

  return <AppRouter />;
}
