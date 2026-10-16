import { displayName, initials } from "../src/profile";

describe("profile", () => {
  test("shows the first name and last initial", () => {
    expect(displayName({ firstName: "Sam", lastName: "Rivera" })).toBe("Sam R.");
  });

  test("shows just the first name when there's no last name", () => {
    expect(displayName({ firstName: "Sam", lastName: "" })).toBe("Sam");
  });

  test("makes initials", () => {
    expect(initials({ firstName: "sam", lastName: "rivera" })).toBe("SR");
  });

  test("shows just the last name when there's no first name", () => {
    expect(displayName({ firstName: " ", lastName: "Rivera" })).toBe("Rivera");
  });
});
