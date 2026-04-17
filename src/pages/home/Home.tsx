import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart2,
  Users,
  Package,
  FileText,
  DollarSign,
  ShoppingCart,
  Shield,
  Zap,
  Globe,
  ChevronLeft,
  ArrowLeft,
  Star,
  Layers,
  Settings,
  TrendingUp,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/Logo21.jpg";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: DollarSign,
    title: "المالية والمحاسبة",
    desc: "إدارة كاملة للحسابات، الميزانيات، الفواتير، والتقارير المالية بدقة عالية وفي الوقت الفعلي.",
    color: "from-[#1B5E4F] to-[#0F4F3E]",
  },
  {
    icon: Users,
    title: "الموارد البشرية",
    desc: "نظام متكامل لإدارة الموظفين، الرواتب، الإجازات، والتدريب ضمن بيئة عمل موحدة.",
    color: "from-[#B8976B] to-[#9E7E52]",
  },
  {
    icon: Package,
    title: "المخزون والمستودعات",
    desc: "تتبع دقيق للمخزون، حركة البضائع، تنبيهات النفاد، وإدارة المستودعات متعددة الفروع.",
    color: "from-[#1B5E4F] to-[#0F4F3E]",
  },
  {
    icon: ShoppingCart,
    title: "المبيعات والمشتريات",
    desc: "أتمتة دورة البيع والشراء بالكامل من عروض الأسعار حتى إغلاق الفاتورة والتحصيل.",
    color: "from-[#B8976B] to-[#9E7E52]",
  },
  {
    icon: BarChart2,
    title: "التقارير والتحليلات",
    desc: "لوحات بيانات ذكية وتقارير قابلة للتخصيص تمنحك رؤية شاملة لأداء مؤسستك.",
    color: "from-[#1B5E4F] to-[#0F4F3E]",
  },
  {
    icon: Settings,
    title: "إدارة المشاريع",
    desc: "تخطيط المشاريع، توزيع المهام، متابعة التقدم، وضبط الموارد البشرية والمادية.",
    color: "from-[#B8976B] to-[#9E7E52]",
  },
];

const WHY_US = [
  {
    icon: Zap,
    title: "سرعة فائقة",
    desc: "أداء استثنائي مع استجابة فورية لجميع العمليات",
  },
  {
    icon: Shield,
    title: "أمان تام",
    desc: "تشفير من أعلى المستويات وصلاحيات دقيقة لكل مستخدم",
  },
  {
    icon: Globe,
    title: "متعدد اللغات",
    desc: "دعم كامل للغة العربية والإنجليزية في واجهة واحدة",
  },
  {
    icon: Layers,
    title: "تكامل شامل",
    desc: "ربط سلس بين جميع أقسام المؤسسة في نظام موحد",
  },
  {
    icon: TrendingUp,
    title: "قابل للتوسع",
    desc: "ينمو مع مؤسستك من الشركات الصغيرة إلى الكبرى",
  },
  {
    icon: FileText,
    title: "توافق قانوني",
    desc: "متوافق مع اللوائح المالية والضريبية المحلية والدولية",
  },
];

const STATS = [
  { value: "٥٠٠+", label: "مؤسسة تثق بنا" },
  { value: "٩٩.٩٪", label: "وقت تشغيل مضمون" },
  { value: "٣٠+", label: "وحدة متكاملة" },
  { value: "٢٤/٧", label: "دعم فني متواصل" },
];

// ─── Component ────────────────────────────────────────────────────────────────

