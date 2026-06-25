import { useState, useMemo, useRef, useEffect } from "react";
import { MessageThread, TypingStatus } from "@/types/messages";
import { ChatMessage } from "@/constants/messages";
import { getInitialCache, saveToCache, updateMemoryCache } from "./useChatCache";

export function useChatState(effectiveProfileId: number, threadId?: string) {
  const initialCache = useMemo(
    () => getInitialCache(effectiveProfileId),
    [effectiveProfileId],
  );

  const [threads, setThreads] = useState<MessageThread[]>(
    () => initialCache?.threads ?? [],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialCache?.messages ?? [],
  );
  const [isLoading, setIsLoading] = useState(initialCache ? false : true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<
    Record<number, Record<number, { name: string; avatar?: string | null }>>
  >(() => initialCache?.groupMembers ?? {});
  const [typingStatus, setTypingStatus] = useState<TypingStatus>(
    () => initialCache?.typingStatus ?? {},
  );
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(
    initialCache?.selectedThread ?? null,
  );
  const [draft, setDraft] = useState(() => initialCache?.draft ?? "");
  const draftRef = useRef(initialCache?.draft ?? "");
  const [replyTarget, setReplyTarget] = useState<{
    messageId: number;
    preview: string;
    authorName?: string;
  } | null>(null);

  const cacheKeyRef = useRef<number>(effectiveProfileId);

  useEffect(() => {
    if (cacheKeyRef.current === effectiveProfileId) return;
    const next = getInitialCache(effectiveProfileId);
    cacheKeyRef.current = effectiveProfileId;
    setThreads(next?.threads ?? []);
    setMessages(next?.messages ?? []);
    setGroupMembers(next?.groupMembers ?? {});
    setTypingStatus(next?.typingStatus ?? {});
    setSelectedThread(next?.selectedThread ?? null);
    setDraft(next?.draft ?? "");
    draftRef.current = next?.draft ?? "";
  }, [effectiveProfileId]);

  // Immediately mirror state into the shared in-memory Map so any component
  // that mounts and calls getInitialCache() sees current data right away —
  // without waiting for the SQLite debounce below.
  useEffect(() => {
    updateMemoryCache(effectiveProfileId, {
      threads,
      messages,
      groupMembers,
      typingStatus: {},
      selectedThread,
      draft: draftRef.current,
    });
  }, [threads, messages, groupMembers, selectedThread, effectiveProfileId]);

  // Debounced SQLite write — only persists to disk every 2 s to avoid
  // hammering the DB on every socket message.
  const saveToCacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveToCacheTimerRef.current) clearTimeout(saveToCacheTimerRef.current);
    saveToCacheTimerRef.current = setTimeout(() => {
      saveToCache(effectiveProfileId, {
        threads,
        messages,
        groupMembers,
        typingStatus: {},
        selectedThread,
        draft: draftRef.current,
      });
    }, 2000);
    return () => {
      if (saveToCacheTimerRef.current) clearTimeout(saveToCacheTimerRef.current);
    };
  }, [
    threads,
    messages,
    groupMembers,
    selectedThread,
    effectiveProfileId,
  ]);

  const activeThread = useMemo(() => {
    return threads.find((item) => item.id === threadId);
  }, [threadId, threads]);

  const currentThread = activeThread ?? selectedThread;

  const localMessages = useMemo(() => {
    if (!currentThread) return [];
    return messages.filter((msg) => msg.threadId === currentThread.id);
  }, [currentThread, messages]);

  return {
    threads,
    setThreads,
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    isThreadLoading,
    setIsThreadLoading,
    groupMembers,
    setGroupMembers,
    typingStatus,
    setTypingStatus,
    selectedThread,
    setSelectedThread,
    draft,
    setDraft,
    draftRef,
    replyTarget,
    setReplyTarget,
    currentThread,
    localMessages,
    activeThread,
  };
}
