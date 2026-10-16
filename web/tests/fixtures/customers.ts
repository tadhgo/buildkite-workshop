import type { Customer } from "../../src/customers";

export const customers: Customer[] = [
  { id: 1, firstName: "Aoife", lastName: "O'Brien", email: "aoife@example.com" },
  { id: 2, firstName: "Marco", lastName: "D'Angelo", email: "marco@example.com" },
  { id: 3, firstName: "Siobhan", lastName: "O'Neil", email: "siobhan@example.com" },
  { id: 4, firstName: "Priya", lastName: "D'Souza", email: "priya@example.com" },
  { id: 5, firstName: "Liam", lastName: "O'Connor", email: "liam@example.com" },
  { id: 6, firstName: "Sam", lastName: "Rivera", email: "sam@example.com" },
  { id: 7, firstName: "Mei", lastName: "Nguyen", email: "mei@example.com" },
  { id: 8, firstName: "Ana", lastName: "Garcia", email: "ana@example.com" },
  { id: 9, firstName: "Ravi", lastName: "Patel", email: "ravi@example.com" },
  { id: 10, firstName: "Jo", lastName: "Smith", email: "jo@example.com" },
];

export function anyCustomer(): Customer {
  return customers[Math.floor(Math.random() * customers.length)];
}
