import sys

file_path = r'c:\Users\Manasai stanly\Desktop\8live\frontend\app\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace 1
t1 = "import { createClient } from '@supabase/supabase-js';"
r1 = "import { createClient } from '@supabase/supabase-js';\nimport LandingPage from '../components/LandingPage';"
content = content.replace(t1, r1)

# Replace 2
t2 = "  const router = useRouter();\n  const [selectedAuthRole, setSelectedAuthRole] = useState<string>('patient');"
r2 = "  const router = useRouter();\n  const [showLanding, setShowLanding] = useState(true);\n  const [selectedAuthRole, setSelectedAuthRole] = useState<string>('patient');"
content = content.replace(t2, r2)

# Replace 3
t3 = "  // ── AUTH SCREEN ───────────────────────────────────────────────────────────\n  if (!user) {"
r3 = """  // ── LANDING PAGE ────────────────────────────────────────────────────────────
  if (showLanding && !user) {
    return (
      <LandingPage 
        onStartAssessment={() => setShowLanding(false)} 
        onLoginDoctor={() => { 
          setSelectedAuthRole('doctor'); 
          setShowRoleSelection(false); 
          setShowLanding(false); 
        }} 
      />
    );
  }

  // ── AUTH SCREEN ───────────────────────────────────────────────────────────
  if (!user) {"""
content = content.replace(t3, r3)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Replacements done.')
