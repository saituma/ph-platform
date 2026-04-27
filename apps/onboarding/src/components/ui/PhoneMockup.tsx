type PhoneMockupProps = {
	src: string;
	alt: string;
	className?: string;
};

export function PhoneMockup({ src, alt, className = "" }: PhoneMockupProps) {
	return (
		<div className={`relative select-none ${className}`}>
			{/* Outer shell — machined aluminum frame */}
			<div
				className="relative rounded-[3.25rem] bg-[#1c1c1e]"
				style={{
					padding: "4px",
					boxShadow: [
						"0 0 0 1px rgba(255,255,255,0.12)",
						"inset 0 0 0 1px rgba(255,255,255,0.06)",
						"0 50px 100px rgba(0,0,0,0.55)",
						"0 20px 40px rgba(0,0,0,0.3)",
					].join(", "),
				}}
			>
				{/* Left side — silent toggle */}
				<div
					className="absolute rounded-l-full bg-[#2c2c2e]"
					style={{ left: "-3px", top: "88px", width: "3px", height: "30px" }}
				/>
				{/* Left side — volume up */}
				<div
					className="absolute rounded-l-full bg-[#2c2c2e]"
					style={{ left: "-3px", top: "132px", width: "3px", height: "52px" }}
				/>
				{/* Left side — volume down */}
				<div
					className="absolute rounded-l-full bg-[#2c2c2e]"
					style={{ left: "-3px", top: "196px", width: "3px", height: "52px" }}
				/>
				{/* Right side — power/sleep */}
				<div
					className="absolute rounded-r-full bg-[#2c2c2e]"
					style={{ right: "-3px", top: "148px", width: "3px", height: "72px" }}
				/>

				{/* Screen bezel */}
				<div
					className="relative overflow-hidden rounded-[3rem] bg-black"
					style={{ aspectRatio: "9 / 19.5" }}
				>
					{/* Status bar area */}
					<div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-center pt-3">
						{/* Dynamic Island */}
						<div
							className="bg-black rounded-full"
							style={{
								width: "110px",
								height: "32px",
								boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
							}}
						/>
					</div>

					{/* Screenshot fills the screen */}
					<img
						src={src}
						alt={alt}
						className="w-full h-full object-cover object-top"
						draggable={false}
						onError={(e) => {
							e.currentTarget.style.display = "none";
						}}
					/>

					{/* Home indicator bar */}
					<div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
						<div
							className="rounded-full bg-white/30"
							style={{ width: "100px", height: "4px" }}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
