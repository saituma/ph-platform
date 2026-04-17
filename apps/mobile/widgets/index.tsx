import { registerWidget, WidgetTask } from "expo-widgets";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 1. PH Summary Widget (Medium/Large)
const PHSummaryWidget = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0b', padding: 12, borderRadius: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
         <Text style={{ color: '#00FF87', fontSize: 12, fontWeight: 'bold' }}>PH PERFORMANCE</Text>
      </View>
      
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: '#F2F6F2', fontSize: 14, fontWeight: '600' }}>Next Session</Text>
        <Text style={{ color: '#E6F2E6', fontSize: 18, fontWeight: 'bold' }}>Strength & Power</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Scheduled for 4:00 PM</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8 }}>
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>WEEKLY KM</Text>
          <Text style={{ color: '#F2F6F2', fontSize: 14, fontWeight: 'bold' }}>12.5 km</Text>
        </View>
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>GOAL</Text>
          <Text style={{ color: '#F2F6F2', fontSize: 14, fontWeight: 'bold' }}>80%</Text>
        </View>
      </View>
    </View>
  );
};

// 2. PH Next Session Widget (Small)
const PHNextSessionWidget = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0b', padding: 12, borderRadius: 16, justifyContent: 'center' }}>
      <Text style={{ color: '#00FF87', fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>NEXT SESSION</Text>
      <Text style={{ color: '#E6F2E6', fontSize: 16, fontWeight: 'bold' }} numberOfLines={2}>Strength & Power</Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }}>Today, 4:00 PM</Text>
    </View>
  );
};

// 3. PH Weekly Stats Widget (Small)
const PHWeeklyStatsWidget = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0b', padding: 12, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#00FF87', fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>WEEKLY KM</Text>
      <Text style={{ color: '#E6F2E6', fontSize: 24, fontWeight: 'bold' }}>12.5</Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>Goal: 15km</Text>
    </View>
  );
};

// 4. PH Current Module Widget (Medium)
const PHCurrentModuleWidget = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0b', padding: 14, borderRadius: 20 }}>
      <Text style={{ color: '#00FF87', fontSize: 10, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>ACTIVE MODULE</Text>
      <View style={{ backgroundColor: 'rgba(0, 255, 135, 0.08)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 255, 135, 0.15)' }}>
        <Text style={{ color: '#F2F6F2', fontSize: 16, fontWeight: 'bold' }}>Foundation Phase 1</Text>
        <Text style={{ color: '#E6F2E6', fontSize: 12, marginTop: 4 }}>Week 3 of 4</Text>
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 8 }}>
          <View style={{ height: 4, backgroundColor: '#00FF87', borderRadius: 2, width: '75%' }} />
        </View>
      </View>
    </View>
  );
};

// 5. PH Schedule Widget (Medium/Large)
const PHScheduleWidget = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0b', padding: 16, borderRadius: 20 }}>
      <Text style={{ color: '#00FF87', fontSize: 10, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 }}>TODAY'S SCHEDULE</Text>
      
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, width: 60 }}>09:00</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 8 }} />
          <Text style={{ color: '#F2F6F2', fontSize: 13, fontWeight: '500' }}>Physio Check</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#00FF87', fontSize: 12, width: 60, fontWeight: 'bold' }}>16:00</Text>
          <View style={{ flex: 1, height: 2, backgroundColor: 'rgba(0, 255, 135, 0.3)', marginHorizontal: 8 }} />
          <View style={{ backgroundColor: '#00FF87', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <Text style={{ color: '#0a0a0b', fontSize: 12, fontWeight: 'bold' }}>Main Session</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, width: 60 }}>18:30</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 8 }} />
          <Text style={{ color: '#F2F6F2', fontSize: 13 }}>Yoga/Mobility</Text>
        </View>
      </View>
    </View>
  );
};

// 6. PH Quick Actions Widget (Medium)
const PHQuickActionsWidget = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0b', padding: 12, borderRadius: 20 }}>
      <Text style={{ color: '#F2F6F2', fontSize: 14, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>Quick Actions</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', flex: 1 }}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#1A1A1C', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="play" size={20} color="#00FF87" />
          </View>
          <Text style={{ color: '#F2F6F2', fontSize: 10, fontWeight: '600' }}>Start Run</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#1A1A1C', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chatbubble" size={20} color="#00FF87" />
          </View>
          <Text style={{ color: '#F2F6F2', fontSize: 10, fontWeight: '600' }}>Coach</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#1A1A1C', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="restaurant" size={20} color="#00FF87" />
          </View>
          <Text style={{ color: '#F2F6F2', fontSize: 10, fontWeight: '600' }}>Log Food</Text>
        </View>
      </View>
    </View>
  );
};

// This task runs whenever the widget needs to refresh
const widgetTask: WidgetTask = async (_props: Record<string, unknown>) => {
  return {
    nextSession: "Strength & Power",
    time: "4:00 PM",
    weeklyKm: "12.5",
    goalProgress: 0.8,
    activeModule: "Foundation Phase 1",
    moduleProgress: 0.75,
    schedule: [
      { time: "09:00", label: "Physio Check" },
      { time: "16:00", label: "Main Session", active: true },
      { time: "18:30", label: "Yoga/Mobility" }
    ]
  };
};

registerWidget("PHSummary", PHSummaryWidget, widgetTask);
registerWidget("PHNextSession", PHNextSessionWidget, widgetTask);
registerWidget("PHWeeklyStats", PHWeeklyStatsWidget, widgetTask);
registerWidget("PHCurrentModule", PHCurrentModuleWidget, widgetTask);
registerWidget("PHSchedule", PHScheduleWidget, widgetTask);
registerWidget("PHQuickActions", PHQuickActionsWidget, widgetTask);
