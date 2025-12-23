const API = "http://localhost:5000";

/* ============ ADMIN AUTH HELPERS ============ */
function isAdmin() {
  return localStorage.getItem("isAdmin") === "true";
}

function requireAdminForPage() {
  // Protect pages with these IDs:
  const adminElements = [
    "studentForm",
    "updateForm",
    "attendanceForm",
    "dashboard",
  ];
  const needAdmin = adminElements.some((id) => document.getElementById(id));
  if (needAdmin && !isAdmin()) {
    alert("Please login as admin to access this page.");
    window.location.href = "login.html";
  }
}

/* ============ ADMIN LOGIN PAGE ============ */
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const res = await fetch(API + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        localStorage.setItem("isAdmin", "true");
        alert("Login successful!");
        window.location.href = "dashboard.html";
      } else {
        alert("Invalid credentials. Try admin / admin123");
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  });
}

/* ============ UTIL: PRN FROM URL ============ */
function getPRNFromURL() {
  return new URLSearchParams(window.location.search).get("prn");
}

/* ============ GLOBAL: ALL STUDENTS FOR FILTERING ============ */
let allStudents = [];

/* ============ LIST PAGE WITH SORT + FILTER ============ */
async function loadStudents() {
  const container = document.getElementById("students");
  if (!container) return; // only on list.html

  try {
    const res = await fetch(API + "/api/students");
    allStudents = await res.json(); // store globally

    applyFiltersAndSort(); // render with current filters
  } catch (err) {
    console.error("Error loading students:", err);
  }
}

// Render helper – shows list of students as cards
function renderStudents(list) {
  const container = document.getElementById("students");
  if (!container) return;

  let output = "";

  list.forEach((s) => {
    const attendance = s.attendancePercentage
      ? s.attendancePercentage.toFixed(2)
      : 0;

    const avgMarks = s.average ? s.average.toFixed(2) : "N/A";

    output += `
      <div class="card" style="
        background:white;
        padding:20px;
        margin:15px auto;
        width:350px;
        box-shadow:0 0 10px rgba(0,0,0,0.1);
        border-radius:10px;
      ">
        <h3>${s.name}</h3>
        <p><strong>PRN:</strong> ${s.prn}</p>
        <p><strong>Year:</strong> ${s.year}</p>
        <p><strong>Division:</strong> ${s.division}</p>
        <p><strong>Attendance:</strong> ${attendance}%</p>
        <p><strong>Average Marks:</strong> ${avgMarks}</p>

        <button onclick="goToProfile(${s.prn})"
          style="background:#6c757d;color:white;border:none;padding:8px 15px;margin-right:10px;border-radius:5px;cursor:pointer;">
          Profile
        </button>

        <button onclick="goToUpdate(${s.prn})"
          style="background:#007bff;color:white;border:none;padding:8px 15px;margin-right:10px;border-radius:5px;cursor:pointer;">
          Update
        </button>

        <button onclick="deleteStudent(${s.prn})"
          style="background:red;color:white;border:none;padding:8px 15px;border-radius:5px;cursor:pointer;">
          Delete
        </button>
      </div>
    `;
  });

  container.innerHTML = output;
}

// Apply filter + sort based on controls in list.html
function applyFiltersAndSort() {
  if (!allStudents || allStudents.length === 0) {
    renderStudents([]);
    return;
  }

  let filtered = allStudents.slice(); // clone

  const sortBy = document.getElementById("sortBy")?.value || "";
  const filterYear = document.getElementById("filterYear")?.value || "";
  const filterDivision = document.getElementById("filterDivision")?.value || "";
  const minAttVal = document.getElementById("filterMinAttendance")?.value || "";
  const minMarksVal = document.getElementById("filterMinMarks")?.value || "";

  // Filter by year
  if (filterYear) {
    const y = Number(filterYear);
    filtered = filtered.filter((s) => s.year === y);
  }

  // Filter by division
  if (filterDivision) {
    filtered = filtered.filter(
      (s) =>
        s.division && s.division.toUpperCase() === filterDivision.toUpperCase()
    );
  }

  // Min attendance
  if (minAttVal !== "") {
    const minAtt = Number(minAttVal);
    filtered = filtered.filter(
      (s) => s.attendancePercentage != null && s.attendancePercentage >= minAtt
    );
  }

  // Min average marks
  if (minMarksVal !== "") {
    const minMarks = Number(minMarksVal);
    filtered = filtered.filter(
      (s) => s.average != null && s.average >= minMarks
    );
  }

  // Sorting
  if (sortBy) {
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "prn":
          return a.prn - b.prn;
        case "year":
          return a.year - b.year;
        case "attendance":
          return (b.attendancePercentage || 0) - (a.attendancePercentage || 0);
        case "average":
          return (b.average || 0) - (a.average || 0);
        default:
          return 0;
      }
    });
  }

  renderStudents(filtered);
}

