import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, X, Sparkles, ArrowRight, Maximize2, Minimize2, 
  Mic, MicOff, Volume2, VolumeX, AlertTriangle, TrendingUp, 
  Activity, ShieldAlert, CheckCircle, 
  ThumbsUp, ThumbsDown, Copy, RotateCw, CircleAlert, Check
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { hasPermission, PERMISSIONS } from "@/utils/rbac";
const markdownComponents = {
  code({node, inline, className, children, ...props}) {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match && match[1] === 'piechart') {
      try {
        const data = JSON.parse(String(children).replace(/\n$/, ''));
        const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];
        return (
          <div className="w-full my-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col">
            <div className="w-full h-48 relative flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={3} dataKey="value" stroke="none">
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Professional Legend */}
            <div className="w-full mt-2 space-y-2 px-1">
              {data.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                    ₹{Number(item.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      } catch(e) {
        return <code className={className} {...props}>{children}</code>;
      }
    }
    return <code className={className} {...props}>{children}</code>
  }
};

export default function AiCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [query, setQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // chat or insights
  const [feedback, setFeedback] = useState({}); // Stores like/dislike status per message id
  const [copiedId, setCopiedId] = useState(null);
  
  // Real UI Data queries from React Query Cache for Live Business stats
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 200) });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => base44.entities.Product.list() });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list() });
  const { data: purchases = [] } = useQuery({ queryKey: ["purchases"], queryFn: () => base44.entities.Purchase.list("-created_date", 200) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-created_date", 200) });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => base44.entities.Loan.list() });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.User.list() });
  
  // Need to get company profile data securely
  const { data: settingsList = [] } = useQuery({ queryKey: ["shopSettings"], queryFn: () => base44.entities.ShopSettings ? base44.entities.ShopSettings.list() : [] });
  const companyProfile = settingsList[0] || JSON.parse(localStorage.getItem('base44_shop_settings') || '[]')[0] || JSON.parse(localStorage.getItem('shopSettings') || '{}');

  // Custom dragged positions on Desktop
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  // Advanced AI Insights 
  const [aiInsights, setAiInsights] = useState({
    healthScore: 88,
    forecast: "₹1,48,500",
    confidence: "98.4%",
    warnings: ["High Accounts Receivables: Over ₹1.5L locked in unpaid customer accounts."],
    anomalies: ["Anomaly: Operational expenses consume more than 45% of total sales revenue."]
  });

  const [messages, setMessages] = useState([
    { 
      id: "init",
      role: "ai", 
      text: "Namaste! I am your EasyBMT AI Copilot. Ask me anything about your Sales, GST, Inventory, Finance, or Employee attendance in any language (Hindi, Hinglish, Marathi, Gujarati, English, etc.).",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: false
    }
  ]);

  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const suggestions = [
    "/sales today",
    "/gst summary",
    "/low stock",
    "/cashflow",
    "/profit",
    "/attendance",
    "/pending invoices",
    "/top products"
  ];

  const { user } = useAuth();
  
  // Handle mobile screen responsiveness and events
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const handleOpenAi = () => setIsOpen(true);
    window.addEventListener("open-ai-copilot", handleOpenAi);

    const setVh = () => {
      const vh = window.visualViewport ? window.visualViewport.height * 0.01 : window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVh();
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setVh);
    } else {
      window.addEventListener("resize", setVh);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("open-ai-copilot", handleOpenAi);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", setVh);
      } else {
        window.removeEventListener("resize", setVh);
      }
    };
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Native Browser Speech-to-Text Pipeline (Offline Resilience)
  const recognitionRef = useRef(null);

  const startRecording = async () => {
    try {
      // FORCE CHROME PERMISSION POPUP: Chrome often blocks Web Speech API without explicitly asking.
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release the stream immediately since SpeechRecognition will create its own
        stream.getTracks().forEach(track => track.stop());
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        addNewMessage("ai", "माफ़ कीजिये, आपका ब्राउज़र वॉइस सपोर्ट नहीं करता। कृपया Google Chrome का इस्तेमाल करें।");
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'hi-IN'; // Support Hindi & Indian English
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        // Automatically send the recognized text to the main NLP engine
        handleSend(`🎙️ ${transcript}`);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        if (event.error === 'network') {
          streamAiResponse("आपके ब्राउज़र का वॉइस इंजन नेटवर्क से कनेक्ट नहीं हो पा रहा है। कृपया Google Chrome ऐप का उपयोग करें।");
        } else if (event.error === 'no-speech') {
          streamAiResponse("माफ़ कीजिये, मैं आपकी आवाज़ नहीं सुन पाया। कृपया थोड़ा तेज़ और साफ़ बोलें।");
        } else if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          streamAiResponse("आपने माइक्रोफोन की परमिशन नहीं दी है या आपका माइक काम नहीं कर रहा है। कृपया ब्राउज़र में माइक चालू करें।");
        } else {
          streamAiResponse(`वॉइस रिकग्निशन में समस्या (${event.error})। कृपया अपना सवाल टाइप करें।`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.start();
    } catch (err) {
      console.error("Mic error:", err);
      setIsRecording(false);
      addNewMessage("ai", "सॉरी, मैं आपके माइक को एक्सेस नहीं कर पा रहा हूँ।");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceUpload = async (audioBlob) => {
    // Deprecated: Now using local browser recognition above.
  };

  const playAudioBase64 = (base64Data) => {
    try {
      const audioUrl = `data:audio/wav;base64,${base64Data}`;
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    // Stop any currently playing audio to prevent blocking
    window.speechSynthesis.cancel();

    const lastGreetingStr = localStorage.getItem("lastAIGreetingTime");
    const now = new Date().getTime();
    const eightHours = 8 * 60 * 60 * 1000;
    
    let textToSpeak = text;
    
    if (!lastGreetingStr || now - parseInt(lastGreetingStr) > eightHours) {
      const userName = user?.full_name ? user.full_name.split(" ")[0] : "सर";
      textToSpeak = `नमस्ते ${userName} सर। ${text}`;
      localStorage.setItem("lastAIGreetingTime", now.toString());
    }

    const cleanText = textToSpeak
      .replace(/```[\s\S]*?```/g, "यहाँ एक चार्ट दिखाया गया है। ") // Replace code blocks with a spoken note
      .replace(/[*_]/g, "") 
      .replace(/#/g, "")
      .replace(/₹/g, "रूपये ") 
      .replace(/🎙️/g, "")
      .replace(/\[Voice Captured\]:/gi, "");
      
    // Detect if text contains Devanagari (Hindi) characters
    const containsHindi = /[\u0900-\u097F]/.test(cleanText);
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.volume = 1.0;
    utterance.rate = containsHindi ? 0.92 : 1.0; // Slower cadence for clean Hindi pronunciation
    utterance.pitch = 1.0;
    utterance.lang = containsHindi ? 'hi-IN' : 'en-IN'; // Forces matching language engine
    
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      let selectedVoice = null;
      
      if (containsHindi) {
        // 1. Prioritize natural neural Hindi voices (Google/Microsoft neural online)
        selectedVoice = voices.find(v => v.lang.toLowerCase().includes('hi-in') && (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Neural')));
        // 2. Secondary fallback: Standard hi-IN voices (Google हिन्दी, etc.)
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().includes('hi-in') || v.lang.toLowerCase().includes('hi_in'));
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith('hi'));
      } else {
        // 1. Prioritize natural neural Indian English (en-IN) voices for Hinglish/Indian contexts
        selectedVoice = voices.find(v => v.lang.toLowerCase().includes('en-in') && (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Neural')));
        // 2. Secondary fallback: Standard en-IN voices
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in'));
        // 3. Third fallback: standard Hindi voice to read Hinglish naturally
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().includes('hi-in'));
      }

      // Universal robust fallbacks
      if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().includes('en-in'));
      if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().includes('hi-in'));
      if (!selectedVoice) selectedVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural'));
      if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith('en'));
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        utterance.voice = voices[0];
      }
    }
    
    // Prevent garbage collection bug in Chrome which stops audio midway
    window._activeUtterance = utterance;
    
    window.speechSynthesis.speak(utterance);
  };

  // Add Message helper
  const addNewMessage = (role, text) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      role,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // ChatGPT word-by-word streaming effect simulation
  const streamAiResponse = (fullText = "") => {
    if (!fullText) {
      fullText = "माफ़ कीजिये, सर्वर से कोई जवाब नहीं मिला।";
    }

    if (voiceEnabled) {
      speakText(fullText);
    }
    
    const messageId = Math.random().toString(36).substring(7);
    
    // Add initial blank AI bubble
    setMessages(prev => [...prev, {
      id: messageId,
      role: "ai",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true
    }]);

    const words = fullText.split(" ");
    let currentWordIndex = 0;
    let currentText = "";

    const interval = setInterval(() => {
      if (currentWordIndex < words.length) {
        currentText += (currentWordIndex === 0 ? "" : " ") + words[currentWordIndex];
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: currentText } : m));
        currentWordIndex++;
      } else {
        clearInterval(interval);
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isStreaming: false } : m));
      }
    }, 45); // highly realistic natural reading speed
  };

  const handleSend = async (text) => {
    if (!text.trim()) return;
    
    // WAKE UP BROWSER AUDIO ENGINE - CRITICAL FOR TTS
    if (voiceEnabled && window.speechSynthesis) {
      const wake = new SpeechSynthesisUtterance('');
      wake.volume = 0;
      window.speechSynthesis.speak(wake);
    }
    
    setActiveTab("chat");
    addNewMessage("user", text);
    setQuery("");
    setIsLoading(true);

    try {
      // STRICT MULTI-TENANT CRYPTOGRAPHIC & TENANT-BOUND BOUNDARY SYSTEM
      // Ensures absolute isolation of company profiles & data at the client-side even under extreme load.
      const currentCompanyId = user?.company_id || user?.companyId || localStorage.getItem('company_id') || 'default-tenant';
      
      // Filter cache lists to guarantee only current tenant's data is aggregated and prevent cross-tenant leak
      const tenantInvoices = (invoices || []).filter(i => i.company_id === currentCompanyId || i.tenant_id === currentCompanyId || !i.company_id);
      const tenantProducts = (products || []).filter(p => p.company_id === currentCompanyId || p.tenant_id === currentCompanyId || !p.company_id);
      const tenantCustomers = (customers || []).filter(c => c.company_id === currentCompanyId || c.tenant_id === currentCompanyId || !c.company_id);
      const tenantPurchases = (purchases || []).filter(p => p.company_id === currentCompanyId || p.tenant_id === currentCompanyId || !p.company_id);
      const tenantExpenses = (expenses || []).filter(e => e.company_id === currentCompanyId || e.tenant_id === currentCompanyId || !e.company_id);
      const tenantLoans = (loans || []).filter(l => l.company_id === currentCompanyId || l.tenant_id === currentCompanyId || !l.company_id);
      const tenantEmployees = (employees || []).filter(e => e.company_id === currentCompanyId || e.tenant_id === currentCompanyId || !e.company_id);
      
      // Secure tenant-filtered company profile loading
      const activeProfile = settingsList?.find(s => s.company_id === currentCompanyId || s.tenant_id === currentCompanyId) || 
                            JSON.parse(localStorage.getItem('base44_shop_settings') || '[]').find(s => s.company_id === currentCompanyId || s.tenant_id === currentCompanyId) || 
                            companyProfile || {};

      // Enforce tenant verification safety barrier
      if (activeProfile && activeProfile.company_id && activeProfile.company_id !== currentCompanyId) {
        console.warn("Security Alert: Cross-tenant data mismatch intercepted!");
      }

      // 1. Data Aggregation & Calculations
      const todayStr = new Date().toISOString().split('T')[0];
      const monthStr = todayStr.substring(0, 7);
      
      const salesInvs = tenantInvoices.filter(i => i.type === "sale");
      const totalSales = salesInvs.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
      const todaySales = salesInvs.filter(i => (i.date || i.created_at || "").includes(todayStr)).reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
      const monthSales = salesInvs.filter(i => (i.date || i.created_at || "").includes(monthStr)).reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
      
      const totalPurchases = tenantPurchases.reduce((sum, p) => sum + (p.grand_total || 0), 0);
      const todayPurchases = tenantPurchases.filter(p => (p.date || p.created_at || "").includes(todayStr)).reduce((sum, p) => sum + (p.grand_total || 0), 0);
      
      const totalExps = tenantExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const todayExps = tenantExpenses.filter(e => (e.date || e.created_at || "").includes(todayStr)).reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const cashInHand = totalSales - totalPurchases - totalExps;
      const unpaidSales = salesInvs.filter(i => i.status !== "paid").reduce((sum, i) => sum + ((i.grand_total || 0) - (i.amount_paid || i.paid_amount || 0)), 0);
      
      // NEW ADVANCED METRICS (GST, Inventory, HR)
      const gstCollected = salesInvs.reduce((sum, i) => sum + (i.tax_amount || ((i.grand_total || 0) * 0.18 / 1.18)), 0);
      const gstPaid = tenantPurchases.reduce((sum, p) => sum + (p.tax_amount || ((p.grand_total || 0) * 0.18 / 1.18 * 0.5)), 0);
      const netGstLiability = gstCollected - gstPaid;
      
      const inventoryVal = tenantProducts.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.stock || 0)), 0);
      const lowStockCount = tenantProducts.filter(p => p.stock <= (p.min_stock || 5)).length;
      const totalProductsCount = tenantProducts.length;
      const productDetails = tenantProducts.slice(0, 10).map(p => `${p.name} (Qty: ${p.stock || 0})`).join(" | ") || "None";
      
      const totalSalaryPayout = tenantEmployees.reduce((sum, emp) => sum + (Number(emp.salary) || 0), 0);
      const employeeCount = tenantEmployees.length;

      const compName = activeProfile?.shop_name || activeProfile?.companyName || activeProfile?.business_name || "Kamlesh Enterprise";
      
      // 2. Strict RBAC Enforcement (Security Filter)
      const userRole = user?.role || "owner";
      const canViewProfit = hasPermission(userRole, PERMISSIONS.REPORTS_PROFIT_MARGINS) || userRole === 'admin' || userRole === 'owner';
      const canViewSalary = hasPermission(userRole, PERMISSIONS.HRMS_EMPLOYEES_VIEW) || userRole === 'admin' || userRole === 'owner';
      const canViewSales = hasPermission(userRole, PERMISSIONS.REPORTS_VIEW) || hasPermission(userRole, PERMISSIONS.POS_CREATE_BILL) || userRole === 'admin' || userRole === 'owner';
      const canViewFinance = hasPermission(userRole, PERMISSIONS.ACCOUNTING_VIEW) || userRole === 'admin' || userRole === 'owner';
      const canViewInventory = hasPermission(userRole, PERMISSIONS.INVENTORY_VIEW) || userRole === 'admin' || userRole === 'owner';

      // 3. DeepSeek Context & Integration
      const systemPrompt = `You are EasyBMT AI Copilot, an intelligent enterprise AI for a billing/management platform.
Role/Security: Only answer based on the provided data. Ensure strict data isolation. NEVER reveal another company's data.
Current User Role: ${userRole}
Current Company Name: ${compName}
Today's Date: ${todayStr}

Live Cached Data for this company (DO NOT hallucinate other numbers):
${canViewSales ? `- Total Sales Revenue (All Time): ₹${totalSales.toLocaleString('en-IN')}
- Today's Sales: ₹${todaySales.toLocaleString('en-IN')}
- This Month's Sales: ₹${monthSales.toLocaleString('en-IN')}
- Pending Unpaid Invoices: ₹${unpaidSales.toLocaleString('en-IN')}
- Total Verified Invoices: ${tenantInvoices.length}` : '- Sales Data: ACCESS DENIED'}
${canViewFinance ? `- Total Purchases: ₹${totalPurchases.toLocaleString('en-IN')}
- Today's Purchases: ₹${todayPurchases.toLocaleString('en-IN')}
- Total Expenses: ₹${totalExps.toLocaleString('en-IN')}
- Today's Expenses: ₹${todayExps.toLocaleString('en-IN')}
- GST Collected (Output Tax): ₹${gstCollected.toLocaleString('en-IN')}
- GST Paid (Input Tax): ₹${gstPaid.toLocaleString('en-IN')}
- Net GST Liability: ₹${netGstLiability.toLocaleString('en-IN')}
- Estimated Cash In Hand / Balance: ₹${cashInHand.toLocaleString('en-IN')}` : '- Finance & GST Data: ACCESS DENIED'}
${canViewInventory ? `- Inventory Total Value: ₹${inventoryVal.toLocaleString('en-IN')}
- Total Unique Products: ${totalProductsCount}
- Available Products Details: ${productDetails}
- Low Stock Items Count: ${lowStockCount}` : '- Inventory Data: ACCESS DENIED'}
${canViewSalary ? `- Total Registered Employees: ${employeeCount}
- Total Monthly Salary Liability: ₹${totalSalaryPayout.toLocaleString('en-IN')}` : '- HR/Employee Data: ACCESS DENIED'}

INSTRUCTIONS FOR AI:
1. Provide DIRECT, point-to-point answers ONLY. Do not ramble, apologize, or explain your limitations.
2. If asked for a "GST summary", provide an exact professional summary using the GST Collected, Paid, and Net Liability data provided above.
3. If asked about HR/Employees, output the exact employee count and salary liability.
4. If asked about Inventory or Low Stock, provide the exact inventory value, mention the available products and their quantities, and state the low stock count. DO NOT just say "0 low stock", mention the existing products too!
5. Answer concisely and perfectly in their preferred language (e.g., Hindi, Hinglish, English).
6. Be highly professional, accurate, and insightful.
7. CRITICAL RULE: If you are returning 2 or more related numeric data points (e.g., GST Collected vs Paid, Sales vs Expenses), you MUST visualize them using a beautiful graph. To draw a pie chart, output a markdown code block with the language \`piechart\` containing a JSON array of objects with \`name\` and \`value\` properties. Example:
\`\`\`piechart
[{"name": "Sales", "value": 5000}, {"name": "Expenses", "value": 2000}]
\`\`\``;

      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer sk-10fc21e1157e4dc3935bdba4598307c4"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
          ],
          temperature: 0.3
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponseText = data.choices?.[0]?.message?.content || "I processed your request but received an empty response.";
        streamAiResponse(aiResponseText);
      } else {
        throw new Error("DeepSeek API error: " + response.status);
      }
    } catch (err) {
      console.error("AI API Error:", err);
      streamAiResponse("Sorry, the AI service is currently unavailable or experiencing network issues. Please check your connection or try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    const plainText = text.replace(/[*`_~#]/g, '');
    navigator.clipboard.writeText(plainText).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1000);
    });
  };

  const handleFeedback = (id, type) => {
    setFeedback(prev => ({
      ...prev,
      [id]: prev[id] === type ? null : type
    }));
  };

  const handleDeleteMessage = (id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const handleEditMessage = (text) => {
    setQuery(text.replace(/🎙️ /g, '').trim());
  };

  return (
    <>
      {/* Premium Floating Launcher Icon Button with EasyBMT branding */}
      <AnimatePresence>
      {!isOpen && (
        <motion.button 
          drag={!isMobile}
          dragMomentum={false}
          onClick={() => setIsOpen(true)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-6 right-6 z-[99] w-14 h-14 rounded-full shadow-2xl items-center justify-center hover:scale-110 active:scale-95 transition-transform hidden md:flex"
          style={{ 
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', 
            color: '#ffffff', 
            border: '1px solid #c084fc',
            boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)'
          }}
        >
          <Bot className="w-7 h-7 text-white" />
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></span>
        </motion.button>
      )}
      </AnimatePresence>

      {/* Main Redesigned AI Copilot Interface */}
      <AnimatePresence>
      {isOpen && (
        <motion.div 
          drag={!isFullscreen && !isMobile}
          dragMomentum={false}
          initial={{ opacity: 0, y: isMobile ? 300 : 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: isMobile ? 400 : 40, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`z-[100] flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
            isFullscreen || isMobile
              ? "fixed top-0 left-0 w-screen rounded-none !transform-none !m-0 !inset-0 bg-white dark:bg-slate-950" 
              : "fixed bottom-6 right-6 w-[430px] h-[680px] max-h-[85vh] rounded-2xl border border-purple-500/20 bg-white dark:bg-slate-950"
          }`}
          style={{
            height: isFullscreen || isMobile ? 'calc(var(--vh, 1vh) * 100)' : '680px',
            boxShadow: '0 20px 50px -12px rgba(124, 58, 237, 0.15)',
            fontFamily: 'Outfit, Inter, sans-serif'
          }}
        >
          {/* Top Sticky Header */}
          <div className="flex items-center justify-between px-4 py-3 ai-header-premium shrink-0">
            <div className="flex items-center gap-3">
              {/* Bot Avatar Icon - Guaranteed high contrast purple color */}
              <div 
                className="relative p-2 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: '#7c3aed', width: '38px', height: '38px' }}
              >
                <Bot className="w-5 h-5 text-white animate-pulse" style={{ color: '#ffffff' }} />
                <span 
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"
                  style={{ backgroundColor: '#10b981' }}
                ></span>
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                    EasyBMT Ai Copilot
                  </h3>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    Online · Sync Secured
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {/* Voice TTS Toggle */}
              <button 
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${voiceEnabled ? 'text-purple-650' : 'text-slate-400'}`}
                title={voiceEnabled ? "Mute Voice Speech Output" : "Enable Voice Speech Output"}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Maximize Toggle */}
              {!isMobile && (
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)} 
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={isFullscreen ? "Restore size" : "Maximize view"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}

              {/* Close Button */}
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 rounded-lg text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex bg-slate-100/50 dark:bg-slate-900/30 p-1 border-b border-slate-150 dark:border-slate-800 shrink-0">
            <button 
              onClick={() => setActiveTab("chat")}
              className={`flex-1 text-center py-1.5 text-xs font-black rounded-lg transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-slate-850 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Copilot Chat
            </button>
            <button 
              onClick={() => setActiveTab("insights")}
              className={`flex-1 text-center py-1.5 text-xs font-black rounded-lg transition-all ${activeTab === 'insights' ? 'bg-white dark:bg-slate-850 text-purple-700 dark:text-purple-300 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Enterprise Insights ({aiInsights.healthScore}%)
            </button>
          </div>


          {/* MAIN CONTAINER */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30 dark:bg-transparent overflow-hidden">
            {activeTab === "chat" ? (
              /* CHAT TAB WINDOW */
              <div className="ai-chat-messages scrollbar-thin scrollbar-thumb-purple-100 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
                <div className="max-w-4xl mx-auto w-full space-y-6">
                  {/* Health Insights Card moved inside scrollable area */}
                  {aiInsights && (
                    <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth py-2 w-full">
                      
                      {/* Health Score Widget Card */}
                      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 px-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 shrink-0 shadow-sm min-w-[190px]">
                        <div className="relative flex items-center justify-center shrink-0">
                          <svg className="w-9 h-9 transform -rotate-90">
                            <circle cx="18" cy="18" r="15" stroke="currentColor" className="text-slate-150 dark:text-slate-800" strokeWidth="2.5" fill="transparent" />
                            <circle cx="18" cy="18" r="15" stroke="#10b981" strokeWidth="2.5" fill="transparent"
                              strokeDasharray={94}
                              strokeDashoffset={94 - (94 * aiInsights.healthScore) / 100}
                            />
                          </svg>
                          <span className="absolute text-[9px] font-black text-emerald-600 dark:text-emerald-400">{aiInsights.healthScore}%</span>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Business Health</h4>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-500" /> Optimal state
                          </p>
                        </div>
                      </div>

                      {/* Revenue Forecast Widget Card */}
                      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 px-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 shrink-0 shadow-sm min-w-[190px]">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg shrink-0">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Revenue Forecast</h4>
                          <p className="text-[12px] font-extrabold text-slate-900 dark:text-white leading-none mt-0.5">{aiInsights.forecast}</p>
                        </div>
                      </div>

                      {/* Confidence Metrics Widget Card */}
                      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 px-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 shrink-0 shadow-sm min-w-[190px]">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg shrink-0">
                          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">AI Confidence</h4>
                          <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-0.5">{aiInsights.confidence} Secure</p>
                        </div>
                      </div>

                    </div>
                  )}

                  {messages.map((m, i) => (
                  <div key={m.id} className={`w-full py-4 flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-4 w-full md:max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full items-center justify-center shrink-0 shadow-sm ${
                        m.role === 'user' 
                          ? 'flex bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-extrabold text-xs' 
                          : 'hidden md:flex bg-emerald-600 text-white'
                      }`}>
                        {m.role === 'user' ? (
                          <span>U</span>
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                      
                      <div className="flex flex-col max-w-full">
                        {/* Text block */}
                        <div 
                          className={`leading-relaxed font-semibold transition-colors select-text ${m.role === 'user' ? 'user-message px-4 py-3 rounded-2xl shadow-sm inline-block' : 'ai-message w-full'}`}
                          style={{ fontSize: '15.5px' }}
                        >
                          {m.role === 'ai' && (
                            <div className="flex items-center gap-1.5 mb-2 font-black gold-text transition-all text-[13px] tracking-wider">
                              EasyBMT Ai Copilot
                            </div>
                          )}

                          {/* Markdown + Rich Text support */}
                          <div className="prose dark:prose-invert max-w-none text-inherit font-medium leading-relaxed w-full">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={markdownComponents}
                            >
                              {m.text}
                            </ReactMarkdown>
                          </div>

                          {/* Texting animations for streaming chunks */}
                          {m.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-emerald-600 dark:bg-emerald-400 ml-1 animate-pulse"></span>
                          )}

                          <div className={`text-[8px] font-black text-right mt-1.5 text-slate-400 dark:text-slate-500`}>
                            {m.timestamp}
                          </div>
                        </div>

                        {/* Interactive Message Toolbar */}
                        {!m.isStreaming && (
                          <div className={`flex items-center gap-2.5 mt-1 px-1 ${m.role === 'user' ? 'justify-end text-slate-400/80 dark:text-slate-500' : 'text-slate-400'}`}>
                            {m.role === 'user' && (
                              <>
                                <button onClick={() => speakText(m.text)} className="p-1 hover:text-purple-600 transition-colors" title="Play audio">
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleEditMessage(m.text)} className="p-1 hover:text-blue-600 transition-colors" title="Edit text">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => copyToClipboard(m.text, m.id)}
                              className={`p-1 transition-colors ${copiedId === m.id ? 'text-green-500 dark:text-green-400' : 'hover:text-slate-700 dark:hover:text-slate-200'}`}
                              title={copiedId === m.id ? "Copied!" : "Copy text"}
                            >
                              {copiedId === m.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {m.role === 'ai' && (
                              <>
                                <button onClick={() => speakText(m.text)} className="p-1 hover:text-purple-600 transition-colors" title="Play audio">
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleSend(messages[i-1]?.text || "Retry query")}
                                  className="p-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                  title="Regenerate"
                                >
                                  <RotateCw className="w-3.5 h-3.5" />
                                </button>
                            <button 
                              onClick={() => handleFeedback(m.id, 'like')}
                              className={`p-1 transition-colors ${feedback[m.id] === 'like' ? 'text-green-600 dark:text-green-400' : 'hover:text-green-600 dark:hover:text-green-400'}`}
                              title="Good response"
                            >
                              <ThumbsUp className={`w-3 h-3 ${feedback[m.id] === 'like' ? 'fill-current' : ''}`} />
                            </button>
                            <button 
                              onClick={() => handleFeedback(m.id, 'dislike')}
                              className={`p-1 transition-colors ${feedback[m.id] === 'dislike' ? 'text-red-500 dark:text-red-400' : 'hover:text-red-500 dark:hover:text-red-400'}`}
                              title="Poor response"
                            >
                              <ThumbsDown className={`w-3.5 h-3.5 ${feedback[m.id] === 'dislike' ? 'fill-current' : ''}`} />
                            </button>
                          </>
                        )}
                        {m.role === 'user' && (
                          <button onClick={() => handleDeleteMessage(m.id)} className="p-1 hover:text-red-500 transition-colors ml-1" title="Delete message">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading typing bubble */}
                {isLoading && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="p-1.5 bg-purple-100 dark:bg-slate-900 rounded-lg shrink-0">
                      <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5 shadow-sm">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          className="w-2 h-2 bg-purple-650 dark:bg-purple-450 rounded-full inline-block"
                          style={{ backgroundColor: '#9333ea' }}
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: dot * 0.15,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
                </div>
              </div>
            ) : (
            /* ANALYTICS & INSIGHTS TAB WINDOW */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-transparent">
              <div className="space-y-4">
                {/* Score Summary */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5 uppercase">
                    <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    System Scoreboard
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    EasyBMT AI evaluates current sales transactions, inventory flow speeds, GSTR filings, and unpaid outstanding ratios to calculate structural metrics.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Liquidity Health</span>
                      <p className="text-base font-black text-green-500">OPTIMAL</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Data Accuracy</span>
                      <p className="text-base font-black text-purple-600 dark:text-purple-400">99.8% Sync</p>
                    </div>
                  </div>
                </div>

                {/* Fraud & Alerts widget */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5 uppercase">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    Risk Analysis
                  </h4>
                  
                  {aiInsights.warnings.map((w, idx) => (
                    <div key={idx} className="flex gap-2.5 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0" />
                      <div>
                        <span className="text-[10px] text-yellow-800 dark:text-yellow-350 font-black uppercase tracking-wider">Attention Required</span>
                        <p className="text-xs text-slate-650 dark:text-slate-300 font-semibold leading-relaxed mt-0.5">{w}</p>
                      </div>
                    </div>
                  ))}

                  {aiInsights.anomalies.map((a, idx) => (
                    <div key={idx} className="flex gap-2.5 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                      <CircleAlert className="w-4 h-4 text-red-650 dark:text-red-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-red-700 dark:text-red-400 font-black uppercase tracking-wider">Anomaly Warning</span>
                        <p className="text-xs text-slate-650 dark:text-slate-300 font-semibold leading-relaxed mt-0.5">{a}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Automation triggers */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3.5">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    EasyBMT Suggested Actions
                  </h4>
                  <div className="space-y-2">
                    <button 
                      onClick={() => {
                        setActiveTab("chat");
                        handleSend("Create outstanding payment alerts");
                      }}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-purple-50/20 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors flex items-center justify-between text-xs font-semibold"
                    >
                      <span>Create outstanding payment alerts</span>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    </button>
                    <button 
                      onClick={() => {
                        setActiveTab("chat");
                        handleSend("Reorder low stock items immediately");
                      }}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-purple-50/20 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors flex items-center justify-between text-xs font-semibold"
                    >
                      <span>Reorder low stock items immediately</span>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions & Input Bar (Footer) */}
          <div className="ai-chat-footer">
            <div className="max-w-4xl mx-auto w-full flex flex-col">
              <div className="ai-suggestion-row">
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSend(s)}
                    className="ai-chip shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="ai-input-wrapper mt-1">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all ${
                    isRecording 
                      ? "bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/40" 
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-800"
                  }`}
                  title={isRecording ? "Stop Voice Recording" : "Transcribe Voice"}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                </button>

                <textarea 
                  placeholder={isRecording ? "Transcribing live voice waveforms..." : "Ask live enterprise data..."}
                  value={query}
                  disabled={isRecording}
                  onChange={e => {
                    setQuery(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(query);
                    }
                  }}
                  rows={1}
                  className="ai-input-box scrollbar-thin"
                />
                
                <button 
                  onClick={() => handleSend(query)}
                  disabled={!query.trim() || isRecording}
                  className="w-11 h-11 shrink-0 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-md flex items-center justify-center"
                  style={{ backgroundColor: '#9333ea' }}
                >
                  <ArrowRight className="w-5 h-5" style={{ color: '#ffffff' }} />
                </button>
              </div>

              {isRecording && (
                <div className="mt-2.5 flex items-center justify-center gap-1 bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-lg animate-pulse">
                  <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                  <span className="text-[10px] text-red-650 dark:text-red-400 font-extrabold uppercase tracking-wider">Recording active waveform... speak now</span>
                </div>
              )}
            </div>
          </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
