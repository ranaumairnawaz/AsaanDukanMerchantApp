import { useState } from 'react';
import { ChevronDown, Store, PackagePlus, Palette, CreditCard, ClipboardList, Globe, Tag, Users, Smartphone, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HelpTopic {
  id: string;
  icon: any;
  titleEn: string;
  titleUr: string;
  contentEn: React.ReactNode;
  contentUr: React.ReactNode;
}

const helpTopics: HelpTopic[] = [
  {
    id: 'account',
    icon: Store,
    titleEn: 'Account Creation',
    titleUr: 'اکاؤنٹ بنانا',
    contentEn: (
      <ol className="list-decimal pl-5 space-y-2 text-sm text-text-body-muted">
        <li>Tap the Login/Register button on the dashboard.</li>
        <li>Enter your phone number and verify via OTP.</li>
        <li>Enter your Store Name and choose a unique Store Slug.</li>
        <li>Your account will be instantly created and you can start adding products.</li>
      </ol>
    ),
    contentUr: (
      <ol className="list-decimal pr-5 space-y-2 text-sm text-text-body-muted font-[Noto_Nastaliq_Urdu] leading-loose text-right" dir="rtl">
        <li>ڈیش بورڈ پر لاگ ان/رجسٹر بٹن پر کلک کریں۔</li>
        <li>اپنا فون نمبر درج کریں اور او ٹی پی کے ذریعے تصدیق کریں۔</li>
        <li>اپنے اسٹور کا نام درج کریں اور ایک منفرد اسٹور سلگ کا انتخاب کریں۔</li>
        <li>آپ کا اکاؤنٹ فوری طور پر بن جائے گا اور آپ پروڈکٹس شامل کرنا شروع کر سکتے ہیں۔</li>
      </ol>
    )
  },
  {
    id: 'products',
    icon: PackagePlus,
    titleEn: 'Adding Products',
    titleUr: 'پروڈکٹ شامل کریں',
    contentEn: (
      <ol className="list-decimal pl-5 space-y-2 text-sm text-text-body-muted">
        <li>Go to the Products tab in your Dashboard.</li>
        <li>Tap the 'Add Product' button.</li>
        <li>Upload images, set the price, stock quantity, and add a description.</li>
        <li>Tap Save to publish the product to your live store.</li>
      </ol>
    ),
    contentUr: (
      <ol className="list-decimal pr-5 space-y-2 text-sm text-text-body-muted font-[Noto_Nastaliq_Urdu] leading-loose text-right" dir="rtl">
        <li>اپنے ڈیش بورڈ میں پروڈکٹس کے ٹیب پر جائیں۔</li>
        <li>'نئی پروڈکٹ شامل کریں' کے بٹن پر کلک کریں۔</li>
        <li>تصاویر اپ لوڈ کریں، قیمت اور اسٹاک درج کریں، اور تفصیل شامل کریں۔</li>
        <li>اپنے اسٹور پر پروڈکٹ کو لائیو کرنے کے لیے محفوظ کریں پر کلک کریں۔</li>
      </ol>
    )
  },
  {
    id: 'theme',
    icon: Palette,
    titleEn: 'Theme Settings',
    titleUr: 'تھیم ترتیبات',
    contentEn: (
      <ol className="list-decimal pl-5 space-y-2 text-sm text-text-body-muted">
        <li>Go to Theme Customizer in your Dashboard.</li>
        <li>Select a base theme layout for your store.</li>
        <li>Adjust the primary colors, upload your store logo, and add a hero banner.</li>
        <li>Premium themes require an active subscription or a one-time unlock payment.</li>
      </ol>
    ),
    contentUr: (
      <ol className="list-decimal pr-5 space-y-2 text-sm text-text-body-muted font-[Noto_Nastaliq_Urdu] leading-loose text-right" dir="rtl">
        <li>ڈیش بورڈ میں تھیم کسٹمائزر پر جائیں۔</li>
        <li>اپنے اسٹور کے لیے بیس تھیم لے آؤٹ منتخب کریں۔</li>
        <li>بنیادی رنگ تبدیل کریں، لوگو اپ لوڈ کریں اور ہیرو بینر شامل کریں۔</li>
        <li>پریمیم تھیمز کے لیے فعال سبسکرپشن یا یکمشت ادائیگی درکار ہوتی ہے۔</li>
      </ol>
    )
  },
  {
    id: 'billing',
    icon: CreditCard,
    titleEn: 'Subscriptions & Payments',
    titleUr: 'سبسکرپشن اور ادائیگی',
    contentEn: (
      <div className="space-y-3 text-sm text-text-body-muted">
        <p><strong>Monthly Plans:</strong> Subscribe to unlock premium features and increase your WhatsApp message limits.</p>
        <p><strong>Overage Limits:</strong> If you exceed your WhatsApp message quota, additional messages will be billed as overage.</p>
        <p><strong>One-Time Payments:</strong> You can pay a one-time fee to permanently unlock specific themes or remove AsaanDukan branding without subscribing to a monthly plan.</p>
        <p><strong>Payment Proof:</strong> Currently, all payments require you to manually upload a screenshot of your bank/wallet transfer for admin verification.</p>
      </div>
    ),
    contentUr: (
      <div className="space-y-3 text-sm text-text-body-muted font-[Noto_Nastaliq_Urdu] leading-loose text-right" dir="rtl">
        <p><strong>ماہانہ پلانز:</strong> پریمیم فیچرز اور واٹس ایپ میسج کی حد بڑھانے کے لیے سبسکرائب کریں۔</p>
        <p><strong>اووریج چارجز:</strong> اگر آپ واٹس ایپ میسج کا کوٹہ عبور کر لیتے ہیں، تو اضافی میسجز کے الگ سے چارجز ہوں گے۔</p>
        <p><strong>یکمشت ادائیگی:</strong> آپ ماہانہ پلان لیے بغیر کسی خاص تھیم کو کھولنے یا آسان دکان کی برانڈنگ ہٹانے کے لیے ایک بار کی فیس ادا کر سکتے ہیں۔</p>
        <p><strong>ادائیگی کا ثبوت:</strong> فی الحال، تمام ادائیگیوں کے لیے آپ کو بینک/والیٹ ٹرانسفر کا سکرین شاٹ اپ لوڈ کرنا ہوتا ہے تاکہ ایڈمن اس کی تصدیق کر سکے۔</p>
      </div>
    )
  }
];

export default function HelpView() {
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-bg-primary p-4 pb-32">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="w-12 h-12 rounded-2xl bg-accent-amber/10 flex items-center justify-center border border-accent-amber/20">
            <HelpCircle size={24} className="text-accent-amber" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-main font-serif">Help Center</h1>
            <p className="text-sm text-text-body-muted">Guide & Tutorials / گائیڈ اور ٹیوٹوریلز</p>
          </div>
        </div>

        <div className="space-y-3">
          {helpTopics.map((topic) => {
            const isOpen = openTopic === topic.id;
            const Icon = topic.icon;
            
            return (
              <div 
                key={topic.id}
                className={`bg-bg-card border rounded-2xl overflow-hidden transition-colors ${isOpen ? 'border-accent-amber/50 shadow-md shadow-accent-amber/5' : 'border-border-card'}`}
              >
                <button
                  onClick={() => setOpenTopic(isOpen ? null : topic.id)}
                  className="w-full flex items-center justify-between p-4 cursor-pointer active:bg-black/5"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${isOpen ? 'bg-accent-amber/10 text-accent-amber' : 'bg-bg-primary text-text-body-muted'}`}>
                      <Icon size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-text-main text-[15px]">{topic.titleEn}</div>
                      <div className="font-[Noto_Nastaliq_Urdu] text-accent-amber text-xs mt-1" dir="rtl">{topic.titleUr}</div>
                    </div>
                  </div>
                  <ChevronDown 
                    size={20} 
                    className={`text-text-body-muted transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent-amber' : ''}`} 
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="p-4 pt-0 border-t border-border-card/50">
                        {/* English Section */}
                        <div className="mb-6 pt-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-text-main mb-3">English Guide</h4>
                          {topic.contentEn}
                        </div>
                        
                        {/* Urdu Section */}
                        <div className="pt-4 border-t border-border-card/50">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-text-main mb-3 text-right">اردو گائیڈ</h4>
                          {topic.contentUr}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
