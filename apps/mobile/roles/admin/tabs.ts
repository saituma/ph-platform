import { TabConfig } from "@/components/navigation";

export const ADMIN_TAB_ROUTES: TabConfig[] = [
  {
    key: "admin-home",
    label: "Dashboard",
    icon: "home",
    iconOutline: "home-outline",
  },
  {
    key: "admin-videos",
    label: "Videos",
    icon: "film",
    iconOutline: "film-outline",
  },
  {
    key: "admin-users",
    label: "Users",
    icon: "people-circle",
    iconOutline: "people-circle-outline",
  },
  {
    key: "admin-messages",
    label: "Inbox",
    icon: "mail",
    iconOutline: "mail-outline",
  },
  {
    key: "admin-content",
    label: "Content",
    icon: "library",
    iconOutline: "library-outline",
  },
  {
    key: "admin-ops",
    label: "Ops",
    icon: "cog",
    iconOutline: "cog-outline",
  },
  {
    key: "admin-profile",
    label: "Profile",
    icon: "person-circle",
    iconOutline: "person-circle-outline",
  },
];

