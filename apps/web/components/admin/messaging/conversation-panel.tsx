import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../ui/dialog";
import { Textarea } from "../../ui/textarea";
import { EmptyState } from "../empty-state";
import { Badge } from "../../ui/badge";
import { Check, CheckCheck, Image as ImageIcon, Paperclip, Play, Send, Smile, Star, Video } from "lucide-react";

type Message = {
  id: string;
  author: string;
  time: string;
  text: string;
  mediaUrl?: string | null;
  contentType?: "text" | "image" | "video" | "audio";
  reactions?: { emoji: string; count: number; reactedByMe?: boolean }[];
  status?: "sent" | "delivered" | "read";
};

export type ComposerAttachment = {
  file: File;
  kind: "image" | "file" | "video";
};

type ConversationPanelProps = {
  name?: string | null;
  messages: Message[];
  profile?: {
    tier: string;
    status: string;
    lastActive: string;
    tags: string[];
  } | null;
  onReact?: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onSend?: (payload: { text: string; attachment?: ComposerAttachment | null }) => void;
  onTypingChange?: (isTyping: boolean) => void;
  typingLabel?: string | null;
};

export function ConversationPanel({
  name,
  messages,
  profile,
  onReact,
  onDeleteMessage,
  onSend,
  onTypingChange,
  typingLabel,
}: ConversationPanelProps) {
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<ComposerAttachment | null>(null);
  const [activeMedia, setActiveMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [recordMode, setRecordMode] = useState<"video" | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);
  const typingRef = useRef<{ active: boolean; timer?: NodeJS.Timeout | null }>({
    active: false,
    timer: null,
  });

  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
    };
  }, [recordedUrl]);

  const closeRecorder = () => {
    setRecorderOpen(false);
    setRecordMode(null);
    setRecording(false);
    setRecordError(null);
    discardRecordingRef.current = true;
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    mediaChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore stop failures
      }
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  const openRecorder = (mode: "video") => {
    setRecordMode(mode);
    setRecorderOpen(true);
    setRecordError(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    mediaChunksRef.current = [];
  };

  const pickMimeType = () => {
    const options = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    if (typeof MediaRecorder === "undefined") return undefined;
    return options.find((type) => MediaRecorder.isTypeSupported(type));
  };

  const startRecording = async () => {
    if (!recordMode) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordError("Recording is not supported in this browser.");
      return;
    }
    try {
      discardRecordingRef.current = false;
      setRecordError(null);
      mediaChunksRef.current = [];
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
      setRecordedBlob(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      });
      mediaStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        await videoPreviewRef.current.play().catch(() => {});
      }
      const mimeType = pickMimeType();
      const bitrateConfig = { videoBitsPerSecond: 3_500_000, audioBitsPerSecond: 256_000 };
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, ...bitrateConfig } : bitrateConfig);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blobType = recorder.mimeType || "video/webm";
        const blob = new Blob(mediaChunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        if (discardRecordingRef.current) {
          URL.revokeObjectURL(url);
          mediaChunksRef.current = [];
          return;
        }
        setRecordedBlob(blob);
        setRecordedUrl(url);
        mediaChunksRef.current = [];
      };
      recorder.start();
      setRecording(true);
    } catch (error) {
      console.warn("Failed to start recording", error);
      setRecordError("Unable to access camera or microphone.");
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setRecording(false);
  };

  const sendRecording = () => {
    if (!recordedBlob || !recordMode) return;
    const mimeType = recordedBlob.type || "video/webm";
    const extension = mimeType.includes("mp4")
      ? "mp4"
      : "webm";
    const fileName = `recording-${Date.now()}.${extension}`;
    const file = new File([recordedBlob], fileName, { type: mimeType });
    setAttachment({ file, kind: recordMode });
    closeRecorder();
  };
  useEffect(() => {
    if (!onTypingChange) return;
    if (draft.trim().length > 0) {
      if (!typingRef.current.active) {
        typingRef.current.active = true;
        onTypingChange(true);
      }
      if (typingRef.current.timer) {
        clearTimeout(typingRef.current.timer);
      }
      typingRef.current.timer = setTimeout(() => {
        typingRef.current.active = false;
        onTypingChange(false);
      }, 1200);
    } else if (typingRef.current.active) {
      typingRef.current.active = false;
      onTypingChange(false);
    }
  }, [draft, onTypingChange]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, name]);

  const submitDraft = () => {
    const text = draft.trim();
    if (!text && !attachment) return;
    onSend?.({ text, attachment });
    setDraft("");
    setAttachment(null);
  };

  const isAudioAttachment = (message: Message) => {
    if (message.contentType === "audio") return true;
    if (!message.mediaUrl) return false;
    const lower = message.mediaUrl.toLowerCase();
    return [".m4a", ".aac", ".mp3", ".wav", ".ogg", ".webm", ".caf"].some((ext) => lower.includes(ext));
  };

  const formatBytes = (sizeBytes: number) => {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 KB";
    if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
    if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const extractFileName = (url: string) => {
    try {
      const pathname = new URL(url).pathname;
      const raw = pathname.split("/").pop() ?? "";
      return decodeURIComponent(raw) || "Attachment";
    } catch {
      const raw = url.split("?")[0]?.split("/").pop() ?? "";
      return decodeURIComponent(raw) || "Attachment";
    }
  };

  const getAttachmentMeta = (message: Message) => {
    if (!message.mediaUrl) return null;
    const sizeMatch = message.text.match(/\b(\d+(?:\.\d+)?)\s?(KB|MB|GB)\b/i);
    const nameFromText = message.text.includes(" • ")
      ? message.text.split(" • ")[0]?.trim()
      : null;
    const sizeLabel = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}` : null;
    const name = nameFromText && nameFromText.length > 0 ? nameFromText : extractFileName(message.mediaUrl);
    return { name, sizeLabel };
  };

  if (!name) {
    return (
      <EmptyState
        title="Select a conversation"
        description="Choose a thread from the inbox to reply."
      />
    );
  }

  return (
    <div className="flex min-h-[24rem] flex-col gap-4 lg:h-[calc(100vh-16rem)] lg:min-h-[34rem]">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/30 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">
            {profile ? `${profile.status} • Last active ${profile.lastActive}` : "Active"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile?.tier ? <Badge variant="primary">{profile.tier}</Badge> : null}
          {profile?.tags?.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
          <Button size="icon" variant="ghost">
            <Star className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-2xl border border-border bg-background/80 p-3 pr-2 dark:bg-black/60">
        <div className="space-y-3 pb-[calc(11rem+env(safe-area-inset-bottom))] lg:pb-0">
        {messages.map((message) => {
          const isCoach = message.author === "Coach";
          const attachmentMeta = getAttachmentMeta(message);
          const showAttachmentMeta = Boolean(attachmentMeta);
          const shouldHideText = showAttachmentMeta && message.text.startsWith(attachmentMeta!.name);
          return (
            <div
              key={message.id}
              className={`flex ${isCoach ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`group max-w-[80%] rounded-2xl border p-3 text-sm shadow-sm ${
                  isCoach
                    ? "bg-emerald-100/80 text-foreground dark:bg-emerald-900/40"
                    : "bg-white text-foreground dark:bg-slate-900"
                }`}
                onContextMenu={(event) => {
                  if (!onDeleteMessage) return;
                  event.preventDefault();
                  const confirmed = window.confirm("Delete this message?");
                  if (confirmed) onDeleteMessage(message.id);
                }}
              >
                <p className="text-[11px] text-muted-foreground">
                  {message.author} • {message.time}
                </p>
                {showAttachmentMeta ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{attachmentMeta!.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {attachmentMeta!.sizeLabel ?? "Size unavailable"}
                      </p>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {message.contentType === "image"
                        ? "Image"
                        : message.contentType === "video"
                        ? "Video"
                        : isAudioAttachment(message)
                        ? "Audio"
                        : "File"}
                    </div>
                  </div>
                ) : null}
                {message.mediaUrl && message.contentType === "image" ? (
                  <button
                    type="button"
                    className="mt-2 block w-full"
                    onClick={() => setActiveMedia({ url: message.mediaUrl ?? "", type: "image" })}
                  >
                    <img
                      src={message.mediaUrl}
                      alt={message.text || "Image attachment"}
                      className="max-h-72 w-full rounded-xl object-cover"
                    />
                  </button>
                ) : null}
                {message.mediaUrl && message.contentType === "video" ? (
                  <button
                    type="button"
                    className="mt-2 block w-full"
                    onClick={() => setActiveMedia({ url: message.mediaUrl ?? "", type: "video" })}
                  >
                    <div className="relative">
                      <video
                        src={message.mediaUrl}
                        className="max-h-72 w-full rounded-xl object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
                          <Play className="h-5 w-5 text-white" />
                        </span>
                      </div>
                    </div>
                  </button>
                ) : null}
                {message.mediaUrl && message.contentType !== "image" && message.contentType !== "video" && !isAudioAttachment(message) ? (
                  <a
                    href={message.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex rounded-xl border border-border bg-background px-3 py-2 text-xs text-primary underline"
                  >
                    Open attachment
                  </a>
                ) : null}
                {isAudioAttachment(message) ? (
                  <p className="mt-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                    Voice messages are disabled.
                  </p>
                ) : null}
                {shouldHideText ? null : <p className="mt-2 text-foreground">{message.text}</p>}
                {message.reactions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.reactions.map((reaction) => (
                      <button
                        type="button"
                        key={reaction.emoji}
                        className={`rounded-full border px-2 py-1 text-xs ${
                          reaction.reactedByMe
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background"
                        }`}
                        onClick={() => onReact?.(message.id, reaction.emoji)}
                      >
                        {reaction.emoji} {reaction.count}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 opacity-0 transition group-hover:opacity-100">
                  {["👍", "🔥", "💪", "👏"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary/60"
                      onClick={() => onReact?.(message.id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {isCoach ? (
                  <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                    {message.status === "read" ? (
                      <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                    ) : message.status === "delivered" ? (
                      <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-[11px]">{message.time}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      {typingLabel ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary/60" />
          {typingLabel}
        </div>
      ) : null}
      <div className="fixed bottom-0 left-0 right-0 z-20 space-y-3 border-t border-border bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-sm backdrop-blur lg:static lg:rounded-2xl lg:border lg:border-border lg:bg-background lg:shadow-none">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setAttachment({ file, kind: "file" });
            event.target.value = "";
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setAttachment({ file, kind: "image" });
            event.target.value = "";
          }}
        />
        <Textarea
          placeholder="Write a response..."
          className="min-h-[56px] rounded-2xl bg-background px-4 py-3"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
            if ((event as unknown as { isComposing?: boolean }).isComposing) return;
            event.preventDefault();
            submitDraft();
          }}
        />
        {attachment ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {attachment.file.name} ({Math.max(1, Math.round(attachment.file.size / 1024))} KB)
            </p>
            <Button size="sm" variant="ghost" onClick={() => setAttachment(null)}>
              Remove
            </Button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => imageInputRef.current?.click()}
              title="Attach image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => openRecorder("video")} title="Record video">
              <Video className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">Save Draft</Button>
            <Button
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={submitDraft}
            >
              Send
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={Boolean(activeMedia)} onOpenChange={(open) => (open ? null : setActiveMedia(null))}>
        <DialogContent className="max-w-5xl p-4">
          <DialogTitle className="sr-only">Media preview</DialogTitle>
          {activeMedia?.type === "image" ? (
            <img
              src={activeMedia.url}
              alt="Attachment preview"
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
          ) : null}
          {activeMedia?.type === "video" ? (
            <video
              src={activeMedia.url}
              className="max-h-[80vh] w-full rounded-xl"
              controls
              playsInline
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={recorderOpen} onOpenChange={(open) => (open ? null : closeRecorder())}>
        <DialogContent className="max-w-3xl p-4">
          <DialogTitle className="sr-only">
            Record video
          </DialogTitle>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Record video</p>
                <p className="text-xs text-muted-foreground">Use your webcam and mic. Review before sending.</p>
              </div>
              <Button variant="ghost" onClick={closeRecorder}>
                Close
              </Button>
            </div>

            {recordError ? (
              <p className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                {recordError}
              </p>
            ) : null}

            <div className="rounded-2xl border border-border bg-black/90 p-4 text-center">
              <video
                ref={videoPreviewRef}
                className="mx-auto aspect-video w-full max-w-2xl rounded-xl bg-black"
                controls={Boolean(recordedUrl)}
                src={recordedUrl ?? undefined}
              />
              {!recordedUrl && !recording ? (
                <p className="mt-3 text-xs text-white/70">
                  Press record to start.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!recording ? (
                  <Button onClick={startRecording} variant="outline">
                    Start recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="outline">
                    Stop recording
                  </Button>
                )}
                {recordedUrl ? (
                  <Button variant="ghost" onClick={() => {
                    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
                    setRecordedUrl(null);
                    setRecordedBlob(null);
                  }}>
                    Discard
                  </Button>
                ) : null}
              </div>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={sendRecording}
                disabled={!recordedBlob}
              >
                Use recording
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
