import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { SignInPage } from './pages/SignIn';
import { HomePage } from './pages/Home';
import { NewRoundPage } from './pages/NewRound';
import { RoundPage } from './pages/Round';
import { HistoryPage } from './pages/History';
import { ProfilePage } from './pages/Profile';
import { BottomNav } from './components/BottomNav';

export default function App() {
  return (
    <>
      <SignedOut>
        <Routes>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="*" element={<RedirectToSignIn />} />
        </Routes>
      </SignedOut>

      <SignedIn>
        <div className="flex flex-col min-h-screen bg-gray-950">
          <main className="flex-1 pb-20">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/rounds/new" element={<NewRoundPage />} />
              <Route path="/rounds/:id" element={<RoundPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </SignedIn>
    </>
  );
}
