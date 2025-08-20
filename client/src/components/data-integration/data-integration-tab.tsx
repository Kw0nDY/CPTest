import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Database, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Filter,
  ExternalLink,
  Zap,
  Eye,
  Server,
  Table,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { ExcelUploadDialog } from './excel-upload-dialog';
import { GoogleSheetsConnectionDialog } from './google-sheets-connection-dialog';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  recordCount?: number;
  config: {
    host?: string;
    port?: string;
    database?: string;
    username?: string;
  };
  connectionDetails: {
    server?: string;
    database?: string;
    port?: number;
    protocol?: string;
  };
  dataSchema: Array<{
    table: string;
    fields: Array<{
      name: string;
      type: string;
      description: string;
    }>;
    recordCount: number;
    lastUpdated: string;
  }>;
  sampleData: Record<string, any[]>;
}

interface AvailableDataSource {
  id: string;
  name: string;
  type: string;
  category: 'scm' | 'qms' | 'plm' | 'mes' | 'erp' | 'crm' | 'file';
  description: string;
  vendor: string;
  features: string[];
}

const availableDataSources: AvailableDataSource[] = [
  {
    id: 'salesforce-crm',
    name: 'Salesforce CRM',
    type: 'REST API',
    category: 'crm',
    description: 'Customer relationship management platform',
    vendor: 'Salesforce',
    features: ['Real-time sync', 'OAuth 2.0', 'Bulk API', 'Custom fields']
  },
  {
    id: 'sap-erp',
    name: 'SAP ERP',
    type: 'SOAP/REST',
    category: 'erp',
    description: 'Enterprise resource planning system',
    vendor: 'SAP',
    features: ['RFC connector', 'IDoc support', 'BAPI integration', 'Real-time']
  },
  {
    id: 'oracle-db',
    name: 'Oracle Database',
    type: 'Database',
    category: 'erp',
    description: 'Relational database management system',
    vendor: 'Oracle',
    features: ['JDBC connector', 'Stored procedures', 'Triggers', 'Views']
  },
  {
    id: 'mysql-db',
    name: 'MySQL Database',
    type: 'Database',
    category: 'erp',
    description: 'Open-source relational database',
    vendor: 'MySQL',
    features: ['JDBC connector', 'Replication', 'Clustering', 'JSON support']
  },
  {
    id: 'mes-system',
    name: 'Manufacturing Execution System',
    type: 'REST API',
    category: 'mes',
    description: 'Production floor management system',
    vendor: 'Various',
    features: ['Real-time production data', 'Quality tracking', 'Equipment monitoring']
  },
  {
    id: 'plm-system',
    name: 'Product Lifecycle Management',
    type: 'REST API',
    category: 'plm',
    description: 'Product development and lifecycle management',
    vendor: 'Various',
    features: ['Design data', 'BOM management', 'Change tracking', 'Collaboration']
  },
  {
    id: 'qms-system',
    name: 'Quality Management System',
    type: 'REST API',
    category: 'qms',
    description: 'Quality control and compliance management',
    vendor: 'Various',
    features: ['Audit trails', 'Compliance reporting', 'Defect tracking', 'Certificates']
  },
  {
    id: 'scm-system',
    name: 'Supply Chain Management',
    type: 'REST API',
    category: 'scm',
    description: 'Supply chain planning and execution',
    vendor: 'Various',
    features: ['Demand planning', 'Inventory optimization', 'Supplier management', 'Logistics']
  },
  {
    id: 'aveva-pi',
    name: 'AVEVA PI System',
    type: 'PI Web API',
    category: 'mes',
    description: 'Industrial data historian for real-time process monitoring and asset performance tracking',
    vendor: 'AVEVA',
    features: ['Real-time data streaming', 'Time-series database', 'Asset Framework', 'Event monitoring', 'PI Vision dashboards']
  },
  {
    id: 'microsoft-excel',
    name: 'Microsoft Excel',
    type: 'OAuth 2.0',
    category: 'file',
    description: 'OneDrive and SharePoint Excel files with real-time data access',
    vendor: 'Microsoft',
    features: ['OAuth 2.0 authentication', 'OneDrive integration', 'SharePoint access', 'Real-time data sync', 'Multiple worksheets']
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    type: 'Google Sheets API',
    category: 'file',
    description: 'Google Sheets cloud spreadsheet integration with real-time synchronization',
    vendor: 'Google',
    features: ['OAuth 2.0 authentication', 'Real-time sync', 'Multiple sheets support']
  }
];

const categoryLabels = {
  scm: 'Supply Chain',
  qms: 'Quality Management',
  plm: 'Product Lifecycle',
  mes: 'Manufacturing Execution',
  erp: 'Enterprise Resource Planning',
  crm: 'Customer Relationship',
  file: 'File Systems'
};

