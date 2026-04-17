const PrivacyPolicy = () => {
  return (
    <div className="bg-gray-50 py-16 px-6 md:px-12 lg:px-20" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-[#0F4F3E] mb-6">
          سياسة الخصوصية
        </h1>
        <p className="text-center text-gray-600 mb-12">
          آخر تحديث: 23 ديسمبر 2025
        </p>

        <div className="space-y-10 text-lg leading-relaxed text-gray-700">
          <section>
            <p className="mb-6">
              مرحباً بك في موقع <strong>استدامة العطاء الدولية</strong> (يُشار
              إليه فيما يلي بـ "الشركة" أو "نحن" أو "لنا"). نحن ملتزمون بحماية
              خصوصيتك وبياناتك الشخصية وفقاً لنظام حماية البيانات الشخصية الصادر
              بالمرسوم الملكي رقم (م/19) بتاريخ 9/2/1443هـ، واللائحة التنفيذية
              له، والمبادئ الصادرة عن الهيئة السعودية للبيانات والذكاء الاصطناعي
              (سدايا).
            </p>
            <p>
              تنطبق هذه السياسة على جميع المعلومات الشخصية التي نجمعها عبر
              موقعنا الإلكتروني أو قنواتنا الأخرى. باستخدام الموقع، توافق على
              جمعنا ومعالجتنا لبياناتك كما هو موضح أدناه.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#B8976B] mb-4">
              1. البيانات الشخصية التي نجمعها
            </h2>
            <ul className="list-disc pr-8 space-y-2">
              <li>بيانات تعريفية: الاسم، البريد الإلكتروني، رقم الهاتف.</li>
              <li>بيانات الاتصال عبر النماذج أو البريد أو واتساب.</li>
              <li>
                بيانات تقنية: عنوان IP، نوع المتصفح، ملفات تعريف الارتباط
                (cookies).
              </li>
              <li>بيانات الخدمات المطلوبة (إذا قدمتها).</li>
            </ul>
            <p className="mt-4">لا نجمع بيانات حساسة إلا بموافقة صريحة.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#B8976B] mb-4">
              2. كيفية استخدام البيانات
            </h2>
            <p>نعالج بياناتك بناءً على:</p>
            <ul className="list-disc pr-8 space-y-2">
              <li>موافقتك الصريحة (للنشرات الإخبارية).</li>
              <li>الضرورة لتقديم الخدمات.</li>
              <li>المصلحة المشروعة (تحسين الموقع).</li>
              <li>الالتزام القانوني.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#B8976B] mb-4">
              3. مشاركة البيانات
            </h2>
            <p>لا نبيع بياناتك. نشاركها فقط مع:</p>
            <ul className="list-disc pr-8 space-y-2">
              <li>معالجين موثوقين (استضافة، تحليلات).</li>
              <li>الجهات الحكومية إذا طُلب قانونياً.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#B8976B] mb-4">4. حقوقك</h2>
            <p>لديك الحق في:</p>
            <ul className="list-disc pr-8 space-y-2">
              <li>الوصول إلى بياناتك</li>
              <li>تصحيحها أو حذفها</li>
              <li>الاعتراض أو سحب الموافقة</li>
            </ul>
            <p className="mt-4">
              تواصل معنا عبر: Istidama.international@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#B8976B] mb-4">
              5. الأمان والاحتفاظ
            </h2>
            <p>
              نستخدم تشفير SSL وإجراءات أمنية قوية. نحتفظ بالبيانات فقط مدة
              الغرض المطلوب.
            </p>
          </section>

          <section>
            <p className="text-center mt-12">
              لأي استفسار:{" "}
              <a
                href="mailto:privacy@istidama-alataa.com"
                className="text-[#B8976B] underline"
              >
                Istidama.international@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
