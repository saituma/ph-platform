/**
 * Centralized query key factory for TanStack Query.
 *
 * All useQuery / useMutation / invalidateQueries calls import from here.
 * Rename a key in one place; TypeScript catches every caller.
 */
export const queryKeys = {
  home: {
    all: () => ["home"] as const,
    content: () => ["home", "content"] as const,
    weeklyStats: (userId: number | string) =>
      ["home", "weeklyStats", userId] as const,
  },

  bookings: {
    all: (profileId: number) => ["bookings", profileId] as const,
    services: (profileId: number) => ["bookings", profileId, "services"] as const,
    generatedAvailability: (profileId: number, from: string, to: string) =>
      ["bookings", profileId, "generated-availability", from, to] as const,
  },

  messages: {
    all: () => ["messages"] as const,
    threads: (profileId: number) => ["messages", "threads", profileId] as const,
    thread: (profileId: number, threadId: string) =>
      ["messages", "thread", profileId, threadId] as const,
    groups: (profileId: number) => ["messages", "groups", profileId] as const,
    group: (groupId: number) => ["messages", "group", groupId] as const,
    mutes: () => ["messages", "mutes"] as const,
    muteStatus: (threadId: string) => ["messages", "mutes", threadId] as const,
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
    audienceWorkspace: () => ["admin", "audienceWorkspace"] as const,
    availability: () => ["admin", "availability"] as const,
    bookings: () => ["admin", "bookings"] as const,
    dms: () => ["admin", "dms"] as const,
    groups: () => ["admin", "groups"] as const,
    services: () => ["admin", "services"] as const,
    programs: () => ["admin", "programs"] as const,
    program: (id: number) => ["admin", "program", id] as const,
    adultAthletes: () => ["admin", "adultAthletes"] as const,
    exercises: () => ["admin", "exercises"] as const,
    teams: () => ["admin", "teams"] as const,
    users: () => ["admin", "users"] as const,
    physioReferrals: () => ["admin", "physioReferrals"] as const,
    announcements: () => ["admin", "announcements"] as const,
    stories: () => ["admin", "stories"] as const,
    content: () => ["admin", "content"] as const,
    teamDetail: (name: string) => ["admin", "teamDetail", name] as const,
    referralGroups: () => ["admin", "referralGroups"] as const,
  },

  nutrition: {
    all: () => ["nutrition"] as const,
    log: (dateKey: string, userId: string) => ["nutrition", "log", dateKey, userId] as const,
  },

  programs: {
    all: () => ["programs"] as const,
    myAssigned: () => ["programs", "myAssigned"] as const,
    detail: (id: number) => ["programs", "detail", id] as const,
    sessionExercises: (sessionId: number) =>
      ["programs", "sessionExercises", sessionId] as const,
    contentDetail: (contentId: string) =>
      ["programs", "contentDetail", contentId] as const,
    stats: () => ["programs", "stats"] as const,
    sessionData: (age: number | null) =>
      ["programs", "sessionData", age] as const,
    uploads: (sectionContentId: number) =>
      ["programs", "uploads", sectionContentId] as const,
    videos: (sectionContentId: number | null) =>
      ["programs", "videos", sectionContentId] as const,
    coachResponses: () => ["programs", "coachResponses"] as const,
    videoHistory: () => ["programs", "videoHistory"] as const,
  },

  goals: {
    all: () => ["goals"] as const,
    myGoals: () => ["goals", "myGoals"] as const,
    detail: (id: number) => ["goals", "detail", id] as const,
  },

  announcements: {
    all: () => ["announcements"] as const,
    list: (userId?: number | null) =>
      userId != null
        ? (["announcements", "list", userId] as const)
        : (["announcements", "list"] as const),
  },

  legal: {
    all: () => ["legal"] as const,
    privacy: (authed: boolean) => ["legal", "privacy", authed] as const,
    terms: (authed: boolean) => ["legal", "terms", authed] as const,
  },

  progress: {
    all: () => ["progress"] as const,
    entries: () => ["progress", "entries"] as const,
  },

  wellbeing: {
    all: () => ["wellbeing"] as const,
    logs: (userId?: number | null) =>
      userId != null
        ? (["wellbeing", "logs", userId] as const)
        : (["wellbeing", "logs"] as const),
  },

  stories: {
    all: () => ["stories"] as const,
  },

  schedule: {
    all: () => ["schedule"] as const,
    events: (from: string, to: string) => ["schedule", "events", from, to] as const,
  },

  preseason: {
    all: () => ["preseason"] as const,
    programme: () => ["preseason", "programme"] as const,
    weekTypes: (weekId: number) => ["preseason", "weekTypes", weekId] as const,
    sessions: (weekId: number) => ["preseason", "sessions", weekId] as const,
    session: (daySessionId: number) => ["preseason", "session", daySessionId] as const,
  },

  notifications: {
    all: (token: string | null) => ["notifications", token] as const,
    infinite: (token: string | null) => ["notifications", "infinite", token] as const,
  },

  profile: {
    all: () => ["profile"] as const,
    managedAthletes: () => ["profile", "managedAthletes"] as const,
  },
} as const;
