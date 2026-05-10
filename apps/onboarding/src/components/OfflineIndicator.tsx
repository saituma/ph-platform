import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Only run client-side
    if (typeof window === "undefined") return;

    setIsOffline(!navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center"
        >
          <div className="mx-auto mt-2 flex items-center gap-2 rounded-full bg-yellow-900/80 backdrop-blur-md border border-yellow-700/50 px-4 py-1.5 text-xs font-medium text-yellow-200 shadow-lg">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            You&apos;re offline — some data may be outdated
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
