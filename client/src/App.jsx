import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectLayout from "./pages/ProjectLayout";
import ConversationsPage from "./pages/ConversationsPage";
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";
import ResearchPage from "./pages/ResearchPage";
import ReportsPage from "./pages/ReportsPage";
import ReportViewerPage from "./pages/ReportViewerPage";
import SettingsPage from "./pages/SettingsPage";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-ink/50">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />

      <Route
        path="/projects/:projectId"
        element={
          <RequireAuth>
            <ProjectLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="conversations" replace />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="conversations/:conversationId" element={<ChatPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="research" element={<ResearchPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:reportId" element={<ReportViewerPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
