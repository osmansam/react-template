import DynamicChart from "../components/charts/DynamicChart";
import { Header } from "../components/header/Header";

/**
 * Example dashboard page demonstrating DynamicChart usage
 *
 * This shows how to integrate charts into your pages using pipeline data from the backend
 */
export default function DashboardExample() {
  return (
    <>
      <Header />
      <div className="w-[98%] mx-auto my-10 space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        {/* Bar Chart Example - Simple */}
        <div className="bg-white p-6 rounded-lg shadow">
          <DynamicChart
            config={{
              type: "bar",
              schemaName: "sales",
              pipelineName: "monthlySales",
              title: "Monthly Sales",
              height: 400,
            }}
          />
        </div>

        {/* Line Chart Example - With Custom Options */}
        <div className="bg-white p-6 rounded-lg shadow">
          <DynamicChart
            config={{
              type: "line",
              schemaName: "users",
              pipelineName: "userGrowth",
              title: "User Growth Over Time",
              height: 450,
              chartOptions: {
                colors: { scheme: "category10" },
                enablePoints: true,
                pointSize: 8,
                enableGridX: false,
                curve: "monotoneX",
                margin: { top: 50, right: 110, bottom: 50, left: 60 },
              },
            }}
          />
        </div>

        {/* Pie Chart Example - With Parameters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <DynamicChart
            config={{
              type: "pie",
              schemaName: "products",
              pipelineName: "categoryDistribution",
              title: "Product Distribution by Category",
              height: 400,
              additionalParams: {
                year: new Date().getFullYear(),
                status: "active",
              },
              chartOptions: {
                innerRadius: 0.6,
                padAngle: 1,
                cornerRadius: 3,
                colors: { scheme: "nivo" },
              },
            }}
          />
        </div>

        {/* Multiple charts in grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <DynamicChart
              config={{
                type: "radar",
                schemaName: "products",
                pipelineName: "performanceMetrics",
                title: "Performance Metrics",
                height: 350,
              }}
            />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <DynamicChart
              config={{
                type: "heatmap",
                schemaName: "analytics",
                pipelineName: "activityHeatmap",
                title: "Activity Heatmap",
                height: 350,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
