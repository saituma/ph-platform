import { render, screen } from "@testing-library/react";

function SmokeComponent() {
  return <h1>Web Test Ready</h1>;
}

describe("web test setup", () => {
  it("renders smoke component", async () => {
    render(<SmokeComponent />);
    expect(await screen.findByRole("heading", { name: "Web Test Ready" })).toBeInTheDocument();
  });
});
