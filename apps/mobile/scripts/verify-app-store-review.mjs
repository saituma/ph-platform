#!/usr/bin/env node

const DEFAULT_API_BASE_URL = "https://ph-performance-2cae29f7922d.herokuapp.com/api";

const apiBaseUrl = (process.env.PH_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
const email = process.env.PH_REVIEW_EMAIL;
const password = process.env.PH_REVIEW_PASSWORD;

function apiUrl(path) {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

async function check(name, run) {
  process.stdout.write(`- ${name}... `);
  try {
    const result = await run();
    console.log("ok");
    return result;
  } catch (error) {
    console.log("failed");
    throw error;
  }
}

async function fetchJson(path, init = {}) {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} returned ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function getProfileUser(profile) {
  return profile?.user && typeof profile.user === "object" ? profile.user : profile;
}

function getAccountType(profile) {
  const user = getProfileUser(profile);
  const role = String(user?.role ?? "").toLowerCase();
  const appRole = String(user?.appRole ?? "").toLowerCase();
  const athleteType = String(user?.athleteType ?? user?.athlete?.athleteType ?? "").toLowerCase();

  if (
    athleteType === "youth" ||
    role === "guardian" ||
    role === "youth_athlete" ||
    appRole.startsWith("youth_")
  ) {
    return "youth";
  }

  if (athleteType === "adult" || role === "adult_athlete" || appRole.startsWith("adult_")) {
    return "adult";
  }

  if (
    role === "coach" ||
    role === "team_coach" ||
    role === "team_manager" ||
    appRole === "team_manager"
  ) {
    return "manager";
  }

  return "unknown";
}

function countYouthWorkspaceContent(workspace) {
  const modules = Array.isArray(workspace?.modules) ? workspace.modules : [];
  const sessions = modules.flatMap((module) => (Array.isArray(module?.sessions) ? module.sessions : []));
  const unlockedSessions = sessions.filter((session) => !session?.locked);
  const itemCount = unlockedSessions.reduce((total, session) => {
    const items = Array.isArray(session?.items) ? session.items : [];
    return total + items.length;
  }, 0);
  const others = Array.isArray(workspace?.others) ? workspace.others : [];
  const otherItemCount = others.reduce((total, group) => {
    const items = Array.isArray(group?.items) ? group.items : [];
    return total + items.length;
  }, 0);

  return {
    moduleCount: modules.length,
    sessionCount: sessions.length,
    unlockedSessionCount: unlockedSessions.length,
    itemCount,
    otherItemCount,
  };
}

async function verifyYouthContent(token) {
  const workspace = await fetchJson("/training-content-v2/mobile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const counts = countYouthWorkspaceContent(workspace);
  const hasReviewableContent =
    counts.moduleCount > 0 &&
    counts.sessionCount > 0 &&
    counts.unlockedSessionCount > 0 &&
    counts.itemCount + counts.otherItemCount > 0;

  if (!hasReviewableContent) {
    throw new Error(
      "Youth reviewer account has no age-based modules/content. " +
        `Counts: modules=${counts.moduleCount}, sessions=${counts.sessionCount}, ` +
        `unlockedSessions=${counts.unlockedSessionCount}, items=${counts.itemCount + counts.otherItemCount}.`,
    );
  }

  return counts;
}

async function verifyAdultAssignedPrograms(token) {
  const content = await fetchJson("/programs/my-assigned", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const programs = Array.isArray(content?.programs)
    ? content.programs
    : Array.isArray(content?.items)
      ? content.items
      : [];
  if (programs.length === 0) {
    throw new Error("Adult reviewer account has no assigned programs.");
  }

  const programSummary = programs.find((program) => Number(program?.id) > 0);
  if (!programSummary) {
    throw new Error("Adult reviewer account has assigned entries, but no assigned program detail endpoint to review.");
  }

  const detail = await fetchJson(`/programs/my-assigned/${programSummary.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const modules = Array.isArray(detail?.program?.modules) ? detail.program.modules : [];
  const sessions = modules.flatMap((module) => (Array.isArray(module?.sessions) ? module.sessions : []));
  const exerciseCount = sessions.reduce((total, session) => {
    const count = Number(session?.exerciseCount ?? 0);
    return total + (Number.isFinite(count) ? count : 0);
  }, 0);

  if (modules.length === 0 || sessions.length === 0 || exerciseCount === 0) {
    throw new Error("Adult reviewer assigned program has no visible modules, sessions, or exercises.");
  }

  return {
    programCount: programs.length,
    moduleCount: modules.length,
    sessionCount: sessions.length,
    exerciseCount,
  };
}

async function verifyManagerContent(token) {
  const roster = await fetchJson("/team/roster", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const members = Array.isArray(roster?.members) ? roster.members : [];
  const hasTeam = Boolean(roster?.team);

  if (!hasTeam && members.length === 0) {
    throw new Error("Manager reviewer account has no team dashboard or roster content.");
  }

  return {
    memberCount: members.length,
    hasTeam,
  };
}

async function main() {
  if (!email || !password) {
    throw new Error("Set PH_REVIEW_EMAIL and PH_REVIEW_PASSWORD before running this check.");
  }

  console.log(`App Store review QA against ${apiBaseUrl}`);

  await check("API health", () => fetchJson("/health"));

  const login = await check("reviewer login", () =>
    fetchJson("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  );

  const token = login?.idToken || login?.accessToken;
  if (!token) {
    throw new Error("Login succeeded but no access token was returned.");
  }

  const profile = await check("authenticated profile", () =>
    fetchJson("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );

  const accountType = getAccountType(profile);
  if (accountType === "youth") {
    const counts = await check("youth age-based training content", () => verifyYouthContent(token));
    console.log(
      `Review backend QA passed. Account type: youth. ` +
        `Age-based modules: ${counts.moduleCount}, sessions: ${counts.sessionCount}, ` +
        `reviewable items: ${counts.itemCount + counts.otherItemCount}.`,
    );
    return;
  }

  if (accountType === "adult") {
    const counts = await check("adult assigned programs content", () => verifyAdultAssignedPrograms(token));
    console.log(
      `Review backend QA passed. Account type: adult. ` +
        `Assigned programs: ${counts.programCount}, exercises: ${counts.exerciseCount}.`,
    );
    return;
  }

  if (accountType === "manager") {
    const counts = await check("manager team roster content", () => verifyManagerContent(token));
    console.log(
      `Review backend QA passed. Account type: manager. Team available: ${counts.hasTeam ? "yes" : "no"}, ` +
        `roster members: ${counts.memberCount}.`,
    );
    return;
  }

  throw new Error("Could not determine reviewer account type from authenticated profile.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
