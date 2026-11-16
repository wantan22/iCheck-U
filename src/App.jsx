import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { initNative, setStatusBar } from './utils/native.js';
import { useDemoBridge } from './utils/demoBridge.js';
import { useStore } from './store/useStore.js';
import Layout from './components/Layout.jsx';
import Welcome from './pages/Welcome.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import WorkerHome from './pages/worker/WorkerHome.jsx';
import Settings from './pages/Settings.jsx';
import Notifications from './pages/Notifications.jsx';
import Privacy from './pages/Privacy.jsx';
import SafePlaces from './pages/SafePlaces.jsx';
import Home from './pages/household/Home.jsx';
import Members from './pages/household/Members.jsx';
import CheckIn from './pages/household/CheckIn.jsx';
import Alerts from './pages/household/Alerts.jsx';
import Escalation from './pages/household/Escalation.jsx';
import GrabList from './pages/household/GrabList.jsx';
import Recovery from './pages/household/Recovery.jsx';
import BizHome from './pages/business/BizHome.jsx';
import Workers from './pages/business/Workers.jsx';
import BizCheckIn from './pages/business/BizCheckIn.jsx';
import Hazard from './pages/business/Hazard.jsx';
import Dashboard from './pages/responder/Dashboard.jsx';
import Board from './pages/responder/Board.jsx';
import Team from './pages/responder/Team.jsx';
import SafetyEditor from './pages/responder/SafetyEditor.jsx';
import Summary from './pages/responder/Summary.jsx';
import EventControl from './pages/admin/EventControl.jsx';
import Approvals from './pages/admin/Approvals.jsx';
import AccessLog from './pages/admin/AccessLog.jsx';

function RequireRole({ roles, children }) {
  const role = useStore((s) => s.role);
  if (!role) return <Navigate to="/" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}

/** Old links like /register/household now open the sign-up flow with that role picked. */
function OldRegister() {
  const { role } = useParams();
  return <Navigate to={`/signup?as=${role}`} replace />;
}

export default function App() {
  const tick = useStore((s) => s.tick);
  const navigate = useNavigate();
  useDemoBridge(navigate);
  const theme = useStore((s) => s.settings.theme);
  const largeText = useStore((s) => s.settings.largeText);
  const lang = useStore((s) => s.settings.lang);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0A0A0A' : '#B71C1C');
  }, [theme]);
  useEffect(() => { document.documentElement.classList.toggle('large-text', largeText); }, [largeText]);
  // Installed app: Android back button, notification taps, status bar colour
  useEffect(() => initNative({ navigate, theme: useStore.getState().settings.theme }), [navigate]);
  useEffect(() => { setStatusBar(theme); }, [theme]);
  useEffect(() => {
    const on = () => useStore.getState().setNetOnline(true);
    const off = () => useStore.getState().setNetOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  useEffect(() => { document.documentElement.lang = lang === 'ms' ? 'ms' : 'en'; }, [lang]);

  const H = ['household'];
  const B = ['business'];
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Welcome />} />
                <Route path="/signup" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register/:role" element={<OldRegister />} />
        <Route path="/worker" element={<RequireRole roles={['worker']}><WorkerHome /></RequireRole>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/safe-places" element={<RequireRole><SafePlaces /></RequireRole>} />

        <Route path="/home" element={<RequireRole roles={H}><Home /></RequireRole>} />
        <Route path="/home/members" element={<RequireRole roles={H}><Members /></RequireRole>} />
        <Route path="/home/checkin" element={<RequireRole roles={H}><CheckIn /></RequireRole>} />
        <Route path="/home/alerts" element={<RequireRole roles={H}><Alerts /></RequireRole>} />
        <Route path="/home/escalation" element={<RequireRole roles={H}><Escalation /></RequireRole>} />
        <Route path="/home/checklist" element={<Navigate to="/home/grab?edit=1" replace />} />
        <Route path="/home/grab" element={<RequireRole roles={H}><GrabList ownerType="household" /></RequireRole>} />
        <Route path="/home/recovery" element={<RequireRole roles={H}><Recovery ownerType="household" /></RequireRole>} />

        <Route path="/biz" element={<RequireRole roles={B}><BizHome /></RequireRole>} />
        <Route path="/biz/workers" element={<RequireRole roles={B}><Workers /></RequireRole>} />
        <Route path="/biz/checkin" element={<RequireRole roles={B}><BizCheckIn /></RequireRole>} />
        <Route path="/biz/checklist" element={<Navigate to="/biz/grab?edit=1" replace />} />
        <Route path="/biz/grab" element={<RequireRole roles={B}><GrabList ownerType="business" /></RequireRole>} />
        <Route path="/biz/recovery" element={<RequireRole roles={B}><Recovery ownerType="business" /></RequireRole>} />
        <Route path="/biz/hazard" element={<RequireRole roles={B}><Hazard /></RequireRole>} />


        <Route path="/responder" element={<RequireRole roles={['rescue']}><Dashboard /></RequireRole>} />
        <Route path="/responder/board" element={<RequireRole roles={['rescue']}><Board /></RequireRole>} />
        <Route path="/responder/team" element={<RequireRole roles={['rescue']}><Team /></RequireRole>} />
        <Route path="/responder/safety-points" element={<RequireRole roles={['rescue']}><SafetyEditor /></RequireRole>} />
        <Route path="/responder/summary" element={<RequireRole roles={['rescue', 'admin']}><Summary /></RequireRole>} />


        <Route path="/admin" element={<RequireRole roles={['admin']}><EventControl /></RequireRole>} />
        <Route path="/admin/approvals" element={<RequireRole roles={['admin']}><Approvals /></RequireRole>} />
        <Route path="/admin/access-log" element={<RequireRole roles={['admin']}><AccessLog /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
