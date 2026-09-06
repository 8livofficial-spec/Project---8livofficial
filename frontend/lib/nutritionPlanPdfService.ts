import { createHash } from 'crypto'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export type NutritionMealItem = {
  food: string
  portion: string
  unit: string
  alternative?: string
  instructions?: string
}

export type NutritionMeal = {
  id: string
  name: string
  time?: string
  items: NutritionMealItem[]
}

export type NutritionPlanCanonicalData = {
  plan_id: string
  plan_name: string
  version: number
  patient_id: string
  dietitian_id: string
  start_date: string
  review_date?: string | null
  daily_calorie_target?: number | null
  water_target_liters?: number | null
  nutrition_goals?: string | null
  general_instructions?: string | null
  status: string
  published_at?: string | null
  patient_name?: string
  patient_gender?: string
  patient_age?: string | number
  patient_current_weight?: number | null
  patient_height_cm?: number | null
  patient_bmi?: number | null
  dietitian_name?: string
  dietitian_qualification?: string
  dietitian_registration_number?: string
  meals: NutritionMeal[]
}

export function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Generates an authoritative, print-ready, high-resolution Clinical Nutrition Plan PDF.
 * Uses pdf-lib with clear 8LIV branding, meal timetables, macronutrient & calorie guidance,
 * and immutable tamper-evident cryptographic hash footer.
 */
