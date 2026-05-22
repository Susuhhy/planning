'use client';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import type { Room, Location } from '@/types';

interface Props {
  room: Room;
}

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => NaverMap;
        Marker: new (opts: object) => NaverMarker;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        Event: { addListener: (target: object, event: string, handler: () => void) => void };
        Service: {
          geocode: (opts: object, cb: (status: string, res: { v2: { addresses: Array<{ x: string; y: string; roadAddress: string }> } }) => void) => void;
          Status: { OK: string };
        };
      };
    };
  }
}
interface NaverMap { setCenter: (pos: NaverLatLng) => void; }
interface NaverMarker { setPosition: (pos: NaverLatLng) => void; }
interface NaverLatLng { x: number; y: number; }

const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || '';

export default function LocationTab({ room }: Props) {
  const { addLocation, removeLocation } = useStore();
  const [mode, setMode] = useState<'manual' | 'naver'>('manual');
  const [manualName, setManualName] = useState('');
  const [manualAddr, setManualAddr] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAddr, setSearchAddr] = useState('');
  const [searchResult, setSearchResult] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<NaverMap | null>(null);
  const markerRef = useRef<NaverMarker | null>(null);

  // Load Naver Maps SDK
  useEffect(() => {
    if (!NAVER_CLIENT_ID) { setMapLoaded(false); return; }
    if (window.naver?.maps) { setMapLoaded(true); return; }
    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_CLIENT_ID}&submodules=geocoder`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setMapLoaded(false);
    document.head.appendChild(script);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;
    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(37.5665, 126.9780),
      zoom: 13,
    });
    const marker = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(37.5665, 126.9780),
      map,
    });
    mapInstanceRef.current = map;
    markerRef.current = marker;
  }, [mapLoaded, mode]);

  const handleSearch = () => {
    if (!window.naver?.maps?.Service) { setError('지도 서비스를 사용할 수 없습니다'); return; }
    window.naver.maps.Service.geocode({ query: searchAddr }, (status, res) => {
      if (status !== window.naver.maps.Service.Status.OK) { setError('검색 결과가 없습니다'); return; }
      const item = res.v2.addresses[0];
      if (!item) { setError('검색 결과가 없습니다'); return; }
      const lat = parseFloat(item.y);
      const lng = parseFloat(item.x);
      setSearchResult({ lat, lng, address: item.roadAddress });
      const pos = new window.naver.maps.LatLng(lat, lng);
      mapInstanceRef.current?.setCenter(pos);
      markerRef.current?.setPosition(pos);
      setError('');
    });
  };

  const handleAddManual = () => {
    if (!manualName.trim()) { setError('장소 이름을 입력해주세요'); return; }
    addLocation({ type: 'manual', name: manualName.trim(), address: manualAddr.trim() });
    setManualName(''); setManualAddr(''); setError('');
  };

  const handleAddNaver = () => {
    if (!locationName.trim()) { setError('장소 이름을 입력해주세요'); return; }
    if (!searchResult) { setError('먼저 주소를 검색해주세요'); return; }
    addLocation({ type: 'naver', name: locationName.trim(), address: searchResult.address, lat: searchResult.lat, lng: searchResult.lng });
    setLocationName(''); setSearchAddr(''); setSearchResult(null); setError('');
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 16, gap: 4 }}>
        {(['manual', 'naver'] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); setError(''); }}
            style={{
              flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)',
              fontSize: 13, fontWeight: 500,
              background: mode === m ? 'var(--surface)' : 'transparent',
              color: mode === m ? 'var(--accent)' : 'var(--text-secondary)',
              border: mode === m ? '1px solid var(--border)' : 'none',
            }}>
            {m === 'manual' ? '✏️ 직접 입력' : '🗺️ 네이버 지도'}
          </button>
        ))}
      </div>

      {/* Add form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 16 }}>
        {mode === 'manual' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input-field" placeholder="장소 이름 (예: 강남역 스타벅스)" value={manualName} onChange={(e) => setManualName(e.target.value)} />
            <input className="input-field" placeholder="주소 또는 메모 (선택)" value={manualAddr} onChange={(e) => setManualAddr(e.target.value)} />
            <button onClick={handleAddManual} style={{
              padding: '10px', background: 'var(--accent)', color: 'white',
              borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600,
            }}>장소 추가</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!NAVER_CLIENT_ID && (
              <div style={{
                padding: '12px', background: 'var(--amber-light)', borderRadius: 'var(--radius-md)',
                fontSize: 13, color: 'var(--amber)', border: '1px solid #f5d98c',
              }}>
                ⚠️ 네이버 지도를 사용하려면 <code>.env.local</code>에<br />
                <code>NEXT_PUBLIC_NAVER_CLIENT_ID</code>를 설정하세요.<br />
                <a href="https://console.ncloud.com/" target="_blank" rel="noreferrer"
                  style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                  네이버 클라우드 콘솔 →
                </a>
              </div>
            )}
            <input className="input-field" placeholder="장소 이름 (예: 홍대 카페)" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input-field" placeholder="주소 검색 (예: 서울 강남구 테헤란로)" value={searchAddr} onChange={(e) => setSearchAddr(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1 }} />
              <button onClick={handleSearch} style={{
                padding: '10px 14px', background: 'var(--teal)', color: 'white',
                borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}>검색</button>
            </div>
            {searchResult && (
              <div style={{ fontSize: 12, color: 'var(--teal)', background: 'var(--teal-light)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                📍 {searchResult.address}
              </div>
            )}
            {/* Map */}
            <div ref={mapRef} style={{ width: '100%', height: 200, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden', background: '#e8e8e8' }}>
              {!mapLoaded && <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>지도 로딩 중...</div>}
            </div>
            <button onClick={handleAddNaver} style={{
              padding: '10px', background: 'var(--accent)', color: 'white',
              borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600,
            }}>장소 추가</button>
          </div>
        )}
        {error && (
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--accent-dark)', background: 'var(--accent-light)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}
      </div>

      {/* Location list */}
      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
        📍 후보 장소 ({room.locations.length})
      </h4>
      {room.locations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 14 }}>
          아직 추가된 장소가 없어요
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {room.locations.map((loc, i) => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '12px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 20, marginTop: 1 }}>{loc.type === 'naver' ? '🗺️' : '📌'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{loc.name}</div>
                {loc.address && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{loc.address}</div>}
                {loc.lat && loc.lng && (
                  <a
                    href={`https://map.naver.com/v5/search/${encodeURIComponent(loc.address || loc.name)}`}
                    target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--teal)', textDecoration: 'underline', display: 'inline-block', marginTop: 4 }}>
                    지도에서 보기 →
                  </a>
                )}
              </div>
              <button
                onClick={() => removeLocation(room.id, loc.name)}
                style={{ color: 'var(--text-muted)', background: 'transparent', fontSize: 18, lineHeight: 1 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
