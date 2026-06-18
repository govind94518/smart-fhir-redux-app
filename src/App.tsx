import { Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { LaunchPage } from "./pages/LaunchPage";

export function App() {
  return (
    <Routes>
      <Route path="/launch" element={<LaunchPage />} />
      <Route path="*" element={<DashboardPage />} />
    </Routes>
  );
}
