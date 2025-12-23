const express = require("express");

module.exports = function (students, saveData) {
  const router = express.Router();

  /* ===============================
     BASIC CRUD ROUTES
  =============================== */

  // GET ALL STUDENTS
  router.get("/", (req, res) => {
    res.json(students);
  });

  // GET ONE STUDENT
  router.get("/:prn", (req, res) => {
    const prn = req.params.prn;
    const stu = students.find((s) => s.prn == prn);
    res.json(stu || {});
  });

  // ADD STUDENT
  router.post("/add", (req, res) => {
    students.push(req.body);
    saveData("students.json", students);
    res.json({ message: "Student added" });
  });

  // UPDATE STUDENT
  router.put("/:prn", (req, res) => {
    const prn = req.params.prn;
    students = students.map((s) => (s.prn == prn ? { ...s, ...req.body } : s));
    saveData("students.json", students);
    res.json({ message: "Student updated" });
  });

  // DELETE STUDENT
  router.delete("/:prn", (req, res) => {
    const prn = req.params.prn;
    students = students.filter((s) => s.prn != prn);
    saveData("students.json", students);
    res.json({ message: "Student deleted" });
  });

  /* ===============================
     DASHBOARD API ROUTES
  =============================== */

  // TOTAL STUDENTS
  router.get("/stats/total", (req, res) => {
    res.json({ total: students.length });
  });

  // YEAR-WISE STUDENT COUNT
  router.get("/stats/year", (req, res) => {
    let counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    students.forEach((s) => {
      if (s.year >= 1 && s.year <= 4) {
        counts[s.year]++;
      }
    });

    res.json(counts);
  });

  /* ===============================
     TOPPER ROUTES
  =============================== */

  router.get("/topper/all", (req, res) => {
    let toppers = { 1: null, 2: null, 3: null, 4: null };

    students.forEach((s) => {
      const avg = s.average || 0;

      if (!toppers[s.year] || avg > (toppers[s.year].average || 0)) {
        toppers[s.year] = s;
      }
    });

    res.json(toppers);
  });

  // SEARCH BY NAME (case-insensitive)
  router.get("/search/name/:name", (req, res) => {
    const name = req.params.name.toLowerCase();

    const result = students.filter((s) => s.name.toLowerCase().includes(name));

    res.json(result);
  });

  return router;
};