const HomePage = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
      className="bg-[#F5F1E8] min-h-screen"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap');
        html { scroll-behavior: smooth; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-fadeUp   { animation: fadeUp 0.7s ease forwards; }
        .delay-100 { animation-delay: 0.1s; opacity: 0; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; }
        .delay-400 { animation-delay: 0.4s; opacity: 0; }
        .animate-float    { animation: float 4s ease-in-out infinite; }
        .pulse-ring::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #1B5E4F;
          animation: pulse-ring 2s ease-out infinite;
        }
      `}</style>

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <nav
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-md border-b border-[#B8976B]/20" : "bg-transparent"}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md">
              <img
                src={logo}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1
                className={`font-black text-base leading-tight ${scrolled ? "text-[#1B5E4F]" : "text-white"}`}
              >
                استدامة العطاء
              </h1>
              <p
                className={`text-[10px] ${scrolled ? "text-[#B8976B]" : "text-white/70"}`}
              >
                نظام ERP المتكامل
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { label: "المميزات", id: "features" },
              { label: "لماذا نحن", id: "why" },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className={`text-sm font-semibold transition-colors hover:text-[#B8976B] ${scrolled ? "text-[#4A4A4A]" : "text-white/90"}`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span
                  className={`text-sm font-semibold ${scrolled ? "text-[#1B5E4F]" : "text-white"}`}
                >
                  مرحباً، {user?.fullName ?? user?.email}
                </span>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="bg-[#1B5E4F] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#0F4F3E] transition-colors shadow-md"
                >
                  لوحة التحكم
                </button>
                <button
                  onClick={handleLogout}
                  className="border-2 border-red-400 text-red-500 text-sm font-bold px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
                >
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className={`text-sm font-bold px-4 py-2 rounded-xl border-2 transition-colors ${scrolled ? "border-[#1B5E4F] text-[#1B5E4F] hover:bg-[#1B5E4F] hover:text-white" : "border-white text-white hover:bg-white hover:text-[#1B5E4F]"}`}
                >
                  تسجيل الدخول
                </button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className={`md:hidden ${scrolled ? "text-[#1B5E4F]" : "text-white"}`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-[#B8976B]/20 px-6 py-5 space-y-4 shadow-xl">
            {[
              { label: "المميزات", id: "features" },
              { label: "لماذا نحن", id: "why" },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="block text-[#4A4A4A] font-semibold text-sm w-full text-right py-1"
              >
                {l.label}
              </button>
            ))}
            <div className="pt-3 border-t border-[#B8976B]/10 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      navigate("/dashboard");
                      setMenuOpen(false);
                    }}
                    className="bg-[#1B5E4F] text-white text-sm font-bold px-4 py-2.5 rounded-xl w-full"
                  >
                    لوحة التحكم
                  </button>
                  <button
                    onClick={handleLogout}
                    className="border-2 border-red-400 text-red-500 text-sm font-bold px-4 py-2.5 rounded-xl w-full"
                  >
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      navigate("/login");
                      setMenuOpen(false);
                    }}
                    className="border-2 border-[#1B5E4F] text-[#1B5E4F] text-sm font-bold px-4 py-2.5 rounded-xl w-full"
                  >
                    تسجيل الدخول
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-bl from-[#1B5E4F] via-[#0F4F3E] to-[#0A3D30]">
        {/* Decorative BG */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          {/* Circles */}
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#B8976B]/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl" />
          {/* Floating shapes */}
          <div
            className="absolute top-1/4 left-10 w-3 h-3 rounded-full bg-[#B8976B]/50 animate-float"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="absolute top-1/3 left-1/4 w-2 h-2 rounded-full bg-white/30 animate-float"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-1/3 right-1/4 w-4 h-4 rounded-full bg-[#B8976B]/30 animate-float"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute top-2/3 left-1/3 w-1.5 h-1.5 rounded-full bg-white/40 animate-float"
            style={{ animationDelay: "0.5s" }}
          />
          {/* Diagonal line */}
          <div
            className="absolute top-0 left-0 w-full h-full opacity-5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, #B8976B 0, #B8976B 1px, transparent 0, transparent 50%)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-16">
          {/* Badge */}
          <div className="animate-fadeUp inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-[#B8976B] relative pulse-ring"></span>
            نظام تخطيط موارد المؤسسات — الجيل الجديد
          </div>

          {/* Headline */}
          <h1 className="animate-fadeUp delay-100 text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            أدر مؤسستك بالكامل
            <br />
            من <span className="text-[#B8976B]">مكان واحد</span>
          </h1>

          <p className="animate-fadeUp delay-200 text-white/70 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            نظام ERP متكامل يربط جميع أقسام مؤسستك — من المالية والمشتريات إلى
            الموارد البشرية والمخزون — في منصة عربية واحدة سهلة الاستخدام.
          </p>

          {/* CTAs */}
          <div className="animate-fadeUp delay-300 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="group bg-[#B8976B] hover:bg-[#9E7E52] text-white font-black text-base px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2 hover:-translate-y-0.5"
              >
                انتقل للوحة التحكم
                <ArrowLeft
                  size={18}
                  className="group-hover:-translate-x-1 transition-transform"
                />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="border-2 border-white/30 text-white font-bold text-base px-8 py-4 rounded-2xl hover:bg-white/10 transition-all duration-300"
                >
                  تسجيل الدخول
                </button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="animate-fadeUp delay-400 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center"
              >
                <p className="text-2xl font-black text-[#B8976B]">
                  {stat.value}
                </p>
                <p className="text-white/60 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 80L60 68C120 56 240 32 360 26.7C480 21 600 35 720 40C840 45 960 40 1080 34.7C1200 29 1320 23 1380 20L1440 17V80H0Z"
              fill="#F5F1E8"
            />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════ */}
      <section id="features" className="py-24 px-6 bg-[#F5F1E8]">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#1B5E4F]/10 text-[#1B5E4F] text-xs font-bold px-4 py-2 rounded-full mb-4">
              <Layers size={14} />
              وحدات النظام
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#1B5E4F] mb-4">
              كل ما تحتاجه في نظام واحد
            </h2>
            <p className="text-[#4A4A4A]/60 max-w-xl mx-auto text-sm leading-relaxed">
              وحدات متكاملة تغطي جميع احتياجات مؤسستك مع إمكانية التفعيل
              التدريجي حسب الحاجة
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              const isGold = feat.color.includes("B8976B");
              return (
                <div
                  key={feat.title}
                  className="group bg-white rounded-2xl p-6 border border-[#B8976B]/10 hover:border-[#B8976B]/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden"
                >
                  {/* BG accent */}
                  <div
                    className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${feat.color}`}
                  />

                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center shadow-md mb-5 group-hover:scale-110 transition-transform`}
                  >
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className="text-base font-black text-[#1B5E4F] mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-[#4A4A4A]/60 leading-relaxed">
                    {feat.desc}
                  </p>

                  <div
                    className={`mt-5 flex items-center gap-1 text-xs font-bold ${isGold ? "text-[#B8976B]" : "text-[#1B5E4F]"} opacity-0 group-hover:opacity-100 transition-opacity`}
                  >
                    اعرف أكثر <ChevronLeft size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WHY US
      ══════════════════════════════════════════ */}
      <section id="why" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 items-center">
            {/* Left: visual */}
            <div className="relative order-2 xl:order-1">
              <div className="relative bg-gradient-to-br from-[#1B5E4F] to-[#0A3D30] rounded-3xl p-8 overflow-hidden shadow-2xl">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#B8976B]/20" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />

                <div className="relative z-10 grid grid-cols-2 gap-4">
                  {[
                    { label: "معدل الرضا", value: "٩٨٪", sub: "من عملائنا" },
                    { label: "وفر في التكاليف", value: "٤٠٪", sub: "متوسطاً" },
                    {
                      label: "سرعة الإعداد",
                      value: "٧ أيام",
                      sub: "للتشغيل الكامل",
                    },
                    {
                      label: "توفير الوقت",
                      value: "٦٠٪",
                      sub: "في العمليات اليومية",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10"
                    >
                      <p className="text-2xl font-black text-[#B8976B]">
                        {item.value}
                      </p>
                      <p className="text-white font-semibold text-xs mt-1">
                        {item.label}
                      </p>
                      <p className="text-white/50 text-[10px]">{item.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="relative z-10 mt-6 bg-white/10 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#B8976B] flex items-center justify-center text-white text-xs font-bold">
                      م
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold">
                        محمد العلي — مدير مالي
                      </p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            className="text-[#B8976B] fill-[#B8976B]"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed">
                    "النظام غيّر طريقة عملنا بالكامل. التقارير التي كانت تأخذ
                    أياماً باتت جاهزة في ثوانٍ."
                  </p>
                </div>
              </div>
            </div>

            {/* Right: text */}
            <div className="order-1 xl:order-2">
              <div className="inline-flex items-center gap-2 bg-[#B8976B]/10 text-[#B8976B] text-xs font-bold px-4 py-2 rounded-full mb-5">
                <Star size={14} />
                لماذا تختارنا
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-[#1B5E4F] mb-4 leading-tight">
                نظام بُني للمؤسسات
                <br />
                <span className="text-[#B8976B]">العربية</span> تحديداً
              </h2>
              <p className="text-[#4A4A4A]/60 text-sm leading-relaxed mb-8">
                صُمم النظام من البداية بعقلية عربية — واجهة RTL احترافية، توافق
                مع الأنظمة المحلية، ودعم بالعربية على مدار الساعة.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {WHY_US.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex gap-3 p-4 bg-[#F5F1E8] rounded-xl hover:bg-[#EBE7DC] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1B5E4F]">
                          {item.title}
                        </p>
                        <p className="text-xs text-[#4A4A4A]/60 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════ */}

      {/* ══════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════ */}
      <section className="py-20 px-6 bg-gradient-to-bl from-[#1B5E4F] via-[#0F4F3E] to-[#0A3D30] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #B8976B 0, #B8976B 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#B8976B]/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            هل أنت مستعد لتحويل
            <span className="text-[#B8976B]"> مؤسستك؟</span>
          </h2>
          <p className="text-white/60 text-sm mb-8 leading-relaxed">
            انضم إلى أكثر من ٥٠٠ مؤسسة تعتمد على نظامنا يومياً لإدارة أعمالها
            بكفاءة واحترافية.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="group bg-[#B8976B] hover:bg-[#9E7E52] text-white font-black text-base px-10 py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2"
              >
                انتقل للوحة التحكم <ArrowLeft size={18} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/register")}
                  className="bg-[#B8976B] hover:bg-[#9E7E52] text-white font-black text-base px-10 py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-0.5"
                >
                  ابدأ تجربتك المجانية
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="border-2 border-white/30 text-white font-bold text-base px-10 py-4 rounded-2xl hover:bg-white/10 transition-all"
                >
                  تسجيل الدخول
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="bg-[#0A3D30] text-white/60 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img
                src={logo}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white font-black text-sm">
              استدامة العطاء الدولية
            </span>
          </div>
          <p className="text-xs text-center">
            © ٢٠٢٦ استدامة العطاء الدولية — جميع الحقوق محفوظة
          </p>
          <div className="flex gap-4 text-xs">
            <Link to={"/privacy-policy"} className="hover:text-[#B8976B] transition-colors">
              سياسة الخصوصية
            </Link>
            <Link to={"/terms-of-use"} className="hover:text-[#B8976B] transition-colors">
              الشروط والأحكام
            </Link>
            <Link
              to="https://www.alataa.sa/"
              className="hover:text-[#B8976B] transition-colors"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
