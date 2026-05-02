import { createFileRoute } from "@tanstack/react-router";
import EnquiryForm from "../../components/EnquiryForm";

export const Route = createFileRoute("/enquiry/team")({
	head: () => ({
		meta: [
			{ title: "Team Session Enquiry — PH Performance" },
			{
				name: "description",
				content:
					"Enquire about team training sessions and performance programmes with PH Performance. Fill in your squad details and we'll get back to you.",
			},
		],
	}),
	component: EnquiryTeam,
});

function EnquiryTeam() {
	return (
		<EnquiryForm
			serviceType="Team Sessions"
			title="Team Session"
			subtitle="Team Programme Enquiry"
		/>
	);
}
