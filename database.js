const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'mims.db'), {
});
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    lrn TEXT NOT NULL UNIQUE,
    grade_section TEXT,
    height TEXT,
    weight TEXT,
    bmi_status TEXT,
    history TEXT DEFAULT 'None',
    clinic_exposure TEXT DEFAULT 'None',
    email TEXT,
    home_address TEXT,
    contact_no TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_type TEXT NOT NULL,
    student_name TEXT NOT NULL,
    grade TEXT,
    lrn TEXT,
    description TEXT,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled Record',
    content TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS student_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lrn TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lrn TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lrn) REFERENCES student_accounts(lrn) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled Record',
    content TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
const patientCount = db.prepare('SELECT COUNT(*) as cnt FROM patients').get().cnt;
if (patientCount === 0) {
  console.log('🌱 Seeding initial 10 patients...');
  const insertPatient = db.prepare(`
    INSERT INTO patients (
      full_name, lrn, grade_section, height, weight, bmi_status,
      history, clinic_exposure
    ) VALUES (
      @full_name, @lrn, @grade_section, @height, @weight, @bmi_status,
      @history, @clinic_exposure
    )
  `);
  const seedTransaction = db.transaction((patients) => {
    for (const p of patients) {
      insertPatient.run(p);
    }
  });
  seedTransaction([
    { full_name: 'Jake Patrick A. Baron', lrn: '136888141225', grade_section: '12 ICT - THALES', height: '165cm', weight: '59kg', bmi_status: 'Normal', history: 'Asthma', clinic_exposure: 'None' },
    { full_name: 'Caylle Nathaniel D. Rico', lrn: '488051150121', grade_section: '12 ICT - THALES', height: '156cm', weight: '45kg', bmi_status: 'Normal', history: 'None', clinic_exposure: 'None' },
    { full_name: 'Mart D. Bernacer', lrn: '136591131208', grade_section: '12 ICT - THALES', height: '160cm', weight: '43kg', bmi_status: 'Normal', history: 'None', clinic_exposure: 'None' },
    { full_name: 'Christian B. Rasonabe', lrn: '136891131615', grade_section: '12 ICT - THALES', height: '159cm', weight: '60kg', bmi_status: 'Normal', history: 'None', clinic_exposure: 'None' },
    { full_name: 'Jhon Carl D. Villacarlos', lrn: '136886150197', grade_section: '12 ICT - THALES', height: '165cm', weight: '70kg', bmi_status: 'Overweight', history: 'None', clinic_exposure: 'None' },
    { full_name: 'Haezel Marie B. Maganding', lrn: '136514120335', grade_section: '12 ICT - THALES', height: '162cm', weight: '40kg', bmi_status: 'Underweight', history: 'None', clinic_exposure: 'Yes — 3 times' },
    { full_name: 'Roncedrick A. Relampagos', lrn: '136891131844', grade_section: '12 ICT - THALES', height: "5'4\"", weight: '58kg', bmi_status: 'Normal', history: 'None', clinic_exposure: 'None' },
    { full_name: 'Dhan Alfred E. Ordeniza', lrn: '488047150113', grade_section: '12 ICT - THALES', height: '171cm', weight: '60kg', bmi_status: 'Normal', history: 'Anemic', clinic_exposure: 'Yes — 4 times' },
    { full_name: 'Lance Jhenel O. Avila', lrn: '136885140567', grade_section: '12 ICT - THALES', height: '166cm', weight: '54kg', bmi_status: 'Normal', history: 'Asthma', clinic_exposure: 'None' },
    { full_name: 'Zyron Drei D. Nacionales', lrn: '407278150268', grade_section: '12 ICT - THALES', height: '180cm', weight: '116kg', bmi_status: 'Overweight', history: 'High Blood', clinic_exposure: 'Yes — 3 times' }
  ]);
  console.log('✅ Patients seeded successfully!');
}

module.exports = db;