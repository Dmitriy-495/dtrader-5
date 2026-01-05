"""
Redis Publisher for Scanner
"""
import redis
import json
from typing import Any, Dict


class RedisPublisher:
    """Publishes scan results to Redis"""
    
    def __init__(self, host: str = 'localhost', port: int = 6379):
        self.client = redis.Redis(
            host=host,
            port=port,
            decode_responses=True
        )
    
    def publish(self, channel: str, message: Dict):
        """
        Publish message to Redis channel
        
        Args:
            channel: Redis channel name
            message: Message dict
        """
        try:
            payload = json.dumps(message)
            self.client.publish(channel, payload)
        except Exception as e:
            print(f"Failed to publish to Redis: {e}")
    
    def set_state(self, key: str, data: Any, ttl: int = 3600):
        """
        Save state to Redis with TTL
        
        Args:
            key: Redis key
            data: Data to save
            ttl: Time to live in seconds
        """
        try:
            payload = json.dumps(data)
            self.client.setex(key, ttl, payload)
        except Exception as e:
            print(f"Failed to set state in Redis: {e}")
    
    def get_state(self, key: str) -> Any:
        """Get state from Redis"""
        try:
            data = self.client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            print(f"Failed to get state from Redis: {e}")
            return None
    
    def ping(self) -> bool:
        """Check Redis connection"""
        try:
            return self.client.ping()
        except:
            return False