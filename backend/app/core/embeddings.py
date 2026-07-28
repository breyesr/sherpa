import litellm
from typing import List, Any
from app.core.system_config import ConfigService

class EmbeddingService:
    def __init__(self, db: Any):
        self.db = db

    async def get_embedding(self, text: str) -> List[float]:
        """Generate a 1536-dimensional embedding using OpenAI's model."""
        try:
            # We standardize on text-embedding-3-small or adav2
            provider = "openai"
            model = "text-embedding-3-small"
            api_key = await ConfigService.get(self.db, "OPENAI_API_KEY")

            response = await litellm.aembedding(
                model=model,
                input=[text],
                api_key=api_key,
                timeout=30
            )
            return response.data[0]["embedding"]
        except Exception as e:
            print(f"ERROR: Embedding generation failed: {e}")
            raise