// Attach Apply / Reset events after DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  const applyBtn = document.getElementById("applyFilters");
  const resetBtn = document.getElementById("resetFilters");

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      applyFiltersAndSort();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const sortBy = document.getElementById("sortBy");
      const fy = document.getElementById("filterYear");
      const fd = document.getElementById("filterDivision");
      const fa = document.getElementById("filterMinAttendance");
      const fm = document.getElementById("filterMinMarks");

      if (sortBy) sortBy.value = "";
      if (fy) fy.value = "";
      if (fd) fd.value = "";
      if (fa) fa.value = "";
      if (fm) fm.value = "";

      renderStudents(allStudents);
    });
  }
});

// Initial load (safe – does nothing if not on list.html)
loadStudents();

/* ============ ADD STUDENT PAGE ============ */
if (document.getElementById("studentForm")) {
  requireAdminForPage();

  document
    .getElementById("studentForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const present = Number(document.getElementById("present").value);
      const total = Number(document.getElementById("total").value);
      const attendancePercentage = total > 0 ? (present / total) * 100 : 0;

      const marks = [];
      ["m1", "m2", "m3", "m4", "m5"].forEach((id) => {
        const val = Number(document.getElementById(id).value);
        if (!isNaN(val) && document.getElementById(id).value !== "")
          marks.push(val);
      });

      let average = 0;
      if (marks.length > 0) {
        const sum = marks.reduce((a, b) => a + b, 0);
        average = sum / marks.length;
      }

      const studentData = {
        name: document.getElementById("name").value,
        prn: Number(document.getElementById("prn").value),
        rollno: Number(document.getElementById("rollno").value),
        division: document.getElementById("division").value,
        year: Number(document.getElementById("year").value),
        attendancePercentage,
        present,
        total,
        marks,
        average,
      };

      await fetch(API + "/api/students/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
      });

      alert("Student Added Successfully!");
      document.getElementById("studentForm").reset();
    });
}

/* ============ DELETE STUDENT ============ */
let lastDeleted = null;

async function deleteStudent(prn) {
  if (!isAdmin()) {
    alert("Only admin can delete students.");
    return;
  }

  // Confirm first
  if (!confirm("Are you sure you want to delete this student?")) return;

  // Fetch student ONLY AFTER confirmation
  const res = await fetch(API + "/api/students/" + prn);
  lastDeleted = await res.json();

  console.log("Saved deleted student:", lastDeleted);

  // Delete student
  await fetch(API + "/api/students/" + prn, {
    method: "DELETE",
  });

  // Show Undo bar
  const undoBar = document.getElementById("undoBar");
  if (undoBar) undoBar.classList.remove("undo-hidden");

  loadStudents();
}
window.deleteStudent = deleteStudent;

async function undoDelete() {
  console.log("UNDO BUTTON CLICKED");
  if (!lastDeleted) {
    console.log("Nothing to undo");
    return;
  }

  console.log("Restoring student:", lastDeleted);

  // Restore student
  await fetch(API + "/api/students/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lastDeleted),
  });

  // Clear stored deleted record
  lastDeleted = null;

  // Hide undo bar
  const undoBar = document.getElementById("undoBar");
  if (undoBar) undoBar.classList.add("undo-hidden");

  alert("Student restored successfully!");

  loadStudents();
}
window.undoDelete = undoDelete;

/* ============ UPDATE STUDENT PAGE ============ */
function goToUpdate(prn) {
  if (!isAdmin()) {
    alert("Login as admin to update.");
    window.location.href = "login.html";
    return;
  }
  window.location.href = "update.html?prn=" + prn;
}

async function loadStudentForUpdate() {
  if (!document.getElementById("updateForm")) return;

  requireAdminForPage();

  const prn = getPRNFromURL();
  const res = await fetch(API + "/api/students/" + prn);
  const s = await res.json();

  document.getElementById("u_name").value = s.name;
  document.getElementById("u_rollno").value = s.rollno;
  document.getElementById("u_division").value = s.division;
  document.getElementById("u_year").value = s.year;

  document.getElementById("u_present").value = s.present ?? 0;
  document.getElementById("u_total").value = s.total ?? 0;

  // Fill marks
  const marks = s.marks || [];
  document.getElementById("u_m1").value = marks[0] ?? "";
  document.getElementById("u_m2").value = marks[1] ?? "";
  document.getElementById("u_m3").value = marks[2] ?? "";
  document.getElementById("u_m4").value = marks[3] ?? "";
  document.getElementById("u_m5").value = marks[4] ?? "";
}

