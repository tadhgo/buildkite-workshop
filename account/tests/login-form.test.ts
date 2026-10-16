import { isValidEmail, passwordProblems, validateLoginForm } from "../src/login-form";

describe("login form", () => {
  test("accepts a normal email address", () => {
    expect(isValidEmail("sam@example.com")).toBe(true);
  });

  test("rejects an email without a domain", () => {
    expect(isValidEmail("sam@")).toBe(false);
  });

  test("explains what's wrong with a weak password", () => {
    expect(passwordProblems("kites")).toEqual([
      "Use at least 12 characters.",
      "Mix letters and numbers.",
    ]);
  });

  test("a good email and password pass", () => {
    expect(
      validateLoginForm({ email: "sam@example.com", password: "boxkite2026sky" }),
    ).toEqual({ valid: true, errors: [] });
  });

  test("collects every error at once", () => {
    const result = validateLoginForm({ email: "nope", password: "short" });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });
});
