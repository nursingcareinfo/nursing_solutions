export interface DashboardStats {
  totalActiveStaff: number;
  availableStaff: number;
  activePatients: number;
  pendingCases: number;
  avgStaffRating: number;
  fulfillmentRate: number;
  revenueMTD: number;
}

export interface ChartData {
  category: string;
  total: number;
  available: number;
  avgRating: number;
}

export interface AreaDistribution {
  area: string;
  count: number;
}

export interface PatientTrend {
  date: string;
  count: number;
}
