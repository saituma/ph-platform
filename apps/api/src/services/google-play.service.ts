import { google } from "googleapis";
import { env } from "../config/env";

const PACKAGE_NAME = "com.phperformance.uk";

/**
 * Adds an individual email address to `ph-tester@googlegroups.com` using the
 * Cloud Identity Groups API.
 *
 * ── One-time setup ──────────────────────────────────────────────────────────
 * 1. Go to groups.google.com → ph-tester → Members → Add members
 *    Add your GOOGLE_SERVICE_ACCOUNT_EMAIL with "Manager" role.
 *
 * 2. In Google Cloud Console (console.cloud.google.com):
 *    APIs & Services → Enable "Cloud Identity API"
 *
 * 3. Add to API .env:
 *    GOOGLE_PLAY_TESTERS_GROUP=ph-tester@googlegroups.com
 * ────────────────────────────────────────────────────────────────────────────
 *
 * No Google Workspace or domain-wide delegation needed.
 */
export async function addTesterToGoogleGroup(testerEmail: string): Promise<void> {
  const groupEmail = env.googlePlayTestersGroup;
  if (!groupEmail) throw new Error("GOOGLE_PLAY_TESTERS_GROUP not configured");

  const saEmail = env.googleServiceAccountEmail;
  const saKey = env.googleServiceAccountPrivateKey;
  if (!saEmail || !saKey) throw new Error("Google service account credentials not configured");

  const auth = new google.auth.JWT({
    email: saEmail,
    key: saKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/cloud-identity.groups"],
  });

  const ci = google.cloudidentity({ version: "v1", auth });

  // Resolve group resource name from email
  const lookupRes = await ci.groups.lookup({
    "groupKey.id": groupEmail,
    "groupKey.namespace": "identitysources/",
  });

  // groupKey.namespace is not needed for Google Groups — retry without it
  let groupName = lookupRes.data.name;
  if (!groupName) {
    const retry = await ci.groups.lookup({ "groupKey.id": groupEmail });
    groupName = retry.data.name;
  }

  if (!groupName) throw new Error(`Could not resolve group resource name for ${groupEmail}`);

  // Check if already a member
  try {
    const existing = await ci.groups.memberships.lookup({
      parent: groupName,
      "memberKey.id": testerEmail,
    });
    if (existing.data.name) return;
  } catch {
    // Not a member yet — proceed
  }

  await ci.groups.memberships.create({
    parent: groupName,
    requestBody: {
      preferredMemberKey: { id: testerEmail },
      roles: [{ name: "MEMBER" }],
    },
  });
}

/**
 * One-time: adds the Google Group to the alpha (closed testing) track.
 * The group is already configured in Play Console so this is a no-op in production.
 */
export async function addGoogleGroupToClosedTrack(groupEmail: string): Promise<void> {
  const auth = new google.auth.JWT({
    email: env.googleServiceAccountEmail,
    key: env.googleServiceAccountPrivateKey?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  const publisher = google.androidpublisher({ version: "v3", auth });
  const { data: edit } = await publisher.edits.insert({ packageName: PACKAGE_NAME });
  const editId = edit.id!;

  try {
    const { data: current } = await publisher.edits.testers.get({
      packageName: PACKAGE_NAME,
      editId,
      track: "alpha",
    });

    const groups: string[] = current.googleGroups ?? [];
    if (!groups.includes(groupEmail)) {
      await publisher.edits.testers.update({
        packageName: PACKAGE_NAME,
        editId,
        track: "alpha",
        requestBody: { googleGroups: [...groups, groupEmail] },
      });
    }

    await publisher.edits.commit({ packageName: PACKAGE_NAME, editId });
  } catch (err) {
    await publisher.edits.delete({ packageName: PACKAGE_NAME, editId }).catch(() => {});
    throw err;
  }
}
