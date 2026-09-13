import React, { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";

export default function ProjectLayout() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);

  useEffect(() => {
    api.get(`/projects/${projectId}`).then(setProject).catch(() => setProject(null));
  }, [projectId]);

  return (
    <div className="flex">
      <Sidebar project={project} />
      <div className="min-h-screen flex-1 bg-paper">
        <Outlet context={{ project }} />
      </div>
    </div>
  );
}
