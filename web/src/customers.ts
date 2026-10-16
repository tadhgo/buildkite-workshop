import initSqlJs, { type Database } from "sql.js";

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export class CustomerDirectory {
  constructor(private db: Database) {}

  static async create(customers: Customer[]): Promise<CustomerDirectory> {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run(`
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL
      )
    `);
    const insert = db.prepare(
      "INSERT INTO customers (id, first_name, last_name, email) VALUES (?, ?, ?, ?)",
    );
    for (const c of customers) {
      insert.run([c.id, c.firstName, c.lastName, c.email]);
    }
    insert.free();
    return new CustomerDirectory(db);
  }

  findByLastName(lastName: string): Customer[] {
    const result = this.db.exec(
      "SELECT id, first_name, last_name, email FROM customers " +
        "WHERE lower(last_name) = lower('" + lastName + "') " +
        "ORDER BY first_name",
    );
    if (result.length === 0) {
      return [];
    }
    return result[0].values.map(([id, firstName, lastName, email]) => ({
      id: Number(id),
      firstName: String(firstName),
      lastName: String(lastName),
      email: String(email),
    }));
  }

  close(): void {
    this.db.close();
  }
}
