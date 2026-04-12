import React from "react";

import AdminHome from "./screens/Home";
import AdminVideos from "./screens/Videos";
import AdminUsers from "./screens/Users";
import AdminMessages from "./screens/Messages";
import AdminContent from "./screens/Content";
import AdminOps from "./screens/Ops";
import AdminProfile from "./screens/Profile";

export const ADMIN_TAB_COMPONENTS: Record<string, React.ComponentType<any>> = {
  "admin-home": React.memo(AdminHome),
  "admin-videos": React.memo(AdminVideos),
  "admin-users": React.memo(AdminUsers),
  "admin-messages": React.memo(AdminMessages),
  "admin-content": React.memo(AdminContent),
  "admin-ops": React.memo(AdminOps),
  "admin-profile": React.memo(AdminProfile),
};

