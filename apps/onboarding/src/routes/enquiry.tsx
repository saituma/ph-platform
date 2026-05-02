import { createFileRoute, Outlet } from "@tanstack/react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const Route = createFileRoute("/enquiry")({
	component: EnquiryLayout,
});

function EnquiryLayout() {
	return (
		<div className="min-h-dvh flex flex-col bg-[#0a0a0a] text-white">
			<Header />
			<Outlet />
			<Footer />
		</div>
	);
}
