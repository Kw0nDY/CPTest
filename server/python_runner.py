#!/usr/bin/env python3
"""
AI Model Execution Service
Loads and runs uploaded AI models with provided data
"""

import sys
import json
import os
import torch
import numpy as np
import pandas as pd
from pathlib import Path
import traceback

class ModelRunner:
    def __init__(self):
        self.models = {}
        
    def load_model(self, model_path):
        """Load a PyTorch model from file"""
        try:
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            # Load the model
            model = torch.load(model_path, map_location=torch.device('cpu'))
            
            # If it's a state dict, we need the model architecture
            if isinstance(model, dict) and 'state_dict' in model:
                # This would require knowing the model architecture
                # For now, assume the model is saved as a complete model
                raise ValueError("State dict models require architecture definition")
            
            return model
        except Exception as e:
            raise Exception(f"Failed to load model: {str(e)}")
    
    def prepare_data(self, data, input_specs):
        """Prepare input data according to model specifications"""
        try:
            prepared_inputs = {}
            
            for input_spec in input_specs:
                input_name = input_spec['name']
                input_type = input_spec['type']
                
                if input_name not in data:
                    raise ValueError(f"Required input '{input_name}' not found in data")
                
                # Convert data based on type
                if input_type == 'number':
                    # Convert to tensor
                    raw_data = data[input_name]
                    if isinstance(raw_data, (list, np.ndarray)):
                        tensor_data = torch.tensor(raw_data, dtype=torch.float32)
                    else:
                        tensor_data = torch.tensor([raw_data], dtype=torch.float32)
                    prepared_inputs[input_name] = tensor_data
                elif input_type == 'string':
                    prepared_inputs[input_name] = str(data[input_name])
                else:
                    prepared_inputs[input_name] = data[input_name]
            
            return prepared_inputs
        except Exception as e:
            raise Exception(f"Failed to prepare data: {str(e)}")
    
    def run_model(self, model_path, input_data, input_specs, output_specs):
        """Run model with input data and return results"""
        try:
            # Load model
            model = self.load_model(model_path)
            model.eval()
            
            # Prepare input data
            prepared_inputs = self.prepare_data(input_data, input_specs)
            
            # Run inference
            with torch.no_grad():
                # For most PyTorch models, we need to pass inputs as positional args
                # This is a simplified approach - real implementation would need
                # more sophisticated input handling based on model architecture
                
                input_values = list(prepared_inputs.values())
                if len(input_values) == 1:
                    outputs = model(input_values[0])
                else:
                    outputs = model(*input_values)
                
                # Process outputs
                results = {}
                if isinstance(outputs, torch.Tensor):
                    # Single output
                    if len(output_specs) > 0:
                        output_name = output_specs[0]['name']
                        results[output_name] = outputs.numpy().tolist()
                elif isinstance(outputs, (list, tuple)):
                    # Multiple outputs
                    for i, output in enumerate(outputs):
                        if i < len(output_specs):
                            output_name = output_specs[i]['name']
                            if torch.is_tensor(output):
                                results[output_name] = output.numpy().tolist()
                            else:
                                results[output_name] = output
                
                return results
                
        except Exception as e:
            raise Exception(f"Model execution failed: {str(e)}")

def main():
    """Main execution function called from Node.js"""
    try:
        if len(sys.argv) < 2:
            raise ValueError("No input data provided")
        
        # Parse input JSON
        input_json = sys.argv[1]
        config = json.loads(input_json)
        
        # Extract configuration
        model_path = config.get('model_path')
        input_data = config.get('input_data', {})
        input_specs = config.get('input_specs', [])
        output_specs = config.get('output_specs', [])
        
        if not model_path:
            raise ValueError("Model path not provided")
        
        # Run model
        runner = ModelRunner()
        results = runner.run_model(model_path, input_data, input_specs, output_specs)
        
        # Return results as JSON
        response = {
            "success": True,
            "results": results,
            "message": "Model executed successfully"
        }
        
        print(json.dumps(response))
        
    except Exception as e:
        # Return error as JSON
        error_response = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == "__main__":
    main()