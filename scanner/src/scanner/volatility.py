"""
Volatility Scanner - calculates volatility metrics for pairs
"""
from typing import List, Dict, Optional
from ..gate_api.client import GateAPIClient
from ..utils.metrics import (
    calculate_atr,
    calculate_price_change,
    calculate_volume_spike,
    calculate_bollinger_width,
    calculate_volatility_score
)


class VolatilityScanner:
    """Scans pairs and calculates volatility metrics"""
    
    def __init__(self, api_client: GateAPIClient):
        self.api_client = api_client
    
    def scan_pair(self, pair: Dict, period_hours: int = 24) -> Optional[Dict]:
        """
        Calculate volatility metrics for a single pair
        
        Args:
            pair: Pair info dict with 'name', 'last_price', etc
            period_hours: Hours of data to analyze
        
        Returns:
            Dict with volatility metrics or None if failed
        """
        try:
            symbol = pair['name']
            last_price = float(pair.get('last_price', 0))
            
            if last_price == 0:
                return None
            
            # Get candles
            candles = self.api_client.get_candles(symbol, '1h', period_hours)
            
            if len(candles) < 10:
                return None  # Not enough data
            
            # Calculate metrics
            atr = calculate_atr(candles)
            atr_percent = (atr / last_price) * 100
            
            price_change_1h = calculate_price_change(candles, 1)
            price_change_4h = calculate_price_change(candles, 4)
            price_change_24h = calculate_price_change(candles, min(24, len(candles)-1))
            
            volume_spike = calculate_volume_spike(candles)
            bollinger_width = calculate_bollinger_width(candles)
            
            # Calculate composite score
            volatility_score = calculate_volatility_score(
                atr_percent,
                price_change_24h,
                volume_spike,
                bollinger_width
            )
            
            return {
                'symbol': symbol,
                'atr': round(atr, 8),
                'atr_percent': round(atr_percent, 2),
                'price_change_1h': round(price_change_1h, 2),
                'price_change_4h': round(price_change_4h, 2),
                'price_change_24h': round(price_change_24h, 2),
                'volume_spike': round(volume_spike, 2),
                'bollinger_width': round(bollinger_width, 2),
                'volatility_score': volatility_score
            }
            
        except Exception as e:
            # Skip pairs with errors
            return None
    
    def scan_pairs(self, pairs: List[Dict], period_hours: int = 24) -> List[Dict]:
        """
        Scan multiple pairs
        
        Args:
            pairs: List of pair info dicts
            period_hours: Hours of data to analyze
        
        Returns:
            List of volatility metrics
        """
        results = []
        
        for pair in pairs:
            metrics = self.scan_pair(pair, period_hours)
            if metrics:
                results.append(metrics)
        
        return results