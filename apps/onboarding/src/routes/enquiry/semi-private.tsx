import { createFileRoute } from "@tanstack/react-router";
import EnquiryForm from "../../components/EnquiryForm";

export const Route = createFileRoute("/enquiry/semi-private")({
	head: () => ({
		meta: [
			{ title: "Semi-Private Training Enquiry — PH Performance" },
			{
				name: "description",
				content:
					"Enquire about semi-private small group training (2-4 athletes) with PH Performance. Fill in your details and we'll get back to you.",
			},
		],
	}),
	component: EnquirySemiPrivate,
});

function EnquirySemiPrivate() {
	return (
		<EnquiryForm
			serviceType="Semi-Private (2-4)"
			title="Semi-Private Training"
			subtitle="Small Group Enquiry (2-4)"
		/>
	);
}
