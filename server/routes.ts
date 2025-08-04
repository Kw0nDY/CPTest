import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertDataSourceSchema,
  insertDataMappingSchema,
  insertWorkflowSchema,
  insertAiModelSchema,
  insertBoiConfigurationSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Data Sources
  app.get("/api/data-sources", async (req, res) => {
    try {
      const dataSources = await storage.getDataSources();
      res.json(dataSources);
    } catch (error) {
      console.error("Error fetching data sources:", error);
      res.status(500).json({ error: "Failed to fetch data sources" });
    }
  });

  app.post("/api/data-sources", async (req, res) => {
    try {
      const validatedData = insertDataSourceSchema.parse(req.body);
      const dataSource = await storage.createDataSource(validatedData);
      res.status(201).json(dataSource);
    } catch (error) {
      console.error("Error creating data source:", error);
      res.status(400).json({ error: "Invalid data source data" });
    }
  });

  app.put("/api/data-sources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const dataSource = await storage.updateDataSource(id, req.body);
      if (!dataSource) {
        return res.status(404).json({ error: "Data source not found" });
      }
      res.json(dataSource);
    } catch (error) {
      console.error("Error updating data source:", error);
      res.status(500).json({ error: "Failed to update data source" });
    }
  });

  app.post("/api/data-sources/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const dataSource = await storage.getDataSource(id);
      if (!dataSource) {
        return res.status(404).json({ error: "Data source not found" });
      }
      
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isConnected = Math.random() > 0.2; // 80% success rate
      
      if (isConnected) {
        await storage.updateDataSource(id, { status: "connected", lastSync: new Date() });
        res.json({ success: true, message: "Connection successful" });
      } else {
        await storage.updateDataSource(id, { status: "error" });
        res.status(400).json({ success: false, message: "Connection failed" });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      res.status(500).json({ error: "Failed to test connection" });
    }
  });

  // Data Mappings
  app.get("/api/data-mappings", async (req, res) => {
    try {
      const { dataSourceId } = req.query;
      const mappings = await storage.getDataMappings(dataSourceId as string);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching data mappings:", error);
      res.status(500).json({ error: "Failed to fetch data mappings" });
    }
  });

  app.post("/api/data-mappings", async (req, res) => {
    try {
      const validatedData = insertDataMappingSchema.parse(req.body);
      const mapping = await storage.createDataMapping(validatedData);
      res.status(201).json(mapping);
    } catch (error) {
      console.error("Error creating data mapping:", error);
      res.status(400).json({ error: "Invalid data mapping data" });
    }
  });

  // Workflows
  app.get("/api/workflows", async (req, res) => {
    try {
      const workflows = await storage.getWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.post("/api/workflows", async (req, res) => {
    try {
      const validatedData = insertWorkflowSchema.parse(req.body);
      const workflow = await storage.createWorkflow(validatedData);
      res.status(201).json(workflow);
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(400).json({ error: "Invalid workflow data" });
    }
  });

  app.put("/api/workflows/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const workflow = await storage.updateWorkflow(id, req.body);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Error updating workflow:", error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  // AI Models
  app.get("/api/ai-models", async (req, res) => {
    try {
      const models = await storage.getAiModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ error: "Failed to fetch AI models" });
    }
  });

  app.post("/api/ai-models", async (req, res) => {
    try {
      const validatedData = insertAiModelSchema.parse(req.body);
      const model = await storage.createAiModel(validatedData);
      res.status(201).json(model);
    } catch (error) {
      console.error("Error creating AI model:", error);
      res.status(400).json({ error: "Invalid AI model data" });
    }
  });

  app.post("/api/ai-models/upload", async (req, res) => {
    // Mock implementation for file upload
    res.json({ success: true, message: "Model uploaded successfully" });
  });

  app.post("/api/ai-models/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const model = await storage.getAiModel(id);
      if (!model) {
        return res.status(404).json({ error: "AI model not found" });
      }
      
      const inputData = req.body;
      
      // Simulate model prediction
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock prediction results based on model type
      let prediction;
      if (model.type === "classification") {
        prediction = {
          customer_segment: "Premium",
          confidence_score: 0.92
        };
      } else {
        prediction = { result: "Model prediction completed" };
      }
      
      res.json({ success: true, prediction });
    } catch (error) {
      console.error("Error testing AI model:", error);
      res.status(500).json({ error: "Failed to test AI model" });
    }
  });

  // BOI Configurations
  app.get("/api/boi-configurations", async (req, res) => {
    try {
      const configurations = await storage.getBoiConfigurations();
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching BOI configurations:", error);
      res.status(500).json({ error: "Failed to fetch BOI configurations" });
    }
  });

  app.post("/api/boi-configurations", async (req, res) => {
    try {
      const validatedData = insertBoiConfigurationSchema.parse(req.body);
      const configuration = await storage.createBoiConfiguration(validatedData);
      res.status(201).json(configuration);
    } catch (error) {
      console.error("Error creating BOI configuration:", error);
      res.status(400).json({ error: "Invalid BOI configuration data" });
    }
  });

  // Automation routes
  app.get("/api/automations", async (req, res) => {
    res.json([]);
  });

  app.post("/api/automations/:id/start", async (req, res) => {
    res.json({ success: true, message: "Automation started" });
  });

  app.post("/api/automations/:id/pause", async (req, res) => {
    res.json({ success: true, message: "Automation paused" });
  });

  // BOI routes
  app.get("/api/boi/overview", async (req, res) => {
    res.json({
      totalDataSources: 8,
      activeConnections: 6,
      aiModelsDeployed: 3,
      automationsRunning: 12,
      dataProcessedToday: 45230,
      predictionsGenerated: 1247,
      averageAccuracy: 94.2,
      systemHealth: 'excellent'
    });
  });

  app.get("/api/boi/data-flows", async (req, res) => {
    res.json([]);
  });

  app.get("/api/boi/insights", async (req, res) => {
    res.json([]);
  });

  app.post("/api/boi-configurations/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const config = await storage.getBoiConfiguration(id);
      if (!config) {
        return res.status(404).json({ error: "BOI configuration not found" });
      }
      
      const inputData = req.body;
      
      // Simulate BOI pipeline execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock combined result
      const result = {
        ...inputData,
        customer_segment: "Premium",
        confidence_score: 0.94,
        prediction_timestamp: new Date().toISOString()
      };
      
      res.json({ success: true, result });
    } catch (error) {
      console.error("Error testing BOI configuration:", error);
      res.status(500).json({ error: "Failed to test BOI configuration" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
