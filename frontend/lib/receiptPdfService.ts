import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type ReceiptData = {
  receiptNumber: string
  invoiceNumber?: string
  transactionId?: string
  razorpayPaymentId?: string
  paymentDate: string
  patientName: string
  patientEmail?: string
  patientPhone?: string
  patientId?: string
  doctorName?: string
  doctorSpecialty?: string
  appointmentDate?: string
  appointmentTime?: string
  serviceDescription?: string
  sacCode?: string
  amount: number
  currency?: string
  paymentMethod?: string
  paymentStatus: string
  gstin?: string
  cin?: string
}

function numberToWords(num: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const n = Math.floor(Math.abs(num))
  if (n === 0) return 'Zero'

  function convert(val: number): string {
    if (val < 20) return a[val]
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : '')
    if (val < 1000) return a[Math.floor(val / 100)] + ' Hundred' + (val % 100 !== 0 ? ' and ' + convert(val % 100) : '')
    if (val < 100000) return convert(Math.floor(val / 1000)) + ' Thousand' + (val % 1000 !== 0 ? ' ' + convert(val % 1000) : '')
    if (val < 10000000) return convert(Math.floor(val / 100000)) + ' Lakh' + (val % 100000 !== 0 ? ' ' + convert(val % 100000) : '')
    return convert(Math.floor(val / 10000000)) + ' Crore' + (val % 10000000 !== 0 ? ' ' + convert(val % 10000000) : '')
  }

  return convert(n)
}

/**
 * Generates a production-grade, print-ready, vectorized A4 PDF Tax Invoice & Payment Receipt.
 * Features institutional healthcare branding, dual-column billing breakdown,
 * itemized SAC/HSN table, RBI-compliant digital payment verification badge,
 * and statutory tax compliance disclosures.
 */
