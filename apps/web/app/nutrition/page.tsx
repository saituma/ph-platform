"use client";

import { useState } from "react";
import { useGetUsersQuery } from "../../lib/apiSlice";
import { Loader2 } from "lucide-react";

export default function NutritionAdminPage() {
  const { data, isLoading, error } = useGetUsersQuery();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground w-8 h-8"/></div>;
  if (error) return <div className="p-8 text-danger">Error loading users.</div>;

  const users = data?.users ?? [];

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <h2 className="text-2xl font-black">Athletes</h2>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[70vh]">
          {users.filter(u => u.role === "athlete" || u.role === "guardian").map(user => (
            <button
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`text-left p-3 rounded-xl border transition ${selectedUserId === user.id ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-card/80 border-border"}`}
            >
              <div className="font-bold">{user.name}</div>
              <div className="text-xs opacity-80">{user.email || user.role}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="w-full lg:w-2/3 bg-card border rounded-3xl p-6">
        {selectedUserId ? (
          <div>
             <h3 className="text-3xl font-black mb-6">Nutrition Profile</h3>
             {/* Fetch Targets and Logs for this user */}
             <p className="text-muted-foreground">Select targets and view logs here...</p>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground flex-col">
             <div className="text-5xl mb-4">🥗</div>
             <p className="font-bold">Select an athlete to manage their Nutrition.</p>
          </div>
        )}
      </div>
    </div>
  );
}
