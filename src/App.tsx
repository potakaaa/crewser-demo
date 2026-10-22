import { useEffect, useSyncExternalStore } from 'react';
import { isTab, routeToHash, useDemo, useRoute, type Route } from './store';
import { DeviceFrame } from './components/Device';
import { DemoPanel } from './components/DemoPanel';
import { TabBar } from './components/TabBar';
import { LogSheet } from './components/LogSheet';
import { SheetHost } from './components/SheetHost';
import { Toast } from './components/Toast';
import { ScreenStack } from './components/ScreenStack';
import { Splash } from './components/Brand';
import { DashboardScreen } from './screens/DashboardScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { ContactsScreen } from './screens/ContactsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
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
    case 'dashboard':
      return <DashboardScreen />;
    case 'calendar':
      return <CalendarScreen />;
    case 'documents':
      return <DocumentsScreen />;
    case 'contacts':
      return <ContactsScreen />;
    case 'settings':
      return <SettingsScreen />;
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
  const sheet = useDemo((s) => s.sheet);
  const accent = useDemo((s) => s.noteAccent);
  const font = useDemo((s) => s.fontTheme);
  const tabs = isTab(route);
  return (
    <div className="app" data-accent={accent} data-font={font}>
      <div className="app-content" inert={logOpen || splash || sheet !== null}>
        <ScreenStack render={(r) => <Screen route={r} />} />
        <TabBar hidden={!tabs} />
      </div>
      <Toast raised={tabs} top={logOpen || sheet !== null} />
      <LogSheet />
      <SheetHost />
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
    if (!location.hash) history.replaceState(null, '', routeToHash({ name: 'dashboard' }));
    const onPop = () => sync('popstate');
    const onHash = () => sync('hashchange');
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onHash);
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
