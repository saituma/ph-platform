import { render, screen } from "@testing-library/react";

function SmokeComponent() {
  return <h1>Web Test Ready</h1>;
}

describe("web test setup", () => {
  it("renders smoke component", () => {
    render(<SmokeComponent />);
    expect(screen.getByRole("heading", { name: "Web Test Ready" })).toBeInTheDocument();
  });
});
