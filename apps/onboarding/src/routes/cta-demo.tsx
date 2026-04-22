import { createFileRoute } from "@tanstack/react-router";
import CTA from "#/components/shadcn-studio/blocks/cta-section-01/cta-section-01";

export const Route = createFileRoute("/cta-demo")({
	component: CTASection,
});

function CTASection() {
	return <CTA />;
}
