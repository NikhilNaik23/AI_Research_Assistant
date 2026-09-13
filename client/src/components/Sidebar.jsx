import React from "react";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "conversations", label: "Conversations" },
  { to: "documents", label: "Documents" },
  { to: "research", label: "Research" },
  { to: "reports", label: "Reports" },
  { to: "settings", label: "Settings" },
];

export default function Sidebar({ project }) {
  const { projectId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-pine-dark text-white/90">
      <div className="border-b border-white/10 px-5 py-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="font-serif text-lg tracking-tight text-white hover:text-gold"
        >
          Fieldnotes
        </button>
        {project && (
          <div className="mt-4 border-l-2 border-gold pl-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Current project</p>
            <p className="mt-1 truncate text-sm text-white/75">{project.title}</p>
          </div>
        )}
      </div>

      {project && (
        <nav className="flex-1 px-3 py-6">
          <p className="px-3 pb-2 text-[10px] uppercase tracking-[0.18em] text-white/35">Workspace</p>
          <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={`/projects/${projectId}/${item.to}`}
              className={({ isActive }) =>
                  `block border-l-2 px-3 py-2 text-sm transition-colors ${
                    isActive ? "border-gold bg-white/10 text-white" : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          </div>
        </nav>
      )}

      {!project && <div className="flex-1" />}

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-xs text-white/50">{user?.email}</p>
        <button onClick={logout} className="mt-1 text-xs text-white/60 hover:text-gold">
          Sign out
        </button>
      </div>
    </aside>
  );
}
