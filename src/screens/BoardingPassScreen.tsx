import { useMemo } from 'react';
import { noteById, person } from '../mock';
import { useDemo } from '../store';
import { Icon } from '../components/Icon';
import { useNoteActions } from '../lib/actions';
import { fmtDayMonth } from '../lib/dates';
import { fakeQr, qrPath, QR_SIZE } from '../lib/qr';

const flight = noteById('fl')!;
const flightNo = flight.facts.find((f) => f.label === 'Flight no.')?.value ?? '';
const ticketFile = flight.attachments[0]?.file ?? '';
const route = flight.route!;

export function BoardingPassScreen() {
  const codeFound = useDemo((s) => s.codeFound);
  return codeFound ? <BoardingPass /> : <BoardingPassFallback />;
}

function BoardingPass() {
  const back = useDemo((s) => s.back);
  const a = useNoteActions();
  const path = useMemo(() => qrPath(fakeQr()), []);
  return (
    <div className="screen screen-col screen-white">
      <div className="topbar">
        <button type="button" className="icon-btn icon-btn-soft" aria-label="Close boarding pass" onClick={back}>
          <Icon name="close" size={20} color="#0E1314" strokeWidth={1.8} />
        </button>
        <h1 className="topbar-title">Boarding pass</h1>
        <span />
      </div>
      <div className="bp-body">
        <div className="bp-flight">
          <span className="bp-meta">
            {flightNo} · {fmtDayMonth(flight.day!)}
          </span>
          <div className="route">
            <div>
              <span className="route-code route-code-md">{route.from.code}</span>
              <span className="route-city">
                {route.from.city} · {flight.time}
              </span>
            </div>
            <Icon name="arrowRight" size={24} color="#61787D" strokeWidth={1.8} className="route-arrow" />
            <div className="route-end">
              <span className="route-code route-code-md">{route.to.code}</span>
              <span className="route-city">{route.to.city}</span>
            </div>
          </div>
        </div>
        <div className="bp-passenger">
          <span>Passenger</span>
          <strong>{person.displayName}</strong>
        </div>
        <div className="qr-wrap">
          <svg
            role="img"
            aria-label={`Scannable code from ${ticketFile}`}
            width={QR_SIZE * 9}
            height={QR_SIZE * 9}
            viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
            shapeRendering="crispEdges"
          >
            <rect width={QR_SIZE} height={QR_SIZE} fill="#FFFFFF" />
            <path d={path} fill="#0E1314" />
          </svg>
        </div>
        <span className="bp-source">Code from {ticketFile}</span>
        <div className="bp-chips">
          <span className="bp-chip">
            <Icon name="sun" size={15} color="#0E1314" />
            Turn brightness up
          </span>
          <span className="bp-chip">Screen stays on</span>
        </div>
      </div>
      <div className="foot-pad">
        <button type="button" className="btn btn-outline-ink btn-lg" onClick={() => a.openPdf(ticketFile)}>
          Original PDF
        </button>
        <button type="button" className="btn btn-ink btn-lg" onClick={back}>
          Done
        </button>
      </div>
    </div>
  );
}

function BoardingPassFallback() {
  const back = useDemo((s) => s.back);
  const a = useNoteActions();
  return (
    <div className="screen screen-col">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="Back" onClick={back}>
          <Icon name="left" size={22} color="#111A1B" />
        </button>
        <h1 className="topbar-title">Boarding pass</h1>
        <span />
      </div>
      <div className="screen-scroll fallback-body">
        <div className="notice-amber" role="status">
          <strong>No scannable code in this PDF</strong>
          <span>We couldn't read a QR, Aztec or PDF417 code in {ticketFile}. Show the original PDF at check-in and the gate.</span>
        </div>
        <button type="button" className="btn btn-ink btn-xl" onClick={() => a.openPdf(ticketFile)}>
          <Icon name="file" size={20} color="#FFFFFF" strokeWidth={1.8} />
          Open original PDF
        </button>
        <div className="card fallback-card">
          <span className="bp-meta">
            {flightNo} · {fmtDayMonth(flight.day!)}
          </span>
          <div className="route">
            <div>
              <span className="route-code route-code-sm">{route.from.code}</span>
              <span className="route-city">{flight.time}</span>
            </div>
            <Icon name="arrowRight" size={22} color="#54686C" className="route-arrow" />
            <div className="route-end">
              <span className="route-code route-code-sm">{route.to.code}</span>
              <span className="route-city">{route.to.city}</span>
            </div>
          </div>
          <span className="fallback-text">{flight.text}</span>
        </div>
        <button type="button" className="btn btn-soft btn-lg" onClick={() => a.copy(flightNo)}>
          <Icon name="copy" size={18} color="#111A1B" />
          Copy flight number
        </button>
      </div>
    </div>
  );
}
