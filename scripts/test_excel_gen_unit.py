import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import asyncio
from services.excel_exporter import OptimizationExcelExporter
import pandas as pd
import numpy as np

def test_excel_generation():
    print("Testing Excel Generation...")
    
    # Mock Artifacts
    artifacts = {
        'input_params': {'client_id': 1, 'mode': 'emh'},
        'fund_info': [{'id': 101, 'name': 'Fund A'}, {'id': 102, 'name': 'Fund B'}],
        'nav_df': pd.DataFrame({'Fund A': [10, 11, 12], 'Fund B': [20, 22, 21]}),
        'returns_df': pd.DataFrame({'Fund A': [0.1, 0.08], 'Fund B': [0.1, -0.05]}),
        'cov_matrix': np.array([[0.01, 0.005], [0.005, 0.02]]),
        'expected_returns': np.array([0.12, 0.15]),
        'results': {
            'mvp_weights': {101: 0.6, 102: 0.4},
            'max_sharpe_weights': {101: 0.3, 102: 0.7},
            'mvp_metrics': {'sharpe': 1.5},
            'max_sharpe_metrics': {'sharpe': 2.0}
        },
        'fetch_audit': [
            {'fund_id': 101, 'source': 'DB', 'status': 'HIT'},
            {'fund_id': 102, 'source': 'MFAPI', 'status': 'FETCHED'}
        ]
    }
    
    # Generate
    try:
        excel_io = OptimizationExcelExporter.generate_debug_excel(artifacts)
        with open('debug_test_output.xlsx', 'wb') as f:
            f.write(excel_io.read())
        print("✅ Excel file generated successfully: debug_test_output.xlsx")
        
        # Verify content
        xl = pd.ExcelFile('debug_test_output.xlsx')
        print(f"Sheets found: {xl.sheet_names}")
        if 'Data_Fetch_Audit' in xl.sheet_names:
            print("✅ Data Audit sheet present")
        else:
            print("❌ Data Audit sheet MISSING")
            
    except Exception as e:
        print(f"❌ Failed to generate Excel: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_excel_generation()
