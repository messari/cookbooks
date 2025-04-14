// Chart Types
export interface ChartPoint {
  timestamp: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  [key: string]: number | undefined;
}

export interface ChartEntity {
  id: string;
  name: string;
  primary_project_id?: string;
  primary_project_slug?: string;
  serial_id?: number;
  slug: string;
  symbol: string;
}

export interface ChartSeries {
  key: string;
  entity: ChartEntity;
  points: Array<Array<number>>;
}

export interface PointSchema {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_timestamp: boolean;
  format: string;
  subcategory?: string;
  attribution?: Array<{
    name: string;
    link: string;
  }>;
}

export interface MetricTimeseries {
  point_schema: PointSchema[];
  series: ChartSeries[];
}

export interface ChartData {
  entities: Array<{
    entityType: string;
    entityId: string;
  }>;
  dataset: string;
  metric: string;
  start: string;
  end: string;
  tier: string;
  metricTimeseries: MetricTimeseries;
  granularity: string;
  messageId?: string;
  uuid?: string;
}

// Citation Types
export interface Citation {
  citationId: number;
  domain: string;
  url?: string;
  title?: string;
  messageId?: string;
  uuid?: string;
}

// Context Types
export interface ChartContextType {
  charts: ChartData[];
  addChart: (
    chart: ChartData,
    messageId?: string,
    idempotencyKey?: string
  ) => void;
  sidebarOpen: boolean;
  activeChart: ChartData | null;
  openChartSidebar: (chart: ChartData) => void;
  closeChartSidebar: () => void;
  getChartsByMessageId: (messageId: string) => ChartData[];
}

export interface CitationContextType {
  citations: Citation[];
  addCitation: (
    citation: Citation,
    messageId?: string,
    idempotencyKey?: string
  ) => void;
  sidebarOpen: boolean;
  activeMessageId: string | null;
  openCitationSidebar: (messageId: string) => void;
  closeCitationSidebar: () => void;
  getCitationsByMessageId: (messageId: string) => Citation[];
}

// API Types
export interface MessariChatChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  metadata?: {
    status: string;
    trace_id: string;
    cited_sources?: Array<{
      citationId: number;
      domain: string;
      url?: string;
      title?: string;
    }>;
    charts?: ChartData[];
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens?: number;
  };
}

// Component Props Types
export interface TimeseriesChartProps {
  chartData: ChartData;
}

export interface ChartProviderProps {
  children: React.ReactNode;
}

// Error Handling Types
export interface ErrorState {
  message: string;
  retryCount: number;
  isReceivingStream: boolean;
}

// JSON Value type (from Vercel AI SDK)
export type JSONValue =
  | string
  | number
  | boolean
  | { [key: string]: JSONValue }
  | JSONValue[]
  | null;

// Streaming Data Types
export interface ChatDataItem {
  type: "chart_data";
  data: ChartData[];
  messageId: string;
  uuid: string;
}

export interface CitationDataItem {
  type: "citation_data";
  data: Citation[];
  messageId: string;
  uuid: string;
}

export type StreamingDataItem = ChatDataItem | CitationDataItem;
