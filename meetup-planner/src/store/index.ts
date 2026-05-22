'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Room, Member, Message, DateVote, Location } from '@/types';

interface StoreState {
  rooms: Room[];
  currentRoomId: string | null;
  currentMemberId: string | null;
  joinedRooms: { roomId: string; memberId: string }[]; // track all joined rooms

  createRoom: (name: string, maxMembers: number, profileImage?: string) => { room: Room; code: string };
  joinRoom: (code: string, memberName: string, avatar?: string) => { room: Room; member: Member } | null;
  getRoomByCode: (code: string) => Room | undefined;
  getCurrentRoom: () => Room | undefined;
  getCurrentMember: () => Member | undefined;
  updateRoomProfile: (roomId: string, profileImage: string) => void;
  confirmDate: (roomId: string, date: string) => void;
  setDecorationLevel: (roomId: string, level: number) => void;
  setConcepts: (roomId: string, concepts: string[]) => void;
  switchRoom: (roomId: string) => void;

  sendMessage: (content: string) => void;
  markMessagesRead: (roomId: string) => void;

  toggleDateVote: (date: string) => void;

  addLocation: (location: Location) => void;
  removeLocation: (roomId: string, locationName: string) => void;

  updateMemberAvatar: (avatar: string) => void;

  setSession: (roomId: string, memberId: string) => void;
  clearSession: () => void;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      rooms: [],
      currentRoomId: null,
      currentMemberId: null,
      joinedRooms: [],

      createRoom: (name, maxMembers, profileImage) => {
        const code = generateCode();
        const memberId = uuidv4();
        const room: Room = {
          id: uuidv4(),
          code,
          name,
          profileImage,
          maxMembers,
          members: [],
          messages: [],
          dateVotes: [],
          locations: [],
          createdAt: new Date().toISOString(),
          createdBy: memberId,
        };
        set((state) => ({ rooms: [...state.rooms, room] }));
        return { room, code };
      },

      joinRoom: (code, memberName, avatar) => {
        const state = get();
        const room = state.rooms.find((r) => r.code === code.toUpperCase());
        if (!room) return null;
        if (room.members.length >= room.maxMembers) return null;

        // Check if already joined this room
        const existing = state.joinedRooms.find(jr => jr.roomId === room.id);
        if (existing) {
          // Re-enter with existing member
          const existingMember = room.members.find(m => m.id === existing.memberId);
          if (existingMember) {
            set({ currentRoomId: room.id, currentMemberId: existing.memberId });
            return { room, member: existingMember };
          }
        }

        const member: Member = {
          id: uuidv4(),
          name: memberName,
          avatar,
          joinedAt: new Date().toISOString(),
        };

        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === room.id ? { ...r, members: [...r.members, member] } : r
          ),
          currentRoomId: room.id,
          currentMemberId: member.id,
          joinedRooms: [...state.joinedRooms.filter(jr => jr.roomId !== room.id), { roomId: room.id, memberId: member.id }],
        }));

        return { room, member };
      },

      getRoomByCode: (code) => {
        return get().rooms.find((r) => r.code === code.toUpperCase());
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

      updateRoomProfile: (roomId, profileImage) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, profileImage } : r
          ),
        }));
      },

      confirmDate: (roomId, date) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, confirmedDate: date } : r
          ),
        }));
      },

      setDecorationLevel: (roomId, level) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, decorationLevel: level } : r
          ),
        }));
      },

      setConcepts: (roomId, concepts) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, concepts } : r
          ),
        }));
      },

      switchRoom: (roomId) => {
        const state = get();
        const jr = state.joinedRooms.find(j => j.roomId === roomId);
        if (jr) {
          set({ currentRoomId: jr.roomId, currentMemberId: jr.memberId });
        }
      },

      sendMessage: (content) => {
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

        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === currentRoomId
              ? { ...r, messages: [...r.messages, message] }
              : r
          ),
        }));
      },

      markMessagesRead: (roomId) => {
        const { currentMemberId } = get();
        if (!currentMemberId) return;
        set((state) => ({
          rooms: state.rooms.map((r) => {
            if (r.id !== roomId) return r;
            return {
              ...r,
              messages: r.messages.map((msg) =>
                msg.readBy?.includes(currentMemberId)
                  ? msg
                  : { ...msg, readBy: [...(msg.readBy || []), currentMemberId] }
              ),
            };
          }),
        }));
      },

      toggleDateVote: (date) => {
        const { currentRoomId, currentMemberId } = get();
        if (!currentRoomId || !currentMemberId) return;

        set((state) => ({
          rooms: state.rooms.map((r) => {
            if (r.id !== currentRoomId) return r;
            const existing = r.dateVotes.find((v) => v.date === date);
            if (existing) {
              const hasVoted = existing.memberIds.includes(currentMemberId);
              return {
                ...r,
                dateVotes: r.dateVotes.map((v) =>
                  v.date === date
                    ? {
                        ...v,
                        memberIds: hasVoted
                          ? v.memberIds.filter((id) => id !== currentMemberId)
                          : [...v.memberIds, currentMemberId],
                      }
                    : v
                ).filter((v) => v.memberIds.length > 0),
              };
            } else {
              return {
                ...r,
                dateVotes: [...r.dateVotes, { date, memberIds: [currentMemberId] }],
              };
            }
          }),
        }));
      },

      addLocation: (location) => {
        const { currentRoomId } = get();
        if (!currentRoomId) return;
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === currentRoomId
              ? { ...r, locations: [...r.locations, location] }
              : r
          ),
        }));
      },

      removeLocation: (roomId, locationName) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId
              ? { ...r, locations: r.locations.filter((l) => l.name !== locationName) }
              : r
          ),
        }));
      },

      updateMemberAvatar: (avatar) => {
        const { currentRoomId, currentMemberId } = get();
        if (!currentRoomId || !currentMemberId) return;
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === currentRoomId
              ? {
                  ...r,
                  members: r.members.map((m) =>
                    m.id === currentMemberId ? { ...m, avatar } : m
                  ),
                  messages: r.messages.map((msg) =>
                    msg.memberId === currentMemberId ? { ...msg, memberAvatar: avatar } : msg
                  ),
                }
              : r
          ),
        }));
      },

      setSession: (roomId, memberId) => {
        set({ currentRoomId: roomId, currentMemberId: memberId });
      },

      clearSession: () => {
        set({ currentRoomId: null, currentMemberId: null });
      },
    }),
    {
      name: 'planit-store',
    }
  )
);
