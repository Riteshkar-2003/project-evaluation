from langchain_core.messages import SystemMessage, HumanMessage
from config import llm, report_llm
import json
import concurrent.futures
from rag_technical.retriever import get_rag_context, retrieve_answer_analysis_knowledge


EMPTY_RESUME = {
    "name": "",
    "skills": [],
    "programming_languages": [],
    "technologies": [],
    "projects": [],
    "internships": [],
    "work_experience": [],
    "education": []
}

SYSTEM_PROMPT = """
You are a professional technical interviewer.

Conduct a resume-based technical interview.

Rules:
- Ask exactly ONE question at a time.
- Questions must come only from information in the resume.
- Never invent skills, projects, companies, technologies or experience.
- Analyze the candidate's previous answer.
- Adjust difficulty based on performance.
- Avoid repeatedly asking about the same topic.
- Cover different resume sections when possible.
- Do not give the answer.
- Behave like a real technical interviewer.

Difficulty:
Easy = basic concepts and definitions.
Medium = practical, implementation and project questions.
Hard = advanced concepts, optimization, troubleshooting and design.

Strong answer -> increase difficulty.
Average answer -> keep difficulty.
Weak answer -> decrease difficulty.

Return only the requested output.
"""



def clean_llm_json(content):
    """
    Clean JSON returned by the LLM.
    Handles responses wrapped inside 
    """

    if not content:
        return ""

    content = content.strip()

    if content.startswith("```"):
        content = content.replace("```json", "", 1)
        content = content.replace("```", "", 1)
        content = content.strip()

    return content


def safe_json_loads(content, default=None):
    """
    Safely convert LLM JSON response into Python object.
    """

    if default is None:
        default = {}

    try:
        content = clean_llm_json(content)
        return json.loads(content)
    except (json.JSONDecodeError, TypeError, ValueError):
        return default


def compact_json(data):
    """
    Convert Python object to compact JSON.

    separators removes unnecessary spaces and reduces
    prompt token usage.
    """

    return json.dumps(
        data,
        ensure_ascii=False,
        separators=(",", ":")
    )


def get_resume_sections(resume_data):
    """
    Return only the sections that actually exist.
    """

    sections = []

    if resume_data.get("skills"):
        sections.append("Skills")

    if resume_data.get("programming_languages"):
        sections.append("Programming Languages")

    if resume_data.get("technologies"):
        sections.append("Technologies")

    if resume_data.get("projects"):
        sections.append("Projects")

    if resume_data.get("internships"):
        sections.append("Internships")

    if resume_data.get("work_experience"):
        sections.append("Work Experience")

    return sections


def build_compact_resume(resume_data):
    """
    Create a smaller resume representation.

    This avoids sending unnecessary resume text to the LLM
    during every interview question.
    """

    compact_resume = {
        "skills": resume_data.get("skills", []),
        "programming_languages": resume_data.get(
            "programming_languages", []
        ),
        "technologies": resume_data.get("technologies", []),
        "projects": [],
        "internships": [],
        "work_experience": []
    }

  
    for project in resume_data.get("projects", []):
        compact_resume["projects"].append({
            "name": project.get("name", ""),
            "technologies": project.get("technologies", []),
            "description": project.get("description", "")[:500]
        })

   
    for internship in resume_data.get("internships", []):
        compact_resume["internships"].append({
            "company": internship.get("company", ""),
            "role": internship.get("role", ""),
            "technologies": internship.get("technologies", []),
            "description": internship.get("description", "")[:400]
        })

   
    for work in resume_data.get("work_experience", []):
        compact_resume["work_experience"].append({
            "company": work.get("company", ""),
            "role": work.get("role", ""),
            "technologies": work.get("technologies", []),
            "description": work.get("description", "")[:400]
        })

    return compact_resume


def get_recent_history(chat_history, limit=4):
    """
    Only send the most recent interview messages.

    Sending the entire history becomes increasingly expensive
    as the interview gets longer.
    """

    if not chat_history:
        return []

    return chat_history[-limit:]


