import { apiRequest } from "@/lib/api";
import { fetchHomeContent } from "@/services/home/homeService";

jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn() }));

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("services/homeService", () => {
  it("returns normalized role-specific intro presentation metadata", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      items: [{
        body: JSON.stringify({
          introVideos: [{
            url: " https://cdn.example.com/intro.mp4 ",
            roles: ["team", "team"],
            title: " Team introduction ",
            description: " Meet the team. ",
            posterUrl: " https://cdn.example.com/poster.jpg ",
          }],
        }),
      }],
    } as never);

    await expect(fetchHomeContent("token")).resolves.toMatchObject({
      introVideoUrl: "https://cdn.example.com/intro.mp4",
      introVideos: [{
        url: "https://cdn.example.com/intro.mp4",
        roles: ["team"],
        title: "Team introduction",
        description: "Meet the team.",
        posterUrl: "https://cdn.example.com/poster.jpg",
      }],
    });
  });
});
