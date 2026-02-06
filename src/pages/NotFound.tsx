import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function NotFound() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        {/* 404 Number with glow effect */}
        <div className="relative">
          <h1 className="font-black text-[8rem] md:text-[16rem] text-emerald-500 leading-none tracking-tight drop-shadow-2xl">
            404
          </h1>
        </div>

        {/* Message */}
        <div className="text-center space-y-3 px-4">
          <p className="font-bold text-2xl md:text-3xl text-emerald-400">
            صفحة غير موجودة
          </p>
          <p className="font-medium text-base md:text-lg text-gray-400 max-w-md">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها
          </p>
        </div>

        {/* Button with hover effect */}
        <button
          onClick={() => navigate("/")}
          className="group relative mt-4 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3 rounded-full transition-all duration-300 hover:scale-100 hover:shadow-2xl hover:shadow-emerald-500/50"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            العودة للرئيسية
          </span>
          <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </button>

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

export default NotFound;
