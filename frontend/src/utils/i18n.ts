/**
 * Bilingual dictionary (English & Hindi) for Sahaaye Report Community Need
 */

export type LanguageCode = 'en' | 'hi';

export const TRANSLATIONS = {
  en: {
    // Stepper Navigation
    step1: '1. Photo',
    step2: '2. Details',
    step3: '3. Location',
    step4: '4. Review',
    closeModal: 'Close modal',
    backBtn: 'Back',
    nextBtn: 'Next Step',
    submitNeedBtn: 'Submit need',
    submittingNeed: 'Submitting Need…',

    // Draft
    draftRestoredBanner: 'Unsaved draft restored.',
    clearDraftBtn: 'Clear',

    // Step 1: Media
    photoStepTitle: 'Need Proof / Photo & Video',
    photoStepSubtitle: 'Capture live camera proof with geo-stamping. Live camera only.',
    takePhotoVideoBtn: 'Take Photo / Video',
    itemsCount: 'Items captured',
    noMediaError: 'At least one photo or video is required to verify the community need.',
    removeMediaBtn: 'Remove item',
    videoBadge: 'VIDEO',

    // Camera Overlay
    cameraTitle: 'Sahaaye Live Verification Camera',
    cameraFindingLocation: 'Finding live location…',
    cameraLocationLocked: 'Live location locked',
    photoMode: 'Photo',
    videoMode: 'Video',
    blurFacesCheckbox: 'Blur faces (Privacy Filter)',
    flashBtn: 'Flash / Torch',
    switchCameraBtn: 'Switch Camera',
    doneBtn: 'Done',
    capturePhotoBtn: 'Capture Photo',
    recordVideoBtn: 'Record Video',
    stopVideoBtn: 'Stop Recording',
    maxMediaReached: 'Max 5 captures reached in this session',
    gpsRequiredNotice: 'GPS location is required. Please turn on GPS and allow location access.',
    cameraPermissionDenied: 'Camera access was denied. Please allow camera permissions in browser settings.',
    cameraNotFound: 'No camera hardware found on this device.',
    cameraInsecureContext: 'Camera and GPS require a secure HTTPS connection or localhost.',
    faceDetectorUnsupported: 'FaceDetector API unsupported on this browser; photo saved without face blur.',
    torchUnsupported: 'Hardware torch is unsupported; screen flash was used.',

    // Step 2: Need Details
    detailsStepTitle: 'Need Information',
    detailsStepSubtitle: 'Provide essential details so community helpers can take action.',
    titleLabel: 'Need Title *',
    titlePlaceholder: 'e.g. Dry Ration Kits Needed for Displaced Families',
    titleMinError: 'Title must be at least 3 characters long.',
    categoryLabel: 'Category *',
    urgencyLabel: 'Urgency Level *',
    descriptionLabel: 'Description & Specific Requirements',
    descriptionPlaceholder: 'Describe the exact situation, required supplies, and any helpful context…',
    descCharCount: 'characters',
    descMaxError: 'Description cannot exceed 500 characters.',

    // Categories
    catFood: 'Food',
    catWater: 'Water',
    catClothes: 'Clothes and blankets',
    catMedical: 'Medical',
    catShelter: 'Shelter',
    catEducation: 'Education',
    catOther: 'Other',

    // Urgency chips
    urgencyLow: 'Low',
    urgencyMedium: 'Medium',
    urgencyHigh: 'High',

    // Step 3: Location
    locationStepTitle: 'Geo-Verification & Location',
    locationStepSubtitle: 'Exact location captured via GPS. Public map shows approximate area.',
    gpsCardLocked: 'GPS LOCKED & GEO-STAMPED',
    gpsCardAcquiring: 'ACQUIRING GPS LOCK…',
    refreshLocationBtn: 'Refresh location',
    landmarkLabel: 'Landmark (Optional)',
    landmarkPlaceholder: 'e.g. Near Bada Ganpati Temple, Opposite Water Tank',
    locationRequiredError: 'Valid GPS location is required.',
    approximateNotice: '🛡️ Public view will show only an approximate area (rounded coordinates) to protect dignity.',
    exactCoordsLabel: 'Captured GPS Coordinates',
    accuracyLabel: 'Accuracy',
    approxCoordsLabel: 'Approximate Public Coordinates',

    // Step 4: Review
    reviewStepTitle: 'Review & Confirm Need',
    reviewStepSubtitle: 'Please verify the details below before publishing to the community.',
    reviewPhotosTitle: 'Captured Proof (Live Camera)',
    reviewDetailsTitle: 'Summary of Need',
    reviewLocationTitle: 'Verified Location',

    // Success Screen
    successTitle: 'Need Successfully Reported! 🎉',
    successSubtitle: 'Your need is now live on the Sahaaye network. Nearby community helpers have been notified.',
    reportIdLabel: 'Report ID',
    viewInNearbyBtn: '📍 View in Nearby Needs',
    reportAnotherBtn: '+ Report Another Need',
  },
  hi: {
    // Stepper Navigation
    step1: '1. फोटो/वीडियो',
    step2: '2. विवरण',
    step3: '3. स्थान',
    step4: '4. समीक्षा',
    closeModal: 'बंद करें',
    backBtn: 'पीछे जाएं',
    nextBtn: 'आगे बढ़ें',
    submitNeedBtn: 'ज़रूरत दर्ज करें',
    submittingNeed: 'ज़रूरत दर्ज हो रही है…',

    // Draft
    draftRestoredBanner: 'असुरक्षित ड्राफ्ट पुनर्स्थापित किया गया।',
    clearDraftBtn: 'हटाएं',

    // Step 1: Media
    photoStepTitle: 'ज़रूरत का प्रमाण / फोटो व वीडियो',
    photoStepSubtitle: 'जियो-स्टैम्प के साथ लाइव कैमरे से प्रमाण लें। केवल लाइव कैमरा मान्य है।',
    takePhotoVideoBtn: 'फोटो / वीडियो लें',
    itemsCount: 'आइटम दर्ज',
    noMediaError: 'ज़रूरत के सत्यापन के लिए कम से कम एक फोटो या वीडियो आवश्यक है।',
    removeMediaBtn: 'हटाएं',
    videoBadge: 'वीडियो',

    // Camera Overlay
    cameraTitle: 'सहाय लाइव सत्यापन कैमरा',
    cameraFindingLocation: 'लाइव लोकेशन खोजी जा रही है…',
    cameraLocationLocked: 'लाइव लोकेशन सुरक्षित',
    photoMode: 'फोटो',
    videoMode: 'वीडियो',
    blurFacesCheckbox: 'चेहरे ब्लर करें (गोपनीयता)',
    flashBtn: 'फ्लैश / टॉर्च',
    switchCameraBtn: 'कैमरा बदलें',
    doneBtn: 'पूर्ण (Done)',
    capturePhotoBtn: 'फोटो खींचें',
    recordVideoBtn: 'वीडियो रिकॉर्ड करें',
    stopVideoBtn: 'रिकॉर्डिंग रोकें',
    maxMediaReached: 'इस सत्र में अधिकतम 5 आइटम पूरे हो गए हैं',
    gpsRequiredNotice: 'GPS लोकेशन आवश्यक है। कृपया GPS चालू करें और लोकेशन की अनुमति दें।',
    cameraPermissionDenied: 'कैमरा अनुमति अस्वीकृत है। कृपया ब्राउज़र सेटिंग्स में कैमरा चालू करें।',
    cameraNotFound: 'इस डिवाइस पर कैमरा उपलब्ध नहीं है।',
    cameraInsecureContext: 'कैमरा और GPS के लिए सुरक्षित HTTPS या localhost आवश्यक है।',
    faceDetectorUnsupported: 'चेहरा पहचान (FaceDetector) समर्थित नहीं है, फोटो बिना ब्लर के सुरक्षित की गई।',
    torchUnsupported: 'हार्डवेयर टॉर्च अनुपलब्ध; स्क्रीन फ्लैश का उपयोग किया गया।',

    // Step 2: Need Details
    detailsStepTitle: 'ज़रूरत का विवरण',
    detailsStepSubtitle: 'आवश्यक जानकारी भरें ताकि सेवादार तुरंत मदद पहुंचा सकें।',
    titleLabel: 'ज़रूरत का शीर्षक *',
    titlePlaceholder: 'उदा. विस्थापित परिवारों के लिए सूखा राशन सहायता',
    titleMinError: 'शीर्षक कम से कम 3 अक्षरों का होना चाहिए।',
    categoryLabel: 'श्रेणी (Category) *',
    urgencyLabel: 'ज़रूरत की गंभीरता *',
    descriptionLabel: 'विवरण व विशेष आवश्यकताएं',
    descriptionPlaceholder: 'परिस्थिति, आवश्यक वस्तुएं और सेवादारों के लिए निर्देश लिखें…',
    descCharCount: 'अक्षर',
    descMaxError: 'विवरण 500 अक्षरों से अधिक नहीं हो सकता।',

    // Categories
    catFood: 'Food (भोजन)',
    catWater: 'Water (जल)',
    catClothes: 'Clothes and blankets (वस्त्र व कम्बल)',
    catMedical: 'Medical (दवाइयां)',
    catShelter: 'Shelter (आश्रय)',
    catEducation: 'Education (शिक्षा)',
    catOther: 'Other (अन्य)',

    // Urgency chips
    urgencyLow: 'Low (सामान्य)',
    urgencyMedium: 'Medium (मध्यम)',
    urgencyHigh: 'High (अत्यावश्यक)',

    // Step 3: Location
    locationStepTitle: 'भू-सत्यापन व स्थान',
    locationStepSubtitle: 'GPS द्वारा सटीक लोकेशन दर्ज। पब्लिक मैप पर लगभग क्षेत्र दिखेगा।',
    gpsCardLocked: 'GPS लॉक और जियो-स्टैम्प सुरक्षित',
    gpsCardAcquiring: 'GPS लोकेशन खोजी जा रही है…',
    refreshLocationBtn: 'लोकेशन रीफ़्रेश करें',
    landmarkLabel: 'लैंडमार्क / पहचान चिह्न (ऐच्छिक)',
    landmarkPlaceholder: 'उदा. बड़ा गणपति मंदिर के पास, पानी की टंकी के सामने',
    locationRequiredError: 'सत्यापित GPS लोकेशन आवश्यक है।',
    approximateNotice: '🛡️ गोपनीयता हेतु पब्लिक व्यू में केवल अनुमानित क्षेत्र (2 दशमलव स्थान) दिखेगा।',
    exactCoordsLabel: 'दर्ज GPS निर्देशांक',
    accuracyLabel: 'सटीकता',
    approxCoordsLabel: 'सार्वजनिक अनुमानित निर्देशांक',

    // Step 4: Review
    reviewStepTitle: 'समीक्षा व पुष्टि करें',
    reviewStepSubtitle: 'समुदाय में प्रकाशित करने से पहले कृपया विवरण की जांच कर लें।',
    reviewPhotosTitle: 'दर्ज प्रमाण (लाइव कैमरा)',
    reviewDetailsTitle: 'ज़रूरत का सारांश',
    reviewLocationTitle: 'सत्यापित लोकेशन',

    // Success Screen
    successTitle: 'ज़रूरत सफलतापूर्वक दर्ज हो गई! 🎉',
    successSubtitle: 'आपकी रिपोर्ट सहाय नेटवर्क पर प्रकाशित हो चुकी है और पास के सेवादारों को सूचित कर दिया गया है।',
    reportIdLabel: 'रिपोर्ट आईडी',
    viewInNearbyBtn: '📍 निकटवर्ती ज़रूरतों में देखें',
    reportAnotherBtn: '+ एक और ज़रूरत रिपोर्ट करें',
  },
};
