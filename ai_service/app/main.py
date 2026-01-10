# ai_service/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic import BaseModel
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

query_engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global query_engine
    print("AI 服务启动中，正在加载模型和索引...")
    import os
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
    Settings.llm = Ollama(model="deepseek-r1:8b", base_url=ollama_base_url, request_timeout=120.0)
    Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-zh-v1.5")
    documents = SimpleDirectoryReader(input_dir="./data").load_data()
    index = VectorStoreIndex.from_documents(documents)
    query_engine = index.as_query_engine()
    print("AI 服务准备就绪！")
    yield
    print("AI 服务关闭。")

app = FastAPI(lifespan=lifespan)
class QueryRequest(BaseModel):
    question: str
@app.post("/query")
async def handle_query(request: QueryRequest):
    response = await query_engine.aquery(request.question)
    return {"answer": response.response}
