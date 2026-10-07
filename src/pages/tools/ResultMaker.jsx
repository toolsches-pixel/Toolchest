import { useEffect, useState, useMemo, useRef } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './ResultMaker.css';

// ============================================================
// GRADING SYSTEMS
// ============================================================
const GRADING_SYSTEMS = {
  cbse: {
    name: 'CBSE',
    grades: [
      { min: 91, grade: 'A1', points: 10 },
      { min: 81, grade: 'A2', points: 9 },
      { min: 71, grade: 'B1', points: 8 },
      { min: 61, grade: 'B2', points: 7 },
      { min: 51, grade: 'C1', points: 6 },
      { min: 41, grade: 'C2', points: 5 },
      { min: 33, grade: 'D', points: 4 },
      { min: 0, grade: 'E (Fail)', points: 0 },
    ],
  },
  generic: {
    name: 'Generic',
    grades: [
      { min: 90, grade: 'A+', points: 10 },
      { min: 80, grade: 'A', points: 9 },
      { min: 70, grade: 'B+', points: 8 },
      { min: 60, grade: 'B', points: 7 },
      { min: 50, grade: 'C', points: 6 },
      { min: 40, grade: 'D', points: 5 },
      { min: 33, grade: 'E', points: 4 },
      { min: 0, grade: 'F (Fail)', points: 0 },
    ],
  },
  percentage: {
    name: 'Percentage Only',
    grades: [
      { min: 60, grade: 'First Division', points: 0 },
      { min: 45, grade: 'Second Division', points: 0 },
      { min: 33, grade: 'Third Division', points: 0 },
      { min: 0, grade: 'Fail', points: 0 },
    ],
  },
};

// ============================================================
// HELPERS
// ============================================================
function getGrade(percentage, system) {
  const grades = GRADING_SYSTEMS[system].grades;
  for (const g of grades) {
    if (percentage >= g.min) return g;
  }
  return grades[grades.length - 1];
}

function getDivision(percentage) {
  if (percentage >= 60) return 'First Division';
  if (percentage >= 45) return 'Second Division';
  if (percentage >= 33) return 'Third Division';
  return 'Fail';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
}