def get_next_section(all_sections, asked_sections):
    """
    Select an uncovered resume section in Python.

    This removes unnecessary decision-making from the LLM.
    """

    if not all_sections:
        return None

    asked = set(asked_sections or [])

    for section in all_sections:
        if section not in asked:
            return section

   
    return all_sections[len(asked) % len(all_sections)]



def extract_resume_information(resume_text):
    # Trim resume text to keep prompt short (first 3000 chars is sufficient for most CVs)
    resume_trimmed = (resume_text or "")[:3000]

    prompt = f"""
Extract the candidate's resume information into JSON.

Resume:
{resume_trimmed}

Return ONLY valid JSON.

Use exactly this structure:

{{
    "name": "",
    "skills": [],
    "programming_languages": [],
    "technologies": [],
    "projects": [
        {{
            "name": "",
            "description": "",
            "technologies": []
        }}
    ],
    "internships": [
        {{
            "company": "",
            "role": "",
            "description": "",
            "technologies": []
        }}
    ],
    "work_experience": [
        {{
            "company": "",
            "role": "",
            "description": "",
            "technologies": []
        }}
    ],
    "education": []
}}

Do not invent information.
If information is missing, return an empty list.
"""

    response = llm.invoke([
        SystemMessage(
            content="You are an expert resume parser. Return only JSON."
        ),
        HumanMessage(content=prompt)
    ])

    result = safe_json_loads(
        response.content,
        default=EMPTY_RESUME.copy()
    )

   
    for key, default_value in EMPTY_RESUME.items():

        if key not in result:
            result[key] = (
                default_value.copy()
                if isinstance(default_value, list)
                else default_value
            )

    return result




def generate_first_question(
    resume_data,
    difficulty
):
    compact_resume = build_compact_resume(resume_data)
    sections = get_resume_sections(resume_data)
    skills = list(resume_data.get("skills", [])) + list(resume_data.get("programming_languages", [])) + list(resume_data.get("technologies", []))

    # Fetch RAG context concurrently (does not depend on LLM)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        rag_future = ex.submit(get_rag_context, skills=skills, difficulty=difficulty, top_k=2)
        rag_context = rag_future.result(timeout=8)

    prompt = f"""Start technical interview. Difficulty: {difficulty}.
Resume: {compact_json(compact_resume)}
Sections: {", ".join(sections)}
{f"Knowledge context: {rag_context[:500]}" if rag_context else ""}
Ask ONE technical question from the resume. Return ONLY the question."""

    try:
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ])
        return response.content.strip()
    except Exception as e:
        print("[WARN] generate_first_question LLM failed:", e)
        first_skill = skills[0] if skills else "software engineering"
        return f"Can you explain your experience with {first_skill} and describe a key challenge you solved?"




def analyze_answer(
    question,
    candidate_answer,
    current_difficulty
):
    # Fetch RAG context in parallel (I/O-bound, doesn't block LLM)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        rag_future = ex.submit(retrieve_answer_analysis_knowledge, question, candidate_answer, 2)
        rag_context = rag_future.result(timeout=8)

    # Trim candidate answer to avoid inflating tokens
    answer_trimmed = (candidate_answer or "")[:1500]

    prompt = f"""Evaluate this interview answer. Difficulty: {current_difficulty}.
Q: {question}
A: {answer_trimmed}
{f"Reference: {rag_context[:400]}" if rag_context else ""}
Score 0-10. Next difficulty: Easy/Medium/Hard.
Return ONLY valid JSON:
{{"score":0,"evaluation":"brief analysis","correct_answer":"ideal answer in 2-3 sentences","strengths":["s1"],"weaknesses":["w1"],"next_difficulty":"Easy"}}"""

    response = llm.invoke([
        SystemMessage(
            content=(
                "You are a technical interviewer evaluator. "
                "Return only valid JSON, no extra text."
            )
        ),
        HumanMessage(content=prompt)
    ])

    result = safe_json_loads(response.content)

    try:
        score = float(result.get("score", 0))
    except (TypeError, ValueError):
        score = 0

    score = max(0, min(10, score))

    result["score"] = score
    result.setdefault("evaluation", "")
    result.setdefault("correct_answer", "The ideal answer should address core architectural principles and technical specifics.")
    result.setdefault("strengths", [])
    result.setdefault("weaknesses", [])
    result.setdefault(
        "next_difficulty",
        current_difficulty
    )

    return result




