export type ReportType = 'campaign' | 'platform' | 'feedback';

export type ReportStatus = 'submitted' | 'in_review' | 'resolved' | 'rejected';

export interface ReportRow {
  id: string;
  user_id: string;
  report_type: ReportType;
  description: string;
  image_url: string | null;
  campaign_id: string | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  status: ReportStatus;
  resolution_message: string | null;
  created_at: string;
  updated_at: string;
  campaign?: { id: string; title: string } | null;
}

export interface ReportResponseRow {
  id: string;
  report_id: string;
  responder_user_id: string;
  message: string;
  created_at: string;
  responder?: { name: string | null } | null;
}

export interface ReportStatusEvent {
  id: string;
  report_id: string;
  status: ReportStatus;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SubmitReportInput {
  report_type: ReportType;
  description: string;
  image_uri?: string | null;
  campaign_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_label?: string | null;
}

export const REPORT_TYPE_OPTIONS: {
  value: ReportType;
  label: string;
  description: string;
}[] = [
  {
    value: 'campaign',
    label: 'Campaign Issue',
    description: 'Resource delivery, volunteer behavior, distribution problems',
  },
  {
    value: 'platform',
    label: 'Platform Issue',
    description: 'App bugs, payment errors, login problems',
  },
  {
    value: 'feedback',
    label: 'General Feedback',
    description: 'Suggestions, UI/UX ideas',
  },
];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: 'Submitted',
  in_review: 'In Review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  campaign: 'Campaign Issue',
  platform: 'Platform Issue',
  feedback: 'General Feedback',
};