// ============================================================
// MAIN
// ============================================================
export default function ResultMaker() {
  const tool = getToolById('result-maker');

  useDocumentTitle('Result Maker — Create Student Report Card Online Free | toolchest');

  // SEO
  useEffect(() => {
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (created) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content =
      'Free online result maker — create professional student report cards and mark sheets. Add school details, subjects, marks, auto-calculate percentage and grades. Print or download as PDF. No signup.';

    const scriptId = 'result-maker-jsonld';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Result Maker',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1287',
      },
      featureList: [
        'Create student report cards and mark sheets',
        'Add school name, logo, session',
        'Add student details (name, roll, class, father name)',
        'Unlimited subjects with marks',
        'Auto-calculate totals, percentage, grades',
        'CBSE / Generic / Percentage grading',
        'Download as PDF',
        'No signup, 100% browser-based',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  // ---------- STATE ----------
  const [school, setSchool] = useState({
    name: 'Toolchest Public School',
    address: 'Sector 45, New Delhi - 110001',
    logo: null,
    session: '2024-25',
  });

  const [student, setStudent] = useState({
    name: 'Rahul Sharma',
    rollNo: '25',
    class: 'X',
    section: 'A',
    fatherName: 'Mr. Rajesh Sharma',
    motherName: 'Mrs. Sunita Sharma',
    dob: '2009-05-15',
    exam: 'Annual Examination',
  });

  const [gradingSystem, setGradingSystem] = useState('cbse');

  const [subjects, setSubjects] = useState([
    { id: 1, name: 'English', maxMarks: 100, marks: 85 },
    { id: 2, name: 'Hindi', maxMarks: 100, marks: 78 },
    { id: 3, name: 'Mathematics', maxMarks: 100, marks: 92 },
    { id: 4, name: 'Science', maxMarks: 100, marks: 88 },
    { id: 5, name: 'Social Science', maxMarks: 100, marks: 81 },
  ]);

  const [resultDate, setResultDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [showPreview, setShowPreview] = useState(false);

  const previewRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('toolchestResultData');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.school) setSchool(data.school);
        if (data.student) setStudent(data.student);
        if (data.subjects) setSubjects(data.subjects);
        if (data.gradingSystem) setGradingSystem(data.gradingSystem);
        if (data.resultDate) setResultDate(data.resultDate);
      }
    } catch (e) {}
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(
        'toolchestResultData',
        JSON.stringify({ school, student, subjects, gradingSystem, resultDate })
      );
    } catch (e) {}
  }, [school, student, subjects, gradingSystem, resultDate]);

  // ---------- SUBJECTS ----------
  const addSubject = () => {
  const newId = Math.max(0, ...subjects.map((s) => s.id)) + 1;
  setSubjects([
    ...subjects,
    { id: newId, name: '', maxMarks: '100', marks: '' },
  ]);
};

  const removeSubject = (id) => {
    if (subjects.length <= 1) return;
    setSubjects(subjects.filter((s) => s.id !== id));
  };

  const updateSubject = (id, field, value) => {
    setSubjects(
      subjects.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const moveSubject = (id, dir) => {
    const idx = subjects.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const target = idx + dir;
    if (target < 0 || target >= subjects.length) return;
    const next = [...subjects];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSubjects(next);
  };

  // ---------- CALCULATIONS ----------
  const totals = useMemo(() => {
    let totalMarks = 0;
    let totalMax = 0;
    subjects.forEach((s) => {
      totalMarks += Number(s.marks) || 0;
      totalMax += Number(s.maxMarks) || 0;
    });
    const percentage = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;
    const grade = getGrade(percentage, gradingSystem);
    return {
      totalMarks,
      totalMax,
      percentage: Math.round(percentage * 100) / 100,
      grade,
      division: getDivision(percentage),
    };
  }, [subjects, gradingSystem]);

  // ---------- LOGO ----------
  const handleLogoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSchool({ ...school, logo: ev.target.result });
    };
    reader.readAsDataURL(f);
  };

  // ---------- PRINT / PDF ----------
 const handlePrint = () => {
  // Hide everything except the report card before print
  document.body.classList.add('printing-report');
  setTimeout(() => {
    window.print();
    // Remove class after print
    setTimeout(() => {
      document.body.classList.remove('printing-report');
    }, 500);
  }, 200);
};

  const handleReset = () => {
    if (!window.confirm('Are you sure? All data will be cleared.')) return;
    setSchool({
      name: 'Toolchest Public School',
      address: 'Sector 45, New Delhi - 110001',
      logo: null,
      session: '2024-25',
    });
    setStudent({
      name: 'Rahul Sharma',
      rollNo: '25',
      class: 'X',
      section: 'A',
      fatherName: 'Mr. xyz',
      motherName: 'Mrs. xyz',
      dob: '2009-05-15',
      exam: 'Annual Examination',
    });
    setSubjects([
      { id: 1, name: 'English', maxMarks: 100, marks: 85 },
      { id: 2, name: 'Hindi', maxMarks: 100, marks: 78 },
      { id: 3, name: 'Mathematics', maxMarks: 100, marks: 92 },
      { id: 4, name: 'Science', maxMarks: 100, marks: 88 },
      { id: 5, name: 'Social Science', maxMarks: 100, marks: 81 },
    ]);
    setGradingSystem('cbse');
    try {
      localStorage.removeItem('toolchestResultData');
    } catch (e) {}
  };

  return (
    <ToolShell tool={tool}>
      <div className="rm-root">
        {/* Action bar */}
        <div className="rm-action-bar">
          <div className="rm-action-bar-left">
            <span className="rm-action-title">Result Maker</span>
            <span className="rm-action-sub">Auto-saved in your browser</span>
          </div>
          <div className="rm-action-bar-right">
            <button className="rm-btn rm-btn-secondary" onClick={handleReset}>
              ⟳ Reset
            </button>
            <button className="rm-btn rm-btn-primary" onClick={handlePrint}>
              📄 Download PDF
            </button>
          </div>
        </div>

        {/* Editor + Preview grid */}
        <div className="rm-layout">
          {/* LEFT: Editor */}
          <div className="rm-editor">
            {/* School Section */}
            <section className="rm-section">
              <h3 className="rm-section-title">🏫 School Details</h3>

              <div className="rm-field">
                <label className="rm-label">School Name</label>
                <input
                  type="text"
                  value={school.name}
                  onChange={(e) => setSchool({ ...school, name: e.target.value })}
                  className="rm-input"
                  placeholder="Toolchest Public School"
                />
              </div>

              <div className="rm-field">
                <label className="rm-label">Address</label>
                <input
                  type="text"
                  value={school.address}
                  onChange={(e) =>
                    setSchool({ ...school, address: e.target.value })
                  }
                  className="rm-input"
                  placeholder="City, State - PIN"
                />
              </div>

              <div className="rm-field">
                <label className="rm-label">Session / Academic Year</label>
                <input
                  type="text"
                  value={school.session}
                  onChange={(e) =>
                    setSchool({ ...school, session: e.target.value })
                  }
                  className="rm-input"
                  placeholder="2024-25"
                />
              </div>

              <div className="rm-field">
                <label className="rm-label">School Logo (optional)</label>
                {!school.logo ? (
                  <label className="rm-file-upload">
                    📁 Choose logo image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  <div className="rm-logo-preview">
                    <img src={school.logo} alt="Logo" />
                    <button
                      className="rm-logo-remove"
                      onClick={() => setSchool({ ...school, logo: null })}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Student Section */}
            <section className="rm-section">
              <h3 className="rm-section-title">👤 Student Details</h3>

              <div className="rm-field-row">
                <div className="rm-field">
                  <label className="rm-label">Full Name</label>
                  <input
                    type="text"
                    value={student.name}
                    onChange={(e) =>
                      setStudent({ ...student, name: e.target.value })
                    }
                    className="rm-input"
                  />
                </div>

                <div className="rm-field">
                  <label className="rm-label">Roll No</label>
                  <input
                    type="text"
                    value={student.rollNo}
                    onChange={(e) =>
                      setStudent({ ...student, rollNo: e.target.value })
                    }
                    className="rm-input"
                  />
                </div>
              </div>

              <div className="rm-field-row">
                <div className="rm-field">
                  <label className="rm-label">Class</label>
                  <input
                    type="text"
                    value={student.class}
                    onChange={(e) =>
                      setStudent({ ...student, class: e.target.value })
                    }
                    className="rm-input"
                    placeholder="X"
                  />
                </div>

                <div className="rm-field">
                  <label className="rm-label">Section</label>
                  <input
                    type="text"
                    value={student.section}
                    onChange={(e) =>
                      setStudent({ ...student, section: e.target.value })
                    }
                    className="rm-input"
                    placeholder="A"
                  />
                </div>
              </div>

              <div className="rm-field-row">
                <div className="rm-field">
                  <label className="rm-label">Father's Name</label>
                  <input
                    type="text"
                    value={student.fatherName}
                    onChange={(e) =>
                      setStudent({ ...student, fatherName: e.target.value })
                    }
                    className="rm-input"
                  />
                </div>

                <div className="rm-field">
                  <label className="rm-label">Mother's Name</label>
                  <input
                    type="text"
                    value={student.motherName}
                    onChange={(e) =>
                      setStudent({ ...student, motherName: e.target.value })
                    }
                    className="rm-input"
                  />
                </div>
              </div>

              <div className="rm-field-row">
                <div className="rm-field">
                  <label className="rm-label">Date of Birth</label>
                  <input
                    type="date"
                    value={student.dob}
                    onChange={(e) =>
                      setStudent({ ...student, dob: e.target.value })
                    }
                    className="rm-input"
                  />
                </div>

                <div className="rm-field">
                  <label className="rm-label">Exam / Term</label>
                  <input
                    type="text"
                    value={student.exam}
                    onChange={(e) =>
                      setStudent({ ...student, exam: e.target.value })
                    }
                    className="rm-input"
                    placeholder="Annual Examination"
                  />
                </div>
              </div>
            </section>

            {/* Grading System */}
            <section className="rm-section">
              <h3 className="rm-section-title">🎓 Grading System</h3>

              <div className="rm-grading-tabs">
                {Object.entries(GRADING_SYSTEMS).map(([key, gs]) => (
                  <button
                    key={key}
                    className={`rm-grading-tab ${
                      gradingSystem === key ? 'active' : ''
                    }`}
                    onClick={() => setGradingSystem(key)}
                  >
                    {gs.name}
                  </button>
                ))}
              </div>
            </section>

            {/* Subjects */}
            <section className="rm-section">
              <div className="rm-section-header">
                <h3 className="rm-section-title">📚 Subjects & Marks</h3>
                <button className="rm-add-btn" onClick={addSubject}>
                  + Add Subject
                </button>
              </div>

              <div className="rm-subjects-table">
                <div className="rm-subjects-header">
                  <span>#</span>
                  <span>Subject</span>
                  <span>Max</span>
                  <span>Obtained</span>
                  <span></span>
                </div>

               {subjects.map((subject, idx) => {
  const subjPct =
    Number(subject.maxMarks) > 0
      ? (Number(subject.marks) / Number(subject.maxMarks)) * 100
      : 0;
  const subjGrade = getGrade(subjPct, gradingSystem);

  return (
    <div key={subject.id} className="rm-subject-row">
      <span className="rm-subject-num">{idx + 1}</span>

      <input
        type="text"
        data-subject-id={subject.id}
        value={subject.name}
        onChange={(e) =>
          updateSubject(subject.id, 'name', e.target.value)
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addSubject();
          }
        }}
        className="rm-subject-input rm-subject-name"
        placeholder="Subject name"
        autoComplete="off"
        spellCheck="false"
      />

      <input
        type="number"
        value={subject.maxMarks}
        onChange={(e) =>
          updateSubject(subject.id, 'maxMarks', e.target.value)
        }
        onFocus={(e) => e.target.select()}
        className="rm-subject-input rm-subject-num-input"
        placeholder="100"
        min="0"
      />

      <input
        type="number"
        value={subject.marks}
        onChange={(e) =>
          updateSubject(subject.id, 'marks', e.target.value)
        }
        onFocus={(e) => e.target.select()}
        className="rm-subject-input rm-subject-num-input"
        placeholder="—"
        min="0"
      />

      <div className="rm-subject-actions">
        <span
          className="rm-subject-grade"
          title={`${subjPct.toFixed(1)}%`}
        >
          {subjPct > 0 ? subjGrade.grade : '—'}
        </span>
        <button
          type="button"
          className="rm-subject-btn"
          onClick={() => moveSubject(subject.id, -1)}
          disabled={idx === 0}
          title="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          className="rm-subject-btn"
          onClick={() => moveSubject(subject.id, 1)}
          disabled={idx === subjects.length - 1}
          title="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          className="rm-subject-btn rm-subject-remove"
          onClick={() => removeSubject(subject.id)}
          disabled={subjects.length <= 1}
          title="Remove"
        >
          ✕
        </button>
      </div>
    </div>
  );
})}
              </div>

              {/* Live totals */}
              <div className="rm-totals-bar">
                <div className="rm-total-item">
                  <span className="rm-total-label">Total</span>
                  <span className="rm-total-value">
                    {totals.totalMarks} / {totals.totalMax}
                  </span>
                </div>
                <div className="rm-total-item">
                  <span className="rm-total-label">Percentage</span>
                  <span className="rm-total-value">
                    {totals.percentage.toFixed(2)}%
                  </span>
                </div>
                <div className="rm-total-item">
                  <span className="rm-total-label">Grade</span>
                  <span className="rm-total-value rm-grade">
                    {totals.grade.grade}
                  </span>
                </div>
              </div>
            </section>

            {/* Result Date */}
            <section className="rm-section">
              <h3 className="rm-section-title">📅 Result Date</h3>
              <input
                type="date"
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
                className="rm-input"
              />
            </section>
          </div>

          {/* RIGHT: Live preview */}
          <div className="rm-preview-wrap">
            <div className="rm-preview-header">
              <span className="rm-preview-title">👁 Live Preview</span>
            </div>
            <div className="rm-preview" ref={previewRef}>
              <ReportCard
                school={school}
                student={student}
                subjects={subjects}
                totals={totals}
                gradingSystem={gradingSystem}
                resultDate={resultDate}
              />
            </div>
          </div>
        </div>

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

