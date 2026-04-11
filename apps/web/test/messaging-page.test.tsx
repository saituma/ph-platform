import { fireEvent, render, screen } from "@testing-library/react";

import MessagingPage from "@/app/messaging/page";

const useSearchParamsMock = jest.fn(() => new URLSearchParams());

jest.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

jest.mock("socket.io-client", () => ({
  io: jest.fn(),
}));

jest.mock("../components/admin/shell", () => ({
  AdminShell: ({ title, children }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock("../components/admin/messaging/inbox-thread-panel", () => ({
  InboxThreadPanel: () => <div data-testid="inbox-thread-panel" />,
}));

jest.mock("../components/admin/messaging/tenor-picker-dialog", () => ({
  TenorPickerDialog: () => null,
}));

jest.mock("@/lib/apiSlice", () => ({
  useGetAnnouncementsQuery: jest.fn(),
  useGetAdminProfileQuery: jest.fn(),
  useGetAdminTeamsQuery: jest.fn(),
  useGetThreadsQuery: jest.fn(),
  useGetUsersQuery: jest.fn(),
  useGetChatGroupsQuery: jest.fn(),
  useGetMessagesQuery: jest.fn(),
  useGetChatGroupMessagesQuery: jest.fn(),
  useGetChatGroupMembersQuery: jest.fn(),
  useMarkChatGroupReadMutation: jest.fn(),
  useMarkThreadReadMutation: jest.fn(),
  useAddChatGroupMembersMutation: jest.fn(),
  useCreateChatGroupMutation: jest.fn(),
  useCreateContentMutation: jest.fn(),
  useCreateMediaUploadUrlMutation: jest.fn(),
  useDeleteContentMutation: jest.fn(),
  useSendMessageMutation: jest.fn(),
  useSendChatGroupMessageMutation: jest.fn(),
  useToggleMessageReactionMutation: jest.fn(),
  useToggleChatGroupMessageReactionMutation: jest.fn(),
  useUpdateContentMutation: jest.fn(),
}));

const apiSlice = jest.requireMock("@/lib/apiSlice");
const { io } = jest.requireMock("socket.io-client");

describe("messaging page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    io.mockReturnValue({
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    });

    apiSlice.useGetAnnouncementsQuery.mockReturnValue({
      data: { items: [] },
      refetch: jest.fn(),
    });
    apiSlice.useGetAdminProfileQuery.mockReturnValue({
      data: { user: { id: 999 } },
    });
    apiSlice.useGetThreadsQuery.mockReturnValue({
      data: { threads: [] },
      refetch: jest.fn(),
    });
    apiSlice.useGetUsersQuery.mockReturnValue({ data: { users: [] } });
    apiSlice.useGetAdminTeamsQuery.mockReturnValue({ data: { teams: [] } });
    apiSlice.useGetChatGroupsQuery.mockReturnValue({
      data: { groups: [] },
      refetch: jest.fn(),
    });
    apiSlice.useGetMessagesQuery.mockReturnValue({
      data: { messages: [] },
      refetch: jest.fn(),
    });
    apiSlice.useGetChatGroupMessagesQuery.mockReturnValue({
      data: { messages: [] },
      refetch: jest.fn(),
    });
    apiSlice.useGetChatGroupMembersQuery.mockReturnValue({
      data: { members: [] },
    });
    apiSlice.useMarkChatGroupReadMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useMarkThreadReadMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useAddChatGroupMembersMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useCreateChatGroupMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useCreateContentMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useCreateMediaUploadUrlMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useDeleteContentMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useSendMessageMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useSendChatGroupMessageMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useToggleMessageReactionMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useToggleChatGroupMessageReactionMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    apiSlice.useUpdateContentMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
  });

  it("renders direct inbox by default", async () => {
    render(<MessagingPage />);

    expect(
      await screen.findByRole("heading", { name: /messaging/i }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("inbox-thread-panel")).toBeInTheDocument();
  });

  it("switches to teams tab", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("tab=teams"));
    render(<MessagingPage />);
    expect(await screen.findByText(/no teams found/i)).toBeInTheDocument();
  });
});
