import React from "react";
import { render, screen } from "@testing-library/react-native";
import { AgeGate } from "../components/AgeGate";

// Mock ScaledText since it uses context and complex styles
jest.mock("@/components/ScaledText", () => {
  const { Text: RNText } = require("react-native");
  return {
    Text: (props: any) => <RNText {...props} />,
  };
});

describe("AgeGate component", () => {
  test("renders with default title and message", () => {
    render(<AgeGate />);
    
    expect(screen.getByText("Not available")).toBeTruthy();
    expect(screen.getByText("This section is not available for this age.")).toBeTruthy();
  });

  test("renders with custom title and message", () => {
    const customTitle = "Locked Content";
    const customMessage = "You must be older to see this.";
    
    render(<AgeGate title={customTitle} message={customMessage} />);
    
    expect(screen.getByText(customTitle)).toBeTruthy();
    expect(screen.getByText(customMessage)).toBeTruthy();
  });
});
