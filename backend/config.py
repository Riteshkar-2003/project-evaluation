import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq


load_dotenv()
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)

groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    raise ValueError(
        "GROQ_API_KEY is not found in .env file."
    )

model_name = os.getenv("MODEL_NAME") or "qwen/qwen3.8-27b"
os.environ["MODEL_NAME"] = model_name

available_models = [
    model_name,
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b"
]
# Deduplicate while preserving order
fallback_model_list = list(dict.fromkeys(available_models))
primary_model = fallback_model_list[0]
secondary_models = fallback_model_list[1:]

primary_llm = ChatGroq(
    model=primary_model,
    temperature=0.7,
    api_key=groq_api_key
)

fallback_llms = [
    ChatGroq(model=m, temperature=0.7, api_key=groq_api_key)
    for m in secondary_models
]

llm = primary_llm.with_fallbacks(fallback_llms)
