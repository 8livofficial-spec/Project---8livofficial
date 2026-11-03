'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Apple,
  Dumbbell,
  Send,
  Eye,
  FileEdit,
  Columns,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Layers,
  Droplet,
  Flame,
  Clock,
  Printer,
  Copy,
  Plus,
} from 'lucide-react'
import CareProtocolOfficialSheet from './CareProtocolOfficialSheet'

export interface ProviderProtocolBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newPlan: any) => void
  providerRole?: 'dietitian' | 'nutritionist' | 'fitness_coach'
  patient?: { id: string; name?: string; full_name?: string } | null
  consultation?: any | null
  patientsList?: any[]
  providerProfile?: any | null
}

interface TemplatePreset {
  id: string
  name: string
  badge: string
  title: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  water?: number
  frequency?: number
  steps?: number
  content: string
  guidelines: string[]
}

const DIETITIAN_PRESETS: TemplatePreset[] = [
  {
    id: 'veg-metabolic',
    name: 'Indian Vegetarian Metabolic Reset',
    badge: 'High Fiber & Protein • Vegetarian',
    title: 'Indian Vegetarian Metabolic Stabilization Protocol',
    calories: 1650,
    protein: 85,
    carbs: 135,
    fat: 42,
    water: 3.0,
    content: `🌅 EARLY MORNING (7:00 AM)
• 1 glass warm lemon water + 1 tsp soaked chia seeds
• 5 soaked almonds + 1 walnut

🍳 BREAKFAST (8:30 AM)
• 2 Moong Dal Chilla with grated paneer (50g) and mint coriander chutney
• OR: 2 Besan vegetable cheelas with 1 cup low-fat curd
• Green tea or black coffee (unsweetened)

🥗 MID-MORNING SNACK (11:30 AM)
• 1 cup sprout salad (cucumber, tomato, lemon, pink salt)
• Coconut water (tender, fresh)

🍲 LUNCH (1:30 PM)
• Large bowl green salad (cucumber, lettuce, bell peppers)
• 1 bowl thick Dal (Tadka / Palak / Masoor)
• 1 bowl seasonal subzi (Bhindi / Lauki / Gobhi) cooked in cold-pressed oil (< 1 tsp)
• 1 Multigrain Roti (Jowar / Bajra / Whole wheat)
• 1 cup low-fat probiotic curd

🍵 EVENING SNACK (5:00 PM)
• 1 cup roasted makhana (fox nuts) or boiled chana chaat
• Black tea / Green tea / Herbal infusion

🥣 DINNER (7:30 PM - 8:00 PM)
• Tofu / Low-fat Paneer stir-fry with broccoli, mushrooms, and bell peppers (150g)
• OR: 1 large bowl vegetable soup with boiled sprouts
• No heavy carbohydrates post 8:00 PM to facilitate nocturnal fat oxidation`,
    guidelines: [
      'Maintain minimum 3.0 Litres of pure water throughout the day.',
      'Chew every bite thoroughly; finish meals over 20-25 minutes.',
      'Take a 10-minute leisurely walk 20 minutes after lunch and dinner.',
      'Avoid artificial sweeteners, processed fried namkeen, and sugary sodas.',
    ],
  },
  {
    id: 'high-protein-nonveg',
    name: 'High-Protein Metabolic Lean (Non-Veg)',
    badge: '110g Protein • Fat Oxidation',
    title: 'High-Protein Lean Metabolic Nutrition Protocol',
    calories: 1600,
    protein: 110,
    carbs: 120,
    fat: 38,
    water: 3.2,
    content: `🌅 EARLY MORNING (7:00 AM)
• Warm water with 1 tbsp apple cider vinegar
• 6 soaked almonds + 2 walnuts

🍳 BREAKFAST (8:30 AM)
• 3 Egg White Omelette with spinach, mushrooms, and onion (1 whole egg + 2 whites)
• 1 slice 100% whole grain sourdough or rye toast
• Green tea (unsweetened)

🥗 MID-MORNING SNACK (11:30 AM)
• 1 cup Greek Yogurt or low-fat hung curd sprinkled with flaxseeds
• 1 small apple or bowl of mixed berries

🍲 LUNCH (1:30 PM)
• 150g Grilled / Poached Chicken Breast or White Fish (Pomfret / Rohu)
• Large garden vegetable salad with lemon-olive oil dressing
• 1 bowl dal or vegetable soup
• 1 cup steamed brown rice or 1 Jowar roti

🍵 EVENING SNACK (5:00 PM)
• 1 scoop Plant/Whey protein isolate in water OR 2 boiled egg whites with chaat masala
• Green tea

🥣 DINNER (7:30 PM - 8:00 PM)
• 150g Grilled fish or chicken tikka (non-creamy)
• Sautéed zucchini, bell peppers, beans, and asparagus in garlic and herbs
• Clear chicken broth or vegetable consommé`,
    guidelines: [
      'Consume 110g minimum daily protein to protect lean muscle mass under GLP-1 therapy.',
      'Hydrate with 3.2 Litres daily. Electrolyte powder in water recommended on workout days.',
      'Stop caffeine consumption after 3:00 PM for deep restorative sleep.',
    ],
  },
  {
    id: 'glp1-starter',
    name: 'GLP-1 Starter Gastro-Soothe Plan',
    badge: 'Anti-Nausea • Gentle Digest',
    title: 'GLP-1 Gastro-Protective & Satiety Calibrated Diet',
    calories: 1500,
    protein: 90,
    carbs: 130,
    fat: 35,
    water: 3.0,
    content: `🌿 NUTRITION DIRECTIVE FOR GLP-1 PATIENTS:
Due to delayed gastric emptying, consume small frequent protein-rich meals. Never force yourself to finish a plate once natural satiety cues signal fullness.

🌅 MORNING (7:30 AM)
• Fresh ginger and fennel seed warm infusion (soothes morning nausea)
• 4 soaked almonds

🍳 BREAKFAST (8:45 AM)
• 1/2 cup warm steel-cut oats cooked in almond milk with 1 scoop unflavored protein powder
• OR: 2 soft scrambled eggs with 1/2 whole wheat toast

🥗 ELEVENSES (11:30 AM)
• 1 small banana or tender coconut water with 1 tbsp soaked basil seeds (sabja)

🍲 LIGHT LUNCH (1:30 PM)
• 1 bowl Moong Dal Khichdi (50% dal, 50% rice) with steamed vegetables and 1 tsp ghee
• 1 small bowl fresh curd (acts as digestive probiotic)
• Small portion of grilled paneer or tofu (50g)

🍵 AFTERNOON SIPS (4:30 PM)
• Clear bone broth or vegetable broth
• 2 fiber-rich crackers or small fistful of roasted makhana

🥣 DINNER (7:00 PM - EARLY)
• 1 bowl warm pumpkin / tomato / spinach soup with shredded chicken breast or soft paneer
• Light sautéed zucchini and carrots with cumin`,
    guidelines: [
      'Eat small portions slowly. Stop eating as soon as comfortable fullness is felt.',
      'Sip liquids BETWEEN meals rather than during meals to prevent abdominal heaviness.',
      'Avoid high-fat, greasy, or deep-fried foods which exacerbate nausea and reflux.',
    ],
  },
  {
    id: 'blank-diet',
    name: 'Custom / Blank Diet Template',
    badge: 'Manual / Paste Custom Plan',
    title: 'Clinical Nutrition & Diet Protocol',
    calories: 1600,
    protein: 90,
    carbs: 140,
    fat: 40,
    water: 3.0,
    content: `[Paste or type your customized meal timings, food portions, and macros here]`,
    guidelines: [
      'Maintain daily hydration goals.',
      'Follow customized macro allocations as prescribed.',
    ],
  },
]

