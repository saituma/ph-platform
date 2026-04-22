import { createFileRoute } from "@tanstack/react-router";
import type { TestimonialItem } from "#/components/shadcn-studio/blocks/testimonials-component-18/testimonials-component-18";
import TestimonialsComponent from "#/components/shadcn-studio/blocks/testimonials-component-18/testimonials-component-18";

const testimonials: TestimonialItem[] = [
	{
		name: "Marcus Thorne",
		role: "Head Coach",
		company: "Elite Track Club",
		avatar:
			"https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png?width=40&height=40&format=auto",
		rating: 5,
		content:
			"PH Performance has completely revolutionized how we track athlete progress. The video analysis tools are the best in the industry.",
	},
	{
		name: "Elena Rodriguez",
		role: "Pro Athlete",
		company: "Global Cycling",
		avatar:
			"https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-2.png?width=40&height=40&format=auto",
		rating: 5,
		content:
			"The data-driven insights allowed me to push past my plateaus and set new personal records this season. Highly recommend!",
	},
	{
		name: "David Chen",
		role: "Performance Director",
		company: "Titan Athletics",
		avatar:
			"https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png?width=40&height=40&format=auto",
		rating: 5,
		content:
			"The UI is incredibly intuitive. My coaches were up and running in minutes, and the team sync features are a game-changer.",
	},
	{
		name: "Sarah Jenkins",
		role: "Conditioning Coach",
		company: "Premier League",
		avatar:
			"https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-4.png?width=40&height=40&format=auto",
		rating: 5,
		content:
			"It's the ultimate tool for anyone serious about their athletic career. The professional analytics are unmatched.",
	},
];

export const Route = createFileRoute("/testimonials-demo")({
	component: TestimonialsComponentPage,
});

function TestimonialsComponentPage() {
	return <TestimonialsComponent testimonials={testimonials} />;
}
