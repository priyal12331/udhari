// Design tokens shared across the app — mirrors /app/design_guidelines.json
export const Colors = {
  surface: '#FFFFFF',
  onSurface: '#171717',
  surfaceSecondary: '#F4F4F5',
  onSurfaceSecondary: '#3F3F46',
  surfaceTertiary: '#E4E4E7',
  onSurfaceTertiary: '#52525B',
  surfaceInverse: '#171717',
  onSurfaceInverse: '#FFFFFF',
  brand: '#171717',
  // Domain semantic: Udhaar (credit given) = RED ; Jama (payment) = GREEN
  udhaar: '#DC2626',
  jama: '#16A34A',
  warning: '#D97706',
  border: '#E4E4E7',
  borderStrong: '#A1A1AA',
  divider: '#F4F4F5',
  riskRed: '#DC2626',
  riskYellow: '#D97706',
  riskGreen: '#16A34A',
  muted: '#71717A',
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};

export const Radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const Font = {
  size: { sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, hero: 40 },
  weight: { regular: '500' as const, semibold: '600' as const, bold: '700' as const, black: '800' as const },
};

export const formatINR = (n: number): string => {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return `₹${formatted}`;
};
