import pandas as pd
import io
from typing import Dict, Any
from datetime import datetime

class OptimizationExcelExporter:
    """
    Service to generate detailed Excel reports for portfolio optimization steps.
    """
    
    @staticmethod
    def generate_debug_excel(artifacts: Dict[str, Any]) -> io.BytesIO:
        """
        Generate an Excel file with multiple sheets containing optimization steps.
        
        Args:
            artifacts: Dictionary containing intermediate dataframes and dictionaries
                       keys: input_params, fund_info, nav_data, returns_df, 
                             corr_matrix, cov_matrix, expected_returns, results
                             
        Returns:
            BytesIO stream containing the Excel file
        """
        output = io.BytesIO()
        
        # Use ExcelWriter with XlsxWriter engine for better formatting if available, else openpyxl
        # We'll use pandas default which usually defaults to openpyxl for .xlsx
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            
            # 1. Summary / Input Parameters
            summary_data = []
            inputs = artifacts.get('input_params', {})
            summary_data.append({"Parameter": "Client ID", "Value": inputs.get('client_id')})
            summary_data.append({"Parameter": "Mode", "Value": inputs.get('mode')})
            summary_data.append({"Parameter": "Generated At", "Value": datetime.now().strftime("%Y-%m-%d %H:%M:%S")})
            
            constraints = inputs.get('constraints', {})
            for k, v in constraints.items():
                summary_data.append({"Parameter": f"Constraint - {k}", "Value": str(v)})
                
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
            
            # 2. Fund Information
            if 'fund_info' in artifacts:
                pd.DataFrame(artifacts['fund_info']).to_excel(writer, sheet_name='Fund_Universe', index=False)
                
            # 3. Raw NAV Data Summary
            # Instead of dumping all NAVs (which could be huge), let's dump the aligned NAV series used
            if 'aligned_navs' in artifacts:
                # This is likely a DataFrame
                artifacts['aligned_navs'].to_excel(writer, sheet_name='Aligned_NAV_Data')
                
            # 4. Returns Calculation
            if 'returns_df' in artifacts:
                artifacts['returns_df'].to_excel(writer, sheet_name='Log_Returns')
                
                # Add basic stats for returns
                desc = artifacts['returns_df'].describe()
                desc.to_excel(writer, sheet_name='Returns_Statistics')

            # 5. Correlation Matrix
            if 'returns_df' in artifacts:
                corr = artifacts['returns_df'].corr()
                corr.to_excel(writer, sheet_name='Correlation_Matrix')
                
            # 6. Covariance Matrix
            # If we have the raw annualized cov matrix
            if 'cov_matrix' in artifacts:
                # Convert ndarray to DataFrame if needed
                cov_data = artifacts['cov_matrix']
                cols = artifacts['returns_df'].columns if 'returns_df' in artifacts else None
                if not isinstance(cov_data, pd.DataFrame) and cols is not None:
                    cov_df = pd.DataFrame(cov_data, index=cols, columns=cols)
                else:
                    cov_df = pd.DataFrame(cov_data)
                
                cov_df.to_excel(writer, sheet_name='Covariance_Annualized')

            # 7. Expected Returns
            if 'expected_returns' in artifacts:
                er_data = artifacts['expected_returns']
                cols = artifacts['returns_df'].columns if 'returns_df' in artifacts else None
                
                if not isinstance(er_data, pd.Series) and not isinstance(er_data, pd.DataFrame):
                    # Array
                    er_df = pd.DataFrame({"Fund": cols, "Expected_Annual_Return": er_data})
                else:
                    er_df = pd.DataFrame(er_data)
                    
                er_df.to_excel(writer, sheet_name='Expected_Returns')
                
            # 8. Optimization Results (Weights)
            results = artifacts.get('results', {})
            weights_data = []
            
            # Collect funds to map IDs to Names
            fund_map = {f['id']: f['name'] for f in artifacts.get('fund_info', [])}
            
            # MVP
            mvp_w = results.get('mvp_weights', {})
            for fid, w in mvp_w.items():
                weights_data.append({
                    "Portfolio": "MVP",
                    "Fund_ID": fid,
                    "Fund_Name": fund_map.get(int(fid), str(fid)),
                    "Weight": w
                })
                
            # Max Sharpe
            ms_w = results.get('max_sharpe_weights', {})
            for fid, w in ms_w.items():
                weights_data.append({
                    "Portfolio": "Max_Sharpe",
                    "Fund_ID": fid,
                    "Fund_Name": fund_map.get(int(fid), str(fid)),
                    "Weight": w
                })
                
            # BL
            bl_w = results.get('bl_weights', {})
            if bl_w:
                for fid, w in bl_w.items():
                    weights_data.append({
                        "Portfolio": "Black_Litterman",
                        "Fund_ID": fid,
                        "Fund_Name": fund_map.get(int(fid), str(fid)),
                        "Weight": w
                    })
            
            if weights_data:
                pd.DataFrame(weights_data).to_excel(writer, sheet_name='Optimal_Portfolios', index=False)
                
            # 9. Metrics
            metrics_data = []
            
            mvp_m = results.get('mvp_metrics', {})
            mvp_m['Portfolio'] = 'MVP'
            metrics_data.append(mvp_m)
            
            ms_m = results.get('max_sharpe_metrics', {})
            ms_m['Portfolio'] = 'Max_Sharpe'
            metrics_data.append(ms_m)
            
            bl_m = results.get('bl_metrics')
            if bl_m:
               bl_m['Portfolio'] = 'Black_Litterman'
               metrics_data.append(bl_m)
               
            pd.DataFrame(metrics_data).to_excel(writer, sheet_name='Portfolio_Metrics', index=False)
            
            # 10. Data Fetching Audit (New request from user)
            # Artifact should contain info about how data was fetched (Cache vs API vs DB)
            if 'fetch_audit' in artifacts:
                pd.DataFrame(artifacts['fetch_audit']).to_excel(writer, sheet_name='Data_Fetch_Audit', index=False)
                
        output.seek(0)
        return output