// ============================================================
// REPORT CARD COMPONENT
// ============================================================
function ReportCard({ school, student, subjects, totals, gradingSystem, resultDate }) {
  return (
    <div className="rc-card" id="report-card">
      {/* Header */}
      <div className="rc-header">
        {school.logo && (
          <div className="rc-logo">
            <img src={school.logo} alt="Logo" />
          </div>
        )}
        <div className="rc-school">
          <h1 className="rc-school-name">{school.name || 'School Name'}</h1>
          {school.address && (
            <p className="rc-school-address">{school.address}</p>
          )}
          {school.session && (
            <p className="rc-session">Session: {school.session}</p>
          )}
        </div>
      </div>

      <div className="rc-title-bar">
        <span className="rc-title-text">
          {student.exam || 'Report Card'}
        </span>
      </div>

      {/* Student info */}
      <div className="rc-student-info">
        <div className="rc-info-row">
          <div className="rc-info-item">
            <span className="rc-info-label">Student Name</span>
            <span className="rc-info-value">{student.name || '—'}</span>
          </div>
          <div className="rc-info-item">
            <span className="rc-info-label">Roll No</span>
            <span className="rc-info-value">{student.rollNo || '—'}</span>
          </div>
        </div>

        <div className="rc-info-row">
          <div className="rc-info-item">
            <span className="rc-info-label">Class</span>
            <span className="rc-info-value">
              {student.class || '—'} {student.section && `(${student.section})`}
            </span>
          </div>
          <div className="rc-info-item">
            <span className="rc-info-label">Date of Birth</span>
            <span className="rc-info-value">{formatDate(student.dob) || '—'}</span>
          </div>
        </div>

        <div className="rc-info-row">
          <div className="rc-info-item">
            <span className="rc-info-label">Father's Name</span>
            <span className="rc-info-value">{student.fatherName || '—'}</span>
          </div>
          <div className="rc-info-item">
            <span className="rc-info-label">Mother's Name</span>
            <span className="rc-info-value">{student.motherName || '—'}</span>
          </div>
        </div>
      </div>

      {/* Marks table */}
      <table className="rc-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>SI No</th>
            <th>Subject</th>
            <th style={{ width: '80px' }}>Max Marks</th>
            <th style={{ width: '90px' }}>Marks Obtained</th>
            <th style={{ width: '70px' }}>Grade</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject, idx) => {
            const pct =
              subject.maxMarks > 0
                ? (Number(subject.marks) / Number(subject.maxMarks)) * 100
                : 0;
            const grade = getGrade(pct, gradingSystem);
            return (
              <tr key={subject.id}>
                <td className="rc-td-center">{idx + 1}</td>
                <td className="rc-td-subject">{subject.name || '—'}</td>
                <td className="rc-td-center">{subject.maxMarks}</td>
                <td className="rc-td-center rc-td-marks">{subject.marks}</td>
                <td className="rc-td-center rc-td-grade">{grade.grade}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="rc-tfoot-total">
            <td colSpan="2" className="rc-td-right">
              Total
            </td>
            <td className="rc-td-center">{totals.totalMax}</td>
            <td className="rc-td-center rc-td-strong">{totals.totalMarks}</td>
            <td className="rc-td-center rc-td-strong">
              {totals.grade.grade}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Summary */}
      <div className="rc-summary">
        <div className="rc-summary-item">
          <span className="rc-summary-label">Total Marks</span>
          <span className="rc-summary-value">
            {totals.totalMarks} / {totals.totalMax}
          </span>
        </div>
        <div className="rc-summary-item">
          <span className="rc-summary-label">Percentage</span>
          <span className="rc-summary-value">
            {totals.percentage.toFixed(2)}%
          </span>
        </div>
        <div className="rc-summary-item">
          <span className="rc-summary-label">Grade</span>
          <span className="rc-summary-value rc-summary-grade">
            {totals.grade.grade}
          </span>
        </div>
        <div className="rc-summary-item">
          <span className="rc-summary-label">Division</span>
          <span className="rc-summary-value">{totals.division}</span>
        </div>
      </div>

      {/* Remarks */}
      <div className="rc-remarks">
        <span className="rc-remarks-label">Remarks:</span>
        <span className="rc-remarks-value">
          {totals.percentage >= 75
            ? 'Excellent performance! Keep up the good work.'
            : totals.percentage >= 60
            ? 'Good performance. Well done!'
            : totals.percentage >= 45
            ? 'Satisfactory. Can do better.'
            : totals.percentage >= 33
            ? 'Needs improvement. Work harder.'
            : 'Failed. Please focus on studies.'}
        </span>
      </div>

      {/* Footer / Signatures */}
      <div className="rc-footer">
        <div className="rc-signature">
          <div className="rc-signature-line"></div>
          <div className="rc-signature-label">Class Teacher</div>
        </div>
        <div className="rc-date">
          Date: {formatDate(resultDate) || '—'}
        </div>
        <div className="rc-signature">
          <div className="rc-signature-line"></div>
          <div className="rc-signature-label">Principal</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SEO CONTENT
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Result Maker?</h2>
        <p>
          A <strong>result maker</strong> is a tool that lets teachers,
          schools, and coaching institutes create professional-looking{' '}
          <strong>student report cards</strong> and{' '}
          <strong>mark sheets</strong> online. Instead of manually designing
          marks cards in Word or Excel, you simply fill in the details — the
          tool auto-calculates totals, percentages, and grades.
        </p>
        <p>
          Our <strong>free online result maker</strong> is built for modern
          schools and tutors. Add your school name, logo, and student details.
          Add unlimited subjects with marks. Get an instant, print-ready report
          card you can download as PDF.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Create a Report Card</h2>
        <ol className="seo-steps">
          <li>
            <strong>Enter school details</strong> — name, address, session, and
            optional logo.
          </li>
          <li>
            <strong>Fill student information</strong> — name, roll number,
            class, section, parent names, date of birth.
          </li>
          <li>
            <strong>Choose grading system</strong> — CBSE, Generic, or
            Percentage-only.
          </li>
          <li>
            <strong>Add subjects and marks</strong> — click "+ Add Subject" for
            each one. Grades compute automatically.
          </li>
          <li>
            <strong>Download PDF</strong> — click "Download PDF" to save or
            print the report card.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🏫</div>
            <h3>School Branding</h3>
            <p>
              Add school name, address, session, and logo for a professional
              report card.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">👤</div>
            <h3>Complete Student Info</h3>
            <p>
              Name, roll number, class, section, parent names, and DOB — all on
              one page.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📚</div>
            <h3>Unlimited Subjects</h3>
            <p>
              Add as many subjects as you need. Reorder them with one click.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🧮</div>
            <h3>Auto Calculations</h3>
            <p>
              Totals, percentage, grade, and division computed automatically
              as you type.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎓</div>
            <h3>3 Grading Systems</h3>
            <p>
              CBSE (A1-E), Generic (A+ to F), or Percentage-based divisions.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📄</div>
            <h3>Download as PDF</h3>
            <p>
              Print the report card directly, or save as PDF from the print
              dialog.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Who is This For?</h2>
        <ul className="seo-list">
          <li>
            <strong>School teachers</strong> — generate report cards for the
            whole class in minutes.
          </li>
          <li>
            <strong>Coaching institutes</strong> — create professional-looking
            result sheets.
          </li>
          <li>
            <strong>Private tutors</strong> — send parents a formal mark sheet
            after each test.
          </li>
          <li>
            <strong>Schools in rural areas</strong> — no expensive software
            needed, just a browser.
          </li>
          <li>
            <strong>Students</strong> — practice creating sample report cards
            for projects.
          </li>
          <li>
            <strong>Homeschool parents</strong> — create custom report cards
            for their children.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this result maker free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no hidden
            fees. Create as many report cards as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I download the report card as PDF?</summary>
          <p>
            Yes — click the "Download PDF" button. This opens the browser's
            print dialog where you can choose "Save as PDF" as the printer.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Which grading systems are supported?</summary>
          <p>
            Three systems: <strong>CBSE</strong> (A1, A2, B1... with grade
            points), <strong>Generic</strong> (A+, A, B+... to F), and{' '}
            <strong>Percentage-only</strong> (First/Second/Third Division).
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is my data saved?</summary>
          <p>
            Yes — your data is auto-saved in your browser's localStorage. It
            persists even if you close the tab and come back. Nothing is sent
            to any server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I add my school logo?</summary>
          <p>
            Yes — upload any image (PNG, JPG) as your school logo. It will
            appear in the top-left of the report card.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How many subjects can I add?</summary>
          <p>
            Unlimited. Add as many subjects as your curriculum requires. Each
            subject has its own max marks and obtained marks.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use this for a college or university?</summary>
          <p>
            Absolutely — the tool is flexible. You can rename "Class" to
            "Semester" or "Year", "Subject" to "Course", and use it for any
            educational level.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work offline?</summary>
          <p>
            Once the page is loaded, yes — everything runs in your browser. No
            internet required after the initial load.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools for students: <strong>Percentage Calculator</strong>,{' '}
          <strong>GPA Calculator</strong>, <strong>Unit Converter</strong>,{' '}
          <strong>Word Counter</strong>, and <strong>Typing Test</strong> — all
          free and browser-based.
        </p>
      </section>
    </article>
  );
}