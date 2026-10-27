import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export const SCREEN_W = 393;
export const SCREEN_H = 852;
const BEZEL = 12;
const FRAME_W = SCREEN_W + BEZEL * 2;
const FRAME_H = SCREEN_H + BEZEL * 2;

/** Static iOS status bar. Nothing in it is live. */
export function StatusBar({ tone }: { tone: 'light' | 'dark' }) {
  const c = tone === 'light' ? '#FFFFFF' : '#111A1B';
  return (
    <div className="statusbar" aria-hidden="true" style={{ color: c }}>
      <span className="sb-time">9:41</span>
      <span className="sb-right">
        <svg width="18" height="12" viewBox="0 0 18 12" fill={c}>
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill={c}>
          <path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.1-1.2C13.2 1.7 10.7.6 8 .6S2.8 1.7.9 3.5L2 4.7c1.6-1.5 3.7-2.4 6-2.4Z" />
          <path d="M8 5.6c1.4 0 2.6.5 3.6 1.4l1.1-1.2C11.4 4.6 9.8 3.9 8 3.9s-3.4.7-4.7 1.9L4.4 7c1-.9 2.2-1.4 3.6-1.4Z" />
          <path d="M8 8.8c.6 0 1.1.2 1.5.6L8 11 6.5 9.4c.4-.4.9-.6 1.5-.6Z" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke={c} strokeOpacity="0.4" />
          <rect x="2" y="2" width="20" height="9" rx="2.5" fill={c} />
          <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill={c} fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

interface FrameProps {
  children: ReactNode;
  /** Caption and demo controls, placed beside the phone (above it on narrow windows). */
  side: ReactNode;
  statusTone: 'light' | 'dark';
  indicatorTone: 'light' | 'dark';
}

/** iPhone 16 frame, scaled down with transform: scale() to fit the space it is given. */
// The app inside is dark-only, so the status bar and home indicator always draw light.
export function DeviceFrame({ children, side }: FrameProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const group = groupRef.current;
    const sideEl = sideRef.current;
    if (!stage || !group || !sideEl) return;
    const measure = () => {
      const pad = 24;
      const row = getComputedStyle(group).flexDirection === 'row';
      const gap = parseFloat(getComputedStyle(group).columnGap) || 0;
      const availW = stage.clientWidth - pad - (row ? sideEl.offsetWidth + gap : 0);
      const availH = stage.clientHeight - pad - (row ? 0 : sideEl.offsetHeight + gap);
      setScale(Math.max(0.4, Math.min(1, availW / FRAME_W, availH / FRAME_H)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(sideEl);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="stage" ref={stageRef}>
      <div className="stage-group" ref={groupRef}>
        <div className="side-wrap" ref={sideRef}>
          {side}
        </div>
        <div className="device-slot" style={{ width: FRAME_W * scale, height: FRAME_H * scale }}>
          <div className="device" style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}>
            <span className="hw hw-action" aria-hidden="true" />
            <span className="hw hw-vol-up" aria-hidden="true" />
            <span className="hw hw-vol-down" aria-hidden="true" />
            <span className="hw hw-power" aria-hidden="true" />
            <span className="hw hw-camera" aria-hidden="true" />
            <div className="device-screen" style={{ width: SCREEN_W, height: SCREEN_H }}>
              {children}
              <StatusBar tone="light" />
              <span className="island" aria-hidden="true" />
              <span className="home-indicator light" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
