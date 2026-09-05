export interface MetricItem {
  id: string;
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
}

export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  tag: string;
  iconName: string;
}

export type ViewStage = 'hero' | 'orbit' | 'telemetry' | 'system';
