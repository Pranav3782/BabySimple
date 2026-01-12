import React from 'react';

export type NicheType = 'Legal' | 'Medical' | 'Business' | 'Tech' | 'Academic';
export type ViewType = 'landing' | 'dashboard' | 'privacy' | 'terms';
export type ToneType = 'Standard' | 'Executive' | 'ELI5' | 'Confident' | 'Sarcastic';
export type ModelType = 'Gemini 1.5 Flash' | 'Gemini 1.5 Pro' | 'Groq (Llama-3)' | 'Cerebras' | 'Grok (xAI)' | 'Gemini Pro (Legacy)';

export interface NicheData {
  id: NicheType;
  label: string;
  icon: string;
  placeholder: string;
  demoInput: string;
  demoOutput: string;
}

export interface ToneData {
  id: ToneType;
  label: string;
  description: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  niche: NicheType;
  input: string;
  output: string;
  model: ModelType;
  tone: ToneType;
}