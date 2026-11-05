
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfilePage, getUserQueries } from "../../lib/api";
import UserQueryModal from "../components/UserQueryModal";
import { motion, AnimatePresence } from "framer-motion";

import {
  Brain,
  User,
  LogOut,
  FileText,
  Code2,
  BarChart3,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
  Code,
  MessageSquare,
  Lightbulb,
  MessageSquarePlus,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Send,
  Calendar,
  ChevronRight,
  Check,
  Gauge,
  TrendingUp,
  Zap,
  Award,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);


  const [report, setReport] = useState({
    overall_score: null,
    technical_score: null,
    skills_score: null,
    projects_score: null,
    experience_score: null,
    final_level: null,
    created_at: null,
  });

  const [hasReport, setHasReport] = useState(false);

  

  const [codingReport, setCodingReport] = useState({
    overall_score: null,
    correctness_score: null,
    code_quality_score: null,
    explanation_score: null,
    problem_solving_score: null,
    time_complexity: null,
    space_complexity: null,
    feedback: null,
    strengths: null,
    improvements: null,
    difficulty: null,
    language: null,
    created_at: null,
  });

  const [hasCodingReport, setHasCodingReport] = useState(false);

  
  const [queries, setQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [queryFilter, setQueryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUserQueries(uid) {
    try {
      setLoadingQueries(true);
      const res = await getUserQueries(uid);
      if (res && res.success) {
        setQueries(res.queries || []);
      }
    } catch (err) {
      console.warn("Could not load user queries:", err);
    } finally {
      setLoadingQueries(false);
    }
  }

  

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setError("User session not found. Please login again.");
        setLoading(false);
        return;
      }

      const userData = JSON.parse(storedUser);

      if (!userData.id) {
        setError("User ID not found in login session.");
        setLoading(false);
        return;
      }

      setUser(userData);

      const userId = Number(userData.id);

      if (!Number.isInteger(userId)) {
        setError("Invalid user ID.");
        setLoading(false);
        return;
      }

      console.log("Logged-in User ID:", userId);

     
      loadUserQueries(userId);

      const data = await getProfilePage(userId);

      console.log("Dashboard API response:", data);

      if (!data || !data.success) {
        setHasReport(false);
        setHasCodingReport(false);
        return;
      }

      

      setHasReport(
        Boolean(data.has_previous_report)
      );

      if (data.report) {
        setReport(data.report);
      }

      

      let codingRep = data.coding_report || null;
      let hasCoding = Boolean(data.has_previous_coding_report && data.coding_report);

      if (!codingRep && typeof window !== "undefined") {
        const storedCodingReport = sessionStorage.getItem("codingReport");
        if (storedCodingReport) {
          try {
            codingRep = JSON.parse(storedCodingReport);
            hasCoding = true;
          } catch (e) {
            console.error("Error parsing stored coding report:", e);
          }
        }
      }

      if (codingRep) {
        if (!codingRep.difficulty || codingRep.difficulty === "-") {
          codingRep.difficulty = (typeof window !== "undefined" ? sessionStorage.getItem("difficulty") : null) || "Easy";
        }
        if (!codingRep.language || codingRep.language === "-") {
          codingRep.language = "Python";
        }
        setCodingReport(codingRep);
        setHasCodingReport(true);
      } else {
        setHasCodingReport(false);
      }

    } catch (error) {
      console.error("Dashboard error:", error);

      setError(
        error.message || "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleStartInterview = () => {
    router.push("/dashboard");
  };

 

  function displayValue(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "-";
    }

    return value;
  }

  function parseScoreValue(val) {
    if (val === null || val === undefined || val === "" || val === "-") return 0;
    if (typeof val === "string") {
      if (val.includes("/")) {
        const parts = val.split("/");
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (!isNaN(num) && !isNaN(den) && den > 0) return Math.min(100, Math.round((num / den) * 100));
      }
      const clean = parseFloat(val.replace(/[^0-9.]/g, ""));
      if (isNaN(clean)) return 0;
      if (clean <= 10) return Math.min(100, Math.round(clean * 10));
      return Math.min(100, Math.round(clean));
    }
    if (typeof val === "number") {
      if (val <= 10) return Math.min(100, Math.round(val * 10));
      return Math.min(100, Math.round(val));
    }
    return 0;
  }

  const techOverallScore = parseScoreValue(report?.overall_score);
  const codingOverallScore = parseScoreValue(codingReport?.overall_score);

  let combinedPerformanceScore = 0;
  if (hasReport && hasCodingReport) {
    combinedPerformanceScore = Math.round((techOverallScore + codingOverallScore) / 2);
  } else if (hasReport) {
    combinedPerformanceScore = techOverallScore;
  } else if (hasCodingReport) {
    combinedPerformanceScore = codingOverallScore;
  }

  const getPerformanceTier = (score, hasAny) => {
    if (!hasAny) {
      return {
        label: "Ready to Calibrate",
        desc: "Complete your first interview to generate your live performance rating.",
        color: "text-slate-600 bg-slate-100 border-slate-200",
        badge: "bg-slate-100 text-slate-700",
        gradient: "from-slate-400 to-slate-500",
      };
    }
    if (score >= 85) {
      return {
        label: "Expert Mastery",
        desc: "Exceptional technical proficiency and algorithm problem-solving abilities.",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        badge: "bg-emerald-100 text-emerald-800",
        gradient: "from-emerald-500 to-teal-600",
      };
    }
    if (score >= 70) {
      return {
        label: "Strong Proficiency",
        desc: "Solid technical foundations and dependable coding execution.",
        color: "text-indigo-700 bg-indigo-50 border-indigo-200",
        badge: "bg-indigo-100 text-indigo-800",
        gradient: "from-violet-600 to-indigo-600",
      };
    }
    if (score >= 50) {
      return {
        label: "Intermediate Competency",
        desc: "Good fundamentals with clear opportunities to refine advanced patterns.",
        color: "text-amber-700 bg-amber-50 border-amber-200",
        badge: "bg-amber-100 text-amber-800",
        gradient: "from-amber-500 to-orange-500",
      };
    }
    return {
      label: "Foundational / Developing",
      desc: "Focus on continuous practice and core system design concepts.",
      color: "text-rose-700 bg-rose-50 border-rose-200",
      badge: "bg-rose-100 text-rose-800",
      gradient: "from-rose-500 to-red-600",
    };
  };

  const performanceTier = getPerformanceTier(combinedPerformanceScore, hasReport || hasCodingReport);

  

  function handleLogout() {
    localStorage.removeItem("user");

    sessionStorage.removeItem("resumeData");
    sessionStorage.removeItem("resumeFileName");
    sessionStorage.removeItem("difficulty");
    sessionStorage.removeItem("codingReport");

    router.push("/");
  }

 

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f7ff]">

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
          initial={{
            opacity: 0,
            scale: 0.9,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          className="relative z-10 rounded-2xl border border-slate-800 bg-slate-900 px-10 py-8 shadow-2xl"
        >
          <div className="flex items-center gap-4">

            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
              className="h-8 w-8 rounded-full border-4 border-slate-700 border-t-violet-500"
            />

            <p className="text-lg font-semibold text-white">
              Loading Dashboard...
            </p>

          </div>
        </motion.div>

      </main>
    );
  }

 
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7ff]">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading your profile...
          </p>

        </div>

      </main>
    );
  }

  const firstName =
    user.name?.split(" ")[0] || "User";

 

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f7ff]">

     

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
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl"
      >
          <div className="mx-auto flex min-h-[64px] w-full max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-4 lg:px-8">

          
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">

              <motion.div
                whileHover={{ rotate: 5, scale: 1.05 }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-violet-200 sm:h-10 sm:w-10 sm:text-sm"
              >
                AI
              </motion.div>

            
              <div className="min-w-0">

                <h1 className="truncate text-xs font-bold text-slate-900 sm:text-sm md:text-base lg:text-lg">
                  AI Interview
                </h1>

                <p className="hidden text-[10px] text-slate-500 sm:block md:text-xs">
                  Preparation Platform
                </p>

              </div>

            </div>


          

            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 md:gap-3">

             
              <button
                type="button"
                onClick={() => router.push("/history")}
                className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50/80 px-2 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 shadow-sm sm:px-3"
              >
                <span className="hidden sm:inline">Interview History</span>
                <span className="sm:hidden text-violet-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                </span>
              </button>

              <div className="min-w-0 max-w-[90px] text-right sm:max-w-[150px] md:max-w-[220px] lg:max-w-[280px]">

               
                <p className="truncate text-[11px] font-bold text-slate-800 sm:text-sm md:text-base">
                  {user?.name || "User"}
                </p>

               
                <p className="hidden truncate text-[9px] text-slate-500 sm:block sm:text-xs md:text-sm">
                  {user?.email || ""}
                </p>

              </div>


             

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 sm:h-10 sm:w-10 md:h-11 md:w-11"
              >
                <User size={18} className="sm:h-5 sm:w-5" />
              </motion.div>


             

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-600 sm:h-10 sm:w-10"
                title="Logout"
              >
                <LogOut size={17} className="sm:h-[19px] sm:w-[19px]" />
              </motion.button>

            </div>

          </div>
      </motion.header>

     

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">

       

        <motion.section
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white shadow-xl shadow-violet-200 md:p-10"
        >
         
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

          <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

         
          <div className="relative max-w-3xl">

           
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} />

              AI INTERVIEW PREPARATION
            </div>

           
            <h2 className="mt-5 text-3xl font-extrabold md:text-4xl">
              Welcome back, {firstName}!
            </h2>

           
            <p className="mt-4 max-w-2xl leading-7 text-violet-100">
              Practice technical and coding interviews with AI
              and receive personalized feedback based on your
              performance.
            </p>

           
            <button
              onClick={handleStartInterview}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-violet-700 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-violet-50 hover:shadow-xl active:translate-y-0"
            >
              Start Interview
              <ArrowRight size={18} />
            </button>

          </div>
        </motion.section>


        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            icon={FileText}
            title="Resume"
            value="Ready"
            description="Upload your resume"
          />

          <StatCard
            icon={Brain}
            title="AI Interview"
            value="Available"
            description="Adaptive questions"
          />

          <StatCard
            icon={Code2}
            title="Coding"
            value="Available"
            description="Practice coding"
          />

          <StatCard
            icon={BarChart3}
            title="Reports"
            value={
              hasReport || hasCodingReport
                ? "Updated"
                : "Track"
            }
            description="View performance"
          />

        </section>

       
        <motion.section
          id="performance-meter-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-6 sm:mt-10 rounded-2xl sm:rounded-3xl border border-white/70 bg-white/75 p-4 sm:p-6 md:p-8 shadow-xl backdrop-blur-xl"
        >
         
          <div className="flex flex-col justify-between gap-3 sm:gap-4 md:flex-row md:items-center border-b border-slate-100 pb-4 sm:pb-6">
            <div>
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200 shrink-0">
                  <Gauge size={18} />
                </span>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
                  Candidate Performance 
                </h2>
              </div>
              <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-500 ml-10 sm:ml-0">
                Aggregate assessment reflecting proficiency across technical and coding challenges.
              </p>
            </div>

            <div className="flex items-center gap-3 ml-10 sm:ml-0">
              <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${performanceTier.color}`}>
                <Zap size={13} className="fill-current" />
                <span>{performanceTier.label}</span>
              </span>
            </div>
          </div>

         
          <div className="mt-5 sm:mt-7 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">

           
            <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white p-4 sm:p-6 flex flex-col items-center justify-between text-center relative overflow-hidden shadow-sm">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-500" />
              
              <div className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <span>Overall Mastery Meter</span>
                <span className="font-mono">{hasReport || hasCodingReport ? `${combinedPerformanceScore}/100` : "Ready"}</span>
              </div>

             
              <div className="relative w-48 h-28 sm:w-64 sm:h-36 my-2 flex items-end justify-center">
                <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
                  
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                 
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="url(#meterGradient)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * Math.min(combinedPerformanceScore, 100)) / 100}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="40%" stopColor="#f59e0b" />
                      <stop offset="75%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                 
                  <g transform={`rotate(${hasReport || hasCodingReport ? -90 + (combinedPerformanceScore / 100) * 180 : -90}, 100, 100)`} className="transition-transform duration-1000 ease-out">
                    <line x1="100" y1="100" x2="100" y2="30" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
                    <polygon points="97,35 100,24 103,35" fill="#1e293b" />
                  </g>
                  
                  <circle cx="100" cy="100" r="9" fill="#0f172a" />
                  <circle cx="100" cy="100" r="4" fill="#a78bfa" />
                </svg>

               
                <div>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {hasReport || hasCodingReport ? `${combinedPerformanceScore}%` : "--"}
                  </span>
                </div>
              </div>

              
              <div className="mt-2 sm:mt-3 w-full">
                <p className="text-xs font-medium text-slate-500 leading-relaxed px-2 sm:px-4">
                  {performanceTier.desc}
                </p>

               
                <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />0–49% Dev</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />50–69% Mid</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />70–84% Pro</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />85%+ Expert</span>
                </div>
              </div>
            </div>

           
            <div className="lg:col-span-7 flex flex-col justify-between gap-3 sm:gap-4">

              
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
                <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 font-bold">
                      <Brain size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        Technical Interview
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight hidden sm:block">
                        Evaluated conceptual clarity, project knowledge, and domain answers
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base sm:text-lg font-bold text-violet-700">
                      {hasReport ? `${techOverallScore}%` : "Not Taken"}
                    </span>
                    {hasReport && report.final_level && (
                      <p className="text-[10px] text-slate-500 font-medium">Level: {report.final_level}</p>
                    )}
                  </div>
                </div>

                
                <div className="h-2.5 sm:h-3 w-full rounded-full bg-slate-100 overflow-hidden mb-3">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${hasReport ? Math.min(techOverallScore, 100) : 0}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>

                
                {hasReport ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px]">Technical</span>
                      <p className="font-bold text-slate-800">{displayValue(report.technical_score)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Skills</span>
                      <p className="font-bold text-slate-800">{displayValue(report.skills_score)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Projects</span>
                      <p className="font-bold text-slate-800">{displayValue(report.projects_score)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Experience</span>
                      <p className="font-bold text-slate-800">{displayValue(report.experience_score)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Take the 10-question technical interview to unlock this performance gauge.
                  </p>
                )}
              </div>

              
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
                <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold">
                      <Code2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        Coding Assessment
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight hidden sm:block">
                        Evaluated algorithmic correctness, code quality, and time complexity
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base sm:text-lg font-bold text-indigo-700">
                      {hasCodingReport ? `${codingOverallScore}%` : "Not Taken"}
                    </span>
                    {hasCodingReport && codingReport.difficulty && (
                      <p className="text-[10px] text-slate-500 font-medium">Difficulty: {codingReport.difficulty}</p>
                    )}
                  </div>
                </div>

               
                <div className="h-2.5 sm:h-3 w-full rounded-full bg-slate-100 overflow-hidden mb-3">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${hasCodingReport ? Math.min(codingOverallScore, 100) : 0}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>

               
                {hasCodingReport ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px]">Correctness</span>
                      <p className="font-bold text-slate-800">{displayValue(codingReport.correctness_score)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Code Quality</span>
                      <p className="font-bold text-slate-800">{displayValue(codingReport.code_quality_score)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Problem Solving</span>
                      <p className="font-bold text-slate-800">{displayValue(codingReport.problem_solving_score)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Language</span>
                      <p className="font-bold text-slate-800">{displayValue(codingReport.language)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Complete your interactive coding interview to populate this performance gauge.
                  </p>
                )}
              </div>

            </div>

          </div>
        </motion.section>

       

        <ReportSection
          title="Previous Technical Interview Report"
          subtitle={
            hasReport
              ? "Your latest technical interview performance"
              : "Complete a technical interview to generate your report"
          }
          completed={hasReport}
        >

          {!hasReport ? (

           

            <EmptyReport
              icon={Brain}
              title="No Technical Interview Yet"
              description="Attend your first AI technical interview to generate your personalized technical performance report."
              buttonText="Start Technical Interview"
              onClick={() =>
                router.push("/dashboard")
              }
            />

          ) : (

           

            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

                <ReportCard
                  icon={Target}
                  title="Overall Score"
                  value={displayValue(
                    report.overall_score
                  )}
                />

                <ReportCard
                  icon={Brain}
                  title="Technical Score"
                  value={displayValue(
                    report.technical_score
                  )}
                />

                <ReportCard
                  icon={Lightbulb}
                  title="Skills Score"
                  value={displayValue(
                    report.skills_score
                  )}
                />

                <ReportCard
                  icon={Code}
                  title="Projects Score"
                  value={displayValue(
                    report.projects_score
                  )}
                />

                <ReportCard
                  icon={FileText}
                  title="Experience Score"
                  value={displayValue(
                    report.experience_score
                  )}
                />

                <ReportCard
                  icon={BarChart3}
                  title="Final Level"
                  value={displayValue(
                    report.final_level
                  )}
                />

              </div>

              {report.created_at && (
                <ReportDate
                  date={report.created_at}
                />
              )}
            </>

          )}

        </ReportSection>

       
        <ReportSection
          title="Previous Coding Interview Report"
          subtitle={
            hasCodingReport
              ? "Your latest coding interview performance"
              : "Complete a coding interview to generate your report"
          }
          completed={hasCodingReport}
        >

          {!hasCodingReport ? (

           
            <EmptyReport
              icon={Code2}
              title="No Coding Interview Yet"
              description="Attend your first AI coding interview to generate your personalized coding performance report."
              buttonText="Start Coding Interview"
              onClick={() => {
                const storedResume = typeof window !== "undefined" ? sessionStorage.getItem("resumeData") : null;
                if (!storedResume) {
                  router.push("/dashboard");
                } else {
                  router.push("/coding-interview");
                }
              }}
            />

          ) : (

            
            <>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

                <CodingReportCard
                  icon={Target}
                  title="Overall Score"
                  value={displayValue(
                    codingReport.overall_score
                  )}
                />

                <CodingReportCard
                  icon={CheckCircle2}
                  title="Correctness"
                  value={displayValue(
                    codingReport.correctness_score
                  )}
                />

                <CodingReportCard
                  icon={Code}
                  title="Code Quality"
                  value={displayValue(
                    codingReport.code_quality_score
                  )}
                />

                <CodingReportCard
                  icon={MessageSquare}
                  title="Explanation"
                  value={displayValue(
                    codingReport.explanation_score
                  )}
                />

                <CodingReportCard
                  icon={Lightbulb}
                  title="Problem Solving"
                  value={displayValue(
                    codingReport.problem_solving_score
                  )}
                />

                <CodingReportCard
                  icon={BarChart3}
                  title="Difficulty"
                  value={displayValue(
                    codingReport.difficulty
                  )}
                />

              </div>

              {/* CODING INFORMATION */}

              <div className="mt-6 grid gap-5 md:grid-cols-3">

                <InfoCard
                  icon={Code}
                  title="Programming Language"
                  value={displayValue(
                    codingReport.language
                  )}
                />

                

              </div>

              {codingReport.created_at && (
                <ReportDate
                  date={codingReport.created_at}
                />
              )}

            </>

          )}

        </ReportSection>

       
        <motion.section
          id="concerns-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-10 rounded-3xl border border-white/70 bg-white/75 p-7 shadow-xl backdrop-blur-xl md:p-8"
        >
        
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <MessageSquarePlus size={18} />
                </span>
                <h2 className="text-2xl font-bold text-slate-900">
                  My Raised Concerns & Support Queries
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Track real-time resolution status and official administrative replies for issues or report questions you submitted.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => user?.id && loadUserQueries(user.id)}
                disabled={loadingQueries}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 shadow-sm"
                title="Refresh concern status"
              >
                <RefreshCw size={14} className={loadingQueries ? "animate-spin text-violet-600" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQueryModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700"
              >
                <MessageSquarePlus size={15} />
                <span>+ Raise New Concern</span>
              </button>
            </div>
          </div>

          
          {queries.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "All Concerns", count: queries.length },
                { id: "pending", label: "Pending", count: queries.filter((q) => (q.status || "").toLowerCase() === "pending").length, color: "text-amber-600 bg-amber-50 border-amber-200" },
                { id: "in review", label: "In Review", count: queries.filter((q) => (q.status || "").toLowerCase() === "in review").length, color: "text-blue-600 bg-blue-50 border-blue-200" },
                { id: "resolved", label: "Resolved", count: queries.filter((q) => (q.status || "").toLowerCase() === "resolved").length, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setQueryFilter(f.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition border ${queryFilter === f.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${f.color || "bg-slate-100 text-slate-600"}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          
          {queries.length === 0 ? (
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-indigo-50/60 p-8 text-center sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-md">
                <MessageSquare size={26} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No Queries or Concerns Raised Yet
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
                Have questions about your technical interview score, coding sandbox execution, or encountered a platform bug? Raise a query and our team will inspect and respond promptly.
              </p>
              <button
                type="button"
                onClick={() => setIsQueryModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700"
              >
                <MessageSquarePlus size={16} />
                <span>Submit Your First Query</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {queries
                .filter((q) => queryFilter === "all" || (q.status || "").toLowerCase() === queryFilter.toLowerCase())
                .map((q) => {
                  const statusNorm = (q.status || "").toLowerCase();
                  const isResolved = statusNorm === "resolved";
                  const isInReview = statusNorm === "in review";

                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`overflow-hidden rounded-2xl border transition hover:shadow-md ${isResolved
                          ? "border-emerald-200/80 bg-white"
                          : isInReview
                            ? "border-blue-200/80 bg-white"
                            : "border-slate-200 bg-white"
                        }`}
                    >
                     
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-violet-700">
                            Concern #{q.id}
                          </span>
                          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
                            {q.category}
                          </span>
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${q.urgency === "High"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : q.urgency === "Medium"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                          >
                            {q.urgency} Urgency
                          </span>
                        </div>

                       
                        <div className="flex items-center gap-2">
                          {isResolved ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              <CheckCircle2 size={13} />
                              <span>Resolved</span>
                            </span>
                          ) : isInReview ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                              <RefreshCw size={13} className="animate-spin" />
                              <span>Under Review</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                              <Clock size={13} />
                              <span>Pending Admin Review</span>
                            </span>
                          )}
                        </div>
                      </div>

                     
                      <div className="p-5 sm:p-6 space-y-4">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 sm:text-lg">
                            {q.subject}
                          </h4>
                          <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            {q.description}
                          </p>
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                            <Calendar size={12} />
                            <span>Submitted: {q.created_at ? new Date(q.created_at).toLocaleString() : ""}</span>
                          </div>
                        </div>

                        
                        {q.admin_response ? (
                          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                  <ShieldCheck size={14} />
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                                  Official Administration Response & Resolution
                                </span>
                              </div>
                              {q.admin_updated_at && (
                                <span className="text-[10px] text-emerald-700 font-mono">
                                  Updated: {new Date(q.admin_updated_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="mt-3 text-xs leading-relaxed text-slate-800 sm:text-sm whitespace-pre-wrap font-sans">
                              {q.admin_response}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs text-slate-500 flex items-center gap-2">
                            <Clock size={14} className="text-amber-500 shrink-0" />
                            <span>
                              Awaiting response. Our support administration will inspect your query and post resolution details here.
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </motion.section>

      </div>

      
      <UserQueryModal
        isOpen={isQueryModalOpen}
        onClose={() => setIsQueryModalOpen(false)}
        onQuerySubmitted={() => {
          if (user?.id) loadUserQueries(user.id);
        }}
      />

    </main>
  );
}



function ReportSection({
  title,
  subtitle,
  completed,
  children,
}) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 30,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.6,
      }}
      className="mt-10 rounded-3xl border border-white/70 bg-white/75 p-7 shadow-xl backdrop-blur-xl md:p-8"
    >

      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div>

          <h2 className="text-2xl font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-slate-500">
            {subtitle}
          </p>

        </div>

        {completed && (
          <span className="w-fit rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-600">
            ✓ Completed
          </span>
        )}

      </div>

      {children}

    </motion.section>
  );
}



function EmptyReport({
  icon: Icon,
  title,
  description,
  buttonText,
  onClick,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-10 text-center"
    >

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-violet-600 shadow-md">

        <Icon size={30} />

      </div>

      <h3 className="mt-5 text-xl font-bold text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-slate-500">
        {description}
      </p>

      <motion.button
        whileHover={{
          scale: 1.03,
        }}
        whileTap={{
          scale: 0.97,
        }}
        onClick={onClick}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/20"
      >

        {buttonText}

        <ArrowRight size={18} />

      </motion.button>

    </motion.div>
  );
}



function ReportCard({
  icon: Icon,
  title,
  value,
}) {
  return (
    <motion.div
      whileHover={{
        y: -5,
        scale: 1.01,
      }}
      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 transition-shadow hover:shadow-lg"
    >

      <div className="flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <Icon size={20} />
        </div>

        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />

      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>

    </motion.div>
  );
}



function CodingReportCard({
  icon: Icon,
  title,
  value,
}) {
  return (
    <motion.div
      whileHover={{
        y: -5,
        scale: 1.01,
      }}
      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 transition-shadow hover:shadow-lg"
    >

      <div className="flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <Icon size={20} />
        </div>

        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />

      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>

    </motion.div>
  );
}



function InfoCard({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <Icon size={19} />
        </div>

        <div>

          <p className="text-xs font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-1 font-bold text-slate-900">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}



function FeedbackBox({
  title,
  value,
}) {
  return (
    <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/60 p-6">

      <h3 className="font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
        {value}
      </p>

    </div>
  );
}



function ReportDate({
  date,
}) {
  return (
    <div className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-500">

      Interview Completed:{" "}

      <span className="font-medium text-slate-700">
        {new Date(date).toLocaleString()}
      </span>

    </div>
  );
}



function StatCard({
  icon: Icon,
  title,
  value,
  description,
}) {
  return (
    <motion.div
      whileHover={{
        y: -4,
      }}
      className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-lg"
    >

      <div className="flex items-center justify-between">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <Icon size={21} />
        </div>

        <CheckCircle2
          size={18}
          className="text-green-500"
        />

      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-xl font-extrabold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </motion.div>
  );
}



function InterviewCard({
  icon: Icon,
  title,
  description,
  features,
  buttonText,
  onClick,
}) {
  return (
    <motion.div
      whileHover={{
        y: -5,
      }}
      className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm transition hover:shadow-xl"
    >

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">

        <Icon size={27} />

      </div>

      <h4 className="mt-6 text-2xl font-extrabold text-slate-900">
        {title}
      </h4>

      <p className="mt-3 leading-7 text-slate-600">
        {description}
      </p>

      <div className="mt-6 space-y-3">

        {features.map((feature) => (
          <div
            key={feature}
            className="flex items-center gap-3 text-sm font-medium text-slate-600"
          >

            <CheckCircle2
              size={17}
              className="shrink-0 text-violet-600"
            />

            {feature}

          </div>
        ))}

      </div>

      <button
        onClick={onClick}
        className="group mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 font-bold text-white shadow-lg shadow-violet-100 transition hover:-translate-y-0.5 hover:shadow-xl"
      >

        {buttonText}

        <ArrowRight
          size={18}
          className="transition-transform group-hover:translate-x-1"
        />

      </button>

    </motion.div>
  );
}