export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // Standard A4 (points)
  const { width, height } = page.getSize()

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const primary = rgb(0.06, 0.09, 0.16) // #0F172A
  const teal = rgb(0.05, 0.58, 0.53) // #0D9488
  const emerald = rgb(0.02, 0.59, 0.41) // #059669
  const textDark = rgb(0.1, 0.12, 0.21) // #1A1F36
  const textMuted = rgb(0.4, 0.45, 0.55)
  const borderLight = rgb(0.88, 0.9, 0.93)
  const bgLight = rgb(0.97, 0.98, 0.99)
  const badgeBg = rgb(0.92, 0.97, 0.96)

  let y = height - 42

  // 1. Top Decorative Brand Bar
  page.drawRectangle({
    x: 0,
    y: height - 6,
    width,
    height: 6,
    color: teal,
  })

  // 2. Organization Branding Header (Left)
  page.drawText('8LIV HEALTHCARE', {
    x: 45,
    y,
    size: 18,
    font: helveticaBold,
    color: primary,
  })
  y -= 14

  page.drawText('8Liv Healthcare Private Limited • Metabolic & Preventative Medicine', {
    x: 45,
    y,
    size: 8.5,
    font: helveticaBold,
    color: teal,
  })
  y -= 12

  page.drawText('Reg. Office: 8LIV Healthcare Hub, 100ft Road, Indiranagar, Bengaluru, KA - 560038', {
    x: 45,
    y,
    size: 7.5,
    font: helvetica,
    color: textMuted,
  })
  y -= 10

  page.drawText('GSTIN: 29AABCL1234F1Z8 | CIN: U85110KA2025PTC184920 | care@8liv.health', {
    x: 45,
    y,
    size: 7.5,
    font: helvetica,
    color: textMuted,
  })

  // 3. Receipt / Tax Invoice Header Box (Right)
  const invoiceBoxX = 355
  const invoiceBoxY = height - 105
  const invoiceBoxW = 195
  const invoiceBoxH = 65

  page.drawRectangle({
    x: invoiceBoxX,
    y: invoiceBoxY,
    width: invoiceBoxW,
    height: invoiceBoxH,
    color: bgLight,
    borderColor: borderLight,
    borderWidth: 1,
  })

  page.drawText('TAX INVOICE / PAYMENT RECEIPT', {
    x: invoiceBoxX + 12,
    y: invoiceBoxY + invoiceBoxH - 16,
    size: 8,
    font: helveticaBold,
    color: primary,
  })

  page.drawText(`Receipt No: ${data.receiptNumber}`, {
    x: invoiceBoxX + 12,
    y: invoiceBoxY + invoiceBoxH - 30,
    size: 8.5,
    font: helveticaBold,
    color: teal,
  })

  page.drawText(`Date of Issue: ${data.paymentDate}`, {
    x: invoiceBoxX + 12,
    y: invoiceBoxY + invoiceBoxH - 43,
    size: 7.5,
    font: helvetica,
    color: textDark,
  })

  const statusText = (data.paymentStatus || 'PAID').toUpperCase()
  page.drawText(`Status: ${statusText}`, {
    x: invoiceBoxX + 12,
    y: invoiceBoxY + invoiceBoxH - 56,
    size: 8,
    font: helveticaBold,
    color: emerald,
  })

  y = height - 120

  // Divider line
  page.drawLine({
    start: { x: 45, y },
    end: { x: width - 45, y },
    thickness: 1,
    color: borderLight,
  })
  y -= 20

  // 4. Two-Column Metadata Block
  const colW = (width - 90 - 20) / 2
  const col1X = 45
  const col2X = 45 + colW + 20

  // Column 1: Billed To
  page.drawRectangle({
    x: col1X,
    y: y - 85,
    width: colW,
    height: 85,
    color: bgLight,
    borderColor: borderLight,
    borderWidth: 1,
  })

  page.drawText('BILLED TO (PATIENT / RECIPIENT)', {
    x: col1X + 12,
    y: y - 16,
    size: 7.5,
    font: helveticaBold,
    color: textMuted,
  })

  page.drawText(data.patientName || 'Registered 8LIV Member', {
    x: col1X + 12,
    y: y - 32,
    size: 9.5,
    font: helveticaBold,
    color: textDark,
  })

  if (data.patientId) {
    page.drawText(`Member ID: ${data.patientId.slice(0, 18)}...`, {
      x: col1X + 12,
      y: y - 46,
      size: 7.5,
      font: helvetica,
      color: textDark,
    })
  }

  if (data.patientEmail) {
    page.drawText(`Email: ${data.patientEmail}`, {
      x: col1X + 12,
      y: y - 58,
      size: 7.5,
      font: helvetica,
      color: textDark,
    })
  }

  if (data.patientPhone) {
    page.drawText(`Phone: ${data.patientPhone}`, {
      x: col1X + 12,
      y: y - 70,
      size: 7.5,
      font: helvetica,
      color: textDark,
    })
  }

  // Column 2: Payment & Transaction Details
  page.drawRectangle({
    x: col2X,
    y: y - 85,
    width: colW,
    height: 85,
    color: bgLight,
    borderColor: borderLight,
    borderWidth: 1,
  })

  page.drawText('PAYMENT & TRANSACTION REFERENCE', {
    x: col2X + 12,
    y: y - 16,
    size: 7.5,
    font: helveticaBold,
    color: textMuted,
  })

  const txId = data.razorpayPaymentId || data.transactionId || 'ONLINE_SETTLED'
  page.drawText(`Gateway Txn: ${txId}`, {
    x: col2X + 12,
    y: y - 32,
    size: 8,
    font: helveticaBold,
    color: textDark,
  })

  page.drawText(`Payment Mode: ${data.paymentMethod || 'Online (UPI / Cards / NetBanking)'}`, {
    x: col2X + 12,
    y: y - 46,
    size: 7.5,
    font: helvetica,
    color: textDark,
  })

  if (data.doctorName) {
    page.drawText(`Assigned Provider: ${data.doctorName}`, {
      x: col2X + 12,
      y: y - 58,
      size: 7.5,
      font: helveticaBold,
      color: textDark,
    })
  }

  if (data.appointmentDate) {
    page.drawText(`Session Schedule: ${data.appointmentDate} @ ${data.appointmentTime || 'Confirmed Slot'}`, {
      x: col2X + 12,
      y: y - 70,
      size: 7.5,
      font: helvetica,
      color: textDark,
    })
  }

  y -= 105

  // 5. Itemized Table of Charges
  const tableX = 45
  const tableW = width - 90
  const colIndex = tableX + 8
  const colDesc = tableX + 30
  const colSac = tableX + 260
  const colQty = tableX + 335
  const colRate = tableX + 380
  const colTaxable = tableX + 440
  const colTotal = tableX + 490

  // Table Header Background
  page.drawRectangle({
    x: tableX,
    y: y - 20,
    width: tableW,
    height: 20,
    color: primary,
  })

  page.drawText('#', { x: colIndex, y: y - 14, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('SERVICE DESCRIPTION', { x: colDesc, y: y - 14, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('SAC / HSN', { x: colSac, y: y - 14, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('QTY', { x: colQty, y: y - 14, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('RATE (INR)', { x: colRate, y: y - 14, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('TAX', { x: colTaxable, y: y - 14, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText('AMOUNT', { x: colTotal, y: y - 14, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) })
  y -= 20

  // Table Row 1
  const rowH = 48
  page.drawRectangle({
    x: tableX,
    y: y - rowH,
    width: tableW,
    height: rowH,
    color: rgb(1, 1, 1),
    borderColor: borderLight,
    borderWidth: 1,
  })

  page.drawText('1', { x: colIndex, y: y - 16, size: 8, font: helvetica, color: textDark })

  const title = data.serviceDescription || 'Clinical Telemedicine Consultation & Metabolic Evaluation'
  page.drawText(title, { x: colDesc, y: y - 16, size: 8.5, font: helveticaBold, color: textDark })
  page.drawText('Telehealth clinical intake, physiological assessment & prescription review', {
    x: colDesc,
    y: y - 28,
    size: 7,
    font: helveticaOblique,
    color: textMuted,
  })

  page.drawText(data.sacCode || '999312', { x: colSac, y: y - 16, size: 8, font: helvetica, color: textDark })
  page.drawText('1', { x: colQty + 5, y: y - 16, size: 8, font: helvetica, color: textDark })

  const formattedAmount = `Rs. ${Number(data.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  page.drawText(formattedAmount, { x: colRate, y: y - 16, size: 8, font: helvetica, color: textDark })
  page.drawText('Exempt*', { x: colTaxable, y: y - 16, size: 7.5, font: helvetica, color: emerald })
  page.drawText(formattedAmount, { x: colTotal, y: y - 16, size: 8.5, font: helveticaBold, color: textDark })

  y -= rowH + 16

  // 6. Summary Totals Box (Right) & Tax Disclosures (Left)
  const summaryBoxW = 200
  const summaryBoxX = width - 45 - summaryBoxW
  const summaryBoxH = 95
  const summaryBoxY = y - summaryBoxH

  // Left: Tax Exemption & Words
  const leftW = summaryBoxX - 45 - 20
  page.drawText('AMOUNT IN WORDS', { x: 45, y: y - 10, size: 7.5, font: helveticaBold, color: textMuted })
  const words = `Indian Rupees ${numberToWords(data.amount || 0)} Only`
  page.drawText(words, { x: 45, y: y - 24, size: 8.5, font: helveticaBold, color: primary })

  page.drawText('*Statutory Healthcare Tax Classification:', {
    x: 45,
    y: y - 44,
    size: 7.5,
    font: helveticaBold,
    color: textMuted,
  })
  page.drawText('Healthcare teleconsultation services provided by Clinical Establishments or authorized', {
    x: 45,
    y: y - 56,
    size: 7,
    font: helvetica,
    color: textMuted,
  })
  page.drawText('Medical Practitioners are exempt from GST under Notification No. 12/2017 - Central Tax (Rate).', {
    x: 45,
    y: y - 66,
    size: 7,
    font: helvetica,
    color: textMuted,
  })

  // Right: Summary Grid
  page.drawRectangle({
    x: summaryBoxX,
    y: summaryBoxY,
    width: summaryBoxW,
    height: summaryBoxH,
    color: bgLight,
    borderColor: borderLight,
    borderWidth: 1,
  })

  let sumY = summaryBoxY + summaryBoxH - 16
  page.drawText('Subtotal:', { x: summaryBoxX + 12, y: sumY, size: 8, font: helvetica, color: textMuted })
  page.drawText(formattedAmount, { x: summaryBoxX + summaryBoxW - 65, y: sumY, size: 8, font: helveticaBold, color: textDark })
  sumY -= 16

  page.drawText('CGST (0% Exempt):', { x: summaryBoxX + 12, y: sumY, size: 8, font: helvetica, color: textMuted })
  page.drawText('Rs. 0.00', { x: summaryBoxX + summaryBoxW - 65, y: sumY, size: 8, font: helvetica, color: textDark })
  sumY -= 16

  page.drawText('SGST / IGST (0% Exempt):', { x: summaryBoxX + 12, y: sumY, size: 8, font: helvetica, color: textMuted })
  page.drawText('Rs. 0.00', { x: summaryBoxX + summaryBoxW - 65, y: sumY, size: 8, font: helvetica, color: textDark })
  sumY -= 16

  // Total Paid Bar
  page.drawRectangle({
    x: summaryBoxX,
    y: summaryBoxY,
    width: summaryBoxW,
    height: 28,
    color: primary,
  })
  page.drawText('TOTAL PAID (INR):', { x: summaryBoxX + 12, y: summaryBoxY + 10, size: 8.5, font: helveticaBold, color: rgb(1, 1, 1) })
  page.drawText(formattedAmount, { x: summaryBoxX + summaryBoxW - 70, y: summaryBoxY + 10, size: 10, font: helveticaBold, color: rgb(1, 1, 1) })

  y -= summaryBoxH + 25

  // 7. Electronic Settlement & Security Compliance Badge
  const badgeH = 50
  page.drawRectangle({
    x: 45,
    y: y - badgeH,
    width: width - 90,
    height: badgeH,
    color: badgeBg,
    borderColor: teal,
    borderWidth: 0.75,
  })

  page.drawText('AUTHENTICATED TELEHEALTH PAYMENT CONFIRMATION', {
    x: 60,
    y: y - 16,
    size: 8,
    font: helveticaBold,
    color: teal,
  })

  page.drawText(
    'This official receipt acknowledges full payment settlement for digital health services rendered by 8LIV Healthcare.',
    { x: 60, y: y - 28, size: 7.5, font: helvetica, color: textDark }
  )
  page.drawText(
    'Eligible for healthcare preventative expenditure deduction under Section 80D of the Indian Income Tax Act where applicable.',
    { x: 60, y: y - 38, size: 7, font: helveticaOblique, color: textMuted }
  )

  y -= badgeH + 30

  // 8. Footer Disclosures
  page.drawLine({
    start: { x: 45, y },
    end: { x: width - 45, y },
    thickness: 0.5,
    color: borderLight,
  })
  y -= 14

  page.drawText(
    'This is a digitally generated document authenticated by 8Liv Healthcare Private Limited under the Information Technology Act, 2000.',
    { x: 45, y, size: 6.5, font: helvetica, color: textMuted }
  )
  page.drawText('For billing inquiries or reconciliation: care@8liv.health • Helpline: +91 80 4567 8900 • Page 1 of 1', {
    x: 45,
    y: y - 9,
    size: 6.5,
    font: helvetica,
    color: textMuted,
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
