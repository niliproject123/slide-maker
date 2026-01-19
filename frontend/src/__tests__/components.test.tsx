import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

describe("UI Components", () => {
  describe("Button", () => {
    it("renders with text", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button")).toHaveTextContent("Click me");
    });

    it("applies variant classes", () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-red-600");
    });

    it("applies size classes", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-8");
    });

    it("handles click events", async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      await userEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("can be disabled", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("Input", () => {
    it("renders an input element", () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    });

    it("accepts user input", async () => {
      render(<Input data-testid="test-input" />);
      const input = screen.getByTestId("test-input");
      await userEvent.type(input, "Hello");
      expect(input).toHaveValue("Hello");
    });
  });

  describe("Card", () => {
    it("renders card with header and content", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
          <CardContent>Test content</CardContent>
        </Card>
      );
      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test content")).toBeInTheDocument();
    });
  });
});
