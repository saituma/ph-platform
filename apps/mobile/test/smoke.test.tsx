import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

function SmokeComponent() {
  return <Text>Mobile Test Ready</Text>;
}

describe("mobile test setup", () => {
  it("renders smoke component", () => {
    render(<SmokeComponent />);
    expect(screen.getByText("Mobile Test Ready")).toBeTruthy();
  });
});
