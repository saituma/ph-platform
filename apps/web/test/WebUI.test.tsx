import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

describe("Web UI Components", () => {
  describe("Badge", () => {
    test("TC-WUI001: renders default badge", () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText("Default");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-secondary");
    });

    test("TC-WUI002: renders primary variant", () => {
      render(<Badge variant="primary">Primary</Badge>);
      const badge = screen.getByText("Primary");
      expect(badge).toHaveClass("bg-primary");
    });

    test("TC-WUI003: renders accent variant", () => {
      render(<Badge variant="accent">Accent</Badge>);
      const badge = screen.getByText("Accent");
      expect(badge).toHaveClass("bg-accent");
    });

    test("TC-WUI004: renders outline variant", () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText("Outline");
      expect(badge).toHaveClass("text-foreground");
    });

    test("TC-WUI005: applies custom className", () => {
      render(<Badge className="custom-class">Custom</Badge>);
      expect(screen.getByText("Custom")).toHaveClass("custom-class");
    });
  });

  describe("Button", () => {
    test("TC-WUI006: renders default button", () => {
      render(<Button>Click Me</Button>);
      const btn = screen.getByRole("button", { name: /click me/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass("bg-primary");
    });

    test("TC-WUI007: renders destructive variant", () => {
      render(<Button variant="destructive">Delete</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-destructive");
    });

    test("TC-WUI008: renders small size", () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-9");
    });

    test("TC-WUI009: renders large size", () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-11");
    });

    test("TC-WUI010: handles onClick event", () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      fireEvent.click(screen.getByText("Click"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test("TC-WUI011: is disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    test("TC-WUI012: renders as child using Slot", () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      const link = screen.getByRole("link", { name: /link button/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveClass("bg-primary");
    });
  });

  describe("Input", () => {
    test("TC-WUI013: renders input field", () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    });

    test("TC-WUI014: handles value change", () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "hello" } });
      expect(handleChange).toHaveBeenCalled();
    });

    test("TC-WUI015: displays initial value", () => {
      render(<Input defaultValue="initial" />);
      expect(screen.getByDisplayValue("initial")).toBeInTheDocument();
    });

    test("TC-WUI016: respects type attribute (e.g. password)", () => {
      const { container } = render(<Input type="password" />);
      const input = container.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    test("TC-WUI017: is disabled when disabled prop is true", () => {
      render(<Input disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    test("TC-WUI018: applies custom className to input", () => {
      render(<Input className="border-red-500" />);
      expect(screen.getByRole("textbox")).toHaveClass("border-red-500");
    });

    test("TC-WUI019: focuses when clicked", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      input.focus();
      expect(input).toHaveFocus();
    });

    test("TC-WUI020: renders with required attribute", () => {
      render(<Input required />);
      expect(screen.getByRole("textbox")).toBeRequired();
    });
  });
});
