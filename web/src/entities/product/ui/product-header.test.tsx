import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductHeader } from "./product-header";

describe("ProductHeader", () => {
  describe("name and category", () => {
    it("renders the product name as h1", () => {
      render(
        <ProductHeader name="Acme App" category="Productivity" />
      );
      expect(
        screen.getByRole("heading", { level: 1, name: "Acme App" })
      ).toBeInTheDocument();
    });

    it("renders the category", () => {
      render(<ProductHeader name="MyApp" category="Finance" />);
      expect(screen.getByText("Finance")).toBeInTheDocument();
    });
  });

  describe("icon / avatar", () => {
    it("renders img when iconUrl is provided", () => {
      const { container } = render(
        <ProductHeader
          name="Acme"
          category="Tools"
          iconUrl="https://example.com/icon.png"
        />
      );
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/icon.png");
    });

    it("renders letter avatar when iconUrl is not provided", () => {
      render(<ProductHeader name="Zendesk" category="CRM" />);
      // First letter uppercase
      expect(screen.getByText("Z")).toBeInTheDocument();
    });
  });

  describe("websiteUrl", () => {
    it("renders Website link when websiteUrl is provided", () => {
      render(
        <ProductHeader
          name="App"
          category="Tools"
          websiteUrl="https://example.com"
        />
      );
      const link = screen.getByRole("link", { name: /Website/i });
      expect(link).toHaveAttribute("href", "https://example.com");
    });

    it("opens website link in new tab", () => {
      render(
        <ProductHeader
          name="App"
          category="Tools"
          websiteUrl="https://example.com"
        />
      );
      const link = screen.getByRole("link", { name: /Website/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("does not render Website link when websiteUrl is not provided", () => {
      render(<ProductHeader name="App" category="Tools" />);
      expect(screen.queryByRole("link", { name: /Website/i })).not.toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = render(
        <ProductHeader name="App" category="Tools" className="custom-header" />
      );
      expect(container.firstChild).toHaveClass("custom-header");
    });

    it("renders without className prop", () => {
      const { container } = render(
        <ProductHeader name="App" category="Tools" />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
