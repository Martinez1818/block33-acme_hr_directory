const express = require("express");
const app = express();
const pg = require("pg");
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_hr_directory"
);

const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(require("morgan")("dev"));

// Routes

// GET /api/employees
app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = `
      SELECT * FROM employees ORDER BY created_at DESC;
    `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/departments
app.get("/api/departments", async (req, res, next) => {
  try {
    const SQL = `
      SELECT * FROM departments;
    `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/employees
app.post("/api/employees", async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = `
      INSERT INTO employees (name, department_id)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const response = await client.query(SQL, [name, department_id]);
    res.send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employees/:id
app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
      DELETE FROM employees
      WHERE id = $1;
    `;
    await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// PUT /api/employees/:id
app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = `
      UPDATE employees
      SET name = $1, department_id = $2, updated_at = now()
      WHERE id = $3
      RETURNING *;
    `;
    const response = await client.query(SQL, [
      name,
      department_id,
      req.params.id,
    ]);
    res.send(response.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({ error: err.message });
});

// Initialize Database
const init = async () => {
  try {
    await client.connect();

    // Drop existing tables
    let SQL = `
      DROP TABLE IF EXISTS employees;
      DROP TABLE IF EXISTS departments;
    `;
    await client.query(SQL);

    // Create tables
    SQL = `
      CREATE TABLE departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL
      );

      CREATE TABLE employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        department_id INTEGER REFERENCES departments(id)
      );
    `;
    await client.query(SQL);
    console.log("Tables created");

    // Seed data
    SQL = `
      INSERT INTO departments (name) VALUES ('Engineering');
      INSERT INTO departments (name) VALUES ('HR');
      INSERT INTO departments (name) VALUES ('Sales');
      
      INSERT INTO employees (name, department_id) VALUES ('Alice', 1);
      INSERT INTO employees (name, department_id) VALUES ('Bob', 2);
      INSERT INTO employees (name, department_id) VALUES ('Charlie', 3);
    `;
    await client.query(SQL);
    console.log("Data seeded");

    // Start server
    app.listen(port, () => console.log(`Server listening on port ${port}`));
  } catch (err) {
    console.error(err);
  }
};

init();