export default function DataIntegrationTab() {
  const [activeTab, setActiveTab] = useState<'connected' | 'available'>('connected');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<AvailableDataSource | null>(null);
  const [connectionConfig, setConnectionConfig] = useState({
    host: '',
    port: '',
    database: '',
    username: '',
    password: ''
  });
  
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedDetailSource, setSelectedDetailSource] = useState<DataSource | null>(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [showExcelUploadDialog, setShowExcelUploadDialog] = useState(false);
  const [googleSheetsDialogRef, setGoogleSheetsDialogRef] = useState<{ openDialog: () => void } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock connected data sources - showing only 2 connected sources
  const mockConnectedSources: DataSource[] = [
    {
      id: '1',
      name: 'SAP ERP Production',
      type: 'ERP',
      status: 'connected',
      lastSync: '2025-01-15 09:30:00',
      recordCount: 104650,
      config: {
        host: 'sap-prod.company.com',
        port: '3200',
        database: 'SAPDB_PROD',
        username: 'sap_user'
      },
      connectionDetails: {
        server: 'sap-prod.company.com',
        database: 'SAPDB_PROD',
        port: 3200,
        protocol: 'RFC'
      },
      dataSchema: [
        {
          table: 'CUSTOMERS',
          fields: [
            { name: 'CUSTOMER_ID', type: 'VARCHAR(10)', description: 'Unique customer identifier' },
            { name: 'CUSTOMER_NAME', type: 'VARCHAR(100)', description: 'Customer company name' },
            { name: 'COUNTRY', type: 'VARCHAR(50)', description: 'Customer country' },
            { name: 'CREDIT_LIMIT', type: 'DECIMAL(15,2)', description: 'Customer credit limit' },
            { name: 'CREATED_DATE', type: 'DATE', description: 'Account creation date' }
          ],
          recordCount: 15420,
          lastUpdated: '2025-01-15 09:30:00'
        },
        {
          table: 'ORDERS',
          fields: [
            { name: 'ORDER_ID', type: 'VARCHAR(12)', description: 'Sales order number' },
            { name: 'CUSTOMER_ID', type: 'VARCHAR(10)', description: 'Customer reference' },
            { name: 'ORDER_DATE', type: 'DATE', description: 'Order placement date' },
            { name: 'TOTAL_AMOUNT', type: 'DECIMAL(15,2)', description: 'Total order value' },
            { name: 'STATUS', type: 'VARCHAR(20)', description: 'Order processing status' }
          ],
          recordCount: 89230,
          lastUpdated: '2025-01-15 09:28:00'
        }
      ],
      sampleData: {
        'CUSTOMERS': [
          { CUSTOMER_ID: 'CUST001', CUSTOMER_NAME: 'Acme Manufacturing Co.', COUNTRY: 'USA', CREDIT_LIMIT: 500000.00, CREATED_DATE: '2023-03-15' },
          { CUSTOMER_ID: 'CUST002', CUSTOMER_NAME: 'Global Tech Solutions', COUNTRY: 'Germany', CREDIT_LIMIT: 750000.00, CREATED_DATE: '2023-01-08' },
          { CUSTOMER_ID: 'CUST003', CUSTOMER_NAME: 'Pacific Industries Ltd.', COUNTRY: 'Japan', CREDIT_LIMIT: 1000000.00, CREATED_DATE: '2022-11-22' },
          { CUSTOMER_ID: 'CUST004', CUSTOMER_NAME: 'European Parts Supplier', COUNTRY: 'France', CREDIT_LIMIT: 300000.00, CREATED_DATE: '2024-02-14' },
          { CUSTOMER_ID: 'CUST005', CUSTOMER_NAME: 'Nordic Components AS', COUNTRY: 'Norway', CREDIT_LIMIT: 450000.00, CREATED_DATE: '2023-09-07' }
        ],
        'ORDERS': [
          { ORDER_ID: 'ORD25-001', CUSTOMER_ID: 'CUST001', ORDER_DATE: '2025-01-14', TOTAL_AMOUNT: 125000.00, STATUS: 'Processing' },
          { ORDER_ID: 'ORD25-002', CUSTOMER_ID: 'CUST002', ORDER_DATE: '2025-01-15', TOTAL_AMOUNT: 89500.00, STATUS: 'Confirmed' },
          { ORDER_ID: 'ORD25-003', CUSTOMER_ID: 'CUST003', ORDER_DATE: '2025-01-13', TOTAL_AMOUNT: 245000.00, STATUS: 'Shipped' },
          { ORDER_ID: 'ORD25-004', CUSTOMER_ID: 'CUST001', ORDER_DATE: '2025-01-12', TOTAL_AMOUNT: 67800.00, STATUS: 'Delivered' },
          { ORDER_ID: 'ORD25-005', CUSTOMER_ID: 'CUST004', ORDER_DATE: '2025-01-15', TOTAL_AMOUNT: 34500.00, STATUS: 'Processing' }
        ]
      }
    },
    {
      id: '2',
      name: 'Salesforce CRM',
      type: 'CRM',
      status: 'connected',
      lastSync: '2025-01-15 09:25:00',
      recordCount: 32200,
      config: {
        host: 'company.salesforce.com',
        database: 'Production Org',
        username: 'api_user'
      },
      connectionDetails: {
        server: 'company.salesforce.com',
        protocol: 'HTTPS',
        database: 'Production Org'
      },
      dataSchema: [
        {
          table: 'ACCOUNTS',
          fields: [
            { name: 'Id', type: 'ID', description: 'Salesforce record ID' },
            { name: 'Name', type: 'STRING', description: 'Account name' },
            { name: 'Industry', type: 'PICKLIST', description: 'Industry classification' },
            { name: 'AnnualRevenue', type: 'CURRENCY', description: 'Annual revenue amount' },
            { name: 'NumberOfEmployees', type: 'NUMBER', description: 'Employee count' }
          ],
          recordCount: 8750,
          lastUpdated: '2025-01-15 09:25:00'
        },
        {
          table: 'OPPORTUNITIES',
          fields: [
            { name: 'Id', type: 'ID', description: 'Opportunity record ID' },
            { name: 'Name', type: 'STRING', description: 'Opportunity name' },
            { name: 'AccountId', type: 'REFERENCE', description: 'Associated account ID' },
            { name: 'Amount', type: 'CURRENCY', description: 'Opportunity value' },
            { name: 'StageName', type: 'PICKLIST', description: 'Sales stage' },
            { name: 'CloseDate', type: 'DATE', description: 'Expected close date' }
          ],
          recordCount: 23450,
          lastUpdated: '2025-01-15 09:20:00'
        }
      ],
      sampleData: {
        'ACCOUNTS': [
          { Id: '001xx000003DHPx', Name: 'TechCorp Solutions', Industry: 'Technology', AnnualRevenue: 25000000, NumberOfEmployees: 250 },
          { Id: '001xx000003DHPy', Name: 'Manufacturing Plus', Industry: 'Manufacturing', AnnualRevenue: 45000000, NumberOfEmployees: 580 },
          { Id: '001xx000003DHPz', Name: 'Healthcare Innovations', Industry: 'Healthcare', AnnualRevenue: 18000000, NumberOfEmployees: 180 },
          { Id: '001xx000003DHP0', Name: 'Retail Dynamics', Industry: 'Retail', AnnualRevenue: 32000000, NumberOfEmployees: 420 },
          { Id: '001xx000003DHP1', Name: 'Energy Solutions Ltd', Industry: 'Energy', AnnualRevenue: 78000000, NumberOfEmployees: 890 }
        ],
        'OPPORTUNITIES': [
          { Id: '006xx000001T2Zs', Name: 'Q1 Software License Deal', AccountId: '001xx000003DHPx', Amount: 150000, StageName: 'Negotiation', CloseDate: '2025-03-15' },
          { Id: '006xx000001T2Zt', Name: 'Manufacturing Equipment Upgrade', AccountId: '001xx000003DHPy', Amount: 850000, StageName: 'Proposal', CloseDate: '2025-02-28' },
          { Id: '006xx000001T2Zu', Name: 'Healthcare System Integration', AccountId: '001xx000003DHPz', Amount: 320000, StageName: 'Closed Won', CloseDate: '2025-01-15' },
          { Id: '006xx000001T2Zv', Name: 'Retail Analytics Platform', AccountId: '001xx000003DHP0', Amount: 95000, StageName: 'Prospecting', CloseDate: '2025-04-30' },
          { Id: '006xx000001T2Zw', Name: 'Energy Management Solution', AccountId: '001xx000003DHP1', Amount: 1200000, StageName: 'Qualification', CloseDate: '2025-06-15' }
        ]
      }
    },
    {
      id: '3',
      name: 'AVEVA PI System',
      type: 'Historian',
      status: 'connected',
      lastSync: '2025-01-15 09:20:00',
      recordCount: 125800,
      config: {
        host: 'pi-server.company.com',
        port: '443',
        database: 'PI Data Archive',
        username: 'pi_service'
      },
      connectionDetails: {
        server: 'pi-server.company.com',
        database: 'PI Data Archive',
        port: 443,
        protocol: 'HTTPS (PI Web API)'
      },
      dataSchema: [
        {
          table: 'ASSET_HIERARCHY',
          fields: [
            { name: 'AssetName', type: 'STRING', description: 'Asset element name (e.g., PetroLux Corporation)' },
            { name: 'AssetPath', type: 'STRING', description: 'Hierarchical path (e.g., Upstream/Conventional Oil/Fort McMurray Field)' },
            { name: 'AssetType', type: 'STRING', description: 'Asset category (Upstream, Midstream, Downstream, Petrochemicals)' },
            { name: 'Location', type: 'STRING', description: 'Physical location or field name' },
            { name: 'OperationalStatus', type: 'STRING', description: 'Current operational state' },
            { name: 'LastUpdate', type: 'DATETIME', description: 'Last data update timestamp' }
          ],
          recordCount: 2800,
          lastUpdated: '2025-01-15 09:20:00'
        },
        {
          table: 'DRILLING_OPERATIONS',
          fields: [
            { name: 'WellPadID', type: 'STRING', description: 'Well pad identifier (e.g., Well Pad 001, 002)' },
            { name: 'BitWeight', type: 'FLOAT', description: 'Drilling bit weight in pounds' },
            { name: 'BlockHeight', type: 'FLOAT', description: 'Block height measurement' },
            { name: 'DiffPress', type: 'FLOAT', description: 'Differential pressure across system' },
            { name: 'FlowInRate', type: 'FLOAT', description: 'Mud flow in rate (gallons/minute)' },
            { name: 'HoleDepth', type: 'FLOAT', description: 'Current hole depth in feet' },
            { name: 'HookLoad', type: 'FLOAT', description: 'Hook load measurement' },
            { name: 'PumpPressure', type: 'FLOAT', description: 'Mud pump pressure (PSI)' },
            { name: 'TopDriveRPM', type: 'FLOAT', description: 'Top drive rotation speed (RPM)' },
            { name: 'TopDriveTorque', type: 'FLOAT', description: 'Top drive torque measurement' }
          ],
          recordCount: 125000,
          lastUpdated: '2025-01-15 09:19:00'
        },
        {
          table: 'STREAMING_VIEWS',
          fields: [
            { name: 'ViewName', type: 'STRING', description: 'View identifier (e.g., Cristal_Demo_Exercise)' },
            { name: 'RunStatus', type: 'STRING', description: 'Current status (Publishing, Stopped, Not Yet Published)' },
            { name: 'ViewType', type: 'STRING', description: 'Type (Asset, Event, Streaming Out)' },
            { name: 'RunMode', type: 'STRING', description: 'Execution mode (Once, Continuous, Scheduled)' },
            { name: 'StartTime', type: 'STRING', description: 'Scheduled start time' },
            { name: 'Interval', type: 'STRING', description: 'Update interval (minutes, hours, days)' }
          ],
          recordCount: 45,
          lastUpdated: '2025-01-15 09:15:00'
        }
      ],
      sampleData: {
        'ASSET_HIERARCHY': [
          { AssetName: 'PetroLux Corporation', AssetPath: 'Root', AssetType: 'Corporation', Location: 'Global', OperationalStatus: 'Active', LastUpdate: '2025-01-15T09:20:00Z' },
          { AssetName: 'Upstream Operations', AssetPath: 'PetroLux/Upstream', AssetType: 'Business Unit', Location: 'North America', OperationalStatus: 'Active', LastUpdate: '2025-01-15T09:19:45Z' },
          { AssetName: 'Conventional Oil', AssetPath: 'PetroLux/Upstream/Conventional Oil', AssetType: 'Asset Group', Location: 'Alberta, Canada', OperationalStatus: 'Active', LastUpdate: '2025-01-15T09:19:30Z' },
          { AssetName: 'Fort McMurray Field', AssetPath: 'PetroLux/Upstream/Conventional Oil/Fort McMurray Field', AssetType: 'Field', Location: 'Fort McMurray, AB', OperationalStatus: 'Producing', LastUpdate: '2025-01-15T09:19:15Z' },
          { AssetName: 'Well Pad 001', AssetPath: 'PetroLux/Upstream/Conventional Oil/Fort McMurray Field/Well Pad 001', AssetType: 'Well Pad', Location: 'Section 12', OperationalStatus: 'Drilling', LastUpdate: '2025-01-15T09:19:00Z' }
        ],
        'DRILLING_OPERATIONS': [
          { WellPadID: 'Well Pad 001', BitWeight: 25000.5, BlockHeight: 87.2, DiffPress: 1250.8, FlowInRate: 450.2, HoleDepth: 8942.1, HookLoad: 285000.0, PumpPressure: 3200.5, TopDriveRPM: 125.8, TopDriveTorque: 15250.2 },
          { WellPadID: 'Well Pad 002', BitWeight: 23500.0, BlockHeight: 91.5, DiffPress: 1180.2, FlowInRate: 425.8, HoleDepth: 9156.7, HookLoad: 275000.0, PumpPressure: 3150.0, TopDriveRPM: 130.2, TopDriveTorque: 14800.5 },
          { WellPadID: 'Well Pad 003', BitWeight: 26200.8, BlockHeight: 85.9, DiffPress: 1320.5, FlowInRate: 465.1, HoleDepth: 8755.3, HookLoad: 295000.0, PumpPressure: 3280.7, TopDriveRPM: 122.4, TopDriveTorque: 15850.9 },
          { WellPadID: 'Well Pad 004', BitWeight: 24800.2, BlockHeight: 89.3, DiffPress: 1205.9, FlowInRate: 440.7, HoleDepth: 9012.8, HookLoad: 280000.0, PumpPressure: 3180.3, TopDriveRPM: 128.6, TopDriveTorque: 15100.4 },
          { WellPadID: 'Well Pad 005', BitWeight: 25600.1, BlockHeight: 88.7, DiffPress: 1275.3, FlowInRate: 455.9, HoleDepth: 8888.6, HookLoad: 290000.0, PumpPressure: 3220.8, TopDriveRPM: 126.1, TopDriveTorque: 15420.7 }
        ],
        'STREAMING_VIEWS': [
          { ViewName: 'Cristal_Demo_Exercise', RunStatus: 'Stopped By User', ViewType: 'Asset', RunMode: 'Continuous', StartTime: '~8h', Interval: 'Real-time' },
          { ViewName: 'Compressor Rollup', RunStatus: 'Not Yet Published', ViewType: 'Asset', RunMode: 'Continuous', StartTime: '~8h', Interval: '5 minutes' },
          { ViewName: 'Concentrator Modes', RunStatus: 'Publishing', ViewType: 'Event', RunMode: 'Continuous', StartTime: '6/26/18 1:07', Interval: 'On change' },
          { ViewName: 'BSQUASSONI - LRS 2018', RunStatus: 'Not Yet Published', ViewType: 'Asset', RunMode: 'Once', StartTime: '~1mo', Interval: 'N/A' },
          { ViewName: 'BWK Test for DCP', RunStatus: 'Not Yet Published', ViewType: 'Event', RunMode: 'Once', StartTime: '~8h', Interval: 'N/A' }
        ]
      }
    }
  ];

  const { data: dataSources = [] } = useQuery<DataSource[]>({
    queryKey: ['/api/data-sources']
  });

  // Delete data source mutation
  const deleteDataSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/data-sources/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to delete data source: ${response.status}`);
      }
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      console.log('Data source deleted successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      toast({
        title: "데이터 소스가 삭제되었습니다",
        description: "연결된 데이터 소스가 성공적으로 제거되었습니다."
      });
    },
    onError: (error: any) => {
      console.error('Delete data source error:', error);
      toast({
        title: "삭제 실패",
        description: `데이터 소스 삭제 중 오류가 발생했습니다: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetSource, setDeleteTargetSource] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteDataSource = (id: string, name: string) => {
    setDeleteTargetSource({ id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetSource) {
      deleteDataSourceMutation.mutate(deleteTargetSource.id);
      setDeleteDialogOpen(false);
      setDeleteTargetSource(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteTargetSource(null);
  };

  const createDataSourceMutation = useMutation({
    mutationFn: async (config: any) => {
      return apiRequest('/api/data-sources', 'POST', config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      toast({ title: "Success", description: "Data source connected successfully." });
      setShowConnectionDialog(false);
      setConnectionConfig({ host: '', port: '', database: '', username: '', password: '' });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to connect data source.", variant: "destructive" });
    },
  });

  const filteredDataSources = useMemo(() => {
    return availableDataSources.filter(ds => {
      const matchesSearch = ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ds.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ds.vendor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || ds.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const handleConnect = async (dataSource: AvailableDataSource) => {
    if (dataSource.id === 'microsoft-excel') {
      // Show Excel upload dialog
      setSelectedDataSource(dataSource);
      setShowExcelUploadDialog(true);
    } else if (dataSource.id === 'google-sheets') {
      // Click the hidden trigger for Google Sheets dialog
      const trigger = document.getElementById('hidden-google-sheets-trigger');
      if (trigger) {
        trigger.click();
      }
    } else {
      // Handle regular database connections
      setSelectedDataSource(dataSource);
      // Set PI-specific default configuration
      if (dataSource.id === 'aveva-pi') {
        setConnectionConfig({
          host: 'pi-server.company.com',
          port: '443',
          database: 'DFPIAF',
          username: 'pi_service',
          password: ''
        });
      } else {
        setConnectionConfig({
          host: '',
          port: '',
          database: '',
          username: '',
          password: ''
        });
      }
      setShowConnectionDialog(true);
    }
  };

  const handleExcelUploadSuccess = async (connectionData: any) => {
    try {
      // Process each Excel file and create detailed data source
      const firstFile = connectionData.files[0];
      const processedData = firstFile.processedData;
      
      // Check if Excel data source with this name already exists
      const existingDataSources = dataSources || [];
      const fileName = firstFile.name.replace(/\.[^/.]+$/, '');
      const existingExcel = existingDataSources.find(ds => 
        ds.type === 'Excel' && ds.name === fileName
      );
      
      if (existingExcel) {
        toast({ 
          title: "이미 연결됨", 
          description: `${fileName}은 이미 연결된 파일입니다.`, 
          variant: "destructive" 
        });
        return;
      }
      
      // Create comprehensive Excel data source with real data structure
      const dataSourceData = {
        name: connectionData.files.length === 1 ? fileName : `Excel Files (${connectionData.files.length} files)`,
        type: 'Excel',
        category: 'file',
        vendor: 'Microsoft',
        config: {
          files: connectionData.files.map((file: any) => ({
            name: file.name,
            worksheets: file.worksheets,
            url: file.url
          })),
          dataSchema: processedData ? Object.entries(processedData.schema).map(([tableName, fields]) => ({
            table: tableName,
            fields: fields,
            recordCount: processedData.recordCounts[tableName] || 0,
            lastUpdated: new Date().toISOString()
          })) : [],
          sampleData: processedData ? processedData.sampleData : {}
        },
        connectionDetails: {
          server: 'Local Upload',
          protocol: 'File System',
          database: connectionData.files.length === 1 ? firstFile.name : 'Multiple Files'
        },
        credentials: null,
        status: 'connected',
        recordCount: processedData ? Object.values(processedData.recordCounts).reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0
      };

      const response = await apiRequest('POST', '/api/data-sources', dataSourceData);
      
      // Refresh data sources to show the new Excel connection
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      
      toast({ 
        title: "Excel 파일 연결 완료", 
        description: `${connectionData.files.length}개의 Excel 파일이 성공적으로 연결되었습니다.` 
      });
      
      // Close the dialog
      setShowExcelUploadDialog(false);
    } catch (error) {
      console.error('Excel connection error:', error);
      toast({ 
        title: "연결 실패", 
        description: "Excel 파일 연결에 실패했습니다.", 
        variant: "destructive" 
      });
    }
  };

  const handleRefreshDataSource = async (id: string, name: string) => {
    try {
      const response = await apiRequest('POST', `/api/data-sources/${id}/refresh`);
      const result = await response.json();
      
      if (result.success) {
        // Refresh data sources to show updated data
        queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
        
        toast({
          title: "새로고침 완료",
          description: result.message || `${name} 데이터가 성공적으로 새로고침되었습니다.`
        });
      } else {
        throw new Error(result.error || 'Refresh failed');
      }
    } catch (error: any) {
      console.error('Refresh error:', error);
      toast({
        title: "새로고침 실패",
        description: error.message || `${name} 데이터 새로고침에 실패했습니다.`,
        variant: "destructive"
      });
    }
  };

  const handleGoogleSheetsSuccess = async () => {
    try {
      // Refresh data sources to show the new Google Sheets connection
      queryClient.invalidateQueries({ queryKey: ['/api/data-sources'] });
      
      // Close the dialog
      // Google Sheets success handled by the dialog itself
      
    } catch (error) {
      console.error('Google Sheets success handler error:', error);
    }
  };

  const handleSaveConnection = () => {
    if (!selectedDataSource || !connectionConfig.host) return;
    
    const config = {
      name: selectedDataSource.name,
      type: selectedDataSource.type,
      category: selectedDataSource.category,
      vendor: selectedDataSource.vendor,
      config: connectionConfig
    };

    createDataSourceMutation.mutate(config);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    return variants[status as keyof typeof variants] || variants.disconnected;
  };

  const handleViewDetails = (dataSource: DataSource) => {
    setSelectedDetailSource(dataSource);
    setSelectedTable(dataSource?.dataSchema?.[0]?.table || '');
    setShowDetailDialog(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Integration</h1>
          <p className="text-gray-600">Manage your data source connections and integrations</p>
        </div>
      </div>

      <div className="border-b bg-white">
        <div className="flex">
          <button
            onClick={() => setActiveTab('connected')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'connected' 
                ? 'border-blue-500 text-blue-600 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Connected Data Sources
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'available' 
                ? 'border-blue-500 text-blue-600 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Available Data Sources
          </button>
        </div>
      </div>

      <div className="space-y-6">{activeTab === 'connected' ? (


          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Connected Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dataSources.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Sources Connected</h3>
                  <p className="text-gray-600 mb-4">Connect your first data source to get started with data integration.</p>
                  <Button onClick={() => setShowConnectionDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Connect Data Source
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                  {dataSources.map((ds: DataSource) => (
                    <Card 
                      key={ds.id} 
                      className="border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors h-full flex flex-col" 
                      onClick={() => handleViewDetails(ds)}
                    >
                      <CardContent className="p-6 flex flex-col h-full">
                        {/* Header Section - Fixed Height */}
                        <div className="flex items-start justify-between mb-4 min-h-[60px]">
                          <div className="flex items-center gap-3 flex-1">
                            {getStatusIcon(ds.status)}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-lg truncate">{ds.name}</h4>
                              <p className="text-sm text-gray-500 truncate">{ds.connectionDetails?.server}</p>
                            </div>
                          </div>
                          <Badge className={getStatusBadge(ds.status)} style={{ flexShrink: 0 }}>
                            {ds.status}
                          </Badge>
                        </div>
                        
                        {/* Stats Section - Fixed Height */}
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4 min-h-[80px]">
                          <div className="min-h-[20px]">
                            <span className="text-gray-600">Type:</span>
                            <p className="font-medium truncate">{ds.type}</p>
                          </div>
                          <div className="min-h-[20px]">
                            <span className="text-gray-600">Records:</span>
                            <p className="font-medium">{ds.recordCount?.toLocaleString()}</p>
                          </div>
                          <div className="min-h-[20px]">
                            <span className="text-gray-600">Tables:</span>
                            <p className="font-medium">{ds.dataSchema?.length || 0}</p>
                          </div>
                          <div className="min-h-[20px]">
                            <span className="text-gray-600">Last Sync:</span>
                            <p className="font-medium text-xs">{ds.lastSync ? new Date(ds.lastSync).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>

                        {/* Tables Section - Fixed Height with Scrolling */}
                        <div className="p-3 bg-gray-50 rounded-lg mb-4 min-h-[80px] max-h-[80px] overflow-hidden">
                          <p className="text-sm text-gray-600 mb-2">Available Tables:</p>
                          <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[40px]">
                            {(ds.dataSchema || []).slice(0, 3).map((schema, index) => (
                              <Badge key={index} variant="secondary" className="text-xs whitespace-nowrap">
                                {schema.table}
                              </Badge>
                            ))}
                            {(ds.dataSchema?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                +{(ds.dataSchema?.length || 0) - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Buttons Section - Always at Bottom */}
                        <div className="flex gap-2 mt-auto">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(ds);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Data
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDataSource(ds.id, ds.name);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
      ) : (
          <Card>
            <CardHeader>
              <CardTitle>Available Data Sources</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search data sources..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {filteredDataSources.map((ds) => (
                  <Card key={ds.id} className="border border-gray-200 hover:shadow-md transition-shadow h-full flex flex-col">
                    <CardContent className="p-4 flex flex-col h-full">
                      {/* Header Section - Fixed Height */}
                      <div className="flex items-start justify-between mb-3 min-h-[60px]">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 mb-1 truncate">{ds.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[ds.category]}
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="ml-2 flex-shrink-0">{ds.type}</Badge>
                      </div>
                      
                      {/* Description Section - Fixed Height */}
                      <div className="mb-3 min-h-[60px] max-h-[60px] overflow-hidden">
                        <p className="text-sm text-gray-600 line-clamp-3">{ds.description}</p>
                      </div>
                      
                      {/* Features Section - Fixed Height with Scrolling */}
                      <div className="mb-3 min-h-[60px] max-h-[60px] overflow-hidden">
                        <p className="text-xs text-gray-500 mb-1">Features:</p>
                        <div className="flex flex-wrap gap-1 overflow-y-auto max-h-[40px]">
                          {ds.features.slice(0, 2).map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs whitespace-nowrap">
                              {feature}
                            </Badge>
                          ))}
                          {ds.features.length > 2 && (
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              +{ds.features.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Buttons Section - Always at Bottom */}
                      <div className="flex gap-2 mt-auto">
                        <Button 
                          onClick={() => handleConnect(ds)}
                          className="flex-1"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Connect
                        </Button>
                        <Button variant="outline" size="sm" className="flex-shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
      )}
      </div>

      {/* Connection Configuration Dialog */}
      <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect to {selectedDataSource?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="host">Host/Server</Label>
              <Input
                id="host"
                value={connectionConfig.host}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, host: e.target.value }))}
                placeholder="localhost or server.company.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  value={connectionConfig.port}
                  onChange={(e) => setConnectionConfig(prev => ({ ...prev, port: e.target.value }))}
                  placeholder="5432"
                />
              </div>
              <div>
                <Label htmlFor="database">Database</Label>
                <Input
                  id="database"
                  value={connectionConfig.database}
                  onChange={(e) => setConnectionConfig(prev => ({ ...prev, database: e.target.value }))}
                  placeholder="production"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={connectionConfig.username}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, username: e.target.value }))}
                placeholder="admin"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={connectionConfig.password}
                onChange={(e) => setConnectionConfig(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSaveConnection}
                disabled={createDataSourceMutation.isPending || !connectionConfig.host}
                className="flex-1"
              >
                {createDataSourceMutation.isPending ? 'Connecting...' : 'Connect'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowConnectionDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Data Source Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              {selectedDetailSource?.name} - Data Source Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedDetailSource && (
            <div className="space-y-6">
              {/* Connection Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connection Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Server</Label>
                      <p className="font-medium">{selectedDetailSource?.connectionDetails?.server}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Database</Label>
                      <p className="font-medium">{selectedDetailSource?.connectionDetails?.database}</p>
                    </div>
                    {selectedDetailSource?.connectionDetails?.port && (
                      <div>
                        <Label className="text-sm text-gray-600">Port</Label>
                        <p className="font-medium">{selectedDetailSource.connectionDetails.port}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm text-gray-600">Protocol</Label>
                      <p className="font-medium">{selectedDetailSource?.connectionDetails?.protocol}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label className="text-sm text-gray-600">Status</Label>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedDetailSource.status)}
                        <Badge className={getStatusBadge(selectedDetailSource.status)}>
                          {selectedDetailSource.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Total Records</Label>
                      <p className="font-medium">{selectedDetailSource.recordCount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Last Sync</Label>
                      <p className="font-medium">{selectedDetailSource?.lastSync ? new Date(selectedDetailSource.lastSync).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Schema and Sample Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Table className="w-5 h-5" />
                    Data Schema & Sample Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Table Selector */}
                    <div>
                      <Label htmlFor="tableSelect">Select Table</Label>
                      <Select value={selectedTable} onValueChange={setSelectedTable}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select a table" />
                        </SelectTrigger>
                        <SelectContent>
                          {(selectedDetailSource?.dataSchema || []).map((schema) => (
                            <SelectItem key={schema.table} value={schema.table}>
                              {schema.table} ({schema.recordCount?.toLocaleString() || 0} records)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTable && (() => {
                      const currentSchema = selectedDetailSource?.dataSchema?.find(s => s.table === selectedTable);
                      const sampleData = selectedDetailSource?.sampleData?.[selectedTable] || [];
                      
                      return (
                        <div className="space-y-4">
                          {/* Schema Information */}
                          <div>
                            <h4 className="font-medium mb-3">Table Schema: {selectedTable}</h4>
                            <div className="border rounded-lg overflow-hidden">
                              <UITable>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Field Name</TableHead>
                                    <TableHead>Data Type</TableHead>
                                    <TableHead>Description</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {currentSchema?.fields.map((field, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium">{field.name}</TableCell>
                                      <TableCell>
                                        <Badge variant="secondary">{field.type}</Badge>
                                      </TableCell>
                                      <TableCell className="text-sm text-gray-600">{field.description}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </UITable>
                            </div>
                            <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                              <span>Total Records: {currentSchema?.recordCount?.toLocaleString() || 0}</span>
                              <span>Last Updated: {currentSchema?.lastUpdated ? new Date(currentSchema.lastUpdated).toLocaleString() : 'N/A'}</span>
                            </div>
                          </div>

                          {/* Sample Data */}
                          <div>
                            <h4 className="font-medium mb-3">Sample Data (First 5 records)</h4>
                            <div className="border rounded-lg overflow-hidden">
                              <div className="max-h-64 overflow-auto">
                                <UITable>
                                  <TableHeader>
                                    <TableRow>
                                      {currentSchema?.fields.map((field) => (
                                        <TableHead key={field.name}>{field.name}</TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sampleData.map((row, rowIndex) => (
                                      <TableRow key={rowIndex}>
                                        {currentSchema?.fields.map((field) => (
                                          <TableCell key={field.name} className="text-sm">
                                            {typeof row[field.name] === 'number' 
                                              ? row[field.name].toLocaleString()
                                              : row[field.name]?.toString() || '-'
                                            }
                                          </TableCell>
                                        ))}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </UITable>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              Showing sample data from {selectedDetailSource.name}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Excel Upload Dialog */}
      <ExcelUploadDialog
        open={showExcelUploadDialog}
        onOpenChange={setShowExcelUploadDialog}
        onSuccess={handleExcelUploadSuccess}
      />
      
      {/* Google Sheets Dialog - Controlled visibility */}
      <GoogleSheetsConnectionDialog
        trigger={
          <Button 
            id="hidden-google-sheets-trigger"
            style={{ display: 'none' }}
            onClick={() => {}}
          >
            Hidden Trigger
          </Button>
        }
        onConnect={handleGoogleSheetsSuccess}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              데이터 소스 삭제
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              다음 데이터 소스를 삭제하시겠습니까?
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-800">
                {deleteTargetSource?.name}
              </p>
              <p className="text-sm text-red-600 mt-1">
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={cancelDelete}
                disabled={deleteDataSourceMutation.isPending}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteDataSourceMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteDataSourceMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    삭제 중...
                  </div>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}