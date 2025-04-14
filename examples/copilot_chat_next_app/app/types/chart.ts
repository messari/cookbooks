export type ChartPoint = {
  timestamp: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
};

export type ChartDimensions = {
  width: number;
  height: number;
  padding: number;
  dpr: number;
};

export type ChartTheme = {
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  axisColor: string;
  upColor: string;
  downColor: string;
  volumeColor: string;
  marketCapColor: string;
};

export type ChartType = "price" | "volume" | "marketcap";

export type ScaleType = {
  factor: number;
  label: string;
  formatter: (value: number) => string;
};

export type ChartConfig = {
  type: ChartType;
  dimensions: {
    width: number;
    height: number;
    padding: number;
    dpr: number;
  };
  theme: ChartTheme;
  scale: ScaleType;
  showGrid: boolean;
  showAxes: boolean;
  animate: boolean;
};

export type ChartData = {
  metric?: string;
  metricTimeseries?: {
    series?: Array<{
      entity?: {
        name?: string;
      };
      points?: Array<Array<number>>;
    }>;
    point_schema?: Array<{
      name?: string;
      slug?: string;
    }>;
  };
};

export interface TimeseriesChartProps {
  chartData: ChartData;
  config?: Partial<ChartConfig>;
}
