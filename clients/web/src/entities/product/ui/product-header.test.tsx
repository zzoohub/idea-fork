import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/src/shared/test/with-intl";
import { ProductHeader } from "./product-header";

describe("ProductHeader", () => {
  describe("name and category", () => {
    it("renders the product name as h1", () => {
      renderWithIntl(
        <ProductHeader name="Acme App" category="Productivity" />
      );
      expect(
        screen.getByRole("heading", { level: 1, name: "Acme App" })
      ).toBeInTheDocument();
    });

    it("renders the category", () => {
      renderWithIntl(<ProductHeader name="MyApp" category="Finance" />);
      expect(screen.getByText("Finance")).toBeInTheDocument();
    });
  });

  describe("description", () => {
    it("renders description when provided", () => {
      renderWithIntl(
        <ProductHeader
          name="App"
          category="Tools"
          description="A productivity tool"
        />
      );
      expect(screen.getByText("A productivity tool")).toBeInTheDocument();
    });

    it("does not render description when not provided", () => {
      const { container } = renderWithIntl(
        <ProductHeader name="App" category="Tools" />
      );
      // Only the category text should appear, no description paragraph
      expect(container.querySelectorAll("p")).toHaveLength(0);
    });
  });

  describe("icon / avatar", () => {
    it("renders img when iconUrl is provided", () => {
      const { container } = renderWithIntl(
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
      renderWithIntl(<ProductHeader name="Zendesk" category="CRM" />);
      // First letter uppercase
      expect(screen.getByText("Z")).toBeInTheDocument();
    });
  });

  describe("websiteUrl", () => {
    it("renders website link when websiteUrl is provided", () => {
      renderWithIntl(
        <ProductHeader
          name="App"
          category="Tools"
          websiteUrl="https://example.com"
        />
      );
      const link = screen.getByRole("link", { name: /example\.com/i });
      expect(link).toHaveAttribute("href", "https://example.com");
    });

    it("opens website link in new tab", () => {
      renderWithIntl(
        <ProductHeader
          name="App"
          category="Tools"
          websiteUrl="https://example.com"
        />
      );
      const link = screen.getByRole("link", { name: /example\.com/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("does not render website link when websiteUrl is not provided", () => {
      renderWithIntl(<ProductHeader name="App" category="Tools" />);
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("merges custom className", () => {
      const { container } = renderWithIntl(
        <ProductHeader name="App" category="Tools" className="custom-header" />
      );
      expect(container.firstChild).toHaveClass("custom-header");
    });

    it("renders without className prop", () => {
      const { container } = renderWithIntl(
        <ProductHeader name="App" category="Tools" />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
