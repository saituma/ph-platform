import { queryKeys } from "@/lib/queryKeys";

describe("queryKeys", () => {
  it("generates home keys", () => {
    expect(queryKeys.home.all()).toEqual(["home"]);
    expect(queryKeys.home.weeklyStats(1)).toEqual(["home", "weeklyStats", 1]);
  });

  it("generates bookings keys", () => {
    expect(queryKeys.bookings.all(1)).toEqual(["bookings", 1]);
    expect(queryKeys.bookings.services(1)).toEqual(["bookings", 1, "services"]);
  });

  it("generates messages keys", () => {
    expect(queryKeys.messages.all()).toEqual(["messages"]);
    expect(queryKeys.messages.threads(1)).toEqual(["messages", "threads", 1]);
    expect(queryKeys.messages.thread(1, "abc")).toEqual(["messages", "thread", 1, "abc"]);
  });

  it("generates training keys", () => {
    expect(queryKeys.training.all()).toEqual(["training"]);
    expect(queryKeys.training.module(5)).toEqual(["training", "module", 5]);
  });

  it("generates admin keys", () => {
    expect(queryKeys.admin.all()).toEqual(["admin"]);
  });
});
