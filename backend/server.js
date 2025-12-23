const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());

// ================= LOAD & SAVE JSON ==================
function loadData(filename) {
  try {
    if (!fs.existsSync(filename)) return [];
    const text = fs.readFileSync(filename, "utf-8").trim();
    if (text === "") return []; // avoid error on empty file
    return JSON.parse(text);
  } catch (err) {
    console.error("Error reading file", filename, err);
    return [];
  }
}

function saveData(filename, data) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing file", filename, err);
  }
}

// Load JSON files NOW
let students = loadData("students.json");
let projects = loadData("projects.json");

// ================= ROUTES ===================
// pass students + saveData into route file
const studentRoutes = require("./routes/studentRoutes")(students, saveData);
app.use("/api/students", studentRoutes);

// LOGIN ROUTE
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
});

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("StudentCP Backend is running!");
});

// START SERVER
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
