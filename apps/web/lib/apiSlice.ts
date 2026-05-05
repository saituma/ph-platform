export * from "./core";

// Import domain endpoint files (triggers injectEndpoints)
// Re-export all hooks so existing imports from "@/lib/apiSlice" keep working
export * from "./api/admin";
export * from "./api/users";
export * from "./api/bookings";
export * from "./api/messaging";
export * from "./api/content";
export * from "./api/programs";
export * from "./api/nutrition";
export * from "./api/tracking";
export * from "./api/enquiries";
export * from "./api/physio";
export * from "./api/media";
