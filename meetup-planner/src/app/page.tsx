'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';

type Tab = 'create' | 'join';

export default function Home() {
  const router = useRouter();
  const store = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const [tab, setTab] = useState<Tab>('create');
  const [roomName, setRoomName] = useState('');
  const [maxMembers, setMaxMembers] = useState(4);
  const [roomProfile, setRoomProfile] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberAvatar, setMemberAvatar] = useState('');
  const [error, setError] = useState('');
  const roomImgRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File): Promise<string> =>
    new Promise((res) => {
      const reader = new FileReader();
      reader.onload = (e) => res(e.target?.result as string);
      reader.readAsDataURL(file);
    });

  const handleCreate = () => {
    if (!roomName.trim()) { setError('방 이름을 입력해주세요'); return; }
    if (!memberName.trim()) { setError('닉네임을 입력해주세요'); return; }
    setError('');
    try {
      const { room } = store.createRoom(roomName.trim(), maxMembers, roomProfile || undefined);
      const result = store.joinRoom(room.code, memberName.trim(), memberAvatar || undefined);
      if (result) router.push(`/room/${room.code}`);
    } catch {
      setError('오류가 발생했어요. 다시 시도해주세요');
    }
  };

  const handleJoin = () => {
    if (!joinCode.trim()) { setError('방 코드를 입력해주세요'); return; }
    if (!memberName.trim()) { setError('닉네임을 입력해주세요'); return; }
    setError('');
    try {
      const result = store.joinRoom(joinCode.trim().toUpperCase(), memberName.trim(), memberAvatar || undefined);
      if (!result) { setError('방을 찾을 수 없거나 정원이 꽉 찼어요'); return; }
      router.push(`/room/${result.room.code}`);
    } catch {
      setError('오류가 발생했어요. 다시 시도해주세요');
    }
  };

  const rooms = mounted ? (store.rooms ?? []) : [];
  const joinedRooms = mounted ? (store.joinedRooms ?? []) : [];

  const myRooms = joinedRooms
    .map(jr => {
      const room = rooms.find(r => r.id === jr.roomId);
      const member = room?.members.find(m => m.id === jr.memberId);
      return room && member ? { room, member } : null;
    })
    .filter(Boolean) as { room: typeof rooms[0]; member: { id: string; name: string; avatar?: string; joinedAt: string } }[];

  const handleEnterRoom = (roomId: string, code: string) => {
    store.switchRoom(roomId);
    router.push(`/room/${code}`);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '28px 16px', paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 32,
          }}>🗓️</div>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: 'var(--accent)', letterSpacing: -0.5 }}>Planit</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>created by @shuuuhn</p>
        </div>

        {/* My rooms */}
        {myRooms.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, paddingLeft: 2 }}>내 방 목록</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myRooms.map(({ room, member }) => {
                const unread = (room.messages ?? []).filter(
                  msg => msg.memberId !== member.id && !((msg.readBy ?? []).includes(member.id))
                ).length;
                return (
                  <button key={room.id} onClick={() => handleEnterRoom(room.id, room.code)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '12px 14px',
                    textAlign: 'left', width: '100%',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-light)', overflow: 'hidden', flexShrink: 0,
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>
                      {room.profileImage
                        ? <img src={room.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '🗓️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {room.members.length}명 · {room.code}
                        {room.confirmedDate && ` · 📌 ${room.confirmedDate.slice(5).replace('-', '/')} 확정`}
                      </div>
                    </div>
                    {unread > 0 && (
                      <div style={{
                        background: 'var(--accent)', color: 'white',
                        borderRadius: 99, minWidth: 20, height: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, padding: '0 6px',
                      }}>{unread}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'var(--surface2)',
          borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 14,
        }}>
          {(['create', 'join'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(''); }} style={{
              flex: 1, padding: '9px 0', borderRadius: 'var(--radius-sm)',
              fontSize: 14, fontWeight: 600,
              background: tab === t ? 'var(--surface)' : 'transparent',
              color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
              border: tab === t ? '1px solid var(--border)' : 'none',
            }}>
              {t === 'create' ? '방 만들기' : '방 참가하기'}
            </button>
          ))}
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: 22,
        }}>
          {tab === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div onClick={() => roomImgRef.current?.click()} style={{
                  width: 60, height: 60, borderRadius: 'var(--radius-md)',
                  background: 'var(--surface2)', border: '2px dashed var(--border-strong)',
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>
                  {roomProfile ? <img src={roomProfile} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📸'}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>방 이름 *</label>
                  <input className="input-field" style={{ marginTop: 4 }}
                    placeholder="예: 제주도 여행 계획" value={roomName}
                    onChange={(e) => setRoomName(e.target.value)} />
                </div>
                <input ref={roomImgRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={async (e) => { const f = e.target.files?.[0]; if (f) setRoomProfile(await readFile(f)); }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  최대 인원: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{maxMembers}명</span>
                </label>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <button key={n} onClick={() => setMaxMembers(n)} style={{
                      flex: 1, padding: '7px 0', borderRadius: 'var(--radius-sm)',
                      fontSize: 13, fontWeight: 500,
                      background: maxMembers === n ? 'var(--accent)' : 'var(--surface2)',
                      color: maxMembers === n ? 'white' : 'var(--text-secondary)',
                      border: '1px solid ' + (maxMembers === n ? 'var(--accent)' : 'var(--border)'),
                    }}>{n}</button>
                  ))}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div onClick={() => avatarRef.current?.click()} style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: 'var(--accent-light)', border: '2px dashed var(--border-strong)',
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  {memberAvatar ? <img src={memberAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '😊'}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>내 닉네임 *</label>
                  <input className="input-field" style={{ marginTop: 4 }}
                    placeholder="닉네임 입력" value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
                </div>
                <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={async (e) => { const f = e.target.files?.[0]; if (f) setMemberAvatar(await readFile(f)); }} />
              </div>
            </div>
          )}

          {tab === 'join' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>방 코드 *</label>
                <input className="input-field"
                  style={{ marginTop: 4, textTransform: 'uppercase', letterSpacing: 4, fontSize: 20, fontWeight: 700, textAlign: 'center' }}
                  placeholder="XXXXXX" maxLength={6} value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div onClick={() => avatarRef.current?.click()} style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: 'var(--accent-light)', border: '2px dashed var(--border-strong)',
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  {memberAvatar ? <img src={memberAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '😊'}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>내 닉네임 *</label>
                  <input className="input-field" style={{ marginTop: 4 }}
                    placeholder="닉네임 입력" value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()} />
                </div>
                <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={async (e) => { const f = e.target.files?.[0]; if (f) setMemberAvatar(await readFile(f)); }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: 'var(--accent-light)', border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--accent-dark)',
            }}>{error}</div>
          )}

          <button onClick={tab === 'create' ? handleCreate : handleJoin} style={{
            marginTop: 20, width: '100%', padding: '13px',
            background: 'var(--accent)', color: 'white',
            borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 600,
          }}>
            {tab === 'create' ? '방 만들기' : '입장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
