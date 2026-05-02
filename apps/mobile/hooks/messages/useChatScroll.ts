import { useRef, useState, useCallback, useEffect } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { FlashListRef } from "@shopify/flash-list";
import { ChatMessage } from "@/constants/messages";

export function useChatScroll(messages: ChatMessage[], threadId: string) {
  const listRef = useRef<FlashListRef<ChatMessage> | null>(null);
  const isNearBottomRef = useRef(true);
  const hasInitialScrolled = useRef<string | null>(null);
  const previousLengthRef = useRef(0);
  const [newIncomingCount, setNewIncomingCount] = useState(0);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  useEffect(() => {
    if (hasInitialScrolled.current === threadId) return;
    hasInitialScrolled.current = threadId;
    previousLengthRef.current = messages.length;
    setNewIncomingCount(0);
    requestAnimationFrame(() =>
      listRef.current?.scrollToOffset({ offset: 0, animated: false }),
    );
  }, [threadId, messages.length]);

  useEffect(() => {
    const previousLength = previousLengthRef.current;
    previousLengthRef.current = messages.length;
    if (messages.length <= previousLength) return;
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest.from === "user" || isNearBottomRef.current) {
      requestAnimationFrame(() =>
        listRef.current?.scrollToOffset({ offset: 0, animated: true }),
      );
      setNewIncomingCount(0);
    } else {
      setNewIncomingCount((prev) => Math.min(prev + 1, 99));
    }
  }, [messages.length]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      isNearBottomRef.current = contentOffset.y < 60;
      if (isNearBottomRef.current) setNewIncomingCount(0);
    },
    [],
  );

  const jumpTo = useCallback(
    (messageId: number) => {
      const index = [...messages]
        .reverse()
        .findIndex((m) => Number(m.id) === messageId);
      if (index < 0) return;
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
      setHighlightedId(messageId);
      setTimeout(() => setHighlightedId(null), 1500);
    },
    [messages],
  );

  return {
    listRef,
    handleScroll,
    jumpTo,
    newIncomingCount,
    setNewIncomingCount,
    highlightedId,
  };
}
