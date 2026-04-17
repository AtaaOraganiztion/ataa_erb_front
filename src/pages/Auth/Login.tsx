import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, LogIn } from "lucide-react";
import logo from "../../assets/Logo2.jpg";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useAuth } from "../../context/AuthContext";

type LoginPageProps = {
  email: string;
  password: string;
};

const LoginSchema = yup.object({
  email: yup
    .string()
    .required("البريد الإلكتروني مطلوب")
    .email("صيغة البريد الإلكتروني غير صحيحة"),
  password: yup
    .string()
    .required("كلمة المرور مطلوبة")
    .min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const year = new Date().getFullYear();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginPageProps>({
    resolver: yupResolver(LoginSchema),
  });
  const { login } = useAuth();

  const handleLogin = async (data: LoginPageProps) => {
    const result = await login(data.email, data.password);

    if (result.success) {
      const userData = localStorage.getItem("user");

      if (!userData) {
        console.error("User not found in localStorage");
        return;
      }
      const user = JSON.parse(userData);
      const roles = user.roles || [];

      if (roles.includes("Admin")) navigate("/dashboard");
      else if (roles.includes("HR")) navigate("/employees");
      else if (roles.includes("Financial")) navigate("/budgets");
      else navigate("/attendance");

      const user = JSON.parse(userData);
      const roles = user.roles || [];

      if (roles.includes("Admin")) {
        navigate("/dashboard");
      } else if (roles.includes("HR")) {
        navigate("/employees");
      } else if (roles.includes("Financial")) {
        navigate("/budgets");
      } else {
        navigate("/attendance");
      }

      console.log("Login successful:", result);
    } else {
      console.error("Login failed:", result.error);
    }
  };

  return (
    <div
      className="min-h-screen bg-brand-bg flex items-center justify-center p-4"
      dir="rtl"
    >
      {/* زخارف الخلفية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-brand-primary/20 overflow-hidden">
          {/* Header */}
          <div className="gradient-bg p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-white/10 rounded-tr-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-white/10 rounded-bl-3xl" />

            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <img
                  src={logo}
                  alt="Logo"
                  className="w-20 h-20 rounded-full object-cover"
                />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                مؤسسة مانح المميزة
              </h1>
              <p className="text-white/80 text-sm">
                تسجيل الدخول إلى لوحة التحكم
              </p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-white/40 to-transparent" />
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit(handleLogin)} className="space-y-6">
              {/* البريد الإلكتروني */}
              <div>
                <label className="block text-brand-primary font-semibold mb-2 text-sm">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-accent">
                    <Mail size={20} />
                  </div>
                  <input
                    {...register("email")}
                    placeholder="example@domain.com"
                    className="w-full pr-12 pl-4 py-3 border-2 border-brand-accent/30 rounded-xl
                      focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
                      outline-none transition-all duration-300
                      placeholder:text-brand-subtext"
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* كلمة المرور */}
              <div>
                <label className="block text-brand-primary font-semibold mb-2 text-sm">
                  كلمة المرور
                </label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-accent">
                    <Lock size={20} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="......"
                    className="w-full pr-12 pl-12 py-3 border-2 border-brand-accent/30 rounded-xl
                      focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
                      outline-none transition-all duration-300
                      placeholder:text-brand-subtext"
                    disabled={isSubmitting}
                  />
                  {errors.password && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.password.message}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-accent hover:text-brand-primary transition-colors"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* زر تسجيل الدخول */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full gradient-bg text-white py-4 rounded-xl font-bold text-lg
                  hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>جاري تسجيل الدخول...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={20} />
                      <span>تسجيل الدخول</span>
                    </>
                  )}
                </div>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-brand-soft px-8 py-4 border-t-2 border-brand-primary/10">
            <p className="text-center text-xs text-brand-subtext">
              © {year} مؤسسة مانح المميزة. جميع الحقوق محفوظة.
          <div className="bg-linear-to-br from-[#F5F1E8] to-white px-8 py-4 border-t-2 border-[#B8976B]/10">
            <p className="text-center text-xs text-[#4A4A4A]">
              © {year} استدامة العطاء الدولية. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
