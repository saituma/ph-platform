import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import LoginPage from "@/app/login/page";

const replaceMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("login page", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    global.fetch = jest.fn();
    document.cookie = "csrfToken=csrf-1";
  });

  it("submits credentials and redirects on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(<LoginPage />);

    fireEvent.change(await screen.findByLabelText(/email/i), { target: { value: "coach@test.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": "csrf-1" },
        body: JSON.stringify({ email: "coach@test.com", password: "Password123" }),
      });
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });

  it("shows API error when login fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    render(<LoginPage />);

    fireEvent.change(await screen.findByLabelText(/email/i), { target: { value: "coach@test.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "WrongPassword" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
