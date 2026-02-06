import { useNavigate, useRouteError } from "react-router-dom";
import { useEffect, useState } from "react";

function Error() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  let message: string;

  if (error instanceof Error) {
    message = (error as Error).message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = "Unknown error";
  }

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-gray-900 via-black to-emerald-950 overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div
        className={`relative z-10 flex flex-col items-center gap-8 transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        {/* Error Icon with glow effect */}
        <div className="relative">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-emerald-600/20 flex items-center justify-center backdrop-blur-sm border-2 border-emerald-500/30">
            <svg
              className="w-16 h-16 md:w-20 md:h-20 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="absolute inset-0 w-32 h-32 md:w-40 md:h-40 rounded-full bg-emerald-500 blur-3xl opacity-30 animate-pulse"></div>
        </div>

        {/* Message */}
        <div className="text-center space-y-4 px-4 max-w-2xl">
          <h1 className="font-bold text-4xl md:text-5xl text-emerald-400 drop-shadow-lg">
            عذراً، حدث خطأ
          </h1>
          <p className="font-semibold text-xl md:text-2xl text-gray-300">
            Something went wrong
          </p>

          {/* Error message box */}
          <div className="mt-6 bg-emerald-950/40 backdrop-blur-sm border border-emerald-700/30 rounded-xl p-6 max-w-xl mx-auto">
            <p className="font-mono text-sm md:text-base text-emerald-300 break-words">
              {message}
            </p>
          </div>

          <p className="text-gray-400 text-sm md:text-base mt-4">
            نعتذر عن الإزعاج، يرجى المحاولة مرة أخرى
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <button
            onClick={() => navigate("/")}
            className="group relative cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/50"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg
                className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              العودة للرئيسية
            </span>
            <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="group relative cursor-pointer bg-transparent hover:bg-emerald-600/20 text-emerald-400 font-semibold px-8 py-3 rounded-full border-2 border-emerald-600/50 hover:border-emerald-500 transition-all duration-300 hover:scale-105"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg
                className="w-5 h-5 transform group-hover:rotate-180 transition-transform duration-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              إعادة المحاولة
            </span>
          </button>
        </div>

        {/* Decorative elements */}
        <div className="flex gap-2 mt-8">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-100"></div>
          <div className="w-2 h-2 rounded-full bg-emerald-300 animate-bounce delay-200"></div>
        </div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
    </div>
  );
}

export default Error;
