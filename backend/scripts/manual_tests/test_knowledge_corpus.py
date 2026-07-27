import asyncio
import json
from app.core.database import SessionLocal
from app.services.graphrag import GraphRAGService
from sqlalchemy import text

async def test_refactored_rag():
    print("🚀 Starting GraphRAG Verification Test...")
    async with SessionLocal() as db:
        # 1. Pick a business and store that we know has data
        # From previous exports, we know 'Alejandro' (069b397d-5646-70aa-8000-55dbb6e613c4) has 48 corpus entries
        business_id = "069b397d-5646-70aa-8000-55dbb6e613c4"
        
        # Find a store for this business
        res = await db.execute(text(f"SELECT id, name FROM stores WHERE business_id = '{business_id}' LIMIT 1"))
        store = res.first()
        if not store:
            print("❌ Error: No stores found for business 'Alejandro'")
            return
        
        store_id, store_name = store
        print(f"📍 Testing with Store: {store_name} ({store_id})")

        rag_service = GraphRAGService(db)
        
        # 2. Test find_similar_notes (The core of the refactor)
        print("\n🔍 Testing 'find_similar_notes' (Vector search against knowledge_corpus)...")
        query = "Show me risks and delivery issues"
        notes = await rag_service.find_similar_notes(query, business_id, store_id=store_id)
        
        if notes:
            print(f"✅ Found {len(notes)} relevant entries in the Unified Corpus!")
            for n in notes[:3]:
                print(f"   - [{n['type']}] {n['content'][:100]}...")
        else:
            print("❌ Error: No notes found in corpus. Migration might have failed or search is broken.")

        # 3. Test search_store_profiles (Global Discovery)
        print("\n🌍 Testing 'search_store_profiles' (Global Account Discovery)...")
        discovery_query = "Find stores in Centro region"
        profiles = await rag_service.search_store_profiles(discovery_query, business_id)
        
        if profiles:
            print(f"✅ Discovery successful! Found {len(profiles)} stores.")
            for p in profiles:
                print(f"   - Store: {p['name']} (Region: {p.get('region')})")
        else:
            print("⚠️ Warning: No store profiles found for discovery query.")

        # 4. Generate a full Briefing (The end-to-end flow)
        print("\n🤖 Generating End-to-End Briefing...")
        brief = await rag_service.generate_brief(f"Give me a brief for {store_name}", business_id)
        print("-" * 50)
        print(brief)
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(test_refactored_rag())
