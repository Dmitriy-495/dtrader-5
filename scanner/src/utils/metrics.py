"""
Metrics calculations for volatility analysis
"""
import numpy as np
from typing import List, Dict


def calculate_atr(candles: List[Dict], period: int = 14) -> float:
    """
    Calculate Average True Range
    
    Args:
        candles: List of candles with 'h', 'l', 'c' keys
        period: ATR period
    
    Returns:
        ATR value
    """
    if len(candles) < period + 1:
        return 0.0
    
    true_ranges = []
    
    for i in range(1, len(candles)):
        high = float(candles[i]['h'])
        low = float(candles[i]['l'])
        prev_close = float(candles[i-1]['c'])
        
        tr = max(
            high - low,
            abs(high - prev_close),
            abs(low - prev_close)
        )
        true_ranges.append(tr)
    
    # Take last N periods
    recent_tr = true_ranges[-period:]
    return np.mean(recent_tr)


def calculate_price_change(candles: List[Dict], hours: int) -> float:
    """
    Calculate price change percentage over period
    
    Args:
        candles: List of candles
        hours: Hours back to calculate from
    
    Returns:
        Price change percentage
    """
    if len(candles) < hours + 1:
        return 0.0
    
    current = float(candles[-1]['c'])
    previous = float(candles[-hours-1]['c'])
    
    return ((current - previous) / previous) * 100


def calculate_volume_spike(candles: List[Dict], period: int = 10) -> float:
    """
    Calculate volume spike ratio
    
    Args:
        candles: List of candles with 'v' key
        period: Period to average
    
    Returns:
        Volume spike ratio (last / average)
    """
    if len(candles) < period:
        return 1.0
    
    volumes = [float(c['v']) for c in candles[-period:]]
    avg_volume = np.mean(volumes[:-1]) if len(volumes) > 1 else volumes[0]
    last_volume = volumes[-1]
    
    return last_volume / avg_volume if avg_volume > 0 else 1.0


def calculate_bollinger_width(candles: List[Dict], period: int = 20) -> float:
    """
    Calculate Bollinger Bands width
    
    Args:
        candles: List of candles
        period: BB period
    
    Returns:
        BB width as percentage
    """
    if len(candles) < period:
        return 0.0
    
    prices = [float(c['c']) for c in candles[-period:]]
    sma = np.mean(prices)
    std = np.std(prices)
    
    upper_band = sma + (2 * std)
    lower_band = sma - (2 * std)
    
    width = ((upper_band - lower_band) / sma) * 100
    return width


def calculate_volatility_score(atr_percent: float, price_change_24h: float,
                               volume_spike: float, bollinger_width: float) -> float:
    """
    Calculate composite volatility score (0-100)
    
    Weights:
        - ATR: 30%
        - Price change: 30%
        - Volume spike: 20%
        - Bollinger width: 20%
    """
    # Normalize components to 0-100
    atr_score = min(atr_percent * 10, 100)
    price_score = min(abs(price_change_24h) * 2, 100)
    volume_score = min((volume_spike - 1) * 50, 100)
    bollinger_score = min(bollinger_width * 5, 100)
    
    # Weighted sum
    total = (
        atr_score * 0.3 +
        price_score * 0.3 +
        volume_score * 0.2 +
        bollinger_score * 0.2
    )
    
    return round(total, 1)