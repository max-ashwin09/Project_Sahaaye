/**
 * Lightweight bilingual dictionary (English & Hindi) for Sahaaye Report Community Need
 */

export type LanguageCode = 'en' | 'hi';

export const TRANSLATIONS = {
  en: {
    // Header
    pageTitle: 'Report Community Need',
    pageSubtitle: 'Geo-Verified Humanitarian Aid · Live Seva Network',
    loginRequiredNotice: 'Please Sign In before submitting a community report.',
    signInBtn: 'Sign In to Report',

    // Photo
    photoLabel: 'Need Proof / Photo *',
    photoChange: 'Change Photo',
    photoRetake: 'Retake',
    photoRemove: 'Remove Photo',
    photoUploadTitle: 'Click to Take Photo or Upload Image',
    photoUploadSubtitle: 'Camera opens directly on mobile. Supports JPG, PNG, WebP up to 10MB.',
    compressing: 'Compressing image…',
    aiAnalyzing: '🤖 AI Analyzing Photo for Need Details…',
    aiSuccess: '✨ AI Suggested (Review & Edit)',
    exifMatch: '✓ Photo GPS matches current location',
    exifMismatch: '⚠️ Photo taken >500m away from current location (flagged for review)',

    // GPS
    gpsLocked: 'GPS LOCKED & GEO-STAMPED',
    gpsAcquiring: 'ACQUIRING GPS LOCK…',
    refreshGps: 'Refresh GPS ↻',
    pickManualPin: 'Pick on Map 🗺️',
    accuracy: 'Accuracy',
    lowAccuracyWarning: '⚠️ GPS accuracy is low (>100m). Please refresh or adjust on map.',
    approximateNotice: '🛡️ Public map displays an approximate area (~300m) to protect dignity.',

    // Fields
    titleLabel: 'Need Title *',
    titlePlaceholder: 'e.g. Urgent food ration needed for 4 daily-wage families',
    categoryLabel: 'Category *',
    urgencyLabel: 'Urgency Level *',
    descriptionLabel: 'Description & Specific Requirements',
    descriptionPlaceholder: 'Describe the situation, required supplies, and any special instructions…',
    peopleAffectedLabel: 'People Affected (Estimate)',
    peopleAffectedPlaceholder: 'e.g. 5',
    anonymousLabel: 'Report Anonymously',
    anonymousHelp: 'Your name will be hidden from the public feed and map.',

    // Categories
    catFood: '🍚 Food & Ration',
    catMedical: '💊 Medical & Healthcare',
    catEducation: '📚 Education & Books',
    catShelter: '🏠 Shelter & Clothing',
    catElderly: '👴 Elderly Care',
    catWater: '💧 Clean Water',
    catOthers: '🤝 Others / Community',

    // Urgency
    urgencyNormal: '🟢 Normal',
    urgencyUrgent: '🟠 Urgent (Within 24h)',
    urgencyCritical: '🔴 Critical Emergency',

    // Voice
    voiceHindi: '🇮🇳 हिन्दी',
    voiceEnglish: '🇬🇧 English',
    voiceListening: 'Listening… बोलिए…',
    voiceClickToSpeak: 'Click mic to speak',
    voiceUnsupported: 'Voice input not supported in this browser. Try Chrome or Edge.',

    // Draft
    draftSaved: 'Draft saved automatically',
    clearDraft: 'Clear Draft',

    // Submission
    submitBtn: 'Publish Need with Geo-Stamp 🚀',
    submittingBtn: 'Uploading & Geo-Verifying…',

    // Duplicate Modal
    duplicateDetectedTitle: 'Similar Need Already Reported Nearby!',
    duplicateSubtitle: 'We found an active need in the same category within 300 meters:',
    duplicateSupportBtn: '🤝 Support Existing Need Instead',
    duplicateProceedBtn: '📝 Report Anyway (Separate Need)',

    // Success Screen
    successTitle: 'Need Successfully Reported & Published! 🎉',
    successSubtitle: 'Your geo-verified humanitarian report has been published to the Sahaaye server and community map.',
    reportIdLabel: 'Report ID',
    statusTimelineTitle: 'Live Seva Status Timeline',
    viewOnMapBtn: '📍 View on Live Map',
    reportAnotherBtn: 'Report Another Need',
  },
  hi: {
    // Header
    pageTitle: 'ज़रूरत की रिपोर्ट दर्ज करें',
    pageSubtitle: 'भू-सत्यापित मानवीय सहायता · लाइव सेवा नेटवर्क',
    loginRequiredNotice: 'रिपोर्ट दर्ज करने के लिए कृपया पहले साइन इन करें।',
    signInBtn: 'रिपोर्ट करने के लिए साइन इन करें',

    // Photo
    photoLabel: 'ज़रूरत का प्रमाण / फ़ोटो *',
    photoChange: 'फ़ोटो बदलें',
    photoRetake: 'दोबारा लें',
    photoRemove: 'फ़ोटो हटाएं',
    photoUploadTitle: 'फ़ोटो खींचें या इमेज अपलोड करें',
    photoUploadSubtitle: 'मोबाइल पर कैमरा तुरंत खुलता है। JPG, PNG, WebP 10MB तक।',
    compressing: 'इमेज कम्प्रेस हो रही है…',
    aiAnalyzing: '🤖 AI फ़ोटो से ज़रूरत का विवरण निकाल रहा है…',
    aiSuccess: '✨ AI द्वारा सुझाया गया (बदल सकते हैं)',
    exifMatch: '✓ फ़ोटो का GPS वर्तमान स्थान से मेल खाता है',
    exifMismatch: '⚠️ फ़ोटो वर्तमान स्थान से 500m से अधिक दूर की है (समीक्षा के लिए चिह्नित)',

    // GPS
    gpsLocked: 'GPS लॉक और जियो-स्टैम्प सुरक्षित',
    gpsAcquiring: 'GPS लोकेशन खोजी जा रही है…',
    refreshGps: 'GPS रीफ़्रेश करें ↻',
    pickManualPin: 'मैप पर चुनें 🗺️',
    accuracy: 'सटीकता',
    lowAccuracyWarning: '⚠️ GPS सटीकता कम है (>100m)। कृपया रीफ़्रेश करें या मैप पर सेट करें।',
    approximateNotice: '🛡️ गोपनीयता हेतु पब्लिक मैप पर केवल लगभग ~300m का क्षेत्र दिखेगा।',

    // Fields
    titleLabel: 'ज़रूरत का शीर्षक *',
    titlePlaceholder: 'उदा. 4 परिवारों के लिए आवश्यक सूखा राशन सहायता',
    categoryLabel: 'श्रेणी (Category) *',
    urgencyLabel: 'ज़रूरत की गंभीरता *',
    descriptionLabel: 'विवरण व विशेष आवश्यकताएं',
    descriptionPlaceholder: 'परिस्थिति, आवश्यक सामग्री और सेवादारों के लिए निर्देश लिखें…',
    peopleAffectedLabel: 'प्रभावित लोगों की संख्या',
    peopleAffectedPlaceholder: 'उदा. 5',
    anonymousLabel: 'गुमनाम रूप से रिपोर्ट करें',
    anonymousHelp: 'सार्वजनिक फ़ीड और मैप पर आपका नाम छिपा रहेगा।',

    // Categories
    catFood: '🍚 भोजन व राशन',
    catMedical: '💊 चिकित्सा व दवाइयां',
    catEducation: '📚 शिक्षा व पुस्तकें',
    catShelter: '🏠 आश्रय व वस्त्र',
    catElderly: '👴 बुजुर्ग सहायता',
    catWater: '💧 स्वच्छ पेयजल',
    catOthers: '🤝 अन्य सामाजिक सेवा',

    // Urgency
    urgencyNormal: '🟢 सामान्य',
    urgencyUrgent: '🟠 आवश्यक (24 घंटे में)',
    urgencyCritical: '🔴 अत्यंत गंभीर आपातकाल',

    // Voice
    voiceHindi: '🇮🇳 हिन्दी',
    voiceEnglish: '🇬🇧 English',
    voiceListening: 'सुन रहे हैं… बोलिए…',
    voiceClickToSpeak: 'माइक दबाकर बोलें',
    voiceUnsupported: 'इस ब्राउज़र में वॉयस इनपुट समर्थित नहीं है। Chrome या Edge प्रयोग करें।',

    // Draft
    draftSaved: 'ड्राफ्ट अपने आप सुरक्षित हो गया',
    clearDraft: 'ड्राफ्ट हटाएं',

    // Submission
    submitBtn: 'जियो-स्टैम्प के साथ सेवा प्रकाशित करें 🚀',
    submittingBtn: 'अपलोड व सत्यापित हो रहा है…',

    // Duplicate Modal
    duplicateDetectedTitle: 'नजदीक में मिलती-जुलती ज़रूरत पहले से दर्ज है!',
    duplicateSubtitle: '300 मीटर के दायरे में इस श्रेणी की खुली ज़रूरत सक्रिय है:',
    duplicateSupportBtn: '🤝 इस मौजूदा ज़रूरत का समर्थन करें',
    duplicateProceedBtn: '📝 अलग ज़रूरत के रूप में दर्ज करें',

    // Success Screen
    successTitle: 'ज़रूरत सफलतापूर्वक दर्ज और प्रकाशित हो गई! 🎉',
    successSubtitle: 'आपकी रिपोर्ट सहाय नेटवर्क और लाइव मैप पर स्वयंसेवकों को प्रेषित कर दी गई है।',
    reportIdLabel: 'रिपोर्ट आईडी',
    statusTimelineTitle: 'लाइव सेवा स्थिति ट्रैकिंग',
    viewOnMapBtn: '📍 लाइव मैप पर देखें',
    reportAnotherBtn: 'एक और ज़रूरत रिपोर्ट करें',
  },
};
