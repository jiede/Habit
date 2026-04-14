import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import type { SessionUser } from "./lib/session";
import { getMe } from "./lib/session";
import LoginPage from "./pages/LoginPage";
import TodayPage from "./pages/TodayPage";
import WeekPage from "./pages/WeekPage";
import StatsPage from "./pages/StatsPage";
import HabitsPage from "./pages/HabitsPage";
import { weekKeyISO } from "./lib/dates";

function CurrentWeekRedirect() {
  const key = weekKeyISO(new Date());
  return <Navigate to={`/week/${key}`} replace />;
}

export default function App() {
  const [me, setMe] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const user = await getMe();
        setMe(user);
      } catch {
        setMe(null);
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  if (checkingSession) {
    return (
      <main style={{ padding: "1rem", maxWidth: 720, margin: "0 auto" }}>
        <p>加载中…</p>
      </main>
    );
  }

  return (
    <>
      {me ? <NavBar onLogout={() => setMe(null)} /> : null}
      <Routes>
        <Route
          path="/login"
          element={me ? <Navigate to="/" replace /> : <LoginPage onAuthenticated={setMe} />}
        />
        <Route
          path="*"
          element={
            me ? (
              <main style={{ padding: "1rem", maxWidth: 720, margin: "0 auto" }}>
                <Routes>
                  <Route path="/" element={<TodayPage />} />
                  <Route path="/week" element={<CurrentWeekRedirect />} />
                  <Route path="/week/:weekKey" element={<WeekPage />} />
                  <Route path="/stats" element={<StatsPage />} />
                  <Route path="/habits" element={<HabitsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </>
  );
}
