import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import type { UIComponent } from "@shared/schema";

interface ViewComponentRendererProps {
  component: UIComponent;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ViewComponentRenderer({ component }: ViewComponentRendererProps) {
  const { data: tableData = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/data-sources', component.config.dataSource, 'tables', component.config.selectedTable, 'data'],
    queryFn: async () => {
      if (!component.config.dataSource || !component.config.selectedTable) {
        return [];
      }
      const response = await fetch(`/api/data-sources/${component.config.dataSource}/tables/${component.config.selectedTable}/data`);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      return response.json();
    },
    enabled: !!component.config.dataSource && !!component.config.selectedTable
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{component.config.title || `${component.type} Component`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!component.config.dataSource || !tableData.length) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{component.config.title || `${component.type} Component`}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p>No data source connected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    if (!component.config.selectedFields || component.config.selectedFields.length < 2) {
      return <p className="text-gray-500">Select at least 2 fields to display chart</p>;
    }

    const xField = component.config.selectedFields[0];
    const yField = component.config.selectedFields[1];
    
    // Prepare chart data
    const chartData = tableData.slice(0, 10).map((row, index) => ({
      name: row[xField] || `Item ${index + 1}`,
      value: Number(row[yField]) || 0,
      [xField]: row[xField],
      [yField]: Number(row[yField]) || 0
    }));

    switch (component.config.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderTable = () => {
    const fieldsToShow = component.config.selectedFields || Object.keys(tableData[0] || {}).slice(0, 5);
    const dataToShow = tableData.slice(0, 10);
    
    return (
      <div className="overflow-auto max-h-96">
        <Table>
          <TableHeader>
            <TableRow>
              {fieldsToShow.map((field) => (
                <TableHead key={field} className="font-semibold">
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataToShow.map((row, index) => (
              <TableRow key={index}>
                {fieldsToShow.map((field) => (
                  <TableCell key={field}>
                    {typeof row[field] === 'number' 
                      ? row[field].toLocaleString()
                      : String(row[field] || '-')
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderMetric = () => {
    const metricField = component.config.selectedFields?.[0];
    if (!metricField) {
      return <p className="text-gray-500">Select a field to display metric</p>;
    }

    const values = tableData.map(row => Number(row[metricField]) || 0).filter(v => !isNaN(v));
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = values.length > 0 ? total / values.length : 0;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{total.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{average.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Average</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{max.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Maximum</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{min.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Minimum</div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (component.type) {
      case 'chart':
        return renderChart();
      case 'table':
        return renderTable();
      case 'metric':
        return renderMetric();
      case 'text':
        return (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Data Summary</h3>
            <p>Connected to: <Badge variant="outline">{component.config.dataSource}</Badge></p>
            <p>Table: <Badge variant="outline">{component.config.selectedTable}</Badge></p>
            <p>Total Records: <Badge variant="outline">{tableData.length}</Badge></p>
          </div>
        );
      default:
        return <p className="text-gray-500">Component type not supported</p>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {component.config.title || `${component.type} Component`}
          <Badge variant="outline" className="text-xs">
            {component.config.dataSource?.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}