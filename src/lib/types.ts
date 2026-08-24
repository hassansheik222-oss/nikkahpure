export type Gender = 'male' | 'female';
export type Verification = 'unverified' | 'pending' | 'verified' | 'rejected';
export type InterestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';
export type ConversationStatus = 'awaiting_wali' | 'open' | 'closed';
export type WaliLinkStatus = 'invited' | 'active' | 'revoked';
export type PhotoVisibility = 'matches_only' | 'wali_only';

export interface Profile {
  id: string;
  full_name: string;
  gender: Gender;
  date_of_birth: string;
  city: string | null;
  country: string | null;
  sect: string | null;
  madhab: string | null;
  prayer_level: string | null;
  ethnicity: string | null;
  languages: string[] | null;
  profession: string | null;
  education: string | null;
  marital_status: string | null;
  has_children: boolean | null;
  willing_to_relocate: boolean | null;
  bio: string | null;
  core_values: string[] | null;
  seeking_min_age: number | null;
  seeking_max_age: number | null;
  seeking_countries: string[] | null;
  photo_path: string | null;
  photo_visibility: PhotoVisibility;
  verification: Verification;
  wali_required: boolean;
  onboarding_done: boolean;
  is_active: boolean;
  is_suspended: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaliLink {
  id: string;
  ward_id: string;
  wali_user_id: string | null;
  wali_name: string;
  wali_email: string;
  wali_phone: string | null;
  relationship: string;
  invite_code: string;
  status: WaliLinkStatus;
  must_approve_chat: boolean;
  can_read_messages: boolean;
  created_at: string;
  accepted_at: string | null;
}

export interface Interest {
  id: string;
  sender_id: string;
  receiver_id: string;
  note: string | null;
  status: InterestStatus;
  created_at: string;
  responded_at: string | null;
}

export interface Conversation {
  id: string;
  interest_id: string | null;
  user_a: string;
  user_b: string;
  status: ConversationStatus;
  needs_wali_a: boolean;
  needs_wali_b: boolean;
  wali_a_approved_at: string | null;
  wali_b_approved_at: string | null;
  wali_a_approved_by: string | null;
  wali_b_approved_by: string | null;
  closed_reason: string | null;
  created_at: string;
  last_message_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  document_path: string;
  selfie_path: string | null;
  status: Verification;
  reviewer_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}
