import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ThemedText } from "../components/themed-text";
import { ThemedView } from "../components/themed-view";
import { Skeleton } from "../components/Skeleton";
import { Colors } from "../constants/theme";

// Mock ScaledText
jest.mock("@/components/ScaledText", () => {
  const { Text: RNText } = require("react-native");
  return { Text: (props: any) => <RNText {...props} /> };
});

// Mock AppTheme
const mockUseAppTheme = jest.fn();
jest.mock("@/app/theme/AppThemeProvider", () => ({
  useAppTheme: () => mockUseAppTheme(),
}));

// Mock UISkeleton
jest.mock("@/components/ui/hero", () => {
  const { View: RNView } = require("react-native");
  return { UISkeleton: (props: any) => <RNView {...props} /> };
});

describe("Mobile UI Components", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppTheme.mockReturnValue({
      colors: Colors.dark,
      colorScheme: "dark",
    });
  });

  describe("ThemedText", () => {
    test("TC-UI001: renders default text style", () => {
      render(<ThemedText>Default Text</ThemedText>);
      const text = screen.getByText("Default Text");
      expect(text.props.style).toContainEqual(expect.objectContaining({ color: Colors.dark.text }));
    });

    test("TC-UI002: renders title style", () => {
      render(<ThemedText type="title">Title Text</ThemedText>);
      const text = screen.getByText("Title Text");
      expect(text.props.style).toContainEqual(expect.objectContaining({ fontSize: 36, fontWeight: "bold" }));
    });

    test("TC-UI003: applies lightColor override in light mode", () => {
      mockUseAppTheme.mockReturnValue({
        colors: Colors.light,
        colorScheme: "light",
      });
      render(<ThemedText lightColor="red" darkColor="blue">Override</ThemedText>);
      const text = screen.getByText("Override");
      expect(text.props.style).toContainEqual(expect.objectContaining({ color: "red" }));
    });

    test("TC-UI004: applies darkColor override in dark mode", () => {
      render(<ThemedText lightColor="red" darkColor="blue">Override</ThemedText>);
      const text = screen.getByText("Override");
      expect(text.props.style).toContainEqual(expect.objectContaining({ color: "blue" }));
    });

    test("TC-UI005: renders link style with accent color", () => {
      render(<ThemedText type="link">Link</ThemedText>);
      const text = screen.getByText("Link");
      expect(text.props.style).toContainEqual(expect.objectContaining({ color: Colors.dark.accent }));
    });
  });

  describe("ThemedView", () => {
    test("TC-UI006: renders with default background", () => {
      const { getByTestId } = render(<ThemedView testID="view" />);
      expect(getByTestId("view").props.style).toContainEqual(expect.objectContaining({ backgroundColor: Colors.dark.background }));
    });

    test("TC-UI007: renders with secondary variant background", () => {
      const { getByTestId } = render(<ThemedView testID="view" variant="secondary" />);
      expect(getByTestId("view").props.style).toContainEqual(expect.objectContaining({ backgroundColor: Colors.dark.backgroundSecondary }));
    });

    test("TC-UI008: applies custom style alongside themed background", () => {
      const { getByTestId } = render(<ThemedView testID="view" style={{ marginTop: 10 }} />);
      const style = getByTestId("view").props.style;
      expect(style).toContainEqual(expect.objectContaining({ backgroundColor: Colors.dark.background }));
      expect(style).toContainEqual(expect.objectContaining({ marginTop: 10 }));
    });

    test("TC-UI009: applies lightColor override in light mode", () => {
      mockUseAppTheme.mockReturnValue({
        colors: Colors.light,
        colorScheme: "light",
      });
      const { getByTestId } = render(<ThemedView testID="view" lightColor="red" darkColor="blue" />);
      expect(getByTestId("view").props.style).toContainEqual(expect.objectContaining({ backgroundColor: "red" }));
    });

    test("TC-UI010: applies darkColor override in dark mode", () => {
      const { getByTestId } = render(<ThemedView testID="view" lightColor="red" darkColor="blue" />);
      expect(getByTestId("view").props.style).toContainEqual(expect.objectContaining({ backgroundColor: "blue" }));
    });
  });

  describe("Skeleton", () => {
    test("TC-UI011: renders with specified dimensions", () => {
      const { getByTestId } = render(<Skeleton width={100} height={50} style={{ testID: "skeleton" } as any} />);
      // Note: UISkeleton is mocked as RNView, and Skeleton passes style through
      const skeleton = screen.toJSON();
      // Inspecting props of the UISkeleton mock
      expect(skeleton.props.style).toContainEqual(expect.objectContaining({ width: 100, height: 50 }));
    });

    test("TC-UI012: applies circle rounding", () => {
      const { getByTestId } = render(<Skeleton width={50} height={50} circle style={{ testID: "skeleton" } as any} />);
      const skeleton = screen.toJSON();
      expect(skeleton.props.style).toContainEqual(expect.objectContaining({ borderRadius: 999 }));
      expect(skeleton.props.className).toBe("rounded-full");
    });

    test("TC-UI013: uses default borderRadius", () => {
      const { getByTestId } = render(<Skeleton width={100} height={50} style={{ testID: "skeleton" } as any} />);
      const skeleton = screen.toJSON();
      expect(skeleton.props.style).toContainEqual(expect.objectContaining({ borderRadius: 8 }));
    });

    test("TC-UI014: allows overriding borderRadius", () => {
      const { getByTestId } = render(<Skeleton width={100} height={50} borderRadius={16} style={{ testID: "skeleton" } as any} />);
      const skeleton = screen.toJSON();
      expect(skeleton.props.style).toContainEqual(expect.objectContaining({ borderRadius: 16 }));
    });

    test("TC-UI015: accepts string dimensions (e.g. 100%)", () => {
      const { getByTestId } = render(<Skeleton width="100%" height={50} style={{ testID: "skeleton" } as any} />);
      const skeleton = screen.toJSON();
      expect(skeleton.props.style).toContainEqual(expect.objectContaining({ width: "100%" }));
    });
  });
});
