import os
import json
import re

from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def evaluate_coding_solution(
    question,
    code,
    execution_result,
    language
):
    # Extract only concise problem summary to avoid sending massive tokens
    q_summary = ""
    if isinstance(question, dict):
        q_summary = f"{question.get('title', '')}: {question.get('description', '')[:300]}"
    elif isinstance(question, str):
        try:
            parsed = json.loads(question)
            if isinstance(parsed, dict):
                q_summary = f"{parsed.get('title', '')}: {parsed.get('description', '')[:300]}"
            else:
                q_summary = question[:300]
        except Exception:
            q_summary = question[:300]
    else:
        q_summary = str(question)[:300]

    code_trimmed = (code or "")[:1500]
    exec_trimmed = (str(execution_result) or "")[:800]

    prompt = f"""You are an expert coding interviewer. Evaluate this candidate solution concisely.

Problem: {q_summary}
Language: {language}
Candidate Code:
```{language}
{code_trimmed}
```
Test Suite Results:
{exec_trimmed}

Return ONLY valid JSON matching this schema:
{{
    "correctness_score": 0,
    "code_quality_score": 0,
    "problem_solving_score": 0,
    "overall_score": 0,
    "time_complexity": "O(?)",
    "space_complexity": "O(?)",
    "strengths": [
        "strength 1",
        "strength 2"
    ],
    "improvements": [
        "improvement 1"
    ],
    "feedback": "Concise feedback of 5-8 lines explaining correctness, complexity, and edge case handling."
}}

Scoring:
0 = very poor / did not run
10 = production-grade / all tests passed
"""

    models_to_try = list(dict.fromkeys([
        os.getenv("MODEL_NAME") or "qwen/qwen3.8-27b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b"
    ]))

    response = None
    last_err = None
    for target_model in models_to_try:
        try:
            response = client.chat.completions.create(
                model=target_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert coding interviewer. Always return valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=600
            )
            if response:
                break
        except Exception as e:
            last_err = e
            print(f"[WARN] Coding evaluation failed on {target_model}: {e}. Trying fallback model...")

    if not response:
        raise last_err or Exception("Failed to get coding evaluation from LLM")

    content = response.choices[0].message.content.strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            clean_json = match.group(0)
        else:
            clean_json = re.sub(r"^```json\s*", "", content)
            clean_json = re.sub(r"^```\s*", "", clean_json)
            clean_json = re.sub(r"\s*```$", "", clean_json).strip()
        clean_json = re.sub(r",\s*([\}\]])", r"\1", clean_json)
        return json.loads(clean_json)
