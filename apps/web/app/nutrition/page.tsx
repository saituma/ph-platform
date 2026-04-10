"use client";

import { useState } from "react";
import { 
  useGetUsersQuery,
  useGetNutritionTargetsQuery,
  useGetNutritionLogsQuery,
  useUpdateNutritionTargetsMutation,
  useReviewNutritionLogMutation
} from "../../lib/apiSlice";
import { Loader2, Save } from "lucide-react";

function NutritionDetails({ userId }: { userId: number }) {
  const { data: targetsData, isLoading: targetsLoading } = useGetNutritionTargetsQuery(userId);
  const { data: logsData, isLoading: logsLoading } = useGetNutritionLogsQuery({ userId, limit: 14 });
  const [updateTargets] = useUpdateNutritionTargetsMutation();
  const [reviewLog] = useReviewNutritionLogMutation();

  const [feedbackInputs, setFeedbackInputs] = useState<Record<number, string>>({});
  const [targetInputs, setTargetInputs] = useState({
    calories: "", protein: "", carbs: "", fats: "", guidance: ""
  });

  if (targetsLoading || logsLoading) return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-muted-foreground"/></div>;

  const logs = logsData?.logs ?? [];
  const targets = targetsData?.targets;

  const handleUpdateTargets = async () => {
    await updateTargets({
      userId,
      calories: Number(targetInputs.calories) || undefined,
      protein: Number(targetInputs.protein) || undefined,
      carbs: Number(targetInputs.carbs) || undefined,
      fats: Number(targetInputs.fats) || undefined,
      micronutrientsGuidance: targetInputs.guidance || undefined,
    });
    alert("Targets updated!");
  };

  const handleSubmitFeedback = async (logId: number) => {
    if (!feedbackInputs[logId]) return;
    await reviewLog({ logId, feedback: feedbackInputs[logId] });
    alert("Feedback saved!");
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Target Management */}
      <div className="bg-secondary/10 border p-6 rounded-2xl">
        <h4 className="text-xl font-bold mb-4">Coach Macro Targets</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Calories</label>
            <input type="number" defaultValue={targets?.calories || ""} onChange={e => setTargetInputs({...targetInputs, calories: e.target.value})} className="w-full bg-input rounded-lg border px-3 py-2 text-sm" placeholder="e.g. 2500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Protein (g)</label>
            <input type="number" defaultValue={targets?.protein || ""} onChange={e => setTargetInputs({...targetInputs, protein: e.target.value})} className="w-full bg-input rounded-lg border px-3 py-2 text-sm" placeholder="180" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Carbs (g)</label>
            <input type="number" defaultValue={targets?.carbs || ""} onChange={e => setTargetInputs({...targetInputs, carbs: e.target.value})} className="w-full bg-input rounded-lg border px-3 py-2 text-sm" placeholder="250" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Fats (g)</label>
            <input type="number" defaultValue={targets?.fats || ""} onChange={e => setTargetInputs({...targetInputs, fats: e.target.value})} className="w-full bg-input rounded-lg border px-3 py-2 text-sm" placeholder="80" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Micronutrient Guidance</label>
          <textarea defaultValue={targets?.micronutrientsGuidance || ""} onChange={e => setTargetInputs({...targetInputs, guidance: e.target.value})} className="w-full bg-input rounded-lg border px-3 py-2 text-sm h-20" placeholder="Eat more leafy greens..."></textarea>
        </div>
        <button onClick={handleUpdateTargets} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90">
          <Save size={16}/> Save Targets
        </button>
      </div>

      {/* Logs View */}
      <div>
        <h4 className="text-xl font-bold mb-4">Recent Athlete Logs</h4>
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent logs found for this athlete.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {logs.map((log) => (
              <div key={log.id} className="border bg-card p-5 rounded-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div className="font-bold text-lg">{log.dateKey}</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-1 rounded-full">{log.athleteType} Athlete</div>
                </div>

                {log.athleteType === "youth" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <p className="text-sm"><span className="font-bold">Meals:</span></p>
                       <ul className="text-sm text-secondary list-disc pl-4">
                         <li>Breakfast: {log.breakfast ? "✅" : "❌"}</li>
                         <li>Lunch: {log.lunch ? "✅" : "❌"}</li>
                         <li>Dinner: {log.dinner ? "✅" : "❌"}</li>
                         <li>Snacks: {log.snacks ? "✅" : "❌"}</li>
                       </ul>
                    </div>
                    <div className="space-y-2 text-sm">
                       <p><span className="font-bold">Water Intake:</span> {log.waterIntake} units</p>
                       <p><span className="font-bold text-green-500">Mood:</span> {log.mood}/5</p>
                       <p><span className="font-bold text-yellow-500">Energy:</span> {log.energy}/5</p>
                       <p><span className="font-bold text-red-500">Pain:</span> {log.pain}/5</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="font-bold mb-2">Food Diary:</p>
                    <div className="bg-secondary/10 p-3 rounded-lg whitespace-pre-wrap">{log.foodDiary || "No entry provided."}</div>
                  </div>
                )}
                
                <div className="mt-2 bg-secondary/10 p-3 rounded-xl">
                  {log.coachFeedback ? (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Your Feedback:</p>
                      <p className="text-sm">{log.coachFeedback}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Leave quick feedback on this log..." 
                        value={feedbackInputs[log.id] || ""}
                        onChange={e => setFeedbackInputs({...feedbackInputs, [log.id]: e.target.value})}
                        className="flex-1 bg-input text-sm rounded-lg border px-3 py-2" 
                      />
                      <button onClick={() => handleSubmitFeedback(log.id)} className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold">Post</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[80vh]">
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
      <div className="w-full lg:w-2/3 bg-card border rounded-3xl p-6 overflow-y-auto max-h-[85vh]">
        {selectedUserId ? (
          <div>
             <h3 className="text-3xl font-black mb-6">Nutrition Profile</h3>
             <NutritionDetails userId={selectedUserId} key={`profile-${selectedUserId}`} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground flex-col py-24">
             <div className="text-5xl mb-4">🥗</div>
             <p className="font-bold">Select an athlete to manage their Nutrition.</p>
          </div>
        )}
      </div>
    </div>
  );
}