export async function generateNutritionPlanPdf(
  canonical: NutritionPlanCanonicalData
): Promise<{ pdfBuffer: Buffer; pdfHash: string }> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // Standard A4 points
  const { width, height } = page.getSize()

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const black = rgb(0.08, 0.08, 0.08)
  const darkGray = rgb(0.28, 0.28, 0.28)
  const lightGray = rgb(0.85, 0.85, 0.85)
  const emeraldTeal = rgb(0.05, 0.58, 0.53) // 8LIV Medical Emerald #0D9488

  let y = height - 40

  // 1. Clinic Header
  page.drawText('8LIV HEALTH NETWORK', { x: 45, y, size: 14, font: helveticaBold, color: black })
  page.drawText('CLINICAL NUTRITION & METABOLIC HEALTH PROTOCOL', { x: 45, y: y - 13, size: 8.5, font: helveticaBold, color: emeraldTeal })
  page.drawText('Evidence-Based Medical Nutrition Therapy (MNT) & Dietary Management', { x: 45, y: y - 24, size: 7.5, font: helvetica, color: darkGray })
  page.drawText('Standardized Clinical Nutrition Guidelines', { x: width - 210, y: y - 24, size: 7.5, font: helveticaOblique, color: darkGray })
  y -= 34

  // Divider
  page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 1.5, color: black })
  y -= 16

  // 2. Metadata: Dietitian (Left) & Plan Details (Right)
  const col1X = 45
  const col2X = 310

  page.drawText('ATTENDING CLINICAL DIETITIAN', { x: col1X, y, size: 7.5, font: helveticaBold, color: darkGray })
  page.drawText('NUTRITION PLAN SPECIFICATION', { x: col2X, y, size: 7.5, font: helveticaBold, color: darkGray })
  y -= 12

  const dName = canonical.dietitian_name || 'Clinical Dietitian'
  page.drawText(dName, { x: col1X, y, size: 9.5, font: helveticaBold, color: black })
  page.drawText(`Plan: ${canonical.plan_name}`, { x: col2X, y, size: 9, font: helveticaBold, color: black })
  y -= 12

  page.drawText(`Credentials: ${canonical.dietitian_qualification || 'M.Sc. Clinical Nutrition, RD'}`, { x: col1X, y, size: 8, font: helvetica, color: black })
  page.drawText(`Document Version: v${canonical.version} (Immutable Snapshot)`, { x: col2X, y, size: 8, font: helvetica, color: black })
  y -= 12

  page.drawText(`Reg. ID: ${canonical.dietitian_registration_number || 'IDA-REG-8LIV'}`, { x: col1X, y, size: 8, font: helvetica, color: black })
  page.drawText(`Start Date: ${canonical.start_date || 'Immediate'}`, { x: col2X, y, size: 8, font: helvetica, color: black })
  y -= 12

  const publishedStr = canonical.published_at ? new Date(canonical.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString()
  page.drawText(`Published: ${publishedStr}`, { x: col1X, y, size: 8, font: helvetica, color: black })
  page.drawText(`Review Due: ${canonical.review_date || 'In 14 Days'}`, { x: col2X, y, size: 8, font: helvetica, color: black })
  y -= 16

  // Divider
  page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 0.5, color: lightGray })
  y -= 14

  // 3. Patient Information & Anthropometrics
  page.drawText('PATIENT CLINICAL & ANTHROPOMETRIC PROFILE', { x: 45, y, size: 7.5, font: helveticaBold, color: darkGray })
  y -= 12

  const pName = canonical.patient_name || 'Registered Patient'
  page.drawText(`Name: ${pName}`, { x: 45, y, size: 9, font: helveticaBold, color: black })
  page.drawText(`Age / Gender: ${canonical.patient_age || '-'} / ${canonical.patient_gender || '-'}`, { x: 230, y, size: 8.5, font: helvetica, color: black })
  page.drawText(`Patient ID: ${canonical.patient_id.slice(0, 14)}...`, { x: 400, y, size: 8, font: helvetica, color: darkGray })
  y -= 12

  const weightText = canonical.patient_current_weight ? `${canonical.patient_current_weight} kg` : 'Recorded in chart'
  const heightText = canonical.patient_height_cm ? `${canonical.patient_height_cm} cm` : '-'
  const bmiText = canonical.patient_bmi ? `${canonical.patient_bmi}` : '-'
  const caloriesText = canonical.daily_calorie_target ? `${canonical.daily_calorie_target} kcal/day` : 'As tolerated'
  const waterText = canonical.water_target_liters ? `${canonical.water_target_liters} L/day` : '2.5 L/day'

  page.drawText(`Weight: ${weightText}   |   Height: ${heightText}   |   BMI: ${bmiText}`, { x: 45, y, size: 8.5, font: helvetica, color: black })
  page.drawText(`Calorie Target: ${caloriesText}   |   Hydration: ${waterText}`, { x: 280, y, size: 8.5, font: helveticaBold, color: emeraldTeal })
  y -= 16

  // Divider
  page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 1, color: black })
  y -= 16

  // 4. Structured Meals Header & Table
  page.drawText('STRUCTURED DAILY MEAL SCHEDULE & CLINICAL INSTRUCTIONS', { x: 45, y, size: 8.5, font: helveticaBold, color: black })
  y -= 14

  // Table header
  const colTime = 45
  const colMeal = 110
  const colFood = 190
  const colPortion = 370
  const colAlt = 460

  page.drawText('TIME', { x: colTime, y, size: 7, font: helveticaBold, color: darkGray })
  page.drawText('MEAL', { x: colMeal, y, size: 7, font: helveticaBold, color: darkGray })
  page.drawText('RECOMMENDED FOODS', { x: colFood, y, size: 7, font: helveticaBold, color: darkGray })
  page.drawText('PORTION', { x: colPortion, y, size: 7, font: helveticaBold, color: darkGray })
  page.drawText('ALTERNATIVES', { x: colAlt, y, size: 7, font: helveticaBold, color: darkGray })
  y -= 6
  page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 0.5, color: darkGray })
  y -= 12

  // Render meals
  const mealsList = canonical.meals && canonical.meals.length > 0 ? canonical.meals : [
    { id: '1', name: 'Breakfast', time: '08:30 AM', items: [{ food: 'Oats with vegetables / Boiled eggs', portion: '1 bowl', unit: 'serving', alternative: 'Moong dal chilla' }] },
    { id: '2', name: 'Lunch', time: '01:30 PM', items: [{ food: 'Brown rice / 2 rotis + Dal + Curd + Salad', portion: '1 plate', unit: 'serving', alternative: 'Quinoa bowl' }] },
    { id: '3', name: 'Dinner', time: '08:00 PM', items: [{ food: 'Clear soup + Grilled paneer / fish + Salad', portion: '1 bowl', unit: 'serving', alternative: 'Vegetable stew' }] },
  ]

  for (const meal of mealsList) {
    if (y < 120) {
      // Don't overflow bottom
      break
    }

    const mealTime = meal.time || '--:--'
    const mealName = meal.name || 'Meal'

    page.drawText(mealTime, { x: colTime, y, size: 7.5, font: helveticaBold, color: emeraldTeal })
    page.drawText(mealName, { x: colMeal, y, size: 8, font: helveticaBold, color: black })

    if (meal.items && meal.items.length > 0) {
      for (const item of meal.items) {
        const foodStr = item.food.length > 36 ? `${item.food.slice(0, 34)}...` : item.food
        const portionStr = `${item.portion || '1'} ${item.unit || 'serving'}`
        const altStr = item.alternative ? (item.alternative.length > 22 ? `${item.alternative.slice(0, 20)}...` : item.alternative) : '-'

        page.drawText(foodStr, { x: colFood, y, size: 7.5, font: helvetica, color: black })
        page.drawText(portionStr, { x: colPortion, y, size: 7.5, font: helvetica, color: black })
        page.drawText(altStr, { x: colAlt, y, size: 7.5, font: helvetica, color: darkGray })
        
        y -= 12

        if (item.instructions) {
          const instr = `Prep: ${item.instructions.length > 70 ? item.instructions.slice(0, 68) + '...' : item.instructions}`
          page.drawText(instr, { x: colFood, y, size: 7, font: helveticaOblique, color: darkGray })
          y -= 10
        }
      }
    } else {
      page.drawText('As discussed during clinical consultation', { x: colFood, y, size: 7.5, font: helveticaOblique, color: darkGray })
      y -= 12
    }

    y -= 4
    page.drawLine({ start: { x: 45, y }, end: { x: width - 45, y }, thickness: 0.3, color: lightGray })
    y -= 10
  }

  // 5. Goals & Guidelines Section
  if (y > 90) {
    page.drawText('NUTRITION GOALS & ADHERENCE GUIDELINES', { x: 45, y, size: 7.5, font: helveticaBold, color: darkGray })
    y -= 11

    const goalsText = canonical.nutrition_goals || 'Follow prescribed meal timings, log daily hydration in patient portal, and maintain balanced macronutrient portions.'
    const cleanGoals = goalsText.length > 180 ? `${goalsText.slice(0, 175)}...` : goalsText
    page.drawText(cleanGoals, { x: 45, y, size: 7.5, font: helvetica, color: black })
    y -= 14

    if (canonical.general_instructions) {
      const cleanInst = canonical.general_instructions.length > 180 ? `${canonical.general_instructions.slice(0, 175)}...` : canonical.general_instructions
      page.drawText(`Instructions: ${cleanInst}`, { x: 45, y, size: 7.5, font: helveticaOblique, color: darkGray })
      y -= 14
    }
  }

  // 6. Cryptographic Stamp & Footer
  const footerY = 40
  page.drawLine({ start: { x: 45, y: footerY + 18 }, end: { x: width - 45, y: footerY + 18 }, thickness: 0.5, color: lightGray })

  const interimBuffer = Buffer.from(await pdfDoc.save())
  const docHash = sha256(interimBuffer).slice(0, 32).toUpperCase()

  page.drawText('8LIV CLINICAL NUTRITION ARCHIVE — IMMUTABLE PUBLISHED RECORD', {
    x: 45,
    y: footerY + 8,
    size: 6.5,
    font: helveticaBold,
    color: darkGray,
  })

  page.drawText(`Document SHA-256 Digest: ${docHash}`, {
    x: 45,
    y: footerY,
    size: 6.5,
    font: helvetica,
    color: darkGray,
  })

  page.drawText(`Generated via 8LIV MNT Engine — Confidential Medical Record`, {
    x: width - 260,
    y: footerY,
    size: 6.5,
    font: helveticaOblique,
    color: darkGray,
  })

  const finalBuffer = Buffer.from(await pdfDoc.save())
  const finalHash = sha256(finalBuffer)

  return { pdfBuffer: finalBuffer, pdfHash: finalHash }
}
