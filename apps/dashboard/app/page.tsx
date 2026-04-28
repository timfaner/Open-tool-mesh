import { DashboardPage } from '../components/dashboard-page';
import { getDashboardRun } from '../lib/demo-run';

export default async function Page() {
  const demoRun = await getDashboardRun();
  return <DashboardPage demoRun={demoRun} />;
}
