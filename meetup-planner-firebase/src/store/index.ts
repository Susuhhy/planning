'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ref, set as dbSet, get, update, push, onValue, off } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { Room, Member, Message, DateVote, Location } from '@/types';

// ─── 로컬 세션만 persist (방 데이터는 Firebase에서 실시간 동기화) ───────────
interface LocalSession {
  currentRoomId: string | null;
  currentMemberId: string | null;
  joinedRooms: { roomId: string; memberId: string }[];
}

interface StoreState extends LocalSession {
  // Firebase에서 동기화된 방 목록 (메모리에만 유지)
  rooms: Room[];

  // Actions
  createRoom: (name: string, maxMembers: number, profileImage?: string) => Promise<{ room: Room; code: string }>;
  joinRoom: (code: string, memberName: string, avatar?: string) => Promise<{ room: Room; member: Member } | null>;
  getRoomByCode: (code: string) => Promise<Room | undefined>;
  getCurrentRoom: () => Room | undefined;
  getCurrentMember: () => Member | undefined;
  updateRoomProfile: (roomId: string, profileImage: string) => Promise<void>;
  confirmDate: (roomId: string, date: string) => Promise<void>;
  setDecorationLevel: (roomId: string, level: number) => Promise<void>;
  setConcepts: (roomId: string, concepts: string[]) => Promise<void>;
  switchRoom: (roomId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  markMessagesRead: (roomId: string) => Promise<void>;
  toggleDateVote: (date: string) => Promise<void>;
  addLocation: (location: Location) => Promise<void>;
  removeLocation: (roomId: string, locationName: string) => Promise<void>;
  updateMemberAvatar: (avatar: string) => Promise<void>;
  setSession: (roomId: string, memberId: string) => void;
  clearSession: () => void;

  // Firebase 실시간 구독 관리
  subscribeRoom: (roomId: string) => () => void;
  _setRoomData: (room: Room) => void;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const safeStorage = createJSONStorage(() => {
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  return localStorage;
});

// Firebase Room 경로 헬퍼
const roomRef = (roomId: string) => ref(db, `rooms/${roomId}`);
const roomByCodeRef = (code: string) => ref(db, `roomCodes/${code}`);

// Firebase에서 Room 전체 읽기 + 배열 필드 정규화
async function fetchRoomById(roomId: string): Promise<Room | null> {
  const snap = await get(roomRef(roomId));
  if (!snap.exists()) return null;
  const data = snap.val();
  return normalizeRoom(data);
}

function normalizeRoom(data: Record<string, unknown>): Room {
  return {
    ...data,
    members: data.members ?? [],
    messages: data.messages ?? [],
    dateVotes: data.dateVotes ?? [],
    locations: data.locations ?? [],
  } as Room;
}

// code → roomId 인덱스로 방 찾기
async function fetchRoomByCode(code: string): Promise<Room | null> {
  const codeSnap = await get(roomByCodeRef(code.toUpperCase()));
  if (!codeSnap.exists()) return null;
  const roomId: string = codeSnap.val();
  return fetchRoomById(roomId);
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      rooms: [],
      currentRoomId: null,
      currentMemberId: null,
      joinedRooms: [],

      // ── 내부용: Firebase 리스너가 방 데이터 업데이트할 때 호출 ──
      _setRoomData: (room: Room) => {
        set((s) => {
          const exists = s.rooms.find((r) => r.id === room.id);
          if (exists) {
            return { rooms: s.rooms.map((r) => (r.id === room.id ? room : r)) };
          }
          return { rooms: [...s.rooms, room] };
        });
      },

      // ── 실시간 구독 (방 입장 시 호출, 나갈 때 반환된 unsubscribe 호출) ──
      subscribeRoom: (roomId: string) => {
        const r = roomRef(roomId);
        const handler = onValue(r, (snap) => {
          if (snap.exists()) {
            get()._setRoomData(normalizeRoom(snap.val()));
          }
        });
        // onValue returns unsubscribe fn
        return () => off(r, 'value', handler);
      },

      // ── 방 만들기 ──────────────────────────────────────────────────────────
      createRoom: async (name, maxMembers, profileImage) => {
        const code = generateCode();
        const room: Room = {
          id: uuidv4(),
          code,
          name,
          maxMembers,
          members: [],
          messages: [],
          dateVotes: [],
          locations: [],
          createdAt: new Date().toISOString(),
          createdBy: '',
          ...(profileImage ? { profileImage } : {}),
        };

        // Firebase는 undefined 필드를 허용하지 않으므로 제거 후 저장
        const roomForFirebase = JSON.parse(JSON.stringify(room));
        await dbSet(roomRef(room.id), roomForFirebase);
        await dbSet(roomByCodeRef(code), room.id);

        set((s) => ({ rooms: [...s.rooms, room] }));
        return { room, code };
      },

      // ── 방 참가 ──────────────────────────────────────────────────────────
      joinRoom: async (code, memberName, avatar) => {
        const state = get();

        // Firebase에서 코드로 방 검색 (다른 기기 방도 찾을 수 있음)
        const room = await fetchRoomByCode(code);
        if (!room) return null;
        if ((room.members ?? []).length >= room.maxMembers) return null;

        // 이미 참가한 방인지 확인 (같은 기기 재입장)
        const existing = (state.joinedRooms ?? []).find((jr) => jr.roomId === room.id);
        if (existing) {
          const existingMember = (room.members ?? []).find((m) => m.id === existing.memberId);
          if (existingMember) {
            set({ currentRoomId: room.id, currentMemberId: existing.memberId });
            // 로컬 rooms에 없으면 추가
            get()._setRoomData(room);
            return { room, member: existingMember };
          }
        }

        const member: Member = {
          id: uuidv4(),
          name: memberName,
          joinedAt: new Date().toISOString(),
          ...(avatar ? { avatar } : {}),
        };

        const updatedMembers = [...(room.members ?? []), member];

        // Firebase는 undefined 허용 안 하므로 직렬화 후 저장
        const membersForFirebase = JSON.parse(JSON.stringify(updatedMembers));
        await update(roomRef(room.id), { members: membersForFirebase });

        const updatedRoom = { ...room, members: updatedMembers };

        set((s) => ({
          rooms: s.rooms.find((r) => r.id === room.id)
            ? s.rooms.map((r) => (r.id === room.id ? updatedRoom : r))
            : [...s.rooms, updatedRoom],
          currentRoomId: room.id,
          currentMemberId: member.id,
          joinedRooms: [
            ...(s.joinedRooms ?? []).filter((jr) => jr.roomId !== room.id),
            { roomId: room.id, memberId: member.id },
          ],
        }));

        return { room: updatedRoom, member };
      },

      // ── 코드로 방 찾기 (Firebase 검색) ────────────────────────────────────
      getRoomByCode: async (code) => {
        const room = await fetchRoomByCode(code);
        return room ?? undefined;
      },

      getCurrentRoom: () => {
        const { rooms, currentRoomId } = get();
        return rooms.find((r) => r.id === currentRoomId);
      },

      getCurrentMember: () => {
        const { currentRoomId, currentMemberId } = get();
        const room = get().rooms.find((r) => r.id === currentRoomId);
        return room?.members.find((m) => m.id === currentMemberId);
      },

      updateRoomProfile: async (roomId, profileImage) => {
        await update(roomRef(roomId), { profileImage });
        set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, profileImage } : r)) }));
      },

      confirmDate: async (roomId, date) => {
        await update(roomRef(roomId), { confirmedDate: date });
        set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, confirmedDate: date } : r)) }));
      },

      setDecorationLevel: async (roomId, level) => {
        await update(roomRef(roomId), { decorationLevel: level });
        set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, decorationLevel: level } : r)) }));
      },

      setConcepts: async (roomId, concepts) => {
        await update(roomRef(roomId), { concepts });
        set((s) => ({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, concepts } : r)) }));
      },

      switchRoom: (roomId) => {
        const jr = (get().joinedRooms ?? []).find((j) => j.roomId === roomId);
        if (jr) set({ currentRoomId: jr.roomId, currentMemberId: jr.memberId });
      },

      sendMessage: async (content) => {
        const { currentRoomId, currentMemberId } = get();
        if (!currentRoomId || !currentMemberId) return;
        const room = get().rooms.find((r) => r.id === currentRoomId);
        const member = room?.members.find((m) => m.id === currentMemberId);
        if (!room || !member) return;

        const message: Message = {
          id: uuidv4(),
          memberId: currentMemberId,
          memberName: member.name,
          memberAvatar: member.avatar,
          content,
          createdAt: new Date().toISOString(),
          readBy: [currentMemberId],
        };

        const updatedMessages = [...(room.messages ?? []), message];
        await update(roomRef(currentRoomId), { messages: updatedMessages });

        set((s) => ({
          rooms: s.rooms.map((r) =>
            r.id === currentRoomId ? { ...r, messages: updatedMessages } : r
          ),
        }));
      },

      markMessagesRead: async (roomId) => {
        const { currentMemberId } = get();
        if (!currentMemberId) return;
        const room = get().rooms.find((r) => r.id === roomId);
        if (!room) return;

        const updatedMessages = (room.messages ?? []).map((msg) =>
          (msg.readBy ?? []).includes(currentMemberId)
            ? msg
            : { ...msg, readBy: [...(msg.readBy ?? []), currentMemberId] }
        );

        await update(roomRef(roomId), { messages: updatedMessages });
        set((s) => ({
          rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, messages: updatedMessages } : r)),
        }));
      },

      toggleDateVote: async (date) => {
        const { currentRoomId, currentMemberId } = get();
        if (!currentRoomId || !currentMemberId) return;
        const room = get().rooms.find((r) => r.id === currentRoomId);
        if (!room) return;

        const existing = (room.dateVotes ?? []).find((v) => v.date === date);
        let updatedVotes: DateVote[];

        if (existing) {
          const hasVoted = existing.memberIds.includes(currentMemberId);
          updatedVotes = (room.dateVotes ?? [])
            .map((v) =>
              v.date === date
                ? {
                    ...v,
                    memberIds: hasVoted
                      ? v.memberIds.filter((id) => id !== currentMemberId)
                      : [...v.memberIds, currentMemberId],
                  }
                : v
            )
            .filter((v) => v.memberIds.length > 0);
        } else {
          updatedVotes = [...(room.dateVotes ?? []), { date, memberIds: [currentMemberId] }];
        }

        await update(roomRef(currentRoomId), { dateVotes: updatedVotes });
        set((s) => ({
          rooms: s.rooms.map((r) =>
            r.id === currentRoomId ? { ...r, dateVotes: updatedVotes } : r
          ),
        }));
      },

      addLocation: async (location) => {
        const { currentRoomId } = get();
        if (!currentRoomId) return;
        const room = get().rooms.find((r) => r.id === currentRoomId);
        if (!room) return;

        const updatedLocations = [...(room.locations ?? []), location];
        await update(roomRef(currentRoomId), { locations: updatedLocations });
        set((s) => ({
          rooms: s.rooms.map((r) =>
            r.id === currentRoomId ? { ...r, locations: updatedLocations } : r
          ),
        }));
      },

      removeLocation: async (roomId, locationName) => {
        const room = get().rooms.find((r) => r.id === roomId);
        if (!room) return;
        const updatedLocations = (room.locations ?? []).filter((l) => l.name !== locationName);
        await update(roomRef(roomId), { locations: updatedLocations });
        set((s) => ({
          rooms: s.rooms.map((r) =>
            r.id === roomId ? { ...r, locations: updatedLocations } : r
          ),
        }));
      },

      updateMemberAvatar: async (avatar) => {
        const { currentRoomId, currentMemberId } = get();
        if (!currentRoomId || !currentMemberId) return;
        const room = get().rooms.find((r) => r.id === currentRoomId);
        if (!room) return;

        const updatedMembers = (room.members ?? []).map((m) =>
          m.id === currentMemberId ? { ...m, avatar } : m
        );
        const updatedMessages = (room.messages ?? []).map((msg) =>
          msg.memberId === currentMemberId ? { ...msg, memberAvatar: avatar } : msg
        );

        await update(roomRef(currentRoomId), { members: updatedMembers, messages: updatedMessages });
        set((s) => ({
          rooms: s.rooms.map((r) =>
            r.id === currentRoomId
              ? { ...r, members: updatedMembers, messages: updatedMessages }
              : r
          ),
        }));
      },

      setSession: (roomId, memberId) => set({ currentRoomId: roomId, currentMemberId: memberId }),
      clearSession: () => set({ currentRoomId: null, currentMemberId: null }),
    }),
    {
      name: 'planit-session',
      storage: safeStorage,
      // 세션 정보만 로컬 저장 (방 데이터는 Firebase)
      partialize: (state) => ({
        currentRoomId: state.currentRoomId,
        currentMemberId: state.currentMemberId,
        joinedRooms: state.joinedRooms,
      }),
    }
  )
);
