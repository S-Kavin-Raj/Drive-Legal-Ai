import {
  BellRing,
  Mic,
  Navigation,
  ScanText,
  Scale,
  EyeOff,
  Radar,
  ShieldCheck,
  FileSearch,
  Bot,
} from 'lucide-react'

export const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Stats', href: '#stats' },
]

export const heroBadges = [
  'Road-safety AI intelligence',
  'Proactive legal support',
  'Built for drivers & fleets',
]

export const featureItems = [
  {
    title: 'Route Intelligence',
    description:
      'Predicts legal risk zones, black spots, and traffic patterns to recommend safer, smarter routes in real time.',
    icon: Navigation,
  },
  {
    title: 'Real-Time Speed Alerts',
    description:
      'Warns drivers instantly when speed trends approach violation thresholds using dynamic road context.',
    icon: BellRing,
  },
  {
    title: 'AI Legal Assistant',
    description:
      'Provides instant legal guidance and compliant next steps for road incidents, challans, and disputes.',
    icon: Scale,
  },
  {
    title: 'Challan OCR Analysis',
    description:
      'Extracts and validates challan details from images, flags anomalies, and suggests quick legal actions.',
    icon: ScanText,
  },
  {
    title: 'Voice Assistant',
    description:
      'Hands-free assistant for navigation alerts and legal support prompts while staying focused on driving.',
    icon: Mic,
  },
  {
    title: 'Drowsiness Detection',
    description:
      'Uses behavioral and sensor signals to detect fatigue early and trigger safety-first interventions.',
    icon: EyeOff,
  },
]

export const workflowSteps = [
  {
    step: '01',
    title: 'Capture Driving Context',
    description:
      'DriveLegal AI ingests route, speed, and event signals continuously from your app and connected devices.',
    icon: Radar,
  },
  {
    step: '02',
    title: 'Analyze & Detect Risks',
    description:
      'The intelligence engine evaluates legal and safety risk in real time, from speed spikes to challan triggers.',
    icon: ShieldCheck,
  },
  {
    step: '03',
    title: 'Act with AI Guidance',
    description:
      'Receive immediate recommendations, voice prompts, and legal next steps to stay compliant and protected.',
    icon: Bot,
  },
]

export const statItems = [
  {
    label: 'Incidents Prevented',
    value: '92K+',
    note: 'AI-assisted interventions this year',
  },
  {
    label: 'Route Decisions Optimized',
    value: '1.8M+',
    note: 'Predicted through traffic-risk models',
  },
  {
    label: 'Faster Legal Resolution',
    value: '4.6x',
    note: 'Compared with manual workflows',
  },
  {
    label: 'Challans Analyzed',
    value: '310K+',
    note: 'OCR summaries with legal insights',
  },
]

export const footerLinks = [
  {
    heading: 'Product',
    links: ['Features', 'How It Works', 'Pricing', 'Integrations'],
  },
  {
    heading: 'Resources',
    links: ['Documentation', 'Case Studies', 'Safety Reports', 'Blog'],
  },
  {
    heading: 'Company',
    links: ['About', 'Careers', 'Contact', 'Support'],
  },
]
