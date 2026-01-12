
import React from 'react';
import { Scale, HeartPulse, Briefcase, Cpu, GraduationCap, Zap, Search, Globe, User, Shield, ZapOff, Sparkles as SparklesIcon } from 'lucide-react';
import { NicheData, FeatureItem, PricingTier, ToneData } from './types';

export const NICHES: NicheData[] = [
  {
    id: 'Legal',
    label: 'Legal',
    icon: 'Scale',
    placeholder: 'Paste your complex contract terms here...',
    demoInput: 'The Lessee shall indemnify and hold harmless the Lessor from and against any and all claims, damages, losses, liabilities, and expenses, including reasonable attorneys’ fees.',
    demoOutput: 'The tenant will pay for any legal costs or damages if something goes wrong, protecting the landlord from being responsible.'
  },
  {
    id: 'Medical',
    label: 'Medical',
    icon: 'HeartPulse',
    placeholder: 'Paste your medical test results here...',
    demoInput: 'Patient presents with acute idiopathic pulmonary edema secondary to myocardial infarction, requiring immediate diuresis and oxygen therapy.',
    demoOutput: 'The patient has sudden fluid buildup in the lungs caused by a heart attack. They need immediate medicine to remove fluid and extra oxygen.'
  },
  {
    id: 'Business',
    label: 'Business',
    icon: 'Briefcase',
    placeholder: 'Paste corporate jargon here...',
    demoInput: 'We need to leverage our core competencies to achieve a synergistic alignment of our cross-functional deliverables by Q4.',
    demoOutput: 'We need to use what we’re best at to make sure our different teams finish their work together by the end of the year.'
  },
  {
    id: 'Tech',
    label: 'Tech',
    icon: 'Cpu',
    placeholder: 'Paste technical documentation here...',
    demoInput: 'The microservices architecture employs an idempotent API design to ensure eventual consistency across distributed nodes during network partitioning.',
    demoOutput: 'The system is built of small pieces that can handle repeated commands without errors, making sure all parts stay in sync even if the internet drops.'
  },
  {
    id: 'Academic',
    label: 'Academic',
    icon: 'GraduationCap',
    placeholder: 'Paste research paper abstracts here...',
    demoInput: 'The longitudinal study elucidates a significant correlation between socioeconomic status and the longitudinal development of cognitive executive functions in adolescents.',
    demoOutput: 'The long-term study shows a clear link between how much money a family has and how well teenagers develop their planning and thinking skills.'
  }
];

export const FEATURES: FeatureItem[] = [
  {
    title: "Paste Jargon",
    description: "Copy any confusing text from contracts, emails, or reports into our smart input field.",
    icon: <Zap className="w-6 h-6" />
  },
  {
    title: "AI Analysis",
    description: "Our advanced models strip away the unnecessary complexity while preserving context.",
    icon: <Search className="w-6 h-6" />
  },
  {
    title: "Get Clarity",
    description: "Understand exactly what's being said in plain English within milliseconds.",
    icon: <Globe className="w-6 h-6" />
  }
];

export const TONES: ToneData[] = [
  { id: 'Standard', label: 'Standard', description: 'Clear and neutral plain English.' },
  { id: 'Executive', label: 'Executive', description: 'Professional summary for decision makers.' },
  { id: 'ELI5', label: 'ELI5', description: 'Explain like I am 5 years old.' },
  { id: 'Confident', label: 'Confident', description: 'Direct and authoritative tone.' },
  { id: 'Sarcastic', label: 'Sarcastic', description: 'Keep it simple, with a bit of bite.' }
];

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Starter",
    price: "$0",
    description: "Instant access. No signup required.",
    features: [
      "5 Simplifications / day",
      "Standard AI Engine",
      "Web App Access",
      "800 Character Limit"
    ],
    buttonText: "Use Now"
  },
  {
    name: "Gist Pro",
    price: "$19",
    description: "The choice for professionals and legal teams.",
    features: [
      "Unlimited Simplifications",
      "Advanced AI Engine",
      "File/PDF Analysis",
      "Save History",
      "5000 Character Limit"
    ],
    buttonText: "Upgrade to Pro",
    isPopular: true
  },
  {
    name: "Enterprise",
    price: "$49",
    description: "Scale clarity across your entire organization.",
    features: [
      "Everything in Pro",
      "25,000 Character Limit",
      "OCR & Image Analysis",
      "Visual Explanations",
      "Legal/Medical Deep Dives",
      "Contextual Hover & Chat",
      "Team Management (10 Users)",
      "Browser Extension Access"
    ],
    buttonText: "Get Enterprise"
  }
];
