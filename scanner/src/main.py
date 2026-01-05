#!/usr/bin/env python3
"""
DTrader-5.1 Scanner
Finds most volatile trading pairs
"""
import time
import sys
import os
from datetime import datetime

# Добавляем src в PYTHONPATH
sys.path.insert(0, os.path.dirname(__file__))

from config import config
from gate_api.client import GateAPIClient
from scanner.volatility import VolatilityScanner
from scanner.selector import PairSelector
from scanner.ranker import Ranker
from redis_client.publisher import RedisPublisher
from utils.logger import logger


class Scanner:
    """Main Scanner class"""
    
    def __init__(self):
        # Validate config
        config.validate()
        
        # Initialize components
        self.api_client = GateAPIClient(
            config.GATEIO_API_KEY,
            config.GATEIO_API_SECRET,
            config.BASE_URL
        )
        
        self.volatility_scanner = VolatilityScanner(self.api_client)
        
        self.selector = PairSelector(
            top_count=config.TOP_PAIRS_COUNT,
            new_listing_days=config.NEW_LISTING_DAYS
        )
        
        self.ranker = Ranker()
        
        self.redis_publisher = RedisPublisher(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT
        )
        
        logger.info("SCANNER_STARTED", data={
            "scan_interval": config.SCAN_INTERVAL,
            "top_pairs": config.TOP_PAIRS_COUNT,
            "new_listing_days": config.NEW_LISTING_DAYS
        })
    
    def run_scan(self):
        """Execute one scan cycle"""
        start_time = time.time()
        
        try:
            logger.info("SCAN_STARTED")
            
            # 1. Get all contracts
            all_contracts = self.api_client.get_all_contracts()
            logger.info("CONTRACTS_FETCHED", data={"count": len(all_contracts)})
            
            # 2. Select top by volume
            top_pairs = self.selector.select_top_by_volume(all_contracts)
            logger.info("TOP_PAIRS_SELECTED", data={"count": len(top_pairs)})
            
            # 3. Select new listings
            new_pairs = self.selector.select_new_listings(all_contracts)
            logger.info("NEW_LISTINGS_FOUND", data={"count": len(new_pairs)})
            
            # 4. Calculate volatility for top pairs
            top_metrics = self.volatility_scanner.scan_pairs(
                top_pairs,
                config.VOLATILITY_PERIOD
            )
            logger.info("TOP_VOLATILITY_CALCULATED", data={"count": len(top_metrics)})
            
            # 5. Calculate volatility for new pairs
            new_metrics = self.volatility_scanner.scan_pairs(
                new_pairs,
                config.VOLATILITY_PERIOD
            )
            logger.info("NEW_VOLATILITY_CALCULATED", data={"count": len(new_metrics)})
            
            # 6. Rank and select
            top_volatile = self.ranker.rank_by_volatility(
                top_metrics,
                config.SELECT_TOP_VOLATILE
            )
            
            new_volatile = self.ranker.rank_by_volatility(
                new_metrics,
                config.SELECT_NEW_VOLATILE
            )
            
            # 7. Build result
            scan_duration = int((time.time() - start_time) * 1000)
            
            result = {
                "timestamp": int(time.time() * 1000),
                "top_volatile": top_volatile,
                "new_volatile": new_volatile,
                "total_scanned": len(all_contracts),
                "scan_duration_ms": scan_duration
            }
            
            # 8. Publish to Redis
            self.publish_result(result)
            
            # 9. Log completion
            logger.scan_complete(result)
            
            # 10. Print summary
            self.print_result(result)
            
        except Exception as e:
            logger.scan_error(e)
    
    def publish_result(self, result: dict):
        """Publish scan result to Redis"""
        # Publish event
        self.redis_publisher.publish('scanner:result', {
            "event": "SCAN_COMPLETE",
            "source": "scanner",
            "timestamp": result["timestamp"],
            "data": result
        })
        
        # Save state
        self.redis_publisher.set_state('state:scanner:volatile_pairs', result)
    
    def print_result(self, result: dict):
        """Print human-readable scan result"""
        print("\n" + "="*60)
        print(f"📊 Scan Results - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        print(f"\n🔥 Top Volatile (from Top-{config.TOP_PAIRS_COUNT}):")
        for pair in result['top_volatile']:
            change = pair['price_change_24h']
            sign = '+' if change > 0 else ''
            print(f"  {pair['rank']}. {pair['symbol']:<12} | "
                  f"Score: {pair['volatility_score']:<5} | "
                  f"24h: {sign}{change}%")
        
        if result['new_volatile']:
            print(f"\n🆕 Top Volatile (New Listings):")
            for pair in result['new_volatile']:
                change = pair['price_change_24h']
                sign = '+' if change > 0 else ''
                print(f"  {pair['rank']}. {pair['symbol']:<12} | "
                      f"Score: {pair['volatility_score']:<5} | "
                      f"24h: {sign}{change}%")
        
        print(f"\n⏱️  Duration: {result['scan_duration_ms']}ms")
        print("="*60 + "\n")
    
    def run(self):
        """Main run loop"""
        print("\n╔════════════════════════════════════════════╗")
        print("║   📡 DTrader-5.1 Scanner Running 📡      ║")
        print("╚════════════════════════════════════════════╝\n")
        
        # Check Redis
        if not self.redis_publisher.ping():
            logger.error("REDIS_UNAVAILABLE")
            sys.exit(1)
        
        logger.info("REDIS_CONNECTED")
        
        # Run first scan immediately
        self.run_scan()
        
        # Schedule scans
        while True:
            try:
                time.sleep(config.SCAN_INTERVAL)
                self.run_scan()
            except KeyboardInterrupt:
                logger.info("SCANNER_STOPPED")
                sys.exit(0)
            except Exception as e:
                logger.scan_error(e)
                time.sleep(60)  # Wait 1 minute before retry


if __name__ == "__main__":
    scanner = Scanner()
    scanner.run()
