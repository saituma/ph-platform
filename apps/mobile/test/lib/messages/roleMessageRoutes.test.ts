import { getMessagesRolePrefix, messagesThreadHref } from "@/lib/messages/roleMessageRoutes";

describe("getMessagesRolePrefix", () => {
  it("returns admin for admin roles", () => {
    expect(getMessagesRolePrefix({ apiUserRole: "admin" })).toBe("admin");
    expect(getMessagesRolePrefix({ appRole: "coach" })).toBe("admin");
  });

  it("returns team for team_manager", () => {
    expect(getMessagesRolePrefix({ appRole: "team_manager" })).toBe("team");
  });

  it("returns adult for adult_athlete", () => {
    expect(getMessagesRolePrefix({ appRole: "adult_athlete" })).toBe("adult");
  });

  it("returns team for team athlete variants", () => {
    expect(getMessagesRolePrefix({ appRole: "youth_athlete_team_guardian" })).toBe("team");
    expect(getMessagesRolePrefix({ appRole: "adult_athlete_team" })).toBe("team");
  });

  it("returns youth for youth_ prefixed roles", () => {
    expect(getMessagesRolePrefix({ appRole: "youth_guardian" })).toBe("youth");
  });

  it("defaults to adult", () => {
    expect(getMessagesRolePrefix({})).toBe("adult");
  });
});

describe("messagesThreadHref", () => {
  it("builds correct href", () => {
    expect(messagesThreadHref("admin", "123")).toBe("/admin/messages/123");
  });

  it("encodes thread id", () => {
    expect(messagesThreadHref("adult", "a b")).toBe("/adult/messages/a%20b");
  });
});
