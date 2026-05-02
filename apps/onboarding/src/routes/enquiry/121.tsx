import { createFileRoute } from "@tanstack/react-router";
import EnquiryForm from "../../components/EnquiryForm";

export const Route = createFileRoute("/enquiry/121")({
	head: () => ({
		meta: [
			{ title: "1-to-1 Coaching Enquiry — PH Performance" },
			{
				name: "description",
				content:
					"Enquire about personalised 1-to-1 coaching with PH Performance. Fill in your details and we'll get back to you within 24 hours.",
			},
		],
	}),
	component: Enquiry121,
});

function Enquiry121() {
	return (
		<EnquiryForm
			serviceType="1-to-1 Private"
			title="1-to-1 Coaching"
			subtitle="Private Training Enquiry"
		/>
	);
}
