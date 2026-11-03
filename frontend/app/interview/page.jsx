

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    getFirstQuestion,
    analyzeAnswer,
    getNextQuestion,
} from "../../lib/api";
import {
    Loader2,
    Send,
    ArrowRight,
    Sparkles,
    Brain,
    User,
    CheckCircle2,
    AlertCircle,
    BookOpen,
} from "lucide-react";

export default function InterviewPage() {
    const router = useRouter();

    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [difficulty, setDifficulty] = useState("Easy");
    const [evaluation, setEvaluation] = useState(null);
    const [loadingFirstQuestion, setLoadingFirstQuestion] = useState(true);
    const [evaluatingAnswer, setEvaluatingAnswer] = useState(false);
    const [generatingNextQuestion, setGeneratingNextQuestion] = useState(false);
    const [questionNumber, setQuestionNumber] = useState(1);
    const [resumeData, setResumeData] = useState(null);
    const [history, setHistory] = useState([]);
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        const storedResume =
            sessionStorage.getItem("resumeData");

        const storedDifficulty =
            sessionStorage.getItem("difficulty");

        if (
            !storedResume ||
            storedResume === "undefined" ||
            storedResume === "null"
        ) {
            console.error(
                "RESUME DATA NOT FOUND"
            );

            router.push("/dashboard");
            return;
        }

        try {
            const parsedResume =
                JSON.parse(storedResume);

            if (!parsedResume) {
                throw new Error(
                    "Resume data is empty"
                );
            }

            setResumeData(
                parsedResume
            );

            const selectedDifficulty =
                storedDifficulty || "Easy";

            setDifficulty(
                selectedDifficulty
            );

            generateFirstQuestion(
                parsedResume,
                selectedDifficulty
            );

        } catch (error) {
            console.error(
                "INVALID RESUME DATA:",
                error
            );

            sessionStorage.removeItem(
                "resumeData"
            );

            sessionStorage.removeItem(
                "resumeFileName"
            );

            router.push("/dashboard");
        }
    }, [router]);

    const generateFirstQuestion = async (
        resume,
        selectedDifficulty
    ) => {
        try {
            setLoadingFirstQuestion(true);
            const data = await getFirstQuestion(
                resume,
                selectedDifficulty
            );

            console.log(
                "FIRST QUESTION RESPONSE:",
                data
            );

            if (!data?.question) {
                throw new Error(
                    "Backend did not return a question"
                );
            }

            setQuestion(data.question);

        } catch (error) {
            console.error(
                "FIRST QUESTION ERROR:",
                error
            );

            setQuestion(
                "Unable to generate interview question."
            );
            hasStartedRef.current = false;
        } finally {
            setLoadingFirstQuestion(false);
        }
    };

    const submitAnswer = async () => {
        if (!answer.trim() || evaluatingAnswer || generatingNextQuestion) {
            return;
        }
        try {
            setEvaluatingAnswer(true);
            const currentQNum = questionNumber || (history.length + 1);
            const data = await analyzeAnswer(
                question,
                answer,
                difficulty,
                null,
                currentQNum
            );
            const newEvaluation = data.evaluation;
            const nextDiff = newEvaluation?.next_difficulty || difficulty;

            setEvaluation(newEvaluation);
            setDifficulty(nextDiff);

            const updatedHistory = [
                ...history,
                {
                    question,
                    answer,
                    evaluation: newEvaluation,
                },
            ];
            setHistory(updatedHistory);
            setEvaluatingAnswer(false);

            // If 10 questions have been answered, interview is complete!
            if (currentQNum >= 10 || updatedHistory.length >= 10) {
                return;
            }

            // Automatically generate the next question without showing any "Next Question" button
            setGeneratingNextQuestion(true);
            try {
                const nextData = await getNextQuestion(
                    resumeData,
                    updatedHistory,
                    nextDiff,
                    newEvaluation,
                    []
                );

                if (!nextData?.question) {
                    throw new Error("Backend did not return the next question.");
                }

                // Allow 3.5 seconds for candidate to view evaluation and synthesis before displaying next question
                setTimeout(() => {
                    setQuestion(nextData.question);
                    setQuestionNumber((number) => number + 1);
                    setDifficulty(nextDiff);
                    setAnswer("");
                    setEvaluation(null);
                    setGeneratingNextQuestion(false);
                }, 3500);
            } catch (nextError) {
                console.error("Auto next question error:", nextError);
                setGeneratingNextQuestion(false);
                alert(nextError?.message || "Failed to generate next question.");
            }
        } catch (error) {
            console.error("Submit answer error:", error);
            setEvaluatingAnswer(false);
            setGeneratingNextQuestion(false);
            alert(error?.message || "Failed to evaluate your answer.");
        }
    };



    const nextQuestion = async () => {
        try {
            setGeneratingNextQuestion(true);

            const nextDifficulty =
                evaluation?.next_difficulty ||
                difficulty;

            const data = await getNextQuestion(
                resumeData,
                history,
                nextDifficulty,
                evaluation,
                []
            );

            console.log(
                "NEXT QUESTION RESPONSE:",
                data
            );

            if (!data?.question) {
                throw new Error(
                    "Backend did not return the next question."
                );
            }

            setQuestion(
                data.question
            );

            setQuestionNumber(
                (number) => number + 1
            );

            setDifficulty(
                nextDifficulty
            );

            setAnswer("");

            setEvaluation(null);

        } catch (error) {
            console.error(
                "NEXT QUESTION ERROR:",
                error
            );

            alert(
                error?.message ||
                "Failed to generate next question."
            );

        } finally {
            setGeneratingNextQuestion(false);
        }
    };

    const stopInterview = async () => {
        if (history.length < 10) {
            alert(
                `Please answer at least 10 questions before stopping the interview. You have answered ${history.length} question(s).`
            );
            return;
        }

        sessionStorage.setItem(
            "interviewHistory",
            JSON.stringify(history)
        );

        sessionStorage.setItem(
            "resumeData",
            JSON.stringify(resumeData)
        );

        router.push("/report");
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#f8f7ff] text-slate-900">

            <motion.div
                className="pointer-events-none fixed -left-32 -top-32 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl"
                animate={{
                    x: [0, 80, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.15, 1],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            <motion.div
                className="pointer-events-none fixed -right-32 top-40 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl"
                animate={{
                    x: [0, -70, 0],
                    y: [0, 60, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            <motion.div
                className="pointer-events-none fixed bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl"
                animate={{
                    x: [0, 50, 0],
                    y: [0, -70, 0],
                }}
                transition={{
                    duration: 11,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            <motion.header
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl"
            >
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">

                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-black text-white shadow-lg shadow-violet-200 sm:h-10 sm:w-10 sm:text-sm">
                            AI
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base lg:text-lg">
                                AI Interview Preparation
                            </h1>
                            <p className="hidden text-[10px] text-slate-500 sm:block sm:text-xs">
                                Technical Interview
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">

                        

                        <div className="hidden rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-xs shadow-sm sm:block sm:px-4 sm:py-2 sm:text-sm">
                            <span className="text-slate-500">Q </span>
                            <span className="font-semibold text-violet-600">{questionNumber}</span>
                        </div>

                        <div className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
                            <span className="hidden text-slate-500 sm:inline">Difficulty: </span>
                            <span className="font-semibold text-indigo-600">{difficulty}</span>
                        </div>

                        <motion.button
                            onClick={stopInterview}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 sm:px-4 sm:py-2 sm:text-sm"
                        >
                            <span className="hidden sm:inline">Stop Interview</span>
                            <span className="sm:hidden">Stop</span>
                        </motion.button>
                    </div>
                </div>
            </motion.header>

            <div className="relative z-10 mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-10">

                <motion.div
                    initial={{
                        opacity: 0,
                        y: 20,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        duration: 0.6,
                        delay: 0.15,
                    }}
                    className="mb-4 sm:mb-7 rounded-2xl sm:rounded-3xl border border-white/70 bg-white/75 p-4 sm:p-5 shadow-lg backdrop-blur-xl"
                >
                    <div className="mb-2 sm:mb-3 flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium text-slate-600">
                            Interview Progress
                        </span>

                        <span className="font-semibold text-violet-600">
                            Question {questionNumber}
                        </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
                            initial={{
                                width: 0,
                            }}
                            animate={{
                                width: `${Math.min(
                                    questionNumber * 10,
                                    100
                                )}%`,
                            }}
                            transition={{
                                duration: 0.6,
                            }}
                        />
                    </div>

                    <div className="mt-3 flex justify-between text-xs text-slate-400">
                        <span>
                            Question {questionNumber}
                        </span>

                        <span>
                            {Math.min(
                                questionNumber * 10,
                                100
                            )}
                            %
                        </span>
                    </div>
                </motion.div>

                <motion.section
                    initial={{
                        opacity: 0,
                        y: 25,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        duration: 0.6,
                        delay: 0.25,
                    }}
                    whileHover={{
                        y: -2,
                    }}
                    className="rounded-2xl sm:rounded-3xl border border-white/70 bg-white/80 p-4 sm:p-6 md:p-8 shadow-xl backdrop-blur-xl"
                >
                    <div className="mb-4 sm:mb-7 flex items-center gap-3 sm:gap-4">

                      
                        <motion.div
                            animate={{
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                            }}
                            className="flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-xs sm:text-sm font-bold text-white shadow-lg shadow-violet-200"
                        >
                            AI
                        </motion.div>

                        <div>
                            <p className="text-sm sm:text-base font-semibold text-slate-900">
                                AI Interviewer
                            </p>

                            <p className="text-xs sm:text-sm text-slate-500">
                                Technical Interview
                            </p>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {loadingFirstQuestion ? (
                            <motion.div
                                key="loading-first"
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                className="rounded-xl sm:rounded-2xl overflow-hidden relative"
                                style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e1b4b 100%)" }}
                            >
                                <motion.div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ background: "linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.12) 50%, transparent 100%)", height: "200%" }}
                                    animate={{ y: ["-100%", "0%"] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                />

                                <div className="relative z-10 p-5 sm:p-7">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

                                        <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                                            <motion.div
                                                className="absolute inset-0 rounded-full border-2 border-violet-500/30"
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                            >
                                                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-violet-400 shadow-[0_0_8px_3px_rgba(167,139,250,0.6)]" />
                                            </motion.div>
                                            <motion.div
                                                className="absolute inset-3 rounded-full border-2 border-indigo-400/40"
                                                animate={{ rotate: -360 }}
                                                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                            >
                                                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-300 shadow-[0_0_6px_2px_rgba(129,140,248,0.7)]" />
                                            </motion.div>
                                            <motion.div
                                                className="absolute inset-6 rounded-full bg-violet-600 flex items-center justify-center shadow-[0_0_20px_6px_rgba(139,92,246,0.4)]"
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                            >
                                                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                            </motion.div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="text-sm sm:text-base font-bold text-violet-100 tracking-wide">
                                                    Generating Question 
                                                </span>
                                               
                                                <motion.span
                                                    className="inline-block w-0.5 h-4 bg-violet-400 rounded"
                                                    animate={{ opacity: [1, 0, 1] }}
                                                    transition={{ duration: 0.8, repeat: Infinity }}
                                                />
                                            </div>
                                            

                                           
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="question-content"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="rounded-xl sm:rounded-2xl border border-violet-100 bg-violet-50/60 p-4 sm:p-6"
                            >
                                <p className="mb-2 sm:mb-3 text-xs font-semibold uppercase tracking-wider text-violet-500">
                                    Interview Question
                                </p>

                                <h2 className="text-base sm:text-xl font-semibold leading-relaxed text-slate-800 md:text-2xl">
                                    {question}
                                </h2>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.section>

                <motion.section
                    initial={{
                        opacity: 0,
                        y: 25,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        duration: 0.6,
                        delay: 0.35,
                    }}
                    className="mt-4 sm:mt-6 rounded-2xl sm:rounded-3xl border border-white/70 bg-white/80 p-4 sm:p-6 md:p-8 shadow-xl backdrop-blur-xl"
                >
                    <div className="mb-3 sm:mb-4 flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-800">
                            Your Answer
                        </label>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                            {answer.length} characters
                        </span>
                    </div>

                    <textarea
                        value={answer}
                        onChange={(e) =>
                            setAnswer(e.target.value)
                        }
                        disabled={!!evaluation}
                        placeholder="Type your answer here..."
                        className="min-h-[150px] sm:min-h-[220px] w-full resize-none rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                    {!evaluation && (
                        <>
                            <AnimatePresence>
                                {evaluatingAnswer && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        className="mt-4 sm:mt-5 rounded-xl sm:rounded-2xl overflow-hidden relative"
                                        style={{ background: "linear-gradient(135deg, #0c0a1e 0%, #0f172a 60%, #140c2a 100%)" }}
                                    >
                                        <motion.div
                                            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                                            style={{ background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.9), transparent)", boxShadow: "0 0 12px 4px rgba(139,92,246,0.5)" }}
                                            animate={{ y: [0, 80, 0] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        />

                                       
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                onClick={submitAnswer}
                                disabled={
                                    evaluatingAnswer ||
                                    generatingNextQuestion ||
                                    loadingFirstQuestion ||
                                    !answer.trim()
                                }
                                whileHover={{
                                    scale: evaluatingAnswer ? 1 : 1.01,
                                }}
                                whileTap={{
                                    scale: evaluatingAnswer ? 1 : 0.98,
                                }}
                                className={`mt-4 sm:mt-5 w-full rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 sm:px-6 sm:py-4 text-sm sm:text-base font-semibold text-white shadow-lg shadow-violet-200 transition hover:from-violet-500 hover:to-indigo-500 flex items-center justify-center gap-2 ${
                                    evaluatingAnswer ? "opacity-90 ring-2 ring-violet-400/60 cursor-wait animate-pulse" : "disabled:cursor-not-allowed disabled:opacity-40"
                                }`}
                            >
                                {evaluatingAnswer ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                                        <span>Evaluating Answer...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Submit Answer</span>
                                        <Send className="w-4 h-4" />
                                    </>
                                )}
                            </motion.button>
                        </>
                    )}
                </motion.section>

                {/* Evaluation */}
                <AnimatePresence>
                    {evaluation && (
                        <motion.section
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="mt-6 rounded-2xl sm:rounded-3xl border border-white/80 bg-white/90 p-5 sm:p-7 md:p-8 shadow-xl backdrop-blur-xl"
                        >
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200">
                                        <Brain size={22} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-violet-600">
                                                AI Answer Evaluation
                                            </span>
                                            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">
                                                Q{questionNumber}
                                            </span>
                                        </div>
                                        <h3 className="mt-0.5 text-lg sm:text-xl font-bold text-slate-900">
                                            Performance Assessment
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-3.5 py-1.5 text-center">
                                        <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                                            Next Difficulty
                                        </span>
                                        <span className="text-sm font-bold text-indigo-700">
                                            {evaluation.next_difficulty || difficulty}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 px-5 py-2.5 text-white shadow-md shadow-violet-200">
                                        <div className="text-center">
                                            <span className="text-xl font-black">
                                                {evaluation.score ?? 0}
                                            </span>
                                            <span className="text-xs font-medium text-violet-200">
                                                /10
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Evaluation Feedback */}
                            {evaluation.evaluation && (
                                <div className="mb-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Interviewer Analysis
                                    </p>
                                    <p className="text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                                        {evaluation.evaluation}
                                    </p>
                                </div>
                            )}

                            {/* Strengths and Weaknesses Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                {/* Strengths */}
                                {Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0 && (
                                    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 sm:p-5">
                                        <div className="flex items-center gap-2 mb-3 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                                            <CheckCircle2 size={16} className="text-emerald-600" />
                                            <span>Key Strengths</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {evaluation.strengths.map((str, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs text-emerald-900 leading-relaxed">
                                                    <span className="text-emerald-600 font-bold">•</span>
                                                    <span>{str}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Weaknesses */}
                                {Array.isArray(evaluation.weaknesses) && evaluation.weaknesses.length > 0 && (
                                    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 sm:p-5">
                                        <div className="flex items-center gap-2 mb-3 text-amber-800 font-bold text-xs uppercase tracking-wider">
                                            <AlertCircle size={16} className="text-amber-600" />
                                            <span>Areas for Improvement</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {evaluation.weaknesses.map((w, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs text-amber-900 leading-relaxed">
                                                    <span className="text-amber-600 font-bold">•</span>
                                                    <span>{w}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Authoritative Reference Answer */}
                            {evaluation.correct_answer && (
                                <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 to-violet-50/50 p-4 sm:p-5 mb-5">
                                    <div className="flex items-center gap-2 mb-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                                        <BookOpen size={16} className="text-indigo-600" />
                                        <span>Ideal / Ground-Truth Reference Answer</span>
                                    </div>
                                    <p className="text-xs sm:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
                                        {evaluation.correct_answer}
                                    </p>
                                </div>
                            )}

                            {/* Completion State or Next Question Synthesis Indicator */}
                            {questionNumber >= 10 || history.length >= 10 ? (
                                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center">
                                    <h4 className="text-base font-bold text-emerald-900">
                                        Technical Interview Complete! (10/10 Questions Answered)
                                    </h4>
                                    <p className="mt-1 text-xs text-emerald-700">
                                        You have successfully completed the full technical assessment.
                                    </p>
                                    <button
                                        onClick={stopInterview}
                                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700"
                                    >
                                        <span>Generate & View Complete Report</span>
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            ) : (
                                generatingNextQuestion && (
                                    <div className="mt-4 rounded-2xl overflow-hidden relative p-4 text-center" style={{ background: "linear-gradient(135deg, #0a0a1f 0%, #0f172a 50%, #0d0a20 100%)" }}>
                                        <div className="flex items-center justify-center gap-3 text-indigo-200 text-xs sm:text-sm font-semibold">
                                            <Loader2 size={18} className="animate-spin text-indigo-400" />
                                            <span>Synthesizing Question #{questionNumber + 1} ({evaluation.next_difficulty || difficulty})...</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Adapting to your performance · Loading next question automatically
                                        </p>
                                    </div>
                                )
                            )}
                        </motion.section>
                    )}
                </AnimatePresence>
                

                
            </div>
        </main>
    );
}