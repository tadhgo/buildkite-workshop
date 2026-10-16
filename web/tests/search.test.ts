import { CustomerDirectory } from "../src/customers";
import { anyCustomer, customers } from "./fixtures/customers";

describe("search", () => {
  let directory: CustomerDirectory;

  beforeAll(async () => {
    directory = await CustomerDirectory.create(customers);
  });

  afterAll(() => {
    directory.close();
  });

  test("finds a customer by last name", () => {
    const customer = anyCustomer();
    const results = directory.findByLastName(customer.lastName);
    expect(results.map((c) => c.lastName)).toEqual([customer.lastName]);
  });

  test("ignores case", () => {
    const results = directory.findByLastName("rivera");
    expect(results.map((c) => c.firstName)).toEqual(["Sam"]);
  });

  test("returns nothing for an unknown name", () => {
    expect(directory.findByLastName("Nobody")).toEqual([]);
  });
});