def generate_next_question(
    resume_data,
    chat_history,
    current_difficulty,
    evaluation,
    asked_sections
):
    compact_resume = build_compact_resume(resume_data)
    recent_history = get_recent_history(chat_history, limit=3)  # reduced from 4
    all_sections = get_resume_sections(resume_data)
    next_section = get_next_section(all_sections, asked_sections)
    skills = list(resume_data.get("skills", [])) + list(resume_data.get("programming_languages", []))

    # Parallel RAG fetch
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        rag_future = ex.submit(get_rag_context, skills=skills, difficulty=current_difficulty, query_text=str(next_section or ""), top_k=2)
        rag_context = rag_future.result(timeout=8)

    # Compact eval summary (only score + 1 weakness)
    eval_summary = {
        "score": evaluation.get("score", 0),
        "weak": (evaluation.get("weaknesses") or [""])[:1]
    }

    prompt = f"""Continue technical interview. Difficulty: {current_difficulty}. Section: {next_section}.
Resume: {compact_json(compact_resume)}
Recent Q&A: {compact_json(recent_history)}
Last score: {compact_json(eval_summary)}
{f"Context: {rag_context[:400]}" if rag_context else ""}
Ask ONE new question not already covered. Return ONLY the question."""

    try:
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt)
        ])
        return response.content.strip()
    except Exception as e:
        print("[WARN] generate_next_question LLM failed:", e)
        first_skill = skills[0] if skills else "software engineering"
        return f"Can you walk me through a challenging {next_section or first_skill} implementation you built and the trade-offs you made?"

def build_computed_report(resume_data, interview_history):
    if not interview_history:
        return {
            "overall_score": 0,
            "technical_score": 0,
            "skills_score": 0,
            "projects_score": 0,
            "experience_score": 0,
            "strengths": ["Completed profile setup."],
            "weaknesses": ["No questions were answered."],
            "areas_for_improvement": ["Complete technical interview questions for a full evaluation."],
            "performance_summary": "The interview was stopped before candidate provided answers.",
            "final_level": "Beginner",
            "recommendation": "Practice core technical concepts and attempt full interview.",
            "question_wise_feedback": []
        }

    scores = []
    strengths = []
    weaknesses = []
    question_wise_feedback = []

    for idx, item in enumerate(interview_history, start=1):
        q = item.get("question", f"Question {idx}")
        a = item.get("answer", "")
        ev = item.get("evaluation") or {}
        score = ev.get("score")
        if score is None:
            score = 7.0
        try:
            score = float(score)
        except (ValueError, TypeError):
            score = 7.0
        scores.append(score)

        if isinstance(ev.get("strengths"), list):
            strengths.extend(ev.get("strengths"))
        if isinstance(ev.get("weaknesses"), list):
            weaknesses.extend(ev.get("weaknesses"))

        eval_text = ev.get("evaluation") or ("Good response demonstrating solid understanding of concepts." if score >= 6 else "Partial response needing more technical depth and edge-case coverage.")
        correct_ans = ev.get("correct_answer") or "Standard industry implementation following clean architecture, best practices, and efficient algorithms."

        question_wise_feedback.append({
            "question": q,
            "topic": "Technical Knowledge",
            "score": round(score, 1),
            "evaluation": eval_text,
            "correct_answer": correct_ans
        })

    avg_score = round(sum(scores) / max(len(scores), 1), 1)
    if avg_score >= 8.5:
        level = "Excellent"
    elif avg_score >= 7.0:
        level = "Strong"
    elif avg_score >= 5.5:
        level = "Good"
    elif avg_score >= 4.0:
        level = "Intermediate"
    else:
        level = "Beginner"

    unique_strengths = list(dict.fromkeys([s for s in strengths if s]))[:5]
    if not unique_strengths:
        unique_strengths = ["Demonstrated fundamental technical knowledge", "Addressed core interview questions", "Clear technical communication"]

    unique_weaknesses = list(dict.fromkeys([w for w in weaknesses if w]))[:5]
    if not unique_weaknesses:
        unique_weaknesses = ["Incorporate more production-ready design patterns", "Discuss edge cases and scale considerations"]

    areas_for_improvement = [f"Deepen knowledge in {w.lower()}" if not w.lower().startswith("deepen") else w for w in unique_weaknesses[:3]]

    return {
        "overall_score": avg_score,
        "technical_score": avg_score,
        "skills_score": min(10.0, round(avg_score * 0.95 + 0.3, 1)),
        "projects_score": min(10.0, round(avg_score * 0.98 + 0.1, 1)),
        "experience_score": min(10.0, round(avg_score * 0.92 + 0.5, 1)),
        "strengths": unique_strengths,
        "weaknesses": unique_weaknesses,
        "areas_for_improvement": areas_for_improvement,
        "performance_summary": f"Candidate demonstrated {level.lower()} capabilities across {len(interview_history)} technical interview question(s) with an overall score of {avg_score}/10.",
        "final_level": level,
        "recommendation": f"Candidate is placed at {level} level. Continue practicing system design, edge cases, and in-depth framework concepts.",
        "question_wise_feedback": question_wise_feedback
    }


