export interface Member {
  id: string;
  name: string;
  avatar?: string;
  joinedAt: string;
}

export interface Message {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  content: string;
  createdAt: string;
  readBy: string[]; // memberIds who have read this message
}

export interface DateVote {
  date: string;
  memberIds: string[];
}

export interface Location {
  type: 'manual' | 'naver';
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  profileImage?: string;
  maxMembers: number;
  members: Member[];
  messages: Message[];
  dateVotes: DateVote[];
  locations: Location[];
  createdAt: string;
  createdBy: string;
  confirmedDate?: string;
  decorationLevel?: number;
  concepts?: string[];
}

export interface AppState {
  rooms: Room[];
  currentRoomId: string | null;
  currentMemberId: string | null;
}