if (document.getElementById("updateForm")) {
  document
    .getElementById("updateForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const prn = getPRNFromURL();

      const present = Number(document.getElementById("u_present").value);
      const total = Number(document.getElementById("u_total").value);
      const attendancePercentage = total > 0 ? (present / total) * 100 : 0;

      const marks = [];
      ["u_m1", "u_m2", "u_m3", "u_m4", "u_m5"].forEach((id) => {
        const val = Number(document.getElementById(id).value);
        if (!isNaN(val) && document.getElementById(id).value !== "")
          marks.push(val);
      });

      let average = 0;
      if (marks.length > 0) {
        const sum = marks.reduce((a, b) => a + b, 0);
        average = sum / marks.length;
      }

      const updatedData = {
        name: document.getElementById("u_name").value,
        rollno: Number(document.getElementById("u_rollno").value),
        division: document.getElementById("u_division").value,
        year: Number(document.getElementById("u_year").value),
        attendancePercentage,
        present,
        total,
        marks,
        average,
      };

      await fetch(API + "/api/students/" + prn, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      alert("Student updated!");
      window.location.href = "list.html";
    });

  loadStudentForUpdate();
}

/* ============ ATTENDANCE PAGE ============ */
if (document.getElementById("attendanceForm")) {
  requireAdminForPage();

  document
    .getElementById("attendanceForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const prn = Number(document.getElementById("a_prn").value);
      const presentValue =
        document.getElementById("a_present").value === "true";

      const res = await fetch(API + "/api/students/attendance/" + prn, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ present: presentValue }),
      });

      const data = await res.json();

      if (data.student) {
        alert(
          `Attendance updated! New attendance: ${data.student.attendancePercentage.toFixed(
            2
          )}%`
        );
      } else {
        alert("Student not found");
      }

      document.getElementById("attendanceForm").reset();
    });
}

