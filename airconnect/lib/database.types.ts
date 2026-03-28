export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type PostType = 'standard' | 'tip' | 'route' | 'broadcast';
export type TipCategory = 'food' | 'transport' | 'safety' | 'activities' | 'hotel' | 'routes';
export type ConversationType = 'dm' | 'group' | 'city_chat';
export type BadgeType =
  | 'country'
  | 'globe_trotter'
  | 'continental_explorer'
  | 'layover_legend'
  | 'local_expert'
  | 'social_butterfly'
  | 'route_master';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  airline: string | null;
  position: string | null;
  base_airport: string | null;
  bio: string | null;
  employee_id_hash: string | null;
  verification_status: VerificationStatus;
  countries_visited: number;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  city: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  status_text: string | null;
  available_to_meet: boolean;
  duration_hours: number;
  expires_at: string;
  created_at: string;
  user?: User;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  city: string;
  country: string;
  post_type: PostType;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  user?: User;
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
}

export interface Tip {
  id: string;
  user_id: string;
  city: string;
  country: string;
  category: TipCategory;
  title: string;
  body: string;
  media_urls: string[];
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  badge_name: string;
  earned_at: string;
  metadata: Record<string, string> | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'photo' | 'location' | 'route';
  media_url: string | null;
  read_at: string | null;
  created_at: string;
  sender?: User;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participant_ids: string[];
  city: string | null;
  created_at: string;
  last_message?: Message;
  other_user?: User;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> };
      check_ins: { Row: CheckIn; Insert: Partial<CheckIn>; Update: Partial<CheckIn> };
      posts: { Row: Post; Insert: Partial<Post>; Update: Partial<Post> };
      tips: { Row: Tip; Insert: Partial<Tip>; Update: Partial<Tip> };
      badges: { Row: Badge; Insert: Partial<Badge>; Update: Partial<Badge> };
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message> };
      conversations: { Row: Conversation; Insert: Partial<Conversation>; Update: Partial<Conversation> };
    };
  };
}
