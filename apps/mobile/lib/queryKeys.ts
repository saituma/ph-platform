/**
 * Centralized query key factory for TanStack Query.
 *
 * All useQuery / useMutation / invalidateQueries calls import from here.
 * Rename a key in one place; TypeScript catches every caller.
 */
export const queryKeys = {
  home: {
    all: () => ["home"] as const,
    weeklyStats: (userId: number | string) =>
      ["home", "weeklyStats", userId] as const,
  },

  bookings: {
    all: () => ["bookings"] as const,
    services: () => ["booking-services"] as const,
    generatedAvailability: (from: string, to: string) =>
      ["generated-availability", from, to] as const,
  },

  messages: {
    all: () => ["messages"] as const,
    threads: (profileId: number) => ["messages", "threads", profileId] as const,
    thread: (profileId: number, threadId: string) =>
      ["messages", "thread", profileId, threadId] as const,
    groups: (profileId: number) => ["messages", "groups", profileId] as const,
    group: (groupId: number) => ["messages", "group", groupId] as const,
  },

  training: {
    all: () => ["training"] as const,
    module: (id: number) => ["training", "module", id] as const,
    session: (id: number) => ["training", "session", id] as const,
    locks: () => ["training", "locks"] as const,
    audiences: () => ["training", "audiences"] as const,
  },

  admin: {
    all: () => ["admin"] as const,
    audiences: () => ["admin", "audiences"] as const,
    availability: () => ["admin", "availability"] as const,
    bookings: () => ["admin", "bookings"] as const,
    services: () => ["admin", "services"] as const,
    programs: () => ["admin", "programs"] as const,
    program: (id: number) => ["admin", "program", id] as const,
    teams: () => ["admin", "teams"] as const,
    users: () => ["admin", "users"] as const,
    physioReferrals: () => ["admin", "physioReferrals"] as const,
    announcements: () => ["admin", "announcements"] as const,
  },

  schedule: {
    all: () => ["schedule"] as const,
    events: (from: string, to: string) => ["schedule", "events", from, to] as const,
  },
} as const;