/* ============ SEARCH PAGE ============ */
async function searchByName() {
  const name = document.getElementById("searchName").value.trim();
  if (!name) {
    alert("Enter a name");
    return;
  }

  const res = await fetch(
    API + "/api/students/search/name/" + encodeURIComponent(name)
  );
  const data = await res.json();

  const container = document.getElementById("searchResults");

  // If no match found → Show message
  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="card" style="width:450px;">
        <h3>No student found</h3>
        <p>There is no student named "<strong>${name}</strong>" in the database.</p>
      </div>
    `;
    return;
  }

  // If matches found → Show cards
  let output = "";
  data.forEach((s) => {
    const attendance = s.attendancePercentage
      ? s.attendancePercentage.toFixed(2)
      : 0;

    const avgMarks = s.average ? s.average.toFixed(2) : "N/A";

    output += `
      <div class="card" style="width:450px;">
        <h3>${s.name}</h3>
        <p><strong>PRN:</strong> ${s.prn}</p>
        <p><strong>Attendance:</strong> ${attendance}%</p>
        <p><strong>Average Marks:</strong> ${avgMarks}</p>

        <button onclick="goToProfile(${s.prn})"
          style="background:#6c757d;color:white;padding:8px 15px;border:none;border-radius:5px;cursor:pointer;">
          Profile
        </button>
      </div>
    `;
  });

  container.innerHTML = output;
}

async function searchByPRN() {
  const prn = document.getElementById("searchPrn").value.trim();
  if (!prn) return alert("Enter a PRN!");

  const res = await fetch(API + "/api/students/" + prn);
  const s = await res.json();

  const container = document.getElementById("searchResults");

  // If no student found → show message
  if (!s || Object.keys(s).length === 0) {
    container.innerHTML = `
      <div class="card" style="width:450px;">
        <h3>No student found</h3>
        <p>No student exists with PRN <strong>${prn}</strong> in the database.</p>
      </div>
    `;
    return;
  }

  // If found → display student card
  const attendance = s.attendancePercentage
    ? s.attendancePercentage.toFixed(2)
    : 0;

  const avgMarks = s.average ? s.average.toFixed(2) : "N/A";

  container.innerHTML = `
    <div class="card" style="width:450px;">
      <h3>${s.name}</h3>
      <p><strong>PRN:</strong> ${s.prn}</p>
      <p><strong>Roll No:</strong> ${s.rollno}</p>
      <p><strong>Division:</strong> ${s.division}</p>
      <p><strong>Year:</strong> ${s.year}</p>
      <p><strong>Attendance:</strong> ${attendance}%</p>
      <p><strong>Average Marks:</strong> ${avgMarks}</p>

      <button onclick="goToProfile(${s.prn})"
        style="background:#6c757d;color:white;padding:8px 15px;border:none;border-radius:5px;cursor:pointer;">
        Profile
      </button>
    </div>
  `;
}

/* ============ PROFILE PAGE ============ */
function goToProfile(prn) {
  window.location.href = "profile.html?prn=" + prn;
}

async function loadProfile() {
  const container = document.getElementById("profile");
  if (!container) return;

  const prn = getPRNFromURL();
  const res = await fetch(API + "/api/students/" + prn);
  const s = await res.json();

  if (!s) {
    container.innerHTML = "<p>Student not found.</p>";
    return;
  }

  const attendance = s.attendancePercentage
    ? s.attendancePercentage.toFixed(2)
    : 0;
  const avgMarks = s.average ? s.average.toFixed(2) : "N/A";

  container.innerHTML = `
    <div class="card" style="
      background:white;
      padding:20px;
      width:350px;
      margin:0 auto;
      box-shadow:0 0 10px rgba(0,0,0,0.1);
      border-radius:10px;
      text-align:center;
    ">
      <h3>${s.name}</h3>
      <p><strong>PRN:</strong> ${s.prn}</p>
      <p><strong>Roll No:</strong> ${s.rollno}</p>
      <p><strong>Division:</strong> ${s.division}</p>
      <p><strong>Year:</strong> ${s.year}</p>
      <p><strong>Attendance:</strong> ${attendance}%</p>
      <p><strong>Average Marks:</strong> ${avgMarks}</p>

      <button onclick="goToUpdate(${s.prn})"
        style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin-top:10px;">
        Update
      </button>
    </div>
  `;
}

loadProfile();

/* ============ DASHBOARD PAGE ============ */
async function loadDashboard() {
  const dashDiv = document.getElementById("dashboard");
  const toppersDiv = document.getElementById("toppers");
  const chartCanvas = document.getElementById("attendanceChart");

  if (!dashDiv) return;

  requireAdminForPage();

  // total & year-wise counts
  const totalRes = await fetch(API + "/api/students/stats/total");
  const totalData = await totalRes.json();

  const yearRes = await fetch(API + "/api/students/stats/year");
  const yearData = await yearRes.json();

  dashDiv.innerHTML = `
    <div class="card" style="padding:20px;width:350px;margin:20px auto;text-align:center;background:white;border-radius:10px;box-shadow:0 0 10px rgba(0,0,0,0.1);">
      <h3>Dashboard</h3>
      <p><strong>Total Students:</strong> ${totalData.total}</p>
      <p><strong>Year-wise:</strong></p>
      <ul style="list-style:none;padding:0">
        <li>FY: ${yearData[1]}</li>
        <li>SY: ${yearData[2]}</li>
        <li>TY: ${yearData[3]}</li>
        <li>LY: ${yearData[4]}</li>
      </ul>
    </div>
  `;

  // Toppers
  if (toppersDiv) {
    const resTop = await fetch(API + "/api/students/topper/all");
    const toppers = await resTop.json();

    let html = "";
    [1, 2, 3, 4].forEach((year) => {
      const t = toppers[year];
      if (t) {
        const avg = t.average ? t.average.toFixed(2) : "N/A";
        html += `
          <div class="card" style="background:white;padding:15px;margin:10px auto;width:350px;border-radius:10px;box-shadow:0 0 8px rgba(0,0,0,0.1);">
            <p><strong>Year ${year} Topper:</strong> ${t.name}</p>
            <p>PRN: ${t.prn} | Avg Marks: ${avg}</p>
          </div>
        `;
      }
    });

    toppersDiv.innerHTML = html || "<p>No topper data yet.</p>";
  }

  // ================= LOW ATTENDANCE ALERTS =================
  const lowDiv = document.getElementById("lowAttendance");
  let groups = {}; // groups[year][division] = [students]

  const allRes = await fetch(API + "/api/students");
  const allStd = await allRes.json();

  allStd.forEach((s) => {
    const att = s.attendancePercentage || 0;
    if (att < 75) {
      if (!groups[s.year]) groups[s.year] = {};
      if (!groups[s.year][s.division]) groups[s.year][s.division] = [];

      groups[s.year][s.division].push(s);
    }
  });

  let lowHTML = "";

  Object.keys(groups).forEach((year) => {
    lowHTML += `<h4>Year ${year}</h4>`;

    Object.keys(groups[year]).forEach((div) => {
      lowHTML += `<strong>Division ${div}:</strong><br>`;

      groups[year][div].forEach((s) => {
        lowHTML += `
        &nbsp;&nbsp;• ${s.name} – ${s.attendancePercentage.toFixed(2)}%<br>
      `;
      });

      lowHTML += `<br>`;
    });
  });

  if (lowHTML === "") lowHTML = "<p>No low-attendance students. Good!</p>";

  lowDiv.innerHTML = `
  <div class="card" style="width:500px;text-align:left;">
    ${lowHTML}
  </div>
`;

  // Attendance Chart
  if (chartCanvas && window.Chart) {
    const resAll = await fetch(API + "/api/students");
    const allStudents = await resAll.json();

    const yearLabels = ["FY", "SY", "TY", "LY"];
    const avgAttendanceByYear = [0, 0, 0, 0];
    const counts = [0, 0, 0, 0];

    allStudents.forEach((s) => {
      const idx = s.year - 1;
      if (idx >= 0 && idx < 4 && s.attendancePercentage != null) {
        avgAttendanceByYear[idx] += s.attendancePercentage;
        counts[idx]++;
      }
    });

    for (let i = 0; i < 4; i++) {
      if (counts[i] > 0) {
        avgAttendanceByYear[i] /= counts[i];
      }
    }

    new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: yearLabels,
        datasets: [
          {
            label: "Average Attendance (%)",
            data: avgAttendanceByYear,
          },
        ],
      },
      options: {
        scales: {
          y: { beginAtZero: true, max: 100 },
        },
      },
    });
  }
  // ================= PASS / FAIL PIE CHARTS =================
  if (window.Chart) {
    const resAll2 = await fetch(API + "/api/students");
    const allStudents2 = await resAll2.json();

    let pf = {
      1: { pass: 0, fail: 0 },
      2: { pass: 0, fail: 0 },
      3: { pass: 0, fail: 0 },
      4: { pass: 0, fail: 0 },
    };

    allStudents2.forEach((s) => {
      if (s.year >= 1 && s.year <= 4) {
        if (s.average >= 35) pf[s.year].pass++;
        else pf[s.year].fail++;
      }
    });

    function createPieChart(canvasId, pass, fail) {
      new Chart(document.getElementById(canvasId), {
        type: "pie",
        data: {
          labels: ["Pass", "Fail"],
          datasets: [
            {
              data: [pass, fail],
            },
          ],
        },
        options: {
          plugins: {
            legend: { position: "bottom" },
          },
        },
      });
    }

    createPieChart("pf1", pf[1].pass, pf[1].fail);
    createPieChart("pf2", pf[2].pass, pf[2].fail);
    createPieChart("pf3", pf[3].pass, pf[3].fail);
    createPieChart("pf4", pf[4].pass, pf[4].fail);
  }
}

/* ============ CLEAR ALL STUDENTS ============ */
async function clearAllStudents() {
  if (!isAdmin()) {
    alert("Only admin can clear all students.");
    return;
  }

  if (!confirm("Delete ALL students?")) return;

  await fetch(API + "/api/students", { method: "DELETE" });

  alert("All students cleared!");

  loadStudents();
  loadDashboard();
}

let projectData = [];

if (document.getElementById("projectForm")) {
  document
    .getElementById("projectForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const prn = Number(document.getElementById("projPrn").value);
      const title = document.getElementById("projTitle").value.trim();
      const desc = document.getElementById("projDesc").value.trim();

      // Validate PRN
      const res = await fetch(API + "/api/students/" + prn);
      const student = await res.json();

      if (!student || Object.keys(student).length === 0) {
        alert("No student found with PRN " + prn);
        return;
      }

      projectData.push({
        prn,
        name: student.name,
        title,
        desc,
      });

      alert("Project added!");

      loadProjects();
      document.getElementById("projectForm").reset();
    });
}

function loadProjects() {
  const container = document.getElementById("projectList");
  if (!container) return;

  if (projectData.length === 0) {
    container.innerHTML = "<p>No projects added yet.</p>";
    return;
  }

  let html = "";

  projectData.forEach((p) => {
    html += `
      <div class="card" style="width:450px;">
        <h3>${p.title}</h3>
        <p><strong>Student:</strong> ${p.name} (PRN: ${p.prn})</p>
        <p>${p.desc}</p>
      </div>
    `;
  });

  container.innerHTML = html;
}

loadProjects();

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
});
