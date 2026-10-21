import { useEffect, useSyncExternalStore } from 'react';
import { isTab, routeToHash, useDemo, useRoute, type Route } from './store';
import { DeviceFrame } from './components/Device';
import { DemoPanel } from './components/DemoPanel';
import { TabBar } from './components/TabBar';
import { LogSheet } from './components/LogSheet';
import { StatSheets } from './components/StatSheets';
import { Toast } from './components/Toast';
import { ScreenStack } from './components/ScreenStack';
import { Splash } from './components/Brand';
import { HomeScreen } from './screens/HomeScreen';
import { StatsScreen } from './screens/StatsScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { NoteDetailScreen } from './screens/NoteDetailScreen';
import { BoardingPassScreen } from './screens/BoardingPassScreen';
import { PdfViewerScreen } from './screens/PdfViewerScreen';

const PHONE_QUERY = '(max-width: 480px)';

function useIsPhone() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(PHONE_QUERY);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />;
    case 'calendar':
      return <CalendarScreen />;
    case 'stats':
      return <StatsScreen />;
    case 'note':
      return <NoteDetailScreen id={route.id} />;
    case 'ticket':
      return <BoardingPassScreen />;
    case 'pdf':
      return <PdfViewerScreen file={route.file} />;
  }
}

function AppShell() {
  const route = useRoute();
  const logOpen = useDemo((s) => s.logOpen);
  const splash = useDemo((s) => s.splash);
  const sheet = useDemo((s) => s.statsSheet);
  const accent = useDemo((s) => s.noteAccent);
  const tabs = isTab(route);
  return (
    <div className="app" data-accent={accent}>
      <div className="app-content" inert={logOpen || splash || sheet !== null}>
        <ScreenStack render={(r) => <Screen route={r} />} />
        <TabBar hidden={!tabs} />
      </div>
      <Toast raised={tabs} />
      <LogSheet />
      <StatSheets />
      {splash && <Splash />}
    </div>
  );
}

export default function App() {
  const isPhone = useIsPhone();
  const route = useRoute();
  const sync = useDemo((s) => s.syncFromLocation);
  const statusDark = useDemo((s) => s.statusDark);
  const logOpen = useDemo((s) => s.logOpen);

  useEffect(() => {
    if (!location.hash) history.replaceState(null, '', routeToHash({ name: 'home' }));
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, [sync]);

  if (isPhone) {
    return (
      <div className="phone-root">
        <AppShell />
      </div>
    );
  }

  const statusTone = route.name === 'ticket' || (statusDark && !logOpen && route.name !== 'pdf') ? 'dark' : 'light';
  const indicatorTone = route.name === 'pdf' ? 'light' : 'dark';
  return (
    <main className="page">
      <DeviceFrame side={<DemoPanel />} statusTone={statusTone} indicatorTone={indicatorTone}>
        <AppShell />
      </DeviceFrame>
    </main>
  );
}