const FITNESS_PRESETS: TemplatePreset[] = [
  {
    id: 'glp1-muscle-preservation',
    name: 'GLP-1 Lean Muscle Defense Split',
    badge: '3-Day Full Body • Hypertrophy',
    title: 'GLP-1 Muscle Preservation & Strength Protocol',
    frequency: 3,
    steps: 8500,
    content: `🏋️ OVERVIEW & TRAINING OBJECTIVE:
Designed specifically for patients on medical weight management to prevent sarcopenia (lean muscle loss) and maintain high basal metabolic rate.

📅 WEEKLY FREQUENCY: 3 Non-Consecutive Days (e.g. Mon / Wed / Fri)
REST & MOBILITY: Tue / Thu / Sat / Sun

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAY 1: FULL BODY A (FOUNDATION & POSTURE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Goblet Squats (Dumbbell / Kettlebell)
   • 3 Sets × 10-12 Reps | Rest: 60s
   • Focus: Hip hinge depth, upright torso

2. Dumbbell Flat / Incline Chest Press
   • 3 Sets × 10-12 Reps | Rest: 60s
   • Focus: Controlled 2-second descent

3. Seated Cable or Dumbbell Neutral Row
   • 3 Sets × 12 Reps | Rest: 60s
   • Focus: Squeeze shoulder blades together

4. Romanian Deadlifts (RDLs with Dumbbells)
   • 3 Sets × 10 Reps | Rest: 60s
   • Focus: Hamstring stretch, flat spine

5. Standing Core Plank
   • 3 Sets × 30-45 Seconds

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAY 2: FULL BODY B (PULL & POSTERIOR CHAIN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Dumbbell Bulgarian Split Squats / Reverse Lunges
   • 3 Sets × 10 Reps per leg | Rest: 60s

2. Lat Pulldown / Resistance Band Overhead Pulldown
   • 3 Sets × 12 Reps | Rest: 60s

3. Dumbbell Overhead Shoulder Press
   • 3 Sets × 10-12 Reps | Rest: 60s

4. Glute Bridges (Bodyweight or Dumbbell across hips)
   • 3 Sets × 15 Reps | Rest: 45s

5. Bird-Dog Core Stability
   • 3 Sets × 10 Reps per side

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAY 3: FULL BODY C (METABOLIC CONDITIONING & CORE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Leg Press or Step-Ups onto 12-inch platform
   • 3 Sets × 12 Reps per leg

2. Push-Ups (Incline on bench or standard)
   • 3 Sets × 8-12 Reps

3. Face Pulls / Band Pull-Aparts (Rear Delts & Upper Back)
   • 3 Sets × 15 Reps

4. Farmer's Walk Carry (Moderate dumbbells)
   • 3 Sets × 40 paces | Rest: 45s

5. Deadbug Core Anti-Extension
   • 3 Sets × 10 Reps per side`,
    guidelines: [
      'Daily Step Target: Minimum 8,500 steps. Take a 12-minute brisk walk after your largest meal.',
      'Dynamic warm-up (arm circles, leg swings, cat-cow) for 5 minutes before lifting.',
      'Use weights where the final 2 reps feel challenging while maintaining flawless form.',
      'Stay hydrated with 500 mL water during exercise. Sip, do not gulp.',
    ],
  },
  {
    id: 'home-mobility-beginner',
    name: 'Home Low-Impact Strength & Mobility',
    badge: 'Zero Equipment • Beginner',
    title: 'Home-Based Low-Impact Functional Movement Protocol',
    frequency: 4,
    steps: 7500,
    content: `🏠 ZERO-EQUIPMENT DAILY FUNCTIONAL ROUTINE:
Designed for beginner fitness levels and joint-friendly metabolic activation without requiring a gym membership.

WEEKLY SCHEDULE: 4 Days Active (Mon / Tue / Thu / Fri), 3 Days Active Recovery

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTINE FLOW (25-30 MINUTES TOTAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Chair Squats / Box Squats
   • 3 Sets × 12 Reps | Rest: 45s
   • Tap the chair seat gently and stand up tall, squeezing glutes.

2. Wall Push-Ups or Countertop Incline Push-Ups
   • 3 Sets × 10-12 Reps | Rest: 45s
   • Keep body in a straight plank line from head to heels.

3. Stationary Wall-Sit
   • 3 Sets × 20-30 Seconds hold | Rest: 45s
   • Thighs parallel to floor, back flat against wall.

4. Standing Knee-to-Chest Marching
   • 3 Sets × 20 Total Marches | Rest: 30s
   • Engages lower abdominals and hip flexors.

5. Standing Calf Raises
   • 3 Sets × 15 Reps (pause 1s at top)

6. Cat-Cow Spine Mobility Stretch
   • 2 Sets × 10 gentle repetitions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST-MEAL GLUCOSE CLEARANCE DIRECTIVE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Commit to a 10-15 minute casual stroll immediately following lunch and dinner.
• This blunt postprandial glucose excursions by up to 35% through muscular GLUT4 activation.`,
    guidelines: [
      'No equipment needed. Wear supportive, cushioned walking shoes.',
      'Focus on smooth breathing; never hold your breath during repetitions.',
      'Report any knee or lower back stiffness to your coach for regression adjustments.',
    ],
  },
  {
    id: 'blank-fitness',
    name: 'Custom / Blank Fitness Template',
    badge: 'Manual / Paste Custom Plan',
    title: 'Customized Movement & Strength Protocol',
    frequency: 3,
    steps: 8000,
    content: `[Paste or type your customized workout split, exercise routines, sets, reps, and cardio directives here]`,
    guidelines: [
      'Complete dynamic warm-up before resistance training.',
      'Hit daily step goal and post-meal walking directives.',
    ],
  },
]

