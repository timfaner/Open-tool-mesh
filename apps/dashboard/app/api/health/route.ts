import { getDashboardRun } from "../../../lib/demo-run";

export async function GET() {
  const demoRun = await getDashboardRun();

  return Response.json({
    ok: true,
    service: "opentool-mesh-dashboard",
    route: "/",
    dataSource: demoRun.source,
    runId: demoRun.runId,
    traceId: demoRun.memory.traceId,
    reportId: demoRun.report.reportId,
  });
}
