'use client';
import { useRef } from 'react';
import { useStore } from '@/store';
import type { Room } from '@/types';

interface Props {
  room: Room;
  currentMemberId: string;
}

function Avatar({ src, name, size = 56 }: { src?: string; name: string; size?: number }) {
  const colors = ['#e8674a', '#2d8f7b', '#d4820f', '#7c6af0', '#e04598'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', background: src ? 'transparent' : color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.38, fontWeight: 700,
      flexShrink: 0, border: '2px solid var(--border)',
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function MembersTab({ room, currentMemberId }: Props) {
  const { updateMemberAvatar, updateRoomProfile } = useStore();
  const avatarRef = useRef<HTMLInputElement>(null);
  const roomImgRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File): Promise<string> =>
    new Promise((res) => {
      const r = new FileReader();
      r.onload = (e) => res(e.target?.result as string);
      r.readAsDataURL(file);
    });

  const me = room.members.find((m) => m.id === currentMemberId);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      {/* Room info */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14 }}>방 정보</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            onClick={() => roomImgRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: 'var(--radius-md)',
              background: room.profileImage ? 'transparent' : 'var(--accent-light)',
              border: '2px dashed var(--border-strong)',
              cursor: 'pointer', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, flexShrink: 0,
            }}>
            {room.profileImage
              ? <img src={room.profileImage} alt="방 프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🗓️'}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{room.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              참가 코드: <span style={{ fontWeight: 700, letterSpacing: 3, color: 'var(--accent)', fontSize: 15 }}>{room.code}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {room.members.length}/{room.maxMembers}명 참가 중
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
          📸 방 사진을 클릭해서 변경할 수 있어요
        </p>
        <input ref={roomImgRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) updateRoomProfile(room.id, await readFile(f));
          }} />
      </div>

      {/* My profile */}
      {me && (
        <div style={{
          background: 'var(--accent-light)', border: '1px solid #f0bfb0',
          borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-dark)', marginBottom: 12 }}>내 프로필</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div onClick={() => avatarRef.current?.click()} style={{ cursor: 'pointer', position: 'relative' }}>
              <Avatar src={me.avatar} name={me.name} size={60} />
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--accent)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, border: '2px solid white',
              }}>✎</div>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{me.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {new Date(me.joinedAt).toLocaleDateString('ko-KR')} 참가
              </div>
              <button onClick={() => avatarRef.current?.click()} style={{
                marginTop: 6, fontSize: 12, color: 'var(--accent)',
                background: 'transparent', textDecoration: 'underline',
              }}>프로필 사진 변경</button>
            </div>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) updateMemberAvatar(await readFile(f));
            }} />
        </div>
      )}

      {/* Members list */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
        멤버 ({room.members.length}명)
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {room.members.map((m) => (
          <div key={m.id} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Avatar src={m.avatar} name={m.name} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</span>
                {m.id === currentMemberId && (
                  <span style={{
                    fontSize: 10, background: 'var(--accent)', color: 'white',
                    borderRadius: 99, padding: '2px 8px', fontWeight: 600,
                  }}>나</span>
                )}
                {m.id === room.createdBy && (
                  <span style={{
                    fontSize: 10, background: 'var(--amber-light)', color: 'var(--amber)',
                    borderRadius: 99, padding: '2px 8px', fontWeight: 600,
                    border: '1px solid #f5c84c',
                  }}>방장</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {new Date(m.joinedAt).toLocaleDateString('ko-KR')} 참가
              </div>
            </div>
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: room.maxMembers - room.members.length }).map((_, i) => (
          <div key={`empty-${i}`} style={{
            background: 'var(--surface2)', border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-md)', padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--border)', flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>참가 대기 중...</span>
          </div>
        ))}
      </div>

      {/* Invite */}
      <div style={{
        marginTop: 20, padding: 16,
        background: 'var(--teal-light)', border: '1px solid #a8ddd0',
        borderRadius: 'var(--radius-lg)', textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: 'var(--teal)', marginBottom: 10 }}>
          친구에게 방 코드를 알려주세요!
        </p>
        <div style={{
          fontSize: 28, fontWeight: 800, letterSpacing: 8,
          color: 'var(--teal)', fontFamily: 'monospace',
        }}>{room.code}</div>
        <button
          onClick={() => navigator.clipboard.writeText(room.code)}
          style={{
            marginTop: 10, padding: '8px 20px',
            background: 'var(--teal)', color: 'white',
            borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600,
          }}>코드 복사</button>
      </div>
    </div>
  );
}
