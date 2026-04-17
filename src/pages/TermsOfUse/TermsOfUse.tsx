const TermsOfUse = () => {
  return (
    <div className="bg-gray-50 py-16 px-6 md:px-12 lg:px-20" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-[#0F4F3E] mb-6">
          الشروط والأحكام
        </h1>
        <p className="text-center text-gray-600 mb-12">
          آخر تحديث: 23 ديسمبر 2025
        </p>

        <div className="space-y-10 text-lg leading-relaxed text-gray-700">
          <section>
            <p>
              هذه الشروط تحكم استخدامك لموقع وخدمات{" "}
              <strong>استدامة العطاء الدولية</strong>. باستخدام الموقع، فإنك
              توافق على الالتزام بها كاملة. تخضع هذه الشروط لقوانين المملكة
              العربية السعودية.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#B8976B] mb-4">
              1. الوصول والاستخدام
            </h2>
            <ul className="list-disc pr-8 space-y-2">
              <li>الموقع للاستخدام الشخصي غير التجاري.</li>
              <li>يجب أن تكون فوق 18 عاماً.</li>
              <li>نحتفظ بحق إيقاف الوصول في حال المخالفة.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#B8976B] mb-4">
              2. حقوق الملكية الفكرية
            </h2>
            <p>
              جميع المحتويات (نصوص، صور، شعار) ملك للشركة. يمنع النسخ أو التوزيع
              دون إذن كتابي.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#B8976B] mb-4">
              3. السلوك الممنوع
            </h2>
            <p>يحظر تماماً:</p>
            <ul className="list-disc pr-8 space-y-2">
              <li>نشر محتوى غير قانوني أو مسيء.</li>
              <li>الهجمات الإلكترونية أو السبام.</li>
              <li>انتحال الشخصية أو انتهاك الخصوصية.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#B8976B] mb-4">
              4. إخلاء المسؤولية
            </h2>
            <p>
              لا نتحمل مسؤولية الأضرار الناتجة عن استخدام الموقع أو الروابط
              الخارجية.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#B8976B] mb-4">
              5. القانون الحاكم
            </h2>
            <p>
              تخضع الشروط لقوانين المملكة العربية السعودية، وتختص محاكم مكة
              المكرمة بالنظر في النزاعات.
            </p>
          </section>

          <section>
            <p className="text-center mt-12">
              لأي استفسار:{" "}
              <a
                href="mailto:info@istidama-alataa.com"
                className="text-[#B8976B] underline"
              >
                Istidama.international@gmail.com{" "}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
