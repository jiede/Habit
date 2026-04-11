import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
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
  return (
    <>
      <NavBar />
      <main style={{ padding: "1rem", maxWidth: 720, margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/week" element={<CurrentWeekRedirect />} />
          <Route path="/week/:weekKey" element={<WeekPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/habits" element={<HabitsPage />} />
        </Routes>
      </main>
    </>
  );
}
