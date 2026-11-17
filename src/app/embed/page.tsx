import type { Metadata } from "next";
import { ChatWindow } from "@/components/chat/ChatWindow";

export const metadata: Metadata = {
  title: "Chat | Afaq Al Barakha Investment",
};

// Compact chat loaded inside the floating widget on the main website.
export default function EmbedPage() {
  return (
    <main className="h-dvh">
      <ChatWindow variant="embed" />
    </main>
  );
}
