"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/auth-context";
import { useCRMStore } from "@/store/crm-store";
import { TeamMember, ChatMessage } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import {
  Send,
  Search,
  Users,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Circle,
  MessageSquare,
  Sparkles,
  PhoneCall,
  Video,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function PeerChatPage() {
  const { user } = useAuth();
  const { members, chatMessages, sendChatMessage, loadChatMessages } = useCRMStore();

  const [selectedPeerId, setSelectedPeerId] = useState<string>("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll for messages periodically (every 5 seconds) to simulate live peer communication
  useEffect(() => {
    loadChatMessages();
    const interval = setInterval(() => {
      loadChatMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadChatMessages]);

  // Scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, selectedPeerId]);

  if (!user) return null;

  const currentUserId = user.id;

  // Filter peers excluding current user
  const peerMembers = members.filter((m) => m.id !== currentUserId);

  const filteredPeers = peerMembers.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q) ||
      m.title.toLowerCase().includes(q) ||
      (m.employeeId && m.employeeId.toLowerCase().includes(q))
    );
  });

  const selectedPeer: TeamMember | undefined =
    selectedPeerId === "general"
      ? undefined
      : members.find((m) => m.id === selectedPeerId);

  // Filter messages for current thread
  const currentMessages = (chatMessages || []).filter((msg) => {
    if (selectedPeerId === "general") {
      return msg.receiverId === "general";
    }
    return (
      (msg.senderId === currentUserId && msg.receiverId === selectedPeerId) ||
      (msg.senderId === selectedPeerId && msg.receiverId === currentUserId)
    );
  });

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInputText("");

    try {
      await sendChatMessage({
        senderId: currentUserId,
        receiverId: selectedPeerId,
        content: trimmed,
      });
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleQuickSend = (text: string) => {
    sendChatMessage({
      senderId: currentUserId,
      receiverId: selectedPeerId,
      content: text,
    });
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* LEFT SIDEBAR: PEER LIST & GENERAL CHANNEL */}
      <div className="w-80 md:w-96 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              Peer Chat
            </h2>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 text-xs font-semibold">
              {members.length} Members
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search colleagues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-9 text-sm"
            />
          </div>
        </div>

        {/* CHAT LIST */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* GENERAL CHANNEL */}
          <button
            onClick={() => setSelectedPeerId("general")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left ${
              selectedPeerId === "general"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
            }`}
          >
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                selectedPeerId === "general"
                  ? "bg-white/20 text-white"
                  : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
              }`}
            >
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm truncate"># General Team</p>
                <span className={`text-[11px] ${selectedPeerId === "general" ? "text-indigo-200" : "text-slate-400"}`}>
                  Channel
                </span>
              </div>
              <p
                className={`text-xs truncate mt-0.5 ${
                  selectedPeerId === "general" ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                All company announcements & discussions
              </p>
            </div>
          </button>

          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Direct Messages
          </div>

          {filteredPeers.map((peer) => {
            const isSelected = selectedPeerId === peer.id;
            // Get last message in this thread
            const peerThread = (chatMessages || []).filter(
              (m) =>
                (m.senderId === currentUserId && m.receiverId === peer.id) ||
                (m.senderId === peer.id && m.receiverId === currentUserId)
            );
            const lastMsg = peerThread[peerThread.length - 1];

            return (
              <button
                key={peer.id}
                onClick={() => setSelectedPeerId(peer.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className="relative">
                  <Avatar className="h-11 w-11 border border-slate-200/50">
                    <AvatarImage src={peer.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                      {initials(peer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm truncate">{peer.name}</p>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {peer.employeeId || peer.role}
                    </span>
                  </div>
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      isSelected ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {lastMsg ? lastMsg.content : peer.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900">
        {/* CHAT HEADER */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            {selectedPeerId === "general" ? (
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            ) : (
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedPeer?.avatar} />
                  <AvatarFallback className="bg-indigo-600 text-white font-bold">
                    {initials(selectedPeer?.name || "")}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {selectedPeerId === "general" ? "General Team Discussion" : selectedPeer?.name}
                </h3>
                {selectedPeer && (
                  <Badge variant="secondary" className="text-[11px] font-medium">
                    {selectedPeer.title} ({selectedPeer.employeeId || selectedPeer.role})
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                {selectedPeerId === "general" ? `${members.length} team members participating` : "Active now"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Voice call connected to WebRTC room")}
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              Call
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Video room created")}
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <Video className="h-3.5 w-3.5" />
              Meet
            </Button>
          </div>
        </div>

        {/* MESSAGES VIEW */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/30">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="h-16 w-16 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                <Sparkles className="h-8 w-8" />
              </div>
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Start a peer conversation
              </h4>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Say hello to {selectedPeerId === "general" ? "the team" : selectedPeer?.name}! Messages are synced in real time.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => handleQuickSend("Hi! 👋 How is everything going today?")}
                  className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  &quot;Hi! 👋 How is everything going today?&quot;
                </button>
                <button
                  onClick={() => handleQuickSend("Let's review the upcoming deliverables.")}
                  className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  &quot;Let&apos;s review the upcoming deliverables.&quot;
                </button>
              </div>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const sender = members.find((m) => m.id === msg.senderId);
              const senderName = isMe ? "You" : sender?.name || "Team Member";

              return (
                <div key={msg.id} className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}>
                  {!isMe && (
                    <Avatar className="h-8 w-8 mb-1 flex-shrink-0">
                      <AvatarImage src={sender?.avatar} />
                      <AvatarFallback className="bg-indigo-600 text-white text-xs">
                        {initials(senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`max-w-[70%] sm:max-w-[60%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && selectedPeerId === "general" && (
                      <span className="text-[11px] font-semibold text-slate-500 mb-1 ml-1">
                        {senderName} {sender?.employeeId ? `(${sender.employeeId})` : ""}
                      </span>
                    )}

                    <div
                      className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words ${
                        isMe
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-slate-400">
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isMe && (
                        <span>
                          {msg.status === "read" ? (
                            <CheckCheck className="h-3.5 w-3.5 text-indigo-500" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* MESSAGE INPUT */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const emojis = ["👍", "🚀", "🎉", "🔥", "❤️", "🙌"];
                const pick = emojis[Math.floor(Math.random() * emojis.length)];
                setInputText((prev) => prev + " " + pick);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <Smile className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => toast.info("File upload ready. Drag & drop or attach assets.")}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              type="text"
              placeholder={`Message ${selectedPeerId === "general" ? "# General Team" : selectedPeer?.name || "colleague"}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11 text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="h-11 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-md shadow-indigo-600/20"
            >
              <Send className="h-4 w-4 mr-1.5" />
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
