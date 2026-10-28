import { Link, useParams } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';
import { useI18n, type Locale } from '../lib/i18n';

type DocumentKey = 'privacy' | 'terms' | 'refunds';
type LegalDocument = { title: string; intro: string; sections: Array<{ title: string; body: string }> };

const documents: Record<Locale, Record<DocumentKey, LegalDocument>> = {
  fr: {
    privacy: { title: 'Politique de confidentialité', intro: 'Cette politique explique quelles données TELC Prep utilise, pourquoi elles sont nécessaires et quels contrôles sont proposés aux apprenants.', sections: [
      { title: 'Données traitées', body: 'Nous traitons les informations du compte, le niveau choisi, les sessions techniques, les abonnements et paiements, les réponses aux exercices, les résultats, les textes envoyés pour correction et les préférences. Les preuves de paiement sont conservées dans un stockage privé.' },
      { title: 'Finalités', body: 'Ces données servent à authentifier le compte, fournir et améliorer les exercices, sauvegarder la progression, évaluer les productions, gérer les abonnements et paiements, prévenir les abus et assurer le support.' },
      { title: 'Prestataires et transferts', body: 'L’hébergement Cloudflare et, lorsque la correction IA est utilisée, le fournisseur configuré peuvent traiter les données nécessaires à la fourniture du service. N’incluez aucune donnée personnelle ou confidentielle dans une production envoyée vers un endpoint IA gratuit.' },
      { title: 'Durée et sécurité', body: 'Les données sont conservées pendant la vie du compte et selon les obligations légales applicables. Les mots de passe sont hachés, les sessions utilisent des cookies httpOnly et les preuves de paiement ne sont pas publiques.' },
      { title: 'Vos droits', body: 'Le profil permet de rectifier, exporter ou supprimer les données du compte. La loi marocaine n°09-08 prévoit notamment des droits d’accès, de rectification et, pour motifs légitimes, d’opposition. Une réclamation peut être adressée à la CNDP.' },
    ] },
    terms: { title: 'Conditions d’utilisation', intro: 'Ces conditions encadrent l’accès à TELC Prep et à ses contenus de préparation linguistique.', sections: [
      { title: 'Service', body: 'TELC Prep propose des exercices B1/B2, un suivi de progression et des retours pédagogiques. Le service est un outil de préparation : il ne garantit ni l’inscription, ni la réussite, ni un score officiel à l’examen TELC.' },
      { title: 'Compte', body: 'Vous devez fournir des informations exactes, protéger votre mot de passe et signaler tout accès non autorisé. Un compte est personnel. Les usages frauduleux, automatisés ou portant atteinte au service peuvent être suspendus.' },
      { title: 'Contenus et IA', body: 'Les corrections automatiques sont des indications pédagogiques susceptibles de contenir des erreurs. Elles ne remplacent pas l’évaluation d’un examinateur qualifié. Les contenus et marques de tiers restent la propriété de leurs titulaires.' },
      { title: 'Abonnements', body: 'Le prix, la durée et les fonctionnalités du pack sont présentés avant la demande de paiement. Le processus manuel actuel ne déclenche aucun renouvellement automatique. L’accès commence après validation du paiement.' },
      { title: 'Responsabilité et évolution', body: 'Nous cherchons à maintenir un service fiable, sans promettre une disponibilité ininterrompue. Les modifications importantes des conditions doivent être communiquées et faire l’objet d’un nouveau consentement lorsque nécessaire.' },
    ] },
    refunds: { title: 'Politique de remboursement', intro: 'Cette politique décrit le traitement des demandes liées aux paiements manuels et n’écarte aucun droit impératif prévu par la loi applicable.', sections: [
      { title: 'Avant validation', body: 'Une demande de paiement en attente ou rejetée n’active pas d’abonnement. TELC Prep ne réalise aucun prélèvement automatique. Si un virement a été effectué mais n’apparaît pas, transmettez le Payment ID et la preuve via le canal officiel de support.' },
      { title: 'Demande de remboursement', body: 'Après validation, contactez rapidement le support avec l’adresse du compte, le Payment ID, la date, le montant et le motif. La demande est examinée selon l’utilisation du service, la preuve du paiement et les règles légales applicables.' },
      { title: 'Droits du consommateur', body: 'La loi marocaine n°31-08 prévoit notamment un droit à l’information et, dans certains cas, un délai de rétractation de sept jours. Les exceptions applicables aux services ou contenus numériques doivent être confirmées avant commercialisation.' },
      { title: 'Traitement', body: 'Une décision et, le cas échéant, les modalités de remboursement sont communiquées par le support. Les délais bancaires ou de virement dépendent ensuite des établissements concernés.' },
    ] },
  },
  en: {
    privacy: { title: 'Privacy policy', intro: 'This policy explains which data TELC Prep uses, why it is needed and which controls are available to learners.', sections: [
      { title: 'Data processed', body: 'We process account information, the selected level, technical sessions, subscriptions and payments, exercise answers, results, texts submitted for correction and preferences. Payment proofs are stored privately.' },
      { title: 'Purposes', body: 'This data authenticates accounts, provides and improves exercises, saves progress, evaluates submissions, manages subscriptions and payments, prevents abuse and provides support.' },
      { title: 'Providers and transfers', body: 'Cloudflare hosting and, when AI correction is used, the configured provider may process data needed to provide the service. Do not include personal or confidential data in a submission sent to a free AI endpoint.' },
      { title: 'Retention and security', body: 'Data is kept for the life of the account and as required by applicable law. Passwords are hashed, sessions use httpOnly cookies and payment proofs are not public.' },
      { title: 'Your rights', body: 'Your profile lets you correct, export or delete account data. Moroccan law 09-08 provides access and correction rights and, for legitimate reasons, objection rights. A complaint may be sent to the CNDP.' },
    ] },
    terms: { title: 'Terms of use', intro: 'These terms govern access to TELC Prep and its language-preparation content.', sections: [
      { title: 'Service', body: 'TELC Prep provides B1/B2 exercises, progress tracking and educational feedback. It is a preparation tool and does not guarantee registration, success or an official TELC exam score.' },
      { title: 'Account', body: 'You must provide accurate information, protect your password and report unauthorized access. An account is personal. Fraudulent, automated or harmful use may be suspended.' },
      { title: 'Content and AI', body: 'Automatic corrections are educational guidance and may contain errors. They do not replace a qualified examiner’s assessment. Third-party content and trademarks remain the property of their owners.' },
      { title: 'Subscriptions', body: 'The plan price, duration and features are shown before a payment request. The current manual process does not trigger automatic renewal. Access starts after payment approval.' },
      { title: 'Liability and changes', body: 'We aim to maintain a reliable service without promising uninterrupted availability. Important changes to these terms will be communicated and renewed consent will be requested when necessary.' },
    ] },
    refunds: { title: 'Refund policy', intro: 'This policy describes how requests related to manual payments are handled and does not remove any mandatory rights under applicable law.', sections: [
      { title: 'Before approval', body: 'A pending or rejected payment request does not activate a subscription. TELC Prep does not make automatic charges. If a transfer was made but is not visible, send the Payment ID and proof through the official support channel.' },
      { title: 'Refund request', body: 'After approval, contact support promptly with the account address, Payment ID, date, amount and reason. The request is reviewed based on service use, payment proof and applicable legal rules.' },
      { title: 'Consumer rights', body: 'Moroccan law 31-08 provides information rights and, in some cases, a seven-day withdrawal period. Any exceptions for digital services or content must be confirmed before commercial launch.' },
      { title: 'Processing', body: 'Support will communicate a decision and, where applicable, the refund procedure. Bank or transfer timing then depends on the institutions involved.' },
    ] },
  },
  ar: {
    privacy: { title: 'سياسة الخصوصية', intro: 'هاد السياسة كتشرح شنو هي البيانات اللي كيستعملها TELC Prep وعلاش ضرورية وشنو هي الاختيارات المتاحة للمتعلمين.', sections: [
      { title: 'البيانات المعالجة', body: 'كنعالجو معلومات الحساب، المستوى المختار، الجلسات التقنية، الاشتراكات والدفوعات، أجوبة التمارين، النتائج، النصوص المرسلة للتصحيح والتفضيلات. إثباتات الأداء كتخزن بشكل خاص.' },
      { title: 'الأهداف', body: 'هاد البيانات كتستعمل لتسجيل الدخول وحماية الحساب، تقديم وتحسين التمارين، حفظ التقدم، تقييم الإنتاجات، تدبير الاشتراكات والدفوعات، منع الاستعمال السيئ وتقديم الدعم.' },
      { title: 'المزودون والتحويلات', body: 'الاستضافة عند Cloudflare، ومزود الذكاء الاصطناعي المختار عند استعمال التصحيح، يقدرو يعالجو البيانات الضرورية للخدمة. ما تدخل حتى معلومة شخصية أو سرية فشي نص غادي يتصيفط لخدمة AI مجانية.' },
      { title: 'المدة والأمان', body: 'البيانات كتتحفظ طول مدة الحساب وبحسب القانون. كلمات المرور مشفرة، الجلسات كتستعمل httpOnly cookies وإثباتات الأداء ماشي عمومية.' },
      { title: 'الحقوق ديالك', body: 'من الملف الشخصي تقدر تصلح أو تصدر أو تحذف بيانات الحساب. القانون المغربي 09-08 كيضمن خصوصاً حقوق الولوج والتصحيح والاعتراض لأسباب مشروعة، ويمكن توجيه شكاية لـ CNDP.' },
    ] },
    terms: { title: 'شروط الاستعمال', intro: 'هاد الشروط كتنظم الولوج لـ TELC Prep ومحتوى التحضير اللغوي ديالو.', sections: [
      { title: 'الخدمة', body: 'TELC Prep كتقدم تمارين B1/B2 وتتبع التقدم وملاحظات تعليمية. الخدمة وسيلة للتحضير وما كتضمنش التسجيل أو النجاح أو نقطة رسمية فامتحان TELC.' },
      { title: 'الحساب', body: 'خاصك تدخل معلومات صحيحة وتحافظ على كلمة المرور وتبلغ على أي دخول ماشي ديالك. الحساب شخصي، والاستعمال الاحتيالي أو الآلي أو الضار يقدر يتوقف.' },
      { title: 'المحتوى والذكاء الاصطناعي', body: 'التصحيحات الآلية غير توجيهات تعليمية وقد يكون فيها خطأ، وما كتعاوضش تقييم ممتحن مؤهل. محتوى وعلامات الأطراف الأخرى كتبقى ملك لأصحابها.' },
      { title: 'الاشتراكات', body: 'الثمن والمدة والخصائص ديال الباك كيبانو قبل طلب الأداء. المسطرة اليدوية الحالية ما فيهاش تجديد أوتوماتيكي، والولوج كيبدا من بعد قبول الأداء.' },
      { title: 'المسؤولية والتغييرات', body: 'كنحاولو نحافظو على خدمة موثوقة بلا ما نضمنو الاستمرارية الكاملة. التغييرات المهمة فالشروط غادي يتعلن عليها ويتطلب فيها قبول جديد إلا كان ضروري.' },
    ] },
    refunds: { title: 'سياسة الاسترجاع', intro: 'هاد السياسة كتشرح كيفاش كنعالجو الطلبات المرتبطة بالدفوعات اليدوية وما كتسقط حتى حق إجباري كيضمنو القانون.', sections: [
      { title: 'قبل القبول', body: 'طلب أداء باقي أو مرفوض ما كيفعلش الاشتراك. TELC Prep ما كتدير حتى اقتطاع أوتوماتيكي. إلا درتي تحويل وما بانش، صيفط Payment ID وإثبات الأداء لقناة الدعم الرسمية.' },
      { title: 'طلب الاسترجاع', body: 'من بعد القبول، تاصل بالدعم بسرعة وصيفط إيميل الحساب وPayment ID والتاريخ والمبلغ والسبب. الطلب كيتراجع حسب استعمال الخدمة وإثبات الأداء والقواعد القانونية.' },
      { title: 'حقوق المستهلك', body: 'القانون المغربي 31-08 كيضمن الحق فالمعلومة، وفبعض الحالات مهلة تراجع ديال سبعة أيام. الاستثناءات الخاصة بالخدمات أو المحتوى الرقمي خاصها تتأكد قبل الإطلاق التجاري.' },
      { title: 'المعالجة', body: 'الدعم غادي يعلمك بالقرار وبطريقة الاسترجاع إلا كانت مطبقة. المدة البنكية أو مدة التحويل كتعلق بالمؤسسات المعنية.' },
    ] },
  },
};

