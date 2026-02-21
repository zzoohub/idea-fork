import { describe, it, expect } from "vitest";
import { ApiError } from "./errors";

describe("ApiError", () => {
  describe("construction", () => {
    it("stores the status code", () => {
      const err = new ApiError(404, "Not Found", "Resource was not found");
      expect(err.status).toBe(404);
    });

    it("stores the title", () => {
      const err = new ApiError(404, "Not Found", "Resource was not found");
      expect(err.title).toBe("Not Found");
    });

    it("stores the detail", () => {
      const err = new ApiError(404, "Not Found", "Resource was not found");
      expect(err.detail).toBe("Resource was not found");
    });

    it("sets name to ApiError", () => {
      const err = new ApiError(500, "Server Error", "Something went wrong");
      expect(err.name).toBe("ApiError");
    });

    it("formats the message as 'status title: detail'", () => {
      const err = new ApiError(422, "Unprocessable Entity", "Validation failed");
      expect(err.message).toBe("422 Unprocessable Entity: Validation failed");
    });

    it("is an instance of Error", () => {
      const err = new ApiError(400, "Bad Request", "Invalid input");
      expect(err).toBeInstanceOf(Error);
    });

    it("is an instance of ApiError", () => {
      const err = new ApiError(400, "Bad Request", "Invalid input");
      expect(err).toBeInstanceOf(ApiError);
    });

    it("works with 401 status", () => {
      const err = new ApiError(401, "Unauthorized", "Missing token");
      expect(err.status).toBe(401);
      expect(err.title).toBe("Unauthorized");
      expect(err.detail).toBe("Missing token");
    });

    it("works with 500 status", () => {
      const err = new ApiError(500, "Internal Server Error", "Unexpected failure");
      expect(err.message).toBe("500 Internal Server Error: Unexpected failure");
    });
  });
});
