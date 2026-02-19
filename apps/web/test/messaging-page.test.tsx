import { fireEvent, render, screen } from "@testing-library/react";

import MessagingPage from "@/app/messaging/page";

jest.mock("socket.io-client", () => ({
  io: jest.fn(),
}));

jest.mock("@/components/admin/shell", () => ({
  AdminShell: ({ title, children }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock("@/components/admin/messaging/inbox-list", () => ({
  InboxList: () => <div data-testid="inbox-list" />,
}));

jest.mock("@/components/admin/messaging/group-inbox-panel", () => ({
  GroupInboxPanel: () => <div data-testid="group-inbox" />,
}));

jest.mock("@/components/admin/messaging/messaging-conversation-card", () => ({
  MessagingConversationCard: () => <div data-testid="conversation" />,
}));

jest.mock("@/components/admin/messaging/message-dialogs", () => ({
  MessageDialogs: () => null,
}));

jest.mock("@/lib/apiSlice", () => ({
  useGetThreadsQuery: jest.fn(),
  useGetUsersQuery: jest.fn(),
  useGetChatGroupsQuery: jest.fn(),
  useGetMessagesQuery: jest.fn(),
  useGetChatGroupMessagesQuery: jest.fn(),
  useGetChatGroupMembersQuery: jest.fn(),
  useCreateChatGroupMutation: jest.fn(),
  useCreateMediaUploadUrlMutation: jest.fn(),
  useSendMessageMutation: jest.fn(),
  useSendChatGroupMessageMutation: jest.fn(),
  useToggleMessageReactionMutation: jest.fn(),
  useToggleChatGroupMessageReactionMutation: jest.fn(),
  useMarkThreadReadMutation: jest.fn(),
}));

const apiSlice = jest.requireMock("@/lib/apiSlice");
const { io } = jest.requireMock("socket.io-client");

describe("messaging page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    io.mockReturnValue({
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    });

    apiSlice.useGetThreadsQuery.mockReturnValue({ data: { threads: [] }, refetch: jest.fn() });
    apiSlice.useGetUsersQuery.mockReturnValue({ data: { users: [] } });
    apiSlice.useGetChatGroupsQuery.mockReturnValue({ data: { groups: [] }, refetch: jest.fn() });
    apiSlice.useGetMessagesQuery.mockReturnValue({ data: { messages: [] }, refetch: jest.fn() });
    apiSlice.useGetChatGroupMessagesQuery.mockReturnValue({ data: { messages: [] }, refetch: jest.fn() });
    apiSlice.useGetChatGroupMembersQuery.mockReturnValue({ data: { members: [] } });
    apiSlice.useCreateChatGroupMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    apiSlice.useCreateMediaUploadUrlMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    apiSlice.useSendMessageMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    apiSlice.useSendChatGroupMessageMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    apiSlice.useToggleMessageReactionMutation.mockReturnValue([jest.fn()]);
    apiSlice.useToggleChatGroupMessageReactionMutation.mockReturnValue([jest.fn()]);
    apiSlice.useMarkThreadReadMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  it("renders direct inbox by default", () => {
    render(<MessagingPage />);

    expect(screen.getByRole("heading", { name: /messaging/i })).toBeInTheDocument();
    expect(screen.getByTestId("inbox-list")).toBeInTheDocument();
  });

  it("switches to group inbox", () => {
    render(<MessagingPage />);

    fireEvent.click(screen.getByRole("button", { name: /groups/i }));
    expect(screen.getByTestId("group-inbox")).toBeInTheDocument();
  });
});