export function Legal() {
  const { document = 'terms' } = useParams();
  const { direction, locale, t } = useI18n();
  const key = (document in documents.fr ? document : 'terms') as DocumentKey;
  const page = documents[locale][key];
  return (
    <div className="app-canvas min-h-screen" dir={direction}>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">{t('legalInformation')}</p>
        <h1 className="mt-3 text-3xl font-black md:text-4xl">{page.title}</h1>
        <p className="mt-3 text-sm text-muted">{t('legalVersion')}</p>
        <p className="mt-6 text-lg leading-8 text-muted">{page.intro}</p>
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('legalWarning')}</div>
        <div className="mt-10 space-y-8">{page.sections.map((section) => <section key={section.title}><h2 className="text-xl font-black">{section.title}</h2><p className="mt-3 leading-7 text-muted">{section.body}</p></section>)}</div>
        <div className="mt-10 flex flex-wrap gap-4 border-t border-border pt-6 text-sm font-bold text-accent">
          <Link to="/legal/terms">{t('terms')}</Link><Link to="/legal/privacy">{t('privacy')}</Link><Link to="/legal/refunds">{t('refunds')}</Link>
          <a href="https://www.cndp.ma/vos-droits-en-matiere-de-protection-des-donnees-a-caractere-personnel/" target="_blank" rel="noreferrer">{t('cndpRights')}</a>
          <a href="https://mcinet.gov.ma/fr/content/protection-consommateur/droits-garantis-aux-consommateurs" target="_blank" rel="noreferrer">{t('consumerRights')}</a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
