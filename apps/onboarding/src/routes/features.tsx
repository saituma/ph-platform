import { createFileRoute } from "@tanstack/react-router";
import { 
    ChartLineUp, 
    VideoCamera, 
    Users, 
    AppWindow, 
    Lightning, 
    ShieldCheck, 
    Globe, 
    Heartbeat 
} from "@phosphor-icons/react";

export const Route = createFileRoute("/features")({
	component: Features,
});

function Features() {
	return (
		<main className="pt-24 pb-20 selection:bg-primary/20">
			<section className="max-w-7xl mx-auto px-6 mb-24">
                <div className="text-center space-y-6 max-w-3xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase">
                        <Lightning weight="fill" className="w-3 h-3" />
                        <span>Platform Capabilities</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                        Professional tools for <span className="text-primary">Elite Teams</span>
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed font-medium">
                        PH Performance brings together professional tracking, real-time analytics, and coaching tools into one refined ecosystem.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
                    {[
                        {
                            title: "Deep Analytics",
                            desc: "Track metrics that matter. From HRV to max power output, see your progress in high definition.",
                            icon: <ChartLineUp size={24} weight="regular" />,
                            color: "bg-blue-500/5 text-blue-500"
                        },
                        {
                            title: "Video Coaching",
                            desc: "Upload and analyze performance video with automated tagging and coach feedback cycles.",
                            icon: <VideoCamera size={24} weight="regular" />,
                            color: "bg-primary/5 text-primary"
                        },
                        {
                            title: "Team Sync",
                            desc: "Coordinate schedules, training loads, and availability across your entire roster effortlessly.",
                            icon: <Users size={24} weight="regular" />,
                            color: "bg-purple-500/5 text-purple-500"
                        },
                        {
                            title: "White-Label Portals",
                            desc: "Custom-branded dashboards for professional organizations and sports academies.",
                            icon: <AppWindow size={24} weight="regular" />,
                            color: "bg-orange-500/5 text-orange-500"
                        },
                        {
                            title: "Data Security",
                            desc: "Enterprise-grade encryption for all athlete data and performance records.",
                            icon: <ShieldCheck size={24} weight="regular" />,
                            color: "bg-green-500/5 text-green-500"
                        },
                        {
                            title: "Global Reach",
                            desc: "Connect with coaches and scouts worldwide through our integrated talent network.",
                            icon: <Globe size={24} weight="regular" />,
                            color: "bg-cyan-500/5 text-cyan-500"
                        }
                    ].map((feature, i) => (
                        <div key={i} className="bg-card border border-border/50 p-8 rounded-3xl hover:border-primary/30 transition-all duration-500 group">
                            <div className={`w-12 h-12 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Integration Spotlight - Refined */}
                <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
                    <div className="flex-1 space-y-6 relative z-10">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">Wearable <span className="text-primary italic">Integration</span></h2>
                        <p className="text-lg text-muted-foreground font-medium">Sync data from Garmin, Whoop, Apple Watch, and Oura seamlessly. One source of truth for all your health metrics.</p>
                        <ul className="grid grid-cols-2 gap-4">
                            {["Real-time sync", "Automated insights", "Recovery tracking", "Load management"].map((item, i) => (
                                <li key={i} className="flex items-center gap-2 font-bold text-[10px] text-muted-foreground uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex-1 w-full max-w-md relative z-10">
                        <div className="aspect-square bg-background rounded-[2rem] border border-border/50 flex items-center justify-center overflow-hidden">
                             <img src="/ph.jpg" alt="Integration" className="w-full h-full object-cover grayscale-[0.2]" />
                        </div>
                    </div>
                </div>
            </section>
		</main>
	);
}
