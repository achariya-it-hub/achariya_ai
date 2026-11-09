"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-context";
import { useCRMStore } from "@/store/crm-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import {
  MessageCircle,
  X,
  Send,
  Users,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export function FloatingChatWidget() {
  const { user } = useAuth();
  const { members, chatMessages, sendChatMessage, loadChatMessages } = useCRMStore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPeerId, setSelectedPeerId] = useState<string>("general");
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadChatMessages();
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, chatMessages, selectedPeerId, loadChatMessages]);

  if (!user) return null;

  const currentUserId = user.id;
  const peerMembers = members.filter((m) => m.id !== currentUserId);

  const selectedPeer =
    selectedPeerId === "general"
      ? undefined
      : members.find((m) => m.id === selectedPeerId);

  const currentMessages = (chatMessages || []).filter((msg) => {
    if (selectedPeerId === "general") {
      return msg.receiverId === "general";
    }
    return (
      (msg.senderId === currentUserId && msg.receiverId === selectedPeerId) ||
      (msg.senderId === selectedPeerId && msg.receiverId === currentUserId)
    );
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setInputText("");
    await sendChatMessage({
      senderId: currentUserId,
      receiverId: selectedPeerId,
      content: trimmed,
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-96 h-[500px] mb-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
          >
            {/* WIDGET HEADER */}
            <div className="p-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
                  {selectedPeerId === "general" ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    initials(selectedPeer?.name || "")
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm leading-tight">
                    {selectedPeerId === "general" ? "# General Team" : selectedPeer?.name}
                  </h4>
                  <p className="text-[11px] text-white/80">
                    {selectedPeerId === "general" ? "Team Hub" : selectedPeer?.title || "Peer"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href="/dashboard/chat"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-white/10 transition text-white/80 hover:text-white"
                  title="Expand to Full Page"
                >
                  <Maximize2 className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-white/10 transition text-white/80 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* PEER SELECTOR DROPDOWN */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Chatting with:</span>
              <select
                value={selectedPeerId}
                onChange={(e) => setSelectedPeerId(e.target.value)}
                className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="general"># General Team</option>
                {peerMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.employeeId || m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* MESSAGES BODY */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20 text-xs">
              {currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                  <MessageCircle className="h-8 w-8 mb-2 text-indigo-400" />
                  <p className="font-medium">No messages yet</p>
                  <p className="text-[11px] mt-0.5">Send a quick peer message below</p>
                </div>
              ) : (
                currentMessages.map((msg) => {
                  const isMe = msg.senderId === currentUserId;
                  const sender = members.find((m) => m.id === msg.senderId);
                  const senderName = isMe ? "You" : sender?.name || "Member";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      {!isMe && (
                        <span className="text-[10px] text-slate-400 font-medium ml-1 mb-0.5">
                          {senderName}
                        </span>
                      )}
                      <div
                        className={`p-2.5 rounded-xl max-w-[80%] leading-relaxed ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-none shadow-xs"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* QUICK INPUT */}
            <form onSubmit={handleSend} className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
              <Input
                type="text"
                placeholder="Type message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="h-9 text-xs bg-slate-50 dark:bg-slate-800"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputText.trim()}
                className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING TRIGGER BUTTON */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-all focus:outline-none"
        title="Peer Chat"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-indigo-600" />
          </div>
        )}
      </motion.button>
    </div>
  );
}