def generate_feedback_report(
    resume_data,
    interview_history
):

   
    if not interview_history:

        return {
            "overall_score": 0,
            "technical_score": 0,
            "skills_score": 0,
            "projects_score": 0,
            "experience_score": 0,

            "strengths": [],

            "weaknesses": [
                "No interview answers were provided."
            ],

            "areas_for_improvement": [
                "Answer interview questions to receive a complete evaluation."
            ],

            "performance_summary": (
                "The interview was stopped before the "
                "candidate provided any answers."
            ),

            "final_level": "Not Evaluated",

            "recommendation": (
                "Answer interview questions to receive "
                "a complete performance evaluation."
            ),

            "question_wise_feedback": []
        }

   

    compact_resume = build_compact_resume(resume_data)

    prompt = f"""
You are a professional technical interview evaluator.

Evaluate the candidate based ONLY on the provided information.

RESUME:
{compact_json(compact_resume)}

INTERVIEW HISTORY:
{compact_json(interview_history)}

The candidate answered the interview questions.

Generate a professional performance report.

Calculate scores based on actual answers.

Do not return zero scores unless the answers clearly deserve zero.

Scoring:
0-2 = Very Poor
3-4 = Poor
5-6 = Average
7-8 = Good
9 = Very Strong
10 = Excellent

Evaluate:

1. Overall Score
2. Technical Knowledge
3. Skills Performance
4. Projects Performance
5. Internship / Work Experience
6. Strengths
7. Weaknesses
8. Areas for Improvement
9. Performance Summary
10. Final Candidate Level
11. Recommendation
12. Question-wise evaluation

Candidate levels:
Beginner
Intermediate
Good
Strong
Excellent

For each answered question include:
- question
- topic
- score
- evaluation
- correct_answer (the comprehensive ideal answer)

Return ONLY valid JSON.

Use exactly this structure:

{{
    "overall_score": 0,
    "technical_score": 0,
    "skills_score": 0,
    "projects_score": 0,
    "experience_score": 0,
    "strengths": [],
    "weaknesses": [],
    "areas_for_improvement": [],
    "performance_summary": "",
    "final_level": "",
    "recommendation": "",
    "question_wise_feedback": [
        {{
            "question": "",
            "topic": "",
            "score": 0,
            "evaluation": "",
            "correct_answer": ""
        }}
    ]
}}
"""

    try:
        response = report_llm.invoke([
            SystemMessage(
                content=(
                    "You are an expert technical interview evaluator. "
                    "Return only valid JSON."
                )
            ),
            HumanMessage(content=prompt)
        ])
        report = safe_json_loads(response.content)
    except Exception as e:
        print("[WARN] generate_feedback_report LLM failed:", e)
        report = None

    if not report or not isinstance(report, dict) or "overall_score" not in report:
        print("[INFO] Using computed report fallback for technical interview")
        return build_computed_report(resume_data, interview_history)

    return report

