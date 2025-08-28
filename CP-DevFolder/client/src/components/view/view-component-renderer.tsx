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
      <Card className="h-full min-h-[300px]">
        <CardHeader className="pb-3">
          <CardTitle className="min-h-[28px] flex items-center">
            {component.config.title || `${component.type} Component`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!component.config.dataSource || !tableData.length) {
    return (
      <Card className="h-full min-h-[300px]">
        <CardHeader className="pb-3">
          <CardTitle className="min-h-[28px] flex items-center">
            {component.config.title || `${component.type} Component`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center min-h-[200px] text-gray-500">
            <p className="text-center">No data source connected</p>
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
      <div className="overflow-auto max-h-96 min-h-[300px]">
        <Table>
          <TableHeader>
            <TableRow className="h-12">
              {fieldsToShow.map((field) => (
                <TableHead key={field} className="font-semibold py-3 align-top">
                  <div className="min-h-[24px] flex items-start">
                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataToShow.map((row, index) => (
              <TableRow key={index} className="h-12">
                {fieldsToShow.map((field) => (
                  <TableCell key={field} className="py-3 align-top">
                    <div className="min-h-[24px] line-clamp-2 flex items-start">
                      {typeof row[field] === 'number' 
                        ? row[field].toLocaleString()
                        : String(row[field] || '-')
                      }
                    </div>
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
      return (
        <div className="min-h-[200px] flex items-center justify-center">
          <p className="text-gray-500 text-center py-8">Select a field to display metric</p>
        </div>
      );
    }

    const values = tableData.map(row => Number(row[metricField]) || 0).filter(v => !isNaN(v));
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = values.length > 0 ? total / values.length : 0;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return (
      <div className="min-h-[200px] flex items-center">
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-blue-600 min-h-[32px] flex items-center justify-center">
              {total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 min-h-[20px] flex items-center justify-center">Total</div>
          </div>
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-green-600 min-h-[32px] flex items-center justify-center">
              {Math.round(average).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 min-h-[20px] flex items-center justify-center">Average</div>
          </div>
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-orange-600 min-h-[32px] flex items-center justify-center">
              {max.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 min-h-[20px] flex items-center justify-center">Maximum</div>
          </div>
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-red-600 min-h-[32px] flex items-center justify-center">
              {min.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 min-h-[20px] flex items-center justify-center">Minimum</div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (component.type) {
      case 'chart':
        return (
          <div className="min-h-[300px] flex items-center">
            {renderChart()}
          </div>
        );
      case 'table':
        return renderTable();
      case 'metric':
        return renderMetric();
      case 'text':
        return (
          <div className="min-h-[200px] flex flex-col justify-center space-y-3">
            <h3 className="text-lg font-semibold min-h-[28px] flex items-center">Data Summary</h3>
            <div className="space-y-2">
              <p className="min-h-[24px] flex items-center">
                Connected to: <Badge variant="outline" className="ml-2">{component.config.dataSource}</Badge>
              </p>
              <p className="min-h-[24px] flex items-center">
                Table: <Badge variant="outline" className="ml-2">{component.config.selectedTable}</Badge>
              </p>
              <p className="min-h-[24px] flex items-center">
                Total Records: <Badge variant="outline" className="ml-2">{tableData.length}</Badge>
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="min-h-[200px] flex items-center justify-center">
            <p className="text-gray-500 text-center">Component type not supported</p>
          </div>
        );
    }
  };

  return (
    <Card className="h-full min-h-[300px] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between min-h-[28px]">
          <span className="text-base truncate">
            {component.config.title || `${component.type} Component`}
          </span>
          <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
            {component.config.dataSource?.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col">
        <div className="flex-1">
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
}