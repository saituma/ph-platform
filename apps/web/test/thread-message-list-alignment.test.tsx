import { render, screen } from "@testing-library/react";

import { ThreadMessageList } from "@/components/admin/messaging/thread-message-list";
import type { ChatMessage } from "@/components/admin/messaging/types";

describe("ThreadMessageList alignment", () => {
  it("renders received messages on the left even when senderName differs from peer name", () => {
    const messages: ChatMessage[] = [
      {
        id: 1,
        senderId: 123,
        receiverId: 999,
        senderRole: "user",
        // Intentionally different from directPeerName to ensure we don't infer direction from names.
        senderName: "Jane D",
        content: "hello from user",
        createdAt: "2026-04-11T10:00:00.000Z",
      },
      {
        id: 2,
        senderId: 999,
        receiverId: 123,
        senderRole: "admin",
        senderName: "Coach",
        content: "hello from admin",
        createdAt: "2026-04-11T10:01:00.000Z",
      },
    ];

    render(
      <ThreadMessageList
        messages={messages}
        onReact={() => {}}
        formatTime={() => ""}
        currentUserId={999}
        mode="direct"
        directPeerUserId={123}
        directPeerName="Jane Doe"
        emptyLabel="No messages yet."
      />,
    );

    const received = screen
      .getByText("hello from user")
      .closest('[data-message-id="1"]');
    expect(received).toBeTruthy();
    expect(received).toHaveClass("justify-start");

    const sent = screen
      .getByText("hello from admin")
      .closest('[data-message-id="2"]');
    expect(sent).toBeTruthy();
    expect(sent).toHaveClass("justify-end");
  });
});
