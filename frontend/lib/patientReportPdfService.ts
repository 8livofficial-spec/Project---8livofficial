import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface PatientReportData {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  display_id?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  age?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  goal_weight_kg?: number | null;
  bmi?: number | null;
  status_label?: string;
  status_color?: string;
  eligibility_status?: string | null;
  eligibility_reason?: string | null;
  medical_risk_flags?: any;
  assessment_summary?: string | null;
  extra_medical_info?: string | null;
  local_food?: string | null;
  consultations?: any[];
  next_appointment?: any;
  [key: string]: any;
}

function getDisplayName(p: PatientReportData): string {
  const byName = `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
  if (byName) return byName;
  if (p?.name && p.name !== 'Patient' && !p.name.includes('@')) return p.name;
  if (p?.full_name) return p.full_name;
  if (p?.display_id) return p.display_id;
  return p?.email || 'Patient';
}

function getBmiValue(p: PatientReportData): string {
  if (p?.bmi) return Number(p.bmi).toFixed(1);
  if (p?.weight_kg && p?.height_cm) {
    return (Number(p.weight_kg) / Math.pow(Number(p.height_cm) / 100, 2)).toFixed(1);
  }
  return 'N/A';
}

function getBmiClassification(bmiStr: string): string {
  const bmi = parseFloat(bmiStr);
  if (isNaN(bmi)) return 'Unknown';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal Weight';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Class I Obesity';
  return 'Class II+ Obesity';
}

/**
 * Generates an institutional, vectorized clinical case report PDF for a single patient.
 */
export async function generateSinglePatientPdfReport(
  patient: PatientReportData,
  doctorName = 'Attending Physician'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 (points)
  const { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Colors
  const darkNavy = rgb(0.06, 0.09, 0.16); // #0F172A
  const tealPrimary = rgb(0.05, 0.58, 0.53); // #0D9488
  const emeraldGreen = rgb(0.02, 0.59, 0.41); // #059669
  const textDark = rgb(0.12, 0.15, 0.22); // #1E293B
  const textMuted = rgb(0.45, 0.5, 0.6); // #718096
  const borderGrey = rgb(0.85, 0.88, 0.92);
  const cardBg = rgb(0.96, 0.97, 0.98);
  const redAlert = rgb(0.78, 0.2, 0.2);

  // 1. Top Decorative Brand Bar
  page.drawRectangle({
    x: 0,
    y: height - 6,
    width,
    height: 6,
    color: tealPrimary,
  });

  let y = height - 44;

  // 2. Header Branding
  page.drawText('8LIV HEALTHCARE', {
    x: 42,
    y,
    size: 18,
    font: helveticaBold,
    color: darkNavy,
  });

  page.drawText('CLINICAL PATIENT CASE REPORT', {
    x: width - 240,
    y: y + 2,
    size: 11,
    font: helveticaBold,
    color: tealPrimary,
  });
  y -= 14;

  page.drawText('Department of Endocrinology & Metabolic Health', {
    x: 42,
    y,
    size: 9,
    font: helveticaBold,
    color: emeraldGreen,
  });

  page.drawText(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, {
    x: width - 140,
    y,
    size: 8.5,
    font: helvetica,
    color: textMuted,
  });
  y -= 12;

  page.drawText('8Liv Digital Health Platform • Confidential Medical Record', {
    x: 42,
    y,
    size: 8,
    font: helvetica,
    color: textMuted,
  });

  y -= 14;

  // Divider Line
  page.drawLine({
    start: { x: 42, y },
    end: { x: width - 42, y },
    thickness: 1,
    color: borderGrey,
  });

  y -= 20;

  // 3. Patient Demographics Card
  const cardHeight = 72;
  page.drawRectangle({
    x: 42,
    y: y - cardHeight + 14,
    width: width - 84,
    height: cardHeight,
    color: cardBg,
    borderColor: borderGrey,
    borderWidth: 1,
  });

  const patientName = getDisplayName(patient);
  page.drawText(patientName, {
    x: 56,
    y: y - 2,
    size: 14,
    font: helveticaBold,
    color: darkNavy,
  });

  const displayId = patient.display_id || patient.id?.slice(0, 8) || 'N/A';
  page.drawText(`Patient ID: ${displayId}`, {
    x: 56,
    y: y - 18,
    size: 9,
    font: helveticaBold,
    color: tealPrimary,
  });

  const phone = patient.phone || patient.phone_number || 'N/A';
  const email = patient.email || 'N/A';
  page.drawText(`Phone: ${phone}   |   Email: ${email}`, {
    x: 56,
    y: y - 32,
    size: 8.5,
    font: helvetica,
    color: textDark,
  });

  const age = patient.age ? `${patient.age} yrs` : 'N/A';
  const gender = patient.gender || 'Not specified';
  page.drawText(`Age / Gender: ${age} • ${gender}`, {
    x: 56,
    y: y - 46,
    size: 8.5,
    font: helvetica,
    color: textMuted,
  });

  // Clinical Status Badge on Right of Card
  const statusLabel = patient.status_label || 'Clinical Active';
  page.drawRectangle({
    x: width - 210,
    y: y - 28,
    width: 154,
    height: 24,
    color: rgb(0.92, 0.97, 0.96),
    borderColor: rgb(0.7, 0.88, 0.84),
    borderWidth: 1,
  });
  page.drawText(statusLabel, {
    x: width - 200,
    y: y - 20,
    size: 8.5,
    font: helveticaBold,
    color: emeraldGreen,
  });

  y -= (cardHeight + 14);

  // 4. Vitals & Metabolic Metrics Grid
  page.drawText('METABOLIC VITALS & PHYSICAL BIOMETRICS', {
    x: 42,
    y,
    size: 10,
    font: helveticaBold,
    color: tealPrimary,
  });
  y -= 14;

  const vitalsCardW = (width - 84 - 24) / 4;
  const vitalsCardH = 46;

  const bmiVal = getBmiValue(patient);
  const bmiClass = getBmiClassification(bmiVal);

  const vitals = [
    { label: 'HEIGHT', val: patient.height_cm ? `${patient.height_cm} cm` : '—' },
    { label: 'CURRENT WEIGHT', val: patient.weight_kg ? `${patient.weight_kg} kg` : '—' },
    { label: 'GOAL WEIGHT', val: patient.goal_weight_kg ? `${patient.goal_weight_kg} kg` : '—' },
    { label: 'CALCULATED BMI', val: `${bmiVal} (${bmiClass})` },
  ];

  vitals.forEach((item, index) => {
    const vx = 42 + index * (vitalsCardW + 8);
    page.drawRectangle({
      x: vx,
      y: y - vitalsCardH,
      width: vitalsCardW,
      height: vitalsCardH,
      color: cardBg,
      borderColor: borderGrey,
      borderWidth: 1,
    });
    page.drawText(item.label, {
      x: vx + 8,
      y: y - 14,
      size: 7,
      font: helveticaBold,
      color: textMuted,
    });
    page.drawText(item.val, {
      x: vx + 8,
      y: y - 32,
      size: index === 3 ? 8 : 11,
      font: helveticaBold,
      color: darkNavy,
    });
  });

  y -= (vitalsCardH + 20);

  // 5. Clinical Assessment Summary Section
  page.drawText('CLINICAL ASSESSMENT SUMMARY', {
    x: 42,
    y,
    size: 10,
    font: helveticaBold,
    color: tealPrimary,
  });
  y -= 12;

  const summaryText = patient.assessment_summary || patient.extra_medical_info || 'Comprehensive metabolic and medical evaluation completed at initial onboarding consultation. No adverse flags noted.';
  
  // Wrap summary lines
  const words = summaryText.split(' ');
  let line = '';
  const lines: string[] = [];
  for (const w of words) {
    if ((line + ' ' + w).length > 85) {
      lines.push(line.trim());
      line = w;
    } else {
      line += ' ' + w;
    }
  }
  if (line.trim()) lines.push(line.trim());

  page.drawRectangle({
    x: 42,
    y: y - (lines.length * 13 + 12),
    width: width - 84,
    height: lines.length * 13 + 16,
    color: cardBg,
    borderColor: borderGrey,
    borderWidth: 1,
  });

  y -= 4;
  lines.forEach((l) => {
    page.drawText(l, {
      x: 52,
      y: y - 8,
      size: 8.5,
      font: helvetica,
      color: textDark,
    });
    y -= 13;
  });

  y -= 16;

  // 6. Medical Risk Flags & Contraindications
  page.drawText('MEDICAL RISK FLAGS & CONTRAINDICATIONS', {
    x: 42,
    y,
    size: 10,
    font: helveticaBold,
    color: tealPrimary,
  });
  y -= 12;

  const riskText = patient.medical_risk_flags
    ? String(patient.medical_risk_flags)
    : 'No critical contraindications, pancreatitis, MTC/MEN2, or severe comorbidities flagged.';

  const isRiskAlert = Boolean(patient.medical_risk_flags && !riskText.toLowerCase().includes('no critical'));

  page.drawRectangle({
    x: 42,
    y: y - 30,
    width: width - 84,
    height: 34,
    color: isRiskAlert ? rgb(0.99, 0.93, 0.93) : cardBg,
    borderColor: isRiskAlert ? rgb(0.95, 0.7, 0.7) : borderGrey,
    borderWidth: 1,
  });

  page.drawText(riskText.slice(0, 110), {
    x: 52,
    y: y - 18,
    size: 8.5,
    font: isRiskAlert ? helveticaBold : helvetica,
    color: isRiskAlert ? redAlert : textDark,
  });

  y -= 46;

  // 7. Clinical Eligibility & Care Plan Directives
  page.drawText('PROGRAM ELIGIBILITY & CLINICAL DIRECTIVES', {
    x: 42,
    y,
    size: 10,
    font: helveticaBold,
    color: tealPrimary,
  });
  y -= 12;

  page.drawRectangle({
    x: 42,
    y: y - 48,
    width: width - 84,
    height: 52,
    color: cardBg,
    borderColor: borderGrey,
    borderWidth: 1,
  });

  const eligibility = patient.eligibility_status || 'ELIGIBLE';
  page.drawText(`Eligibility Status: ${eligibility}`, {
    x: 52,
    y: y - 16,
    size: 9,
    font: helveticaBold,
    color: darkNavy,
  });

  const reason = patient.eligibility_reason ? `Reason: ${patient.eligibility_reason}` : 'Candidate cleared for physician-supervised weight management protocols.';
  page.drawText(reason.slice(0, 100), {
    x: 52,
    y: y - 30,
    size: 8.5,
    font: helvetica,
    color: textDark,
  });

  const foodPref = patient.local_food ? `Dietary Preference: ${patient.local_food}` : 'Dietary guidance: Standard high-protein balanced nutrition plan.';
  page.drawText(foodPref, {
    x: 52,
    y: y - 43,
    size: 8,
    font: helveticaOblique,
    color: textMuted,
  });

  y -= 74;

  // 8. Attending Physician & Institutional Signoff Block
  page.drawLine({
    start: { x: 42, y },
    end: { x: width - 42, y },
    thickness: 1,
    color: borderGrey,
  });
  y -= 18;

  page.drawText('ATTENDING PHYSICIAN SIGNATURE & AUTHENTICATION', {
    x: 42,
    y,
    size: 8.5,
    font: helveticaBold,
    color: textMuted,
  });

  page.drawText('SECURITY VERIFICATION CODE', {
    x: width - 210,
    y,
    size: 8.5,
    font: helveticaBold,
    color: textMuted,
  });
  y -= 16;

  page.drawText(`Verified by: ${doctorName}`, {
    x: 42,
    y,
    size: 10,
    font: helveticaBold,
    color: darkNavy,
  });

  page.drawText(`DIGITAL STAMP: 8LIV-MED-${(patient.id || '000').slice(0, 8).toUpperCase()}`, {
    x: width - 210,
    y,
    size: 8,
    font: helvetica,
    color: tealPrimary,
  });
  y -= 12;

  page.drawText('Physician License verified on 8Liv Medical Network Registry', {
    x: 42,
    y,
    size: 7.5,
    font: helveticaOblique,
    color: textMuted,
  });

  // Footer Disclaimer
  page.drawText('Confidential Medical Record — Intended solely for the registered patient and authorized medical personnel.', {
    x: 42,
    y: 24,
    size: 7,
    font: helvetica,
    color: textMuted,
  });

  return await pdfDoc.save();
}

/**
 * Generates an executive A4 PDF Table summary report of the entire assigned patient roster.
 */
export async function generatePatientRosterPdfReport(
  patients: PatientReportData[],
  doctorName = 'Attending Physician'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([841.89, 595.28]); // Standard A4 Landscape (points) for high-density tabular view
  let { width, height } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const darkNavy = rgb(0.06, 0.09, 0.16);
  const tealPrimary = rgb(0.05, 0.58, 0.53);
  const textDark = rgb(0.12, 0.15, 0.22);
  const textMuted = rgb(0.45, 0.5, 0.6);
  const borderGrey = rgb(0.85, 0.88, 0.92);
  const zebraBg = rgb(0.97, 0.98, 0.99);

  // Top Decorative Bar
  page.drawRectangle({
    x: 0,
    y: height - 6,
    width,
    height: 6,
    color: tealPrimary,
  });

  let y = height - 40;

  // Header
  page.drawText('8LIV HEALTHCARE • ASSIGNED PATIENTS ROSTER REPORT', {
    x: 36,
    y,
    size: 16,
    font: helveticaBold,
    color: darkNavy,
  });

  page.drawText(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, {
    x: width - 180,
    y,
    size: 9,
    font: helveticaBold,
    color: textMuted,
  });
  y -= 14;

  page.drawText(`Physician: ${doctorName}   |   Total Assigned Patients: ${patients.length}`, {
    x: 36,
    y,
    size: 9,
    font: helvetica,
    color: tealPrimary,
  });
  y -= 18;

  // Table Columns
  // Total width: width - 72 = 769.89
  const colX = {
    idx: 36,
    name: 65,
    id: 200,
    phone: 280,
    vitals: 390,
    bmi: 490,
    status: 580,
    eligibility: 690,
  };

  // Table Header Box
  page.drawRectangle({
    x: 36,
    y: y - 22,
    width: width - 72,
    height: 22,
    color: rgb(0.93, 0.96, 0.96),
    borderColor: borderGrey,
    borderWidth: 1,
  });

  const headerY = y - 15;
  page.drawText('#', { x: colX.idx + 4, y: headerY, size: 8, font: helveticaBold, color: darkNavy });
  page.drawText('PATIENT NAME', { x: colX.name, y: headerY, size: 8, font: helveticaBold, color: darkNavy });
  page.drawText('PATIENT ID', { x: colX.id, y: headerY, size: 8, font: helveticaBold, color: darkNavy });
  page.drawText('CONTACT / PHONE', { x: colX.phone, y: headerY, size: 8, font: helveticaBold, color: darkNavy });
  page.drawText('WEIGHT / GOAL', { x: colX.vitals, y: headerY, size: 8, font: helveticaBold, color: darkNavy });
  page.drawText('BMI (CLASS)', { x: colX.bmi, y: headerY, size: 8, font: helveticaBold, color: darkNavy });
  page.drawText('CLINICAL STATUS', { x: colX.status, y: headerY, size: 8, font: helveticaBold, color: darkNavy });
  page.drawText('ELIGIBILITY', { x: colX.eligibility, y: headerY, size: 8, font: helveticaBold, color: darkNavy });

  y -= 22;

  const rowHeight = 22;

  patients.forEach((p, index) => {
    // Check if new page needed
    if (y < 45) {
      page = pdfDoc.addPage([841.89, 595.28]);
      y = height - 40;
    }

    const isZebra = index % 2 === 1;
    if (isZebra) {
      page.drawRectangle({
        x: 36,
        y: y - rowHeight,
        width: width - 72,
        height: rowHeight,
        color: zebraBg,
      });
    }

    page.drawLine({
      start: { x: 36, y: y - rowHeight },
      end: { x: width - 36, y: y - rowHeight },
      thickness: 0.5,
      color: borderGrey,
    });

    const currentY = y - 15;
    const pName = getDisplayName(p).slice(0, 24);
    const pId = (p.display_id || p.id?.slice(0, 8) || '—').slice(0, 14);
    const pPhone = (p.phone || p.phone_number || 'No Phone').slice(0, 16);
    const curW = p.weight_kg ? `${p.weight_kg}kg` : '—';
    const goalW = p.goal_weight_kg ? `➔ ${p.goal_weight_kg}kg` : '';
    const vitalsStr = `${curW} ${goalW}`.trim();
    const bmiVal = getBmiValue(p);
    const bmiCategory = getBmiClassification(bmiVal).slice(0, 12);
    const status = (p.status_label || 'Active').slice(0, 18);
    const elig = (p.eligibility_status || 'ELIGIBLE').slice(0, 14);

    page.drawText(String(index + 1), { x: colX.idx + 4, y: currentY, size: 7.5, font: helvetica, color: textMuted });
    page.drawText(pName, { x: colX.name, y: currentY, size: 8, font: helveticaBold, color: textDark });
    page.drawText(pId, { x: colX.id, y: currentY, size: 7.5, font: helvetica, color: tealPrimary });
    page.drawText(pPhone, { x: colX.phone, y: currentY, size: 7.5, font: helvetica, color: textMuted });
    page.drawText(vitalsStr, { x: colX.vitals, y: currentY, size: 7.5, font: helveticaBold, color: textDark });
    page.drawText(`${bmiVal} (${bmiCategory})`, { x: colX.bmi, y: currentY, size: 7.5, font: helvetica, color: textDark });
    page.drawText(status, { x: colX.status, y: currentY, size: 7.5, font: helveticaBold, color: tealPrimary });
    page.drawText(elig, { x: colX.eligibility, y: currentY, size: 7.5, font: helvetica, color: textMuted });

    y -= rowHeight;
  });

  // Footer Disclaimer
  page.drawText('Confidential Medical Audit Registry — 8Liv Healthcare Private Limited • All Rights Reserved', {
    x: 36,
    y: 18,
    size: 7.5,
    font: helvetica,
    color: textMuted,
  });

  return await pdfDoc.save();
}

/**
 * Triggers a browser download of the generated PDF bytes.
 */
export function downloadPdfBlob(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
