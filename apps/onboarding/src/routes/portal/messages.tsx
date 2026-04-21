import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { fetchInbox, fetchThreadMessages, sendMessage, type MessageThread, type ApiChatMessage } from "@/services/messagesService";
import { MessageSquare, Send, Search, Users, Shield, User, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { config } from "#/lib/config";

export const Route = createFileRoute("/portal/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const token = localStorage.getItem("auth_token");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;

    const loadInbox = async () => {
      try {
        setLoading(true);
        const [inboxData, userRes] = await Promise.all([
          fetchInbox(token),
          fetch(`${config.api.baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setThreads(inboxData.threads);
        if (userRes.ok) {
           const userData = await userRes.json();
           setCurrentUserId(userData.user.id);
        }

        if (inboxData.threads.length > 0 && !activeThreadId) {
          setActiveThreadId(inboxData.threads[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadInbox();
  }, [token]);

  useEffect(() => {
    if (!activeThreadId || !token) return;

    const loadMessages = async () => {
      try {
        setMessagesLoading(true);
        const msgs = await fetchThreadMessages(token, activeThreadId);
        setMessages(msgs.reverse()); // Show newest at bottom
      } catch (err) {
        console.error(err);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [activeThreadId, token]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeThreadId || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(token, activeThreadId, newMessage);
      setNewMessage("");
      // Reload messages
      const msgs = await fetchThreadMessages(token, activeThreadId);
      setMessages(msgs.reverse());
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const activeThread = threads.find(t => t.id === activeThreadId);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center pb-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground font-medium">Connecting to secure chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-140px)] flex flex-col space-y-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tight">Your <span className="text-primary">Inbox</span></h1>
          <p className="text-muted-foreground font-medium mt-1">Chat with your performance coaches</p>
        </div>
      </div>

      <div className="flex-1 bg-card border rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className={cn(
          "w-full md:w-80 border-r flex flex-col bg-muted/5",
          activeThreadId && "hidden md:flex"
        )}>
          <div className="p-6 border-b">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                   placeholder="Search messages..."
                   className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
             {threads.map((thread) => (
                <button
                   key={thread.id}
                   onClick={() => setActiveThreadId(thread.id)}
                   className={cn(
                      "w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left",
                      activeThreadId === thread.id 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "hover:bg-muted/50 text-foreground"
                   )}
                >
                   <div className="w-12 h-12 rounded-xl bg-background/20 flex items-center justify-center shrink-0 border border-border/10 overflow-hidden">
                      {thread.avatarUrl ? (
                         <img src={thread.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                         thread.type === "group" ? <Users className="w-6 h-6" /> : <User className="w-6 h-6" />
                      )}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                         <p className="font-bold text-sm truncate uppercase tracking-tight">{thread.name}</p>
                         <span className={cn("text-[10px] font-medium opacity-60", activeThreadId === thread.id && "text-primary-foreground")}>{thread.time}</span>
                      </div>
                      <p className={cn("text-xs truncate opacity-70", activeThreadId === thread.id && "text-primary-foreground/80")}>
                         {thread.preview}
                      </p>
                   </div>
                   {thread.unread > 0 && activeThreadId !== thread.id && (
                      <div className="w-2 h-2 bg-primary rounded-full ring-4 ring-primary/20" />
                   )}
                </button>
             ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className={cn(
           "flex-1 flex flex-col bg-card",
           !activeThreadId && "hidden md:flex"
        )}>
           {activeThread ? (
              <>
                 {/* Chat Header */}
                 <div className="p-4 md:p-6 border-b flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <button 
                        onClick={() => setActiveThreadId(null)}
                        className="md:hidden p-2 hover:bg-muted rounded-full"
                       >
                          <ArrowLeft className="w-5 h-5" />
                       </button>
                       <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/5">
                          {activeThread.type === "group" ? <Users className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
                       </div>
                       <div>
                          <h2 className="font-black uppercase italic text-sm tracking-tight">{activeThread.name}</h2>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{activeThread.role}</p>
                       </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full">
                       <Shield className="w-3 h-3 text-green-500" />
                       <span className="text-[9px] font-black text-green-500 uppercase">Secure encrypted Chat</span>
                    </div>
                 </div>

                 {/* Messages */}
                 <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]"
                 >
                    {messagesLoading ? (
                       <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                       </div>
                    ) : (
                       messages.map((msg) => {
                          const isOwn = msg.senderId === currentUserId;
                          return (
                             <div key={msg.id} className={cn(
                                "flex flex-col max-w-[80%] md:max-w-[70%]",
                                isOwn ? "ml-auto items-end" : "mr-auto items-start"
                             )}>
                                <div className={cn(
                                   "p-4 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm",
                                   isOwn 
                                   ? "bg-primary text-primary-foreground rounded-tr-none" 
                                   : "bg-muted/80 backdrop-blur-sm border rounded-tl-none"
                                )}>
                                   {msg.contentType === "image" && msg.mediaUrl && (
                                      <div className="mb-2 rounded-2xl overflow-hidden border border-border/10">
                                         <img src={msg.mediaUrl} alt="Message attachment" className="max-w-full h-auto" />
                                      </div>
                                   )}
                                   {msg.contentType === "video" && msg.mediaUrl && (
                                      <div className="mb-2 rounded-2xl overflow-hidden border border-border/10 aspect-video bg-black">
                                         <video src={msg.mediaUrl} controls className="w-full h-full" />
                                      </div>
                                   )}
                                   {msg.content}
                                </div>
                                <span className="text-[10px] mt-1.5 px-2 font-bold text-muted-foreground uppercase tracking-widest">
                                   {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             </div>
                          );
                       })
                    )}
                 </div>

                 {/* Composer */}
                 <form onSubmit={handleSendMessage} className="p-4 md:p-6 bg-muted/5 border-t">
                    <div className="relative flex items-center gap-3">
                       <input 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1 h-14 pl-6 pr-16 bg-background border rounded-[1.25rem] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
                       />
                       <button 
                          type="submit"
                          disabled={!newMessage.trim() || sending}
                          className="absolute right-2 w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                       >
                          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                       </button>
                    </div>
                 </form>
              </>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                 <div className="w-24 h-24 bg-muted/20 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-border">
                    <MessageSquare className="w-10 h-10 text-muted-foreground opacity-20" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold uppercase italic tracking-tight">Select a conversation</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2 leading-relaxed">
                       Choose a performance coach or team group from the left to start collaborating on your training.
                    </p>
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