export default function ProviderProtocolBuilderModal({
  isOpen,
  onClose,
  onSuccess,
  providerRole = 'dietitian',
  patient = null,
  consultation = null,
  patientsList = [],
  providerProfile = null,
}: ProviderProtocolBuilderModalProps) {
  const isFitnessRole = providerRole === 'fitness_coach'
  const presets = isFitnessRole ? FITNESS_PRESETS : DIETITIAN_PRESETS

  // State
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split')
  const [selectedPatientId, setSelectedPatientId] = useState(patient?.id || consultation?.patient_id || '')
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0]?.id || '')

  const [title, setTitle] = useState(presets[0]?.title || '')
  const [calories, setCalories] = useState(String(presets[0]?.calories || 1600))
  const [protein, setProtein] = useState(String(presets[0]?.protein || 90))
  const [carbs, setCarbs] = useState(String(presets[0]?.carbs || 135))
  const [fat, setFat] = useState(String(presets[0]?.fat || 40))
  const [water, setWater] = useState(String(presets[0]?.water || 3.0))
  const [frequency, setFrequency] = useState(String(presets[0]?.frequency || 3))
  const [steps, setSteps] = useState(String(presets[0]?.steps || 8000))
  const [protocolContent, setProtocolContent] = useState(presets[0]?.content || '')
  const [guidelinesText, setGuidelinesText] = useState((presets[0]?.guidelines || []).join('\n'))
  const [clinicalNotes, setClinicalNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Sync patient if changed externally
  useEffect(() => {
    if (patient?.id) setSelectedPatientId(patient.id)
    else if (consultation?.patient_id) setSelectedPatientId(consultation.patient_id)
  }, [patient, consultation])

  if (!isOpen) return null

  // Resolve patient details
  const resolvedPatient =
    patient ||
    patientsList.find((p: any) => p.id === selectedPatientId) ||
    {
      id: selectedPatientId,
      name: consultation?.patient_name || 'Patient',
      full_name: consultation?.patient_name || 'Patient',
    }

  const patientDisplayName =
    resolvedPatient.full_name ||
    resolvedPatient.name ||
    consultation?.patient_name ||
    'Designated Patient'

  const specialistName =
    providerProfile?.full_name ||
    (isFitnessRole ? 'Certified Fitness Coach' : 'Clinical Dietitian')

  // Apply template preset
  const handleSelectPreset = (presetId: string) => {
    const tmpl = presets.find((p) => p.id === presetId)
    if (!tmpl) return
    setSelectedPresetId(presetId)
    setTitle(tmpl.title)
    if (tmpl.calories) setCalories(String(tmpl.calories))
    if (tmpl.protein) setProtein(String(tmpl.protein))
    if (tmpl.carbs) setCarbs(String(tmpl.carbs))
    if (tmpl.fat) setFat(String(tmpl.fat))
    if (tmpl.water) setWater(String(tmpl.water))
    if (tmpl.frequency) setFrequency(String(tmpl.frequency))
    if (tmpl.steps) setSteps(String(tmpl.steps))
    setProtocolContent(tmpl.content)
    setGuidelinesText(tmpl.guidelines.join('\n'))
  }

  // Quick text snippet inserters
  const insertSnippet = (snippet: string) => {
    setProtocolContent((prev) => (prev ? `${prev}\n\n${snippet}` : snippet))
  }

  // Submit and Deliver
  const handleDeliverProtocol = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId) {
      setErrorMsg('Please select a patient.')
      return
    }
    if (!protocolContent.trim()) {
      setErrorMsg('Protocol content cannot be empty. Type or paste your plan details.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      const payload: any = {
        patientId: selectedPatientId,
        appointmentId: consultation?.id || undefined,
        title: title.trim() || (isFitnessRole ? 'Personalized Movement Protocol' : 'Clinical Nutrition Plan'),
        description: isFitnessRole
          ? `Workout Split: ${frequency} sessions/week • Daily Step Goal: ${steps}`
          : `Daily Calories: ${calories} kcal • Hydration: ${water} L/day`,
        notes: clinicalNotes.trim() || undefined,
      }

      if (isFitnessRole) {
        payload.workoutType = title.trim()
        payload.weeklyFrequency = Number(frequency) || 3
        payload.dailyStepGoal = Number(steps) || 8000
        payload.exerciseRestrictions = guidelinesText.trim() || undefined
        payload.notes = `${clinicalNotes.trim()}\n\n${protocolContent.trim()}`
      } else {
        payload.caloriesPerDay = Number(calories) || 1600
        payload.hydrationGoal = `${water} L`
        payload.foodRestrictions = guidelinesText.trim() || undefined
        payload.mealSchedule = protocolContent.trim()
      }

      const res = await fetch('/api/provider/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Unable to deliver care protocol.')
      }

      onSuccess(data.plan || payload)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to deliver protocol.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-7xl rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col h-[94vh] max-h-[96vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* ── TOP NAV BAR ── */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-logo-official.png"
              alt="8Liv Official Logo"
              className="h-7 sm:h-8 w-auto object-contain hidden sm:block mr-1"
            />
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${isFitnessRole ? 'bg-amber-100 text-amber-700' : 'bg-[#0D9488]/10 text-[#0D9488]'}`}>
              {isFitnessRole ? <Dumbbell className="w-4 h-4" /> : <Apple className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${isFitnessRole ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-teal-50 text-teal-800 border border-teal-200'}`}>
                  {isFitnessRole ? 'Fitness Coach Studio' : 'Dietitian Studio'}
                </span>
                <span className="text-xs font-bold text-slate-500">• Official 8Liv Letterhead Template</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                {isFitnessRole ? 'Author Movement & Exercise Protocol' : 'Author Clinical Nutrition Blueprint'}
              </h2>
            </div>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex p-1 bg-slate-100 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'split' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'editor' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Editor Only</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Sheet Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── WORKSPACE BODY ── */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* ── LEFT PANE: EDITABLE FORM & PASTE STUDIO ── */}
          <div className={`overflow-y-auto p-6 space-y-5 bg-white ${viewMode === 'preview' ? 'hidden' : viewMode === 'editor' ? 'col-span-2' : ''}`}>
            
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                {errorMsg}
              </div>
            )}

            {/* Step 1: Select Patient & Starter Template */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Assigned Patient *
                </label>
                {patient ? (
                  <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900">
                    {patientDisplayName}
                  </div>
                ) : (
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:border-[#0D9488] outline-none bg-white cursor-pointer"
                  >
                    <option value="">-- Choose patient --</option>
                    {patientsList.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.name || p.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Starter Template / Preset</span>
                  <span className="text-[10px] text-teal-700 font-bold lowercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> auto-fills
                  </span>
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handleSelectPreset(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:border-[#0D9488] outline-none bg-white cursor-pointer"
                >
                  {presets.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({tmpl.badge})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 2: Protocol Title */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Protocol Header Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Personalized Indian Metabolic Nutrition Blueprint"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:border-[#0D9488] outline-none"
              />
            </div>

            {/* Step 3: Core Numeric Targets */}
            {!isFitnessRole ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="1650"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="90"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="135"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="40"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Water Goal (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={water}
                    onChange={(e) => setWater(e.target.value)}
                    placeholder="3.0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Weekly Training Frequency</label>
                  <input
                    type="number"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="3"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Daily Step Target</label>
                  <input
                    type="number"
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    placeholder="8000"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
              </div>
            )}

            {/* Step 4: THE CORE EDIT / COPY-PASTE PROTOCOL TEXTAREA */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <FileEdit className="w-4 h-4 text-[#0D9488]" />
                  <span>Protocol Schedule &amp; Directives (Editable / Copy-Paste) *</span>
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  {!isFitnessRole ? (
                    <>
                      <button
                        type="button"
                        onClick={() => insertSnippet('🍳 BREAKFAST (8:30 AM)\n• ')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        + Breakfast
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet('🍲 LUNCH (1:30 PM)\n• ')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        + Lunch
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet('🍵 EVENING SNACK (5:00 PM)\n• ')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        + Snack
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet('🥣 DINNER (7:30 PM)\n• ')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        + Dinner
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => insertSnippet('DAY 1: FULL BODY STRENGTH\n1. \n2. \n3. ')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        + Day 1
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet('DAY 2: PULL & POSTERIOR CHAIN\n1. \n2. \n3. ')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        + Day 2
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet('DAY 3: METABOLIC CONDITIONING\n1. \n2. \n3. ')}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        + Day 3
                      </button>
                    </>
                  )}
                </div>
              </div>

              <textarea
                rows={11}
                required
                value={protocolContent}
                onChange={(e) => setProtocolContent(e.target.value)}
                placeholder="Type or copy-paste your meal timings, exercises, sets, reps, or dietary guidance here. The formatting is preserved exactly as delivered."
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 font-mono text-xs leading-relaxed focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] outline-none bg-slate-50/50"
              />
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Tip: You can paste existing Word / WhatsApp notes directly above. It will be professionally styled inside the official 8Liv header &amp; footer letterhead.
              </p>
            </div>

            {/* Step 5: Directives & Clinical Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Directives (1 per line)
                </label>
                <textarea
                  rows={3}
                  value={guidelinesText}
                  onChange={(e) => setGuidelinesText(e.target.value)}
                  placeholder="Drink 3L water daily&#10;Avoid refined sugars&#10;Walk 10 mins post meals"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Private / Specialist Consultation Notes
                </label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Patient reports mild acid reflux; advised ginger infusion prior to bedtime."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeliverProtocol}
                disabled={submitting}
                className={`px-7 py-3 rounded-xl text-white text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isFitnessRole
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20'
                    : 'bg-[#0D9488] hover:bg-[#0B7D73] shadow-teal-900/20'
                }`}
              >
                {submitting ? (
                  <span>Delivering Protocol...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Deliver Official Protocol &amp; Complete</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── RIGHT PANE: LIVE BRANDED LETTERHEAD SHEET PREVIEW ── */}
          <div className={`overflow-y-auto p-4 sm:p-6 bg-slate-100/70 ${viewMode === 'editor' ? 'hidden' : viewMode === 'preview' ? 'col-span-2' : ''}`}>
            <CareProtocolOfficialSheet
              role={isFitnessRole ? 'fitness_coach' : 'dietitian'}
              specialistName={specialistName}
              specialistTitle={providerProfile?.specialization || providerProfile?.specialty}
              specialistRegistration={providerProfile?.registration_number}
              patientName={patientDisplayName}
              patientId={selectedPatientId}
              protocolNumber={isFitnessRole ? '8LIV-FIT-PREVIEW' : '8LIV-NUT-PREVIEW'}
              title={title}
              targetCalories={calories}
              targetProtein={protein}
              targetCarbs={carbs}
              targetFat={fat}
              hydrationLiters={Number(water)}
              weeklyFrequency={Number(frequency)}
              dailyStepGoal={Number(steps)}
              protocolContent={protocolContent}
              guidelines={guidelinesText}
              clinicalNotes={clinicalNotes}
              isDraftPreview={true}
            />
          </div>

        </div>
      </div>
    </div>
  )
}

