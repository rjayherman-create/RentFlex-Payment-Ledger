import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  FileText,
  Home,
  Lock,
  Mail,
  MessageSquareText,
  NotebookPen,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Send,
  Settings,
  Shield,
  UsersRound,
  UserRound,
  WalletCards
} from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { AuthControls } from "@/components/AuthControls";
import brandLogo from "@/assets/logo-with-text.png";

type PlanType = "monthly" | "twice_monthly" | "weekly" | "bi_weekly" | "custom";
type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type PaymentMethod = "cash_app" | "chime" | "zelle" | "venmo" | "paypal" | "ach" | "cash" | "money_order" | "other";
type PaymentStatus = "paid" | "window_open" | "partial" | "late" | "upcoming" | "missed";
type ViewId = "dashboard" | "rent_due" | "properties" | "tenants" | "payment_plans" | "plan_acceptance" | "new_tenant" | "documents" | "ledger" | "reminders" | "late" | "reports" | "settings" | "mobile_app" | "security" | "privacy" | "terms";
type UserRole = "owner" | "manager" | "viewer";
type DocumentKind = "invoice" | "statement";
type DocumentStatus = "draft" | "approved" | "sent";
type PlanStatus = "active" | "paused" | "completed" | "cancelled";
type AccountType =
  | "section_8"
  | "cash_paying"
  | "ssi_disability"
  | "social_security"
  | "employment"
  | "pension"
  | "fixed_income"
  | "mixed_income"
  | "other";
type ReminderOffset = "three_days_before" | "one_day_before" | "payment_day" | "two_days_late" | "seven_days_late";
type DeliveryMethod = "sms" | "email" | "push" | "in_app";

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  unitNumber?: string;
  status: "active" | "inactive";
}

interface PaymentPlan {
  planName: string;
  status: PlanStatus;
  monthlyRent: number;
  planType: PlanType;
  graceDays: number;
  paymentFrequency?: PlanType;
  typicalPayday?: Weekday;
  nextExpectedPayday?: string;
  leaseDueDate?: string;
  installments: Array<{
    label: string;
    amount: number;
    windowStartDay: number;
    windowEndDay: number;
    expectedDate?: string;
  }>;
}

interface Tenant {
  id: string;
  propertyId: string;
  firstName: string;
  lastInitial: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact: string;
  emergencyPhone: string;
  accountType: AccountType;
  preferredPaymentMethod: PaymentMethod;
  paymentMethods: PaymentMethod[];
  cashAppTag: string;
  chimeSign: string;
  chimePhone: string;
  chimeEmail: string;
  backupPaymentMethod: PaymentMethod;
  startOfLease: string;
  leaseEndDate: string;
  moveInDate: string;
  securityDeposit: number;
  lateFee: number;
  currentBalance: number;
  reminderOffsets: ReminderOffset[];
  deliveryMethods: DeliveryMethod[];
  memo: string;
  active: boolean;
  plan: PaymentPlan;
  notes: string[];
}

interface Payment {
  id: string;
  tenantId: string;
  installmentLabel: string;
  amount: number;
  method: PaymentMethod;
  receivedDate: string;
  note: string;
  enteredBy: string;
  timestamp: string;
}

interface PromiseToPay {
  id: string;
  tenantId: string;
  promisedAmount: number;
  promisedDate: string;
  note: string;
  status: "open" | "kept" | "broken";
}

interface ReminderLog {
  id: string;
  tenantId: string;
  message: string;
  sendDate: string;
  status: "draft" | "queued" | "sent";
}

interface CommunicationReceipt {
  id: string;
  tenantId: string;
  channel: "document" | "reminder";
  createdAt: string;
  summary: string;
}

interface AuditEvent {
  id: string;
  actorRole: UserRole;
  action: string;
  targetId: string;
  createdAt: string;
  details: string;
}

interface PlanAcceptanceRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyAddress: string;
  phoneNumber: string;
  acceptedAt: string;
  agreementVersion: string;
  deviceInfo: string;
  ipAddress: string;
  acceptedVia: "link" | "sms_yes";
  typedName: string;
  planName: string;
  paymentPlanDescription: string;
  nextExpectedPaymentDate: string;
}

interface PlanActivityLogEntry {
  id: string;
  tenantId: string;
  title: string;
  details: string;
  createdAt: string;
  agreementVersion?: string;
}

interface GeneratedPlanPdf {
  id: string;
  tenantId: string;
  fileName: string;
  content: string;
  createdAt: string;
}

interface RentDocument {
  id: string;
  tenantId: string;
  kind: DocumentKind;
  title: string;
  amountDue: number;
  issueDate: string;
  dueDate: string;
  delivery: Array<"email" | "text">;
  status: DocumentStatus;
  approvedAt?: string;
  sentAt?: string;
  body: string;
}

interface InstallmentState {
  tenant: Tenant;
  property: Property;
  label: string;
  expectedAmount: number;
  paidAmount: number;
  balance: number;
  windowStart: Date;
  windowEnd: Date;
  graceEnd: Date;
  status: PaymentStatus;
}

interface LedgerRow {
  date: string;
  description: string;
  charge: number;
  payment: number;
  balance: number;
}

interface NewTenantDraft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  unitNumber: string;
  moveInDate: string;
  startOfLease: string;
  leaseEndDate: string;
  leaseDueDate: string;
  accountType: AccountType;
  monthlyRent: string;
  securityDeposit: string;
  lateFee: string;
  graceDays: string;
  currentBalance: string;
  paymentFrequency: PlanType;
  typicalPayday: Weekday;
  nextExpectedPayday: string;
  paymentMethods: PaymentMethod[];
  preferredPaymentMethod: PaymentMethod;
  cashAppTag: string;
  chimeSign: string;
  chimePhone: string;
  chimeEmail: string;
  backupPaymentMethod: PaymentMethod;
  planName: string;
  planStatus: PlanStatus;
  planType: PlanType;
  planRows: Array<{ label: string; amount: string; windowStartDay: string; windowEndDay: string }>;
  reminderOffsets: ReminderOffset[];
  deliveryMethods: DeliveryMethod[];
  memo: string;
}

interface AppState {
  activityLogs?: PlanActivityLogEntry[];
  auditEvents?: AuditEvent[];
  communicationReceipts?: CommunicationReceipt[];
  documents: RentDocument[];
  generatedPlanPdfs?: GeneratedPlanPdf[];
  payments: Payment[];
  planAcceptances?: PlanAcceptanceRecord[];
  promises: PromiseToPay[];
  properties: Property[];
  reminders: ReminderLog[];
  tenants: Tenant[];
}

interface ParsedTenantCsvRow {
  sourceRowNumber: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  unitNumber: string;
  monthlyRent: number;
  preferredPaymentMethod: PaymentMethod;
  cashAppTag: string;
  chimeSign: string;
  chimePhone: string;
}

interface CsvParseResult {
  rows: ParsedTenantCsvRow[];
  invalidIssues: CsvImportIssue[];
  invalidRows: number;
  totalRows: number;
  sampleErrors: string[];
}

interface CsvImportIssue {
  rowNumber: number;
  reason: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  unitNumber: string;
  monthlyRent: string;
  preferredPaymentMethod: string;
  cashAppTag: string;
  chimeSign: string;
  chimePhone: string;
}

interface CsvImportReport {
  totalRows: number;
  validRows: number;
  importedRows: number;
  skippedRows: number;
  invalidRows: number;
  sampleErrors: string[];
}

const today = new Date(2026, 5, 3);
const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const propertiesSeed: Property[] = [
  { id: "prop-1", address: "123 Main Street", city: "Newark", state: "NJ", zip: "07102", unitNumber: "1", status: "active" },
  { id: "prop-2", address: "45 Oak Street", city: "Irvington", state: "NJ", zip: "07111", unitNumber: "2B", status: "active" },
  { id: "prop-3", address: "88 Pine Street", city: "East Orange", state: "NJ", zip: "07017", unitNumber: "", status: "active" },
  { id: "prop-4", address: "14 Bergen Avenue", city: "Jersey City", state: "NJ", zip: "07305", unitNumber: "", status: "inactive" }
];

const tenantsSeed: Tenant[] = [
  {
    id: "tenant-1",
    propertyId: "prop-1",
    firstName: "John",
    lastInitial: "D.",
    lastName: "Davis",
    email: "john.d@example.com",
    phone: "(973) 555-0184",
    emergencyContact: "Lisa Davis",
    emergencyPhone: "(973) 555-0199",
    accountType: "employment",
    preferredPaymentMethod: "cash_app",
    paymentMethods: ["cash_app", "chime", "money_order"],
    cashAppTag: "$JohnTenant",
    chimeSign: "$JohnTenant",
    chimePhone: "(973) 555-0184",
    chimeEmail: "john.d@example.com",
    backupPaymentMethod: "money_order",
    moveInDate: "2025-09-01",
    startOfLease: "2026-03-01",
    leaseEndDate: "2026-08-31",
    securityDeposit: 900,
    lateFee: 50,
    currentBalance: 450,
    reminderOffsets: ["three_days_before", "one_day_before", "payment_day", "two_days_late", "seven_days_late"],
    deliveryMethods: ["sms", "email"],
    memo: "Tenant pays in two installments. Send reminder before each payment window.",
    active: true,
    plan: {
      planName: "Twice Monthly Rent Plan",
      status: "active",
      monthlyRent: 900,
      planType: "twice_monthly",
      graceDays: 3,
      installments: [
        { label: "First June installment", amount: 450, windowStartDay: 1, windowEndDay: 7 },
        { label: "Second June installment", amount: 450, windowStartDay: 15, windowEndDay: 22 }
      ]
    },
    notes: ["Prefers reminder two days before window opens.", "Usually replies PAID after Cash App transfer."]
  },
  {
    id: "tenant-2",
    propertyId: "prop-2",
    firstName: "Maria",
    lastInitial: "S.",
    lastName: "Santos",
    email: "maria.s@example.com",
    phone: "(862) 555-0119",
    emergencyContact: "Ana Santos",
    emergencyPhone: "(862) 555-0190",
    accountType: "mixed_income",
    preferredPaymentMethod: "chime",
    paymentMethods: ["chime", "cash", "zelle"],
    cashAppTag: "$MariaRent",
    chimeSign: "$MariaRent",
    chimePhone: "(862) 555-0119",
    chimeEmail: "maria.s@example.com",
    backupPaymentMethod: "cash",
    moveInDate: "2024-12-15",
    startOfLease: "2024-12-15",
    leaseEndDate: "2026-12-14",
    securityDeposit: 850,
    lateFee: 40,
    currentBalance: 550,
    reminderOffsets: ["three_days_before", "one_day_before", "payment_day", "two_days_late", "seven_days_late"],
    deliveryMethods: ["sms", "email", "in_app"],
    memo: "Partial payments common when work hours change. Keep communication history in notes.",
    active: true,
    plan: {
      planName: "Mixed Income Split Plan",
      status: "active",
      monthlyRent: 850,
      planType: "twice_monthly",
      graceDays: 2,
      installments: [
        { label: "First June installment", amount: 425, windowStartDay: 1, windowEndDay: 5 },
        { label: "Second June installment", amount: 425, windowStartDay: 15, windowEndDay: 20 }
      ]
    },
    notes: ["Partial payments common when work hours change."]
  },
  {
    id: "tenant-3",
    propertyId: "prop-3",
    firstName: "Robert",
    lastInitial: "K.",
    lastName: "King",
    email: "robert.k@example.com",
    phone: "(201) 555-0162",
    emergencyContact: "Dana King",
    emergencyPhone: "(201) 555-0191",
    accountType: "ssi_disability",
    preferredPaymentMethod: "chime",
    paymentMethods: ["chime", "cash", "money_order"],
    cashAppTag: "$RobPaysRent",
    chimeSign: "$RobPaysRent",
    chimePhone: "(201) 555-0162",
    chimeEmail: "robert.k@example.com",
    backupPaymentMethod: "money_order",
    moveInDate: "2026-01-01",
    startOfLease: "2026-01-01",
    leaseEndDate: "2026-12-31",
    securityDeposit: 1000,
    lateFee: 35,
    currentBalance: 1000,
    reminderOffsets: ["three_days_before", "one_day_before", "payment_day", "two_days_late", "seven_days_late"],
    deliveryMethods: ["sms", "in_app"],
    memo: "Tenant receives SSI on the 3rd. Weekly plan is used to keep payments manageable.",
    active: true,
    plan: {
      planName: "SSI Weekly Payment Plan",
      status: "active",
      monthlyRent: 1000,
      planType: "weekly",
      graceDays: 1,
      installments: [
        { label: "Week 1 rent", amount: 250, windowStartDay: 1, windowEndDay: 3 },
        { label: "Week 2 rent", amount: 250, windowStartDay: 8, windowEndDay: 10 },
        { label: "Week 3 rent", amount: 250, windowStartDay: 15, windowEndDay: 17 },
        { label: "Week 4 rent", amount: 250, windowStartDay: 22, windowEndDay: 24 }
      ]
    },
    notes: ["Needs short messages. Avoid long explanations."]
  }
];

const paymentsSeed: Payment[] = [
  {
    id: "pay-1",
    tenantId: "tenant-1",
    installmentLabel: "First June installment",
    amount: 450,
    method: "cash_app",
    receivedDate: "2026-06-02",
    note: "Cash App received, tenant replied PAID.",
    enteredBy: "Landlord",
    timestamp: "2026-06-02T20:13:00"
  },
  {
    id: "pay-2",
    tenantId: "tenant-2",
    installmentLabel: "First June installment",
    amount: 300,
    method: "chime",
    receivedDate: "2026-06-03",
    note: "Partial Chime payment. Balance promised Friday.",
    enteredBy: "Landlord",
    timestamp: "2026-06-03T09:20:00"
  }
];

const promisesSeed: PromiseToPay[] = [
  {
    id: "promise-1",
    tenantId: "tenant-2",
    promisedAmount: 125,
    promisedDate: "2026-06-05",
    note: "Tenant promised to send remaining first installment after shift.",
    status: "open"
  },
  {
    id: "promise-2",
    tenantId: "tenant-3",
    promisedAmount: 250,
    promisedDate: "2026-06-04",
    note: "Asked for one extra day on week 1.",
    status: "open"
  }
];

const documentSeed: RentDocument[] = [
  {
    id: "doc-2",
    tenantId: "tenant-2",
    kind: "statement",
    title: "June balance statement",
    amountDue: 550,
    issueDate: "2026-06-03",
    dueDate: "2026-06-05",
    delivery: ["email", "text"],
    status: "draft",
    body: "Statement for 45 Oak Street showing $300 received and $550 still open for June rent. Tenant has an open promise to pay $125 on Jun 5."
  },
  {
    id: "doc-3",
    tenantId: "tenant-3",
    kind: "invoice",
    title: "Week 1 rent invoice",
    amountDue: 250,
    issueDate: "2026-06-01",
    dueDate: "2026-06-04",
    delivery: ["text"],
    status: "draft",
    body: "Invoice for Robert K. at 88 Pine Street. Week 1 rent amount due is $250. Please pay by Chime to $RobPaysRent or contact the landlord."
  },
  {
    id: "doc-1",
    tenantId: "tenant-1",
    kind: "invoice",
    title: "June rent installment invoice",
    amountDue: 450,
    issueDate: "2026-06-01",
    dueDate: "2026-06-07",
    delivery: ["email", "text"],
    status: "approved",
    approvedAt: "2026-06-01T08:30:00",
    body: "Invoice for the first June rent installment at 123 Main Street. Amount due: $450. Payment may be sent by Cash App to $JohnTenant or by backup money order."
  }
];

const defaultNewTenantDraft: NewTenantDraft = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  emergencyContact: "",
  emergencyPhone: "",
  address: "",
  city: "",
  state: "NJ",
  zip: "",
  unitNumber: "",
  moveInDate: "2026-06-03",
  startOfLease: "2026-03-01",
  leaseEndDate: "2027-06-02",
  leaseDueDate: "2026-06-01",
  accountType: "cash_paying",
  monthlyRent: "900",
  securityDeposit: "900",
  lateFee: "50",
  graceDays: "3",
  currentBalance: "900",
  paymentFrequency: "twice_monthly",
  typicalPayday: "wednesday",
  nextExpectedPayday: "2026-06-03",
  paymentMethods: ["cash_app", "chime"],
  preferredPaymentMethod: "cash_app",
  cashAppTag: "",
  chimeSign: "",
  chimePhone: "",
  chimeEmail: "",
  backupPaymentMethod: "money_order",
  planName: "Flexible Installment Plan",
  planStatus: "active",
  planType: "twice_monthly",
  planRows: [
    { label: "Payment 1", amount: "450", windowStartDay: "3", windowEndDay: "3" },
    { label: "Payment 2", amount: "450", windowStartDay: "17", windowEndDay: "17" }
  ],
  reminderOffsets: ["three_days_before", "one_day_before", "payment_day", "two_days_late", "seven_days_late"],
  deliveryMethods: ["sms", "email", "in_app"],
  memo: "Tenant receives SSI on the 3rd of each month and pension on the 17th. Rent is collected in two installments. Send reminder 3 days before each payment date."
};

export default function App() {
  const authRequired = import.meta.env.PROD;
  const [sessionToken, setSessionToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const token = localStorage.getItem("rentflex-session-token") ?? "";
    return isSessionTokenValid(token) ? token : "";
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("rentflex-session-token") ?? "";
    return isSessionTokenValid(token);
  });
  const userRole = useMemo(() => decodeSessionTokenPayload(sessionToken)?.role as UserRole || "owner", [sessionToken]);
  const [bootLoading, setBootLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSensitive, setShowSensitive] = useState(false);
  const [communicationReceipts, setCommunicationReceipts] = useState<CommunicationReceipt[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [csvImportBusy, setCsvImportBusy] = useState(false);
  const [csvImportReport, setCsvImportReport] = useState<CsvImportReport | null>(null);
  const [csvImportIssues, setCsvImportIssues] = useState<CsvImportIssue[]>([]);
  const loadAbortRef = useRef<AbortController | null>(null);
  const [view, setView] = useState<ViewId>("dashboard");
  const [properties, setProperties] = useState<Property[]>(propertiesSeed);
  const [tenants, setTenants] = useState<Tenant[]>(tenantsSeed);
  const [payments, setPayments] = useState<Payment[]>(paymentsSeed);
  const [promises, setPromises] = useState<PromiseToPay[]>(promisesSeed);
  const [reminders, setReminders] = useState<ReminderLog[]>([]);
  const [documents, setDocuments] = useState<RentDocument[]>(documentSeed);
  const [selectedTenantId, setSelectedTenantId] = useState("tenant-1");
  const [planAcceptanceTenantId, setPlanAcceptanceTenantId] = useState<string | null>(null);
  const [planAcceptanceRecords, setPlanAcceptanceRecords] = useState<PlanAcceptanceRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<PlanActivityLogEntry[]>([]);
  const [generatedPlanPdfs, setGeneratedPlanPdfs] = useState<GeneratedPlanPdf[]>([]);
  const [query, setQuery] = useState("");
  const [propertyFilter] = useState("all");
  const [syncStatus, setSyncStatus] = useState("Using local demo data");
  const [paymentDraft, setPaymentDraft] = useState({
    amount: "450",
    installmentLabel: "First June installment",
    method: "cash_app" as PaymentMethod,
    note: "Payment manually confirmed."
  });
  const [promiseDraft, setPromiseDraft] = useState({
    amount: "150",
    date: "2026-06-05",
    note: "Tenant promised a follow-up payment."
  });
  const [newTenantDraft, setNewTenantDraft] = useState<NewTenantDraft>(defaultNewTenantDraft);
  const [newTenantError, setNewTenantError] = useState("");
  const [newTenantFieldErrors, setNewTenantFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [newTenantStep, setNewTenantStep] = useState(0);
  const [lastGeneratedDocumentIds, setLastGeneratedDocumentIds] = useState<string[]>([]);
  const [actionBusy, setActionBusy] = useState({
    saveTenant: false,
    savePayment: false,
    savePromise: false,
    generateDrafts: false,
    approvingDocumentId: "",
    sendingDocumentId: ""
  });

  function refreshStateFromApi() {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    const startedAt = Date.now();
    return loadAppState(controller.signal)
      .then((state) => {
        if (controller.signal.aborted) return;
        setProperties(state.properties);
        setTenants(state.tenants);
        setPayments(state.payments);
        setPromises(state.promises);
        setReminders(state.reminders);
        setDocuments(state.documents);
        setCommunicationReceipts(state.communicationReceipts ?? []);
        setAuditEvents(state.auditEvents ?? []);
        setPlanAcceptanceRecords(state.planAcceptances ?? []);
        setActivityLogs(state.activityLogs ?? []);
        setGeneratedPlanPdfs(state.generatedPlanPdfs ?? []);
        setSelectedTenantId(state.tenants[0]?.id ?? "tenant-1");
        setSyncStatus("Connected to SQLite database");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSyncStatus("API offline - using local demo data");
      })
      .finally(() => {
        const elapsed = Date.now() - startedAt;
        const delay = Math.max(0, 550 - elapsed);
        setTimeout(() => setBootLoading(false), delay);
      });
  }

  useEffect(() => {
    void refreshStateFromApi();
    return () => {
      loadAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!authRequired || !isAuthenticated) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        localStorage.removeItem("rentflex-session-token");
        setSessionToken("");
        setIsAuthenticated(false);
        showToast("Session expired for security. Sign in again.", "error");
      }, 20 * 60 * 1000);
    };
    const events: Array<keyof WindowEventMap> = ["click", "keydown", "mousemove", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, reset));
    reset();
    return () => {
      clearTimeout(timeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, reset));
    };
  }, [authRequired, isAuthenticated]);

  useEffect(() => {
    if (!authRequired) return;
    if (!isAuthenticated) setView("dashboard");
  }, [authRequired, isAuthenticated]);

  useEffect(() => {
    if (!sessionToken) return;
    localStorage.setItem("rentflex-session-token", sessionToken);
  }, [sessionToken]);

  useEffect(() => {
    void trackAnalyticsEvent("view_changed", { view });
  }, [view]);

  useEffect(() => {
    if (view !== "new_tenant") return;
    void trackAnalyticsEvent("tenant_wizard_step", { step: newTenantStep + 1 });
  }, [newTenantStep, view]);

  useEffect(() => {
    function onBeforeUnload() {
      const dirty = JSON.stringify(newTenantDraft) !== JSON.stringify(defaultNewTenantDraft);
      if (view === "new_tenant" && dirty) {
        void trackAnalyticsEvent("tenant_form_abandon", { step: newTenantStep + 1 });
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [newTenantDraft, newTenantStep, view]);

  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? tenants[0];
  const selectedProperty = properties.find((property) => property.id === selectedTenant.propertyId) ?? properties[0];
  const planAcceptanceTenant = tenants.find((tenant) => tenant.id === planAcceptanceTenantId) ?? selectedTenant;
  const planAcceptanceProperty = properties.find((property) => property.id === planAcceptanceTenant.propertyId) ?? selectedProperty;

  const installmentStates = useMemo(
    () => buildInstallmentStates(tenants, properties, payments),
    [payments, properties, tenants]
  );
  const planAcceptanceInstallments = installmentStates.filter((item) => item.tenant.id === planAcceptanceTenant.id);

  const filteredInstallmentStates = useMemo(() => {
    const normalizedQuery = debouncedQuery;
    return installmentStates.filter((state) => {
      const propertyMatches = propertyFilter === "all" || state.property.id === propertyFilter;
      const textMatches = !normalizedQuery || `${state.tenant.firstName} ${state.tenant.lastName} ${state.property.address} ${state.tenant.phone} ${state.tenant.cashAppTag} ${state.tenant.chimeSign}`.toLowerCase().includes(normalizedQuery);
      return propertyMatches && textMatches;
    });
  }, [debouncedQuery, installmentStates, propertyFilter]);

  const monthTotals = useMemo(() => {
    const expected = filteredInstallmentStates.reduce((sum, item) => sum + item.expectedAmount, 0);
    const visibleTenantIds = new Set(filteredInstallmentStates.map((state) => state.tenant.id));
    const paid = payments.filter((payment) => visibleTenantIds.has(payment.tenantId)).reduce((sum, payment) => sum + payment.amount, 0);
    return { expected, paid, balance: expected - paid };
  }, [filteredInstallmentStates, payments]);

  const visibleTenants = tenants.filter((tenant) => {
    const property = properties.find((item) => item.id === tenant.propertyId);
    const haystack = `${tenant.firstName} ${tenant.lastInitial} ${tenant.phone} ${tenant.email} ${tenant.cashAppTag} ${tenant.chimeSign} ${tenant.chimePhone} ${tenant.chimeEmail} ${property?.address}`.toLowerCase();
    return haystack.includes(debouncedQuery);
  });

  const recoveredViaReminders = useMemo(() => {
    const remindedTenantIds = new Set(reminders.filter((item) => item.status === "sent").map((item) => item.tenantId));
    return payments.filter((payment) => remindedTenantIds.has(payment.tenantId)).reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments, reminders]);

  const selectedInstallments = installmentStates.filter((item) => item.tenant.id === selectedTenant.id);
  const selectedBalance = selectedInstallments.reduce((sum, item) => sum + item.balance, 0);
  const documentStats = {
    drafts: documents.filter((document) => document.status === "draft").length,
    approved: documents.filter((document) => document.status === "approved").length,
    sent: documents.filter((document) => document.status === "sent").length
  };
  const upcomingStates = filteredInstallmentStates.filter((state) => state.balance > 0 && state.status === "upcoming" && daysUntil(toInputDate(state.windowStart)) <= 7);
  const overdueStates = filteredInstallmentStates.filter((state) => state.status === "late" || state.status === "missed");
  const overdueBalance = overdueStates.reduce((sum, state) => sum + state.balance, 0);
  const dashboardStats = {
    activeTenants: tenants.filter((tenant) => tenant.active).length,
    leaseExpiring: tenants.filter((tenant) => daysUntil(tenant.leaseEndDate) >= 0 && daysUntil(tenant.leaseEndDate) <= 90).length,
    rentOverdue: filteredInstallmentStates.filter((state) => state.status === "late" || state.status === "missed" || state.status === "partial").length,
    pendingDocuments: documentStats.drafts + documentStats.approved,
    upcomingBalance: upcomingStates.reduce((sum, state) => sum + state.balance, 0),
    overdueBalance
  };
  const checklistItems = [
    { label: "Add your first tenant", done: tenants.length > 0, action: () => { setNewTenantStep(0); setView("new_tenant"); } },
    { label: "Save a payment", done: payments.length > 0, action: () => setView("tenants") },
    { label: "Generate first draft", done: documents.length > 0, action: () => { setView("documents"); generateDocuments(); } },
    { label: "Open inbox", done: reminders.length > 0, action: () => setView("reminders") }
  ];
  const checklistDone = checklistItems.filter((item) => item.done).length;
  const checklistPercent = Math.round((checklistDone / checklistItems.length) * 100);

  function showToast(message: string, kind: "success" | "error" = "success") {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3500);
  }

  function requireAuth() {
    if (!authRequired || isAuthenticated) return true;
    showToast("Sign in first to perform this action.", "error");
    return false;
  }

  function getAuthHeaders() {
    return sessionToken ? { "X-Session-Token": sessionToken } : {} as Record<string, string>;
  }

  function requireFinancialPermission(actionLabel: string) {
    if (userRole === "viewer") {
      showToast(`Your role cannot ${actionLabel}. Contact owner for access.`, "error");
      return false;
    }
    return true;
  }

  function maskValue(value: string) {
    if (showSensitive) return value || "-";
    if (!value) return "-";
    if (value.length <= 4) return "••••";
    return `${"•".repeat(Math.max(4, value.length - 3))}${value.slice(-3)}`;
  }

  function appendAudit(action: string, targetId: string, details: string) {
    const event: AuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      actorRole: userRole,
      action,
      targetId,
      details,
      createdAt: new Date().toISOString()
    };
    setAuditEvents((current) => [event, ...current]);
    void apiPost("/api/audit-events", event, { idempotencyKey: createIdempotencyKey("audit", event.id), headers: getAuthHeaders() });
  }

  function addCommunicationReceipt(tenantId: string, channel: "document" | "reminder", summary: string) {
    const receipt: CommunicationReceipt = {
      id: `rcpt-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      tenantId,
      channel,
      summary,
      createdAt: new Date().toISOString()
    };
    setCommunicationReceipts((current) => [receipt, ...current]);
    void apiPost("/api/communication-receipts", receipt, { idempotencyKey: createIdempotencyKey("receipt", receipt.id), headers: getAuthHeaders() });
    showToast(`Sent successfully. Receipt ${receipt.id}. Next: log tenant reply.`);
  }

  function clearTenantFieldError(field: string) {
    setNewTenantFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function normalizeMoneyInput(value: string) {
    return Number(value.replace(/[$,\s]/g, ""));
  }

  function createIdempotencyKey(prefix: string, subject: string) {
    return `${prefix}:${subject}:${Date.now()}:${Math.random().toString(16).slice(2, 10)}`;
  }

  function runSampleWalkthrough() {
    setView("tenants");
    setSelectedTenantId(tenants[0]?.id ?? selectedTenantId);
    showToast("Walkthrough started: review tenant profile, save a payment, then generate drafts.");
  }

  function recordPayment() {
    if (!requireAuth()) return;
    if (!requireFinancialPermission("save payments")) return;
    if (actionBusy.savePayment) return;
    const amount = normalizeMoneyInput(paymentDraft.amount);
    if (!paymentDraft.amount.trim() || !Number.isFinite(amount) || amount === 0) {
      showToast("Enter a valid payment amount greater than $0.", "error");
      return;
    }
    if (amount < 0 && !/adjustment:/i.test(paymentDraft.note)) {
      showToast("Negative amounts require a note starting with 'adjustment:' explaining why.", "error");
      return;
    }
    const now = Date.now();
    const recentDuplicate = payments.find(
      (p) =>
        p.tenantId === selectedTenant.id &&
        p.installmentLabel === paymentDraft.installmentLabel &&
        p.amount === amount &&
        now - new Date(p.timestamp).getTime() < 6000
    );
    if (recentDuplicate) {
      showToast("This payment was just recorded. Confirm before submitting again.", "error");
      return;
    }
    const idempotencyKey = createIdempotencyKey("payment", `${selectedTenant.id}-${paymentDraft.installmentLabel}-${amount}`);
    const payment = {
      id: `pay-${Date.now()}`,
      tenantId: selectedTenant.id,
      installmentLabel: paymentDraft.installmentLabel,
      amount,
      method: paymentDraft.method,
      receivedDate: toInputDate(today),
      note: paymentDraft.note,
      enteredBy: "Landlord",
      timestamp: new Date().toISOString()
    };
    setActionBusy((current) => ({ ...current, savePayment: true }));
    setPayments((current) => [payment, ...current]);
    appendAudit("payment_saved", payment.id, `${selectedTenant.id} ${money(amount)} ${payment.method}`);
    showToast(`${money(amount)} received from ${selectedTenant.firstName} ${selectedTenant.lastInitial}`);
    void apiPost("/api/payments", payment, { idempotencyKey })
      .catch(() => showToast("Payment saved locally. Retry sync when online.", "error"))
      .finally(() => setActionBusy((current) => ({ ...current, savePayment: false })));
  }

  function recordPromise() {
    if (!requireAuth()) return;
    if (!requireFinancialPermission("save promises")) return;
    if (actionBusy.savePromise) return;
    const promisedAmount = normalizeMoneyInput(promiseDraft.amount);
    if (!promiseDraft.amount.trim() || !Number.isFinite(promisedAmount) || promisedAmount <= 0) {
      showToast("Enter a valid promised amount greater than $0.", "error");
      return;
    }
    if (!promiseDraft.date) {
      showToast("Select a promised payment date.", "error");
      return;
    }
    const promise = {
      id: `promise-${Date.now()}`,
      tenantId: selectedTenant.id,
      promisedAmount,
      promisedDate: promiseDraft.date,
      note: promiseDraft.note,
      status: "open" as const
    };
    const idempotencyKey = createIdempotencyKey("promise", `${selectedTenant.id}-${promisedAmount}-${promiseDraft.date}`);
    setActionBusy((current) => ({ ...current, savePromise: true }));
    setPromises((current) => [promise, ...current]);
    appendAudit("promise_saved", promise.id, `${selectedTenant.id} ${money(promisedAmount)} on ${promiseDraft.date}`);
    showToast(`Promise to pay ${money(promisedAmount)} recorded.`);
    void apiPost("/api/promises", promise, { idempotencyKey })
      .catch(() => showToast("Promise saved locally. Retry sync when online.", "error"))
      .finally(() => setActionBusy((current) => ({ ...current, savePromise: false })));
  }

  function openPlanAcceptance(tenantId: string) {
    setPlanAcceptanceTenantId(tenantId);
    setSelectedTenantId(tenantId);
    setView("plan_acceptance");
  }

  function shiftPlanNextPayday(tenantId: string) {
    if (!requireAuth()) return;
    if (!requireFinancialPermission("shift schedules")) return;
    const tenant = tenants.find((item) => item.id === tenantId);
    if (!tenant) return;
    const proceed = window.confirm(`Shift next payday forward for ${tenant.firstName} ${tenant.lastInitial}?`);
    if (!proceed) return;

    const nextExpectedPayday = toInputDate(
      advanceDateByFrequency(
        parseInputDate(tenant.plan.nextExpectedPayday ?? toInputDate(today)),
        tenant.plan.paymentFrequency ?? tenant.plan.planType
      )
    );

    const updatedPlan = createPlanFromType(
      tenant.plan.planType,
      tenant.plan.monthlyRent,
      tenant.plan.graceDays,
      tenant.plan.typicalPayday ?? "friday",
      nextExpectedPayday,
      tenant.plan.leaseDueDate ?? tenant.leaseEndDate,
      tenant.plan.installments
    );

    setTenants((current) =>
      current.map((item) => (item.id === tenantId ? { ...item, plan: updatedPlan } : item))
    );

    void apiPatch(`/api/tenants/${tenantId}/payday`, { plan: updatedPlan }).then((response) => {
      if (response?.activityLog) {
        setActivityLogs((current) => [response.activityLog, ...current]);
      }
    });
    appendAudit("payday_shifted", tenantId, `Next expected payday ${updatedPlan.nextExpectedPayday ?? "TBD"}`);
    setSyncStatus("Next payday updated without creating a new plan");
  }

  function acceptPaymentPlan(acceptedVia: "link" | "sms_yes", typedName: string) {
    const tenant = planAcceptanceTenant;
    const property = planAcceptanceProperty;
    const nextInstallment = planAcceptanceInstallments.find((item) => item.balance > 0) ?? planAcceptanceInstallments[0];
    const record: PlanAcceptanceRecord = {
      id: `acceptance-${Date.now()}`,
      tenantId: tenant.id,
      tenantName: `${tenant.firstName} ${tenant.lastInitial}`,
      propertyAddress: property.address,
      phoneNumber: tenant.phone,
      acceptedAt: new Date().toISOString(),
      agreementVersion: "1.0",
      deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown device",
      ipAddress: "Captured by backend",
      acceptedVia,
      typedName: typedName.trim(),
      planName: tenant.plan.planName,
      paymentPlanDescription: describePaymentPlan(tenant.plan),
      nextExpectedPaymentDate: nextInstallment ? friendlyDate(toInputDate(nextInstallment.windowStart)) : "TBD"
    };

    setPlanAcceptanceRecords((current) => [record, ...current]);
    setSyncStatus("Payment plan acceptance recorded");
    void apiPost("/api/plan-acceptances", record).then((response) => {
      if (response?.acceptance) {
        setPlanAcceptanceRecords((current) => [response.acceptance, ...current.filter((item) => item.id !== response.acceptance.id)]);
      }
      if (response?.activityLog) {
        setActivityLogs((current) => [response.activityLog, ...current]);
      }
      if (response?.generatedPdf) {
        setGeneratedPlanPdfs((current) => [response.generatedPdf, ...current]);
      }
    });
  }

  function queueReminder(tenant: Tenant, state?: InstallmentState) {
    if (!requireAuth()) return;
    if (!requireFinancialPermission("create reminders")) return;
    const property = properties.find((item) => item.id === tenant.propertyId);
    const target = state ?? installmentStates.find((item) => item.tenant.id === tenant.id && item.balance > 0);
    const message = buildReminderMessage(tenant, property, target);
    const reminder = {
      id: `reminder-${Date.now()}`,
      tenantId: tenant.id,
      message,
      sendDate: toInputDate(today),
      status: "draft" as const
    };
    setReminders((current) => [
      reminder,
      ...current
    ]);
    appendAudit("reminder_drafted", reminder.id, `Tenant ${tenant.id}`);
    showToast(`Reminder draft created for ${tenant.firstName} ${tenant.lastInitial}.`);
    void apiPost("/api/reminders", reminder, { idempotencyKey: createIdempotencyKey("reminder", reminder.id) });
  }

  function updateReminderStatus(reminderId: string, status: ReminderLog["status"]) {
    setReminders((current) => current.map((reminder) => (reminder.id === reminderId ? { ...reminder, status } : reminder)));
    void apiPatch(`/api/reminders/${reminderId}`, { status }, { idempotencyKey: createIdempotencyKey("reminder-status", `${reminderId}-${status}`) });
  }

  function queueReminderForSend(reminderId: string) {
    updateReminderStatus(reminderId, "queued");
    showToast("Reminder queued. Review and send when ready.");
  }

  function sendReminder(reminderId: string) {
    if (!requireAuth()) return;
    if (!requireFinancialPermission("send reminders")) return;
    const proceed = window.confirm("Send this reminder now? This action updates communication status.");
    if (!proceed) return;
    const reminder = reminders.find((item) => item.id === reminderId);
    updateReminderStatus(reminderId, "sent");
    if (reminder) {
      addCommunicationReceipt(reminder.tenantId, "reminder", "Reminder sent to tenant");
      appendAudit("reminder_sent", reminderId, `Tenant ${reminder.tenantId}`);
    } else {
      showToast("Reminder sent to tenant.");
    }
  }

  function generateDocuments() {
    if (!requireAuth()) return;
    if (!requireFinancialPermission("generate drafts")) return;
    if (actionBusy.generateDrafts) return;
    const nextDocuments = installmentStates
      .filter((state) => state.balance > 0)
      .map((state) => createRentDocument(state, promises.filter((promise) => promise.tenantId === state.tenant.id)));
    const existingKeys = new Set(documents.map((document) => `${document.tenantId}-${document.title}`));
    const newDocs = nextDocuments.filter((document) => !existingKeys.has(`${document.tenantId}-${document.title}`));
    if (newDocs.length === 0) {
      showToast("All drafts already exist — no new documents to create.", "error");
      return;
    }
    const proceed = window.confirm(`Create ${newDocs.length} new draft document${newDocs.length > 1 ? "s" : ""}?`);
    if (!proceed) return;
    setActionBusy((current) => ({ ...current, generateDrafts: true }));
    setDocuments((current) => {
      const keys = new Set(current.map((document) => `${document.tenantId}-${document.title}`));
      return [
        ...nextDocuments.filter((document) => !keys.has(`${document.tenantId}-${document.title}`)),
        ...current
      ];
    });
    setLastGeneratedDocumentIds(newDocs.map((document) => document.id));
    appendAudit("documents_generated", `batch-${Date.now()}`, `${newDocs.length} drafts`);
    showToast(`${newDocs.length} draft${newDocs.length > 1 ? "s" : ""} created.`);
    void apiPost("/api/documents", { documents: newDocs }, { idempotencyKey: createIdempotencyKey("documents", String(newDocs.length)) })
      .catch(() => showToast("Drafts created locally. Retry sync when online.", "error"))
      .finally(() => setActionBusy((current) => ({ ...current, generateDrafts: false })));
  }

  function undoGeneratedDocuments() {
    if (lastGeneratedDocumentIds.length === 0) {
      showToast("No recent auto-created drafts to undo.", "error");
      return;
    }
    const proceed = window.confirm("Undo the most recent auto-created drafts?");
    if (!proceed) return;
    setDocuments((current) => current.filter((document) => !lastGeneratedDocumentIds.includes(document.id)));
    setLastGeneratedDocumentIds([]);
    showToast("Last auto-created drafts removed.");
  }

  function approveDocument(documentId: string) {
    if (!requireAuth()) return;
    if (!requireFinancialPermission("approve documents")) return;
    if (actionBusy.approvingDocumentId === documentId) return;
    const proceed = window.confirm("Approve this document for delivery?");
    if (!proceed) return;
    setActionBusy((current) => ({ ...current, approvingDocumentId: documentId }));
    setDocuments((current) =>
      current.map((document) =>
        document.id === documentId
          ? { ...document, status: "approved", approvedAt: new Date().toISOString() }
          : document
      )
    );
    appendAudit("document_approved", documentId, "Ready to send");
    showToast("Document approved and ready to send.");
    void apiPatch(`/api/documents/${documentId}/approve`, undefined, { idempotencyKey: createIdempotencyKey("document-approve", documentId) })
      .finally(() => setActionBusy((current) => ({ ...current, approvingDocumentId: "" })));
  }

  function sendDocument(documentId: string) {
    if (!requireAuth()) return;
    if (!requireFinancialPermission("send documents")) return;
    if (actionBusy.sendingDocumentId === documentId) return;
    const proceed = window.confirm("Send this approved document to the tenant now?");
    if (!proceed) return;
    setActionBusy((current) => ({ ...current, sendingDocumentId: documentId }));
    setDocuments((current) =>
      current.map((document) =>
        document.id === documentId && document.status === "approved"
          ? { ...document, status: "sent", sentAt: new Date().toISOString() }
          : document
      )
    );
    const sentDoc = documents.find((item) => item.id === documentId);
    if (sentDoc) {
      addCommunicationReceipt(sentDoc.tenantId, "document", sentDoc.title);
      appendAudit("document_sent", documentId, `Tenant ${sentDoc.tenantId}`);
    } else {
      showToast("Document sent to tenant.");
    }
    void apiPatch(`/api/documents/${documentId}/send`, undefined, { idempotencyKey: createIdempotencyKey("document-send", documentId) })
      .finally(() => setActionBusy((current) => ({ ...current, sendingDocumentId: "" })));
  }

  function updatePlanType(planType: PlanType) {
    setTenants((current) =>
      current.map((tenant) =>
        tenant.id === selectedTenant.id
          ? {
              ...tenant,
              plan: createPlanFromType(
                planType,
                tenant.plan.monthlyRent,
                tenant.plan.graceDays,
                tenant.plan.typicalPayday ?? "friday",
                tenant.plan.nextExpectedPayday ?? toInputDate(today),
                tenant.plan.leaseDueDate ?? tenant.leaseEndDate,
                tenant.plan.installments
              )
            }
          : tenant
      )
    );
  }

  function createTenantProfile() {
    if (!requireAuth()) return;
    if (!requireFinancialPermission("create tenants")) return;
    if (actionBusy.saveTenant) return;
    const fieldErrors: Partial<Record<string, string>> = {};
    if (!newTenantDraft.firstName.trim()) fieldErrors.firstName = "First name is required.";
    if (!newTenantDraft.lastName.trim()) fieldErrors.lastName = "Last name is required.";
    if (!newTenantDraft.phone.trim()) fieldErrors.phone = "Phone number is required.";

    const rentCheck = numberFromDraft(newTenantDraft.monthlyRent);
    if (rentCheck <= 0) fieldErrors.monthlyRent = "Monthly rent must be greater than $0.";
    if (!isValidPastOrTodayDate(newTenantDraft.startOfLease)) {
      fieldErrors.startOfLease = "Start of Lease is required and cannot be in the future.";
    }
    if (newTenantDraft.leaseEndDate && newTenantDraft.startOfLease && newTenantDraft.leaseEndDate < newTenantDraft.startOfLease) {
      fieldErrors.leaseEndDate = "Lease end date cannot be before lease start.";
    }
    if (newTenantDraft.moveInDate && newTenantDraft.startOfLease && newTenantDraft.moveInDate > newTenantDraft.startOfLease) {
      fieldErrors.moveInDate = "Move-in date cannot be after lease start.";
    }
    const duplicateTenant = tenants.find((tenant) =>
      tenant.firstName.toLowerCase() === newTenantDraft.firstName.trim().toLowerCase() &&
      tenant.lastName.toLowerCase() === newTenantDraft.lastName.trim().toLowerCase() &&
      tenant.phone.replace(/\D/g, "") === newTenantDraft.phone.replace(/\D/g, "")
    );
    if (duplicateTenant) {
      fieldErrors.phone = "Possible duplicate tenant found with same name and phone.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setNewTenantFieldErrors(fieldErrors);
      setNewTenantError("Please correct the highlighted fields before saving.");
      if (fieldErrors.firstName || fieldErrors.lastName || fieldErrors.phone) {
        setNewTenantStep(0);
      } else {
        setNewTenantStep(1);
      }
      showToast("Please fix required fields before continuing.", "error");
      return;
    }

    setActionBusy((current) => ({ ...current, saveTenant: true }));
    const monthlyRent = numberFromDraft(newTenantDraft.monthlyRent);
    const propertyId = `prop-${Date.now()}`;
    const tenantId = `tenant-${Date.now()}`;
    const nextProperty: Property = {
      id: propertyId,
      address: newTenantDraft.address.trim() || "New Property",
      city: newTenantDraft.city.trim() || "City",
      state: newTenantDraft.state.trim() || "NJ",
      zip: newTenantDraft.zip.trim(),
      unitNumber: newTenantDraft.unitNumber.trim(),
      status: "active"
    };
    const installments = newTenantDraft.planRows
      .filter((row) => numberFromDraft(row.amount) > 0)
      .map((row, index) => ({
        label: row.label.trim() || `Payment ${index + 1}`,
        amount: numberFromDraft(row.amount),
        windowStartDay: Math.max(1, Math.min(31, numberFromDraft(row.windowStartDay) || 1)),
        windowEndDay: Math.max(1, Math.min(31, numberFromDraft(row.windowEndDay) || numberFromDraft(row.windowStartDay) || 1))
      }));
    const nextTenant: Tenant = {
      id: tenantId,
      propertyId,
      firstName: newTenantDraft.firstName.trim() || "New",
      lastInitial: `${(newTenantDraft.lastName.trim()[0] ?? "T").toUpperCase()}.`,
      lastName: newTenantDraft.lastName.trim() || "Tenant",
      email: newTenantDraft.email.trim(),
      phone: newTenantDraft.phone.trim(),
      emergencyContact: newTenantDraft.emergencyContact.trim(),
      emergencyPhone: newTenantDraft.emergencyPhone.trim(),
      accountType: newTenantDraft.accountType,
      preferredPaymentMethod: newTenantDraft.preferredPaymentMethod,
      paymentMethods: newTenantDraft.paymentMethods,
      cashAppTag: newTenantDraft.cashAppTag.trim(),
      chimeSign: newTenantDraft.chimeSign.trim(),
      chimePhone: newTenantDraft.chimePhone.trim(),
      chimeEmail: newTenantDraft.chimeEmail.trim(),
      backupPaymentMethod: newTenantDraft.backupPaymentMethod,
      moveInDate: newTenantDraft.moveInDate,
      startOfLease: newTenantDraft.startOfLease,
      leaseEndDate: newTenantDraft.leaseEndDate,
      securityDeposit: numberFromDraft(newTenantDraft.securityDeposit),
      lateFee: numberFromDraft(newTenantDraft.lateFee),
      currentBalance: numberFromDraft(newTenantDraft.currentBalance),
      reminderOffsets: newTenantDraft.reminderOffsets,
      deliveryMethods: newTenantDraft.deliveryMethods,
      memo: newTenantDraft.memo,
      active: true,
      plan: {
        planName: newTenantDraft.planName.trim() || "Flexible Payment Plan",
        status: newTenantDraft.planStatus,
        monthlyRent,
        planType: newTenantDraft.planType,
        graceDays: numberFromDraft(newTenantDraft.graceDays),
        paymentFrequency: newTenantDraft.paymentFrequency,
        typicalPayday: newTenantDraft.typicalPayday,
        nextExpectedPayday: newTenantDraft.nextExpectedPayday,
        leaseDueDate: newTenantDraft.leaseDueDate,
        installments:
          installments.length > 0
            ? installments
            : createPlanFromType(
                newTenantDraft.planType,
                monthlyRent,
                numberFromDraft(newTenantDraft.graceDays),
                newTenantDraft.typicalPayday,
                newTenantDraft.nextExpectedPayday,
                newTenantDraft.leaseDueDate
              ).installments
      },
      notes: [newTenantDraft.memo].filter(Boolean)
    };
    setProperties((current) => [...current, nextProperty]);
    setTenants((current) => [...current, nextTenant]);
    void apiPost("/api/tenants", { property: nextProperty, tenant: nextTenant }, { idempotencyKey: createIdempotencyKey("tenant", tenantId) })
      .catch(() => showToast("Tenant saved locally. Retry sync when online.", "error"))
      .finally(() => setActionBusy((current) => ({ ...current, saveTenant: false })));
    setSelectedTenantId(tenantId);
    setNewTenantDraft(defaultNewTenantDraft);
    setNewTenantError("");
    setNewTenantFieldErrors({});
    setNewTenantStep(0);
    showToast(`${nextTenant.firstName} ${nextTenant.lastName} added successfully.`);
    setView("tenants");
  }

  function downloadTenantCsvTemplate() {
    const template = [
      "first_name,last_name,phone,email,address,city,state,zip,unit,monthly_rent,preferred_payment_method,cash_app_tag,chime_sign,chime_phone",
      "Avery,Johnson,(973) 555-0101,avery@example.com,123 Main Street,Newark,NJ,07102,1,1200,cash_app,$AveryRent,$AveryChime,(973) 555-0101",
      "Jordan,Lee,(973) 555-0102,jordan@example.com,45 Oak Street,Irvington,NJ,07111,2B,980,money_order,,,"
    ].join("\n");
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rentflex-tenant-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsvImportIssues() {
    if (csvImportIssues.length === 0) return;
    const header = [
      "row_number",
      "reason",
      "first_name",
      "last_name",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "zip",
      "unit",
      "monthly_rent",
      "preferred_payment_method",
      "cash_app_tag",
      "chime_sign",
      "chime_phone"
    ];
    const lines = csvImportIssues.map((issue) => [
      issue.rowNumber,
      issue.reason,
      issue.firstName,
      issue.lastName,
      issue.phone,
      issue.email,
      issue.address,
      issue.city,
      issue.state,
      issue.zip,
      issue.unitNumber,
      issue.monthlyRent,
      issue.preferredPaymentMethod,
      issue.cashAppTag,
      issue.chimeSign,
      issue.chimePhone
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
    const content = [header.join(","), ...lines].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rentflex-tenant-import-issues.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importTenantsFromCsv(file: File) {
    if (!requireAuth()) return;
    if (!requireFinancialPermission("import tenants")) return;
    setCsvImportBusy(true);
    setCsvImportReport(null);
    setCsvImportIssues([]);
    try {
      const csv = await file.text();
      const parseResult = parseTenantCsv(csv);
      const parsedRows = parseResult.rows;
      if (parsedRows.length === 0) {
        setCsvImportIssues(parseResult.invalidIssues);
        setCsvImportReport({
          totalRows: parseResult.totalRows,
          validRows: 0,
          importedRows: 0,
          skippedRows: 0,
          invalidRows: parseResult.invalidRows,
          sampleErrors: parseResult.sampleErrors
        });
        showToast("No valid tenant rows found in CSV.", "error");
        return;
      }

      const existingTenantKeys = new Set(
        tenants.map((tenant) => `${tenant.firstName.toLowerCase()}|${tenant.lastName.toLowerCase()}|${tenant.phone.replace(/\D/g, "")}`)
      );
      const seenCsvKeys = new Set<string>();
      const issueRows: CsvImportIssue[] = [...parseResult.invalidIssues];
      let skippedRows = 0;
      const nextProperties: Property[] = [];
      const nextTenants: Tenant[] = [];
      const propertyByAddress = new Map(properties.map((property) => [`${property.address.toLowerCase()}|${(property.unitNumber ?? "").toLowerCase()}`, property]));

      for (const row of parsedRows) {
        const tenantKey = `${row.firstName.toLowerCase()}|${row.lastName.toLowerCase()}|${row.phone.replace(/\D/g, "")}`;
        if (existingTenantKeys.has(tenantKey) || seenCsvKeys.has(tenantKey)) {
          skippedRows += 1;
          issueRows.push({
            rowNumber: row.sourceRowNumber,
            reason: "Duplicate tenant in existing records or file",
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
            email: row.email,
            address: row.address,
            city: row.city,
            state: row.state,
            zip: row.zip,
            unitNumber: row.unitNumber,
            monthlyRent: String(row.monthlyRent),
            preferredPaymentMethod: row.preferredPaymentMethod,
            cashAppTag: row.cashAppTag,
            chimeSign: row.chimeSign,
            chimePhone: row.chimePhone
          });
          continue;
        }
        seenCsvKeys.add(tenantKey);

        const propertyKey = `${row.address.toLowerCase()}|${row.unitNumber.toLowerCase()}`;
        let property = propertyByAddress.get(propertyKey);
        if (!property) {
          property = {
            id: `prop-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
            address: row.address,
            city: row.city,
            state: row.state,
            zip: row.zip,
            unitNumber: row.unitNumber,
            status: "active"
          };
          propertyByAddress.set(propertyKey, property);
          nextProperties.push(property);
        }

        const tenantId = `tenant-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
        const nextTenant: Tenant = {
          id: tenantId,
          propertyId: property.id,
          firstName: row.firstName,
          lastInitial: `${(row.lastName[0] ?? "T").toUpperCase()}.`,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          emergencyContact: "",
          emergencyPhone: "",
          accountType: "employment",
          preferredPaymentMethod: row.preferredPaymentMethod,
          paymentMethods: [row.preferredPaymentMethod, "money_order"],
          cashAppTag: row.cashAppTag,
          chimeSign: row.chimeSign,
          chimePhone: row.chimePhone,
          chimeEmail: row.email,
          backupPaymentMethod: "money_order",
          moveInDate: toInputDate(today),
          startOfLease: toInputDate(today),
          leaseEndDate: toInputDate(addDays(today, 365)),
          securityDeposit: 0,
          lateFee: 0,
          currentBalance: 0,
          reminderOffsets: ["one_day_before", "payment_day", "two_days_late"],
          deliveryMethods: ["sms", "email"],
          memo: "Imported from CSV",
          active: true,
          plan: createPlanFromType("monthly", row.monthlyRent, 3, "friday", toInputDate(today), toInputDate(addDays(today, 365))),
          notes: ["Imported via CSV"]
        };
        nextTenants.push(nextTenant);
      }

      if (nextTenants.length === 0) {
        setCsvImportIssues(issueRows);
        setCsvImportReport({
          totalRows: parseResult.totalRows,
          validRows: parsedRows.length,
          importedRows: 0,
          skippedRows,
          invalidRows: parseResult.invalidRows,
          sampleErrors: parseResult.sampleErrors
        });
        showToast("No new tenants to import after deduplication.", "error");
        return;
      }

      setProperties((current) => [...current, ...nextProperties]);
      setTenants((current) => [...current, ...nextTenants]);
      const records = nextTenants.map((tenant) => ({
        tenant,
        property: nextProperties.find((property) => property.id === tenant.propertyId) ?? properties.find((property) => property.id === tenant.propertyId)
      })).filter((record): record is { tenant: Tenant; property: Property } => Boolean(record.property));

      await apiPost(
        "/api/tenants/import",
        { records },
        { idempotencyKey: createIdempotencyKey("tenant-import", String(records.length)) }
      );
      setCsvImportIssues(issueRows);
      setCsvImportReport({
        totalRows: parseResult.totalRows,
        validRows: parsedRows.length,
        importedRows: nextTenants.length,
        skippedRows,
        invalidRows: parseResult.invalidRows,
        sampleErrors: parseResult.sampleErrors
      });
      appendAudit("tenants_imported", `import-${Date.now()}`, `${nextTenants.length} tenants from CSV`);
      showToast(`Imported ${nextTenants.length} tenant${nextTenants.length > 1 ? "s" : ""} from CSV.`);
    } catch {
      setCsvImportReport({
        totalRows: 0,
        validRows: 0,
        importedRows: 0,
        skippedRows: 0,
        invalidRows: 0,
        sampleErrors: ["Could not parse CSV file. Ensure UTF-8 CSV format and required headers."]
      });
      setCsvImportIssues([]);
      showToast("CSV import failed. Check file format and retry.", "error");
    } finally {
      setCsvImportBusy(false);
    }
  }

  function exportCsv() {
    const header = "Tenant,Property,Installment,Expected,Paid,Balance,Status,Window Start,Window End\n";
    const rows = installmentStates
      .map((item) =>
        [
          `${item.tenant.firstName} ${item.tenant.lastInitial}`,
          item.property.address,
          item.label,
          item.expectedAmount,
          item.paidAmount,
          item.balance,
          item.status,
          toInputDate(item.windowStart),
          toInputDate(item.windowEnd)
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rentflex-june-2026-ledger.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const offlineMode = syncStatus.toLowerCase().includes("offline");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="logo-section">
          <img className="logo-image" src={brandLogo} alt="RentFlex Ledger" decoding="async" loading="lazy" fetchPriority="low" />
          <p className="logo-tagline">Flexible Rent Collection. Simple Tenant Payments.</p>
        </div>

        <nav aria-label="Primary">
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <div className="nav-section-title"><span>{section.title}</span></div>
              {section.items.map((item) => (
                <button className={view === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => {
                  const publicViews: ViewId[] = ["dashboard", "privacy", "terms", "security", "settings"];
                  if (authRequired && !isAuthenticated && !publicViews.includes(item.id)) {
                    showToast("Sign in first to access this section.", "error");
                    return;
                  }
                  setView(item.id);
                }} type="button">
                  <item.icon size={19} />
                  <span>{item.label}</span>
                  {item.id === "documents" && documentStats.drafts > 0 ? <b>{documentStats.drafts}</b> : null}
                  {item.id === "late" ? <b>{overdueStates.length}</b> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="quick-actions">
          <strong>Guided Workflow</strong>
          <button onClick={() => { setNewTenantStep(0); setView("new_tenant"); }} type="button"><Plus size={17} /> 1. Add Tenant</button>
          <button onClick={() => setView("tenants")} type="button"><DollarSign size={17} /> 2. Save Payment</button>
          <button onClick={() => { setView("documents"); generateDocuments(); }} type="button"><FileText size={17} /> 3. Generate Drafts</button>
          <button onClick={() => setView("reminders")} type="button"><BellRing size={17} /> 4. Open Inbox</button>
        </div>
        <div className="sync-pill">{syncStatus}</div>
        <footer className="sidebar-trust">
          <span>🔒 Encrypted at rest · Audit trail enabled</span>
          <span>
            RentFlex Ledger · <a href="#" onClick={(e) => { e.preventDefault(); setView("privacy"); }}>Privacy</a> · <a href="#" onClick={(e) => { e.preventDefault(); setView("terms"); }}>Terms</a> · <a href="#" onClick={(e) => { e.preventDefault(); setView("security"); }}>Security</a> · <a href="mailto:support@rentflex.app">Contact</a>
          </span>
        </footer>
      </aside>

      <section className="workspace">
        {toast ? (
          <div className={`toast-banner toast-${toast.kind}`} role="alert" aria-live="assertive">
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} type="button" aria-label="Dismiss notification">×</button>
          </div>
        ) : null}
        {offlineMode ? (
          <div className="network-banner" role="status" aria-live="polite">
            <span><AlertTriangle size={16} /> Offline mode: changes are local demo data until reconnection.</span>
            <button className="secondary-button compact" onClick={() => void refreshStateFromApi()} type="button">Retry connection</button>
          </div>
        ) : null}
        <div className="utility-bar">
          <label className="global-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tenants, properties, phone, Cash App, Chime..." />
          </label>
          <div className="top-actions">
            <button className="notification-button" onClick={() => setView("reminders")} type="button" aria-label="Open inbox">
              <BellRing size={20} />
              <b>{reminders.length || documentStats.drafts}</b>
            </button>
            <div className="auth-controls">
              <AuthControls onAuthenticated={(session) => {
                setSessionToken(session.sessionToken);
                setIsAuthenticated(true);
              }} />
            </div>
            <button className="user-menu" type="button" aria-label="Owner menu">
              <span>JD</span>
              <strong>John D.<small>Owner</small></strong>
            </button>
          </div>
        </div>

        <header className="topbar">
          <div>
            <h1>Good morning, John! 👋</h1>
            <p>Here's what's happening with your properties today.</p>
          </div>
          {view === "dashboard" ? (
            <div className="topbar-cta">
              <span>Start here</span>
              <button className="primary-button" onClick={() => setView("rent_due")} type="button">
                <DollarSign size={16} /> Run Today&apos;s Rent Workflow
              </button>
            </div>
          ) : null}
        </header>

        {authRequired && !isAuthenticated ? (
          <section className="auth-gate-panel" role="status" aria-live="polite">
            <strong>First-time setup: sign in to unlock landlord actions</strong>
            <p>Use the Get Started button in the header to sign in or create your owner account. After sign-in, tenant creation, payments, messages, and document delivery are enabled.</p>
          </section>
        ) : null}

        {view === "dashboard" ? (
          <section className="first-run-checklist" aria-label="First run checklist">
            <div>
              <strong>First-run checklist</strong>
              <p>{checklistDone} of {checklistItems.length} complete</p>
            </div>
            <div className="checklist-progress-track"><span style={{ width: `${checklistPercent}%` }} /></div>
            <div className="checklist-actions">
              {checklistItems.map((item) => (
                <button className="secondary-button compact" key={item.label} onClick={item.action} type="button">
                  {item.done ? "✓" : "○"} {item.label}
                </button>
              ))}
              <button className="primary-button compact" onClick={runSampleWalkthrough} type="button">Run Sample Walkthrough</button>
            </div>
          </section>
        ) : null}

        {view === "dashboard" ? (
          <section className="value-block">
            <strong>Why this beats spreadsheets</strong>
            <p>Guided workflows, audit-ready records, and send-tracked communications reduce disputes and speed up collection follow-up.</p>
          </section>
        ) : null}

        {bootLoading ? <AppSkeleton /> : (
          <>
            <section className="metric-grid" aria-label="Monthly summary">
              <MetricCard icon={DollarSign} label="Open Balance" value={money(monthTotals.balance)} tone="purple" />
              <MetricCard icon={CalendarClock} label="Rent Collected" value={money(monthTotals.paid)} tone="blue" />
              <MetricCard icon={Clock} label="Upcoming Payments" value={money(dashboardStats.upcomingBalance)} tone="yellow" />
              <MetricCard icon={AlertTriangle} label="Past Due" value={money(dashboardStats.overdueBalance)} tone="red" />
              <MetricCard icon={FileText} label="Pending Documents" value={String(dashboardStats.pendingDocuments)} tone="pink" />
            </section>
            {view === "dashboard" ? <p className="quiet-note">Recovered via reminders this month: <strong>{money(recoveredViaReminders)}</strong></p> : null}

            {view === "dashboard" ? (
              <DashboardView
                filteredInstallmentStates={filteredInstallmentStates}
                onSelectTenant={setSelectedTenantId}
                onViewLedger={() => setView("ledger")}
                queueReminder={queueReminder}
              />
            ) : null}

            {view === "rent_due" || view === "late" ? <RentDueView installmentStates={filteredInstallmentStates} initialFilter={view === "late" ? "overdue" : "all"} /> : null}

            {view === "properties" ? <PropertiesView properties={properties} tenants={tenants} installmentStates={filteredInstallmentStates} /> : null}

            {view === "tenants" ? (
              <TenantsView
                onAddTenant={() => { setNewTenantStep(0); setView("new_tenant"); }}
                onDownloadCsvTemplate={downloadTenantCsvTemplate}
                onDownloadImportIssues={downloadCsvImportIssues}
                onImportCsv={importTenantsFromCsv}
                savingPayment={actionBusy.savePayment}
                savingPromise={actionBusy.savePromise}
                importingCsv={csvImportBusy}
                importReport={csvImportReport}
                hasImportIssues={csvImportIssues.length > 0}
                paymentDraft={paymentDraft}
                promiseDraft={promiseDraft}
                promises={promises}
                property={selectedProperty}
                query={query}
                maskValue={maskValue}
                showSensitive={showSensitive}
                toggleSensitive={() => setShowSensitive((current) => !current)}
                recordPayment={recordPayment}
                recordPromise={recordPromise}
                selectedBalance={selectedBalance}
                selectedInstallments={selectedInstallments}
                selectedTenant={selectedTenant}
                setPaymentDraft={setPaymentDraft}
                setPromiseDraft={setPromiseDraft}
                setQuery={setQuery}
                setSelectedTenantId={setSelectedTenantId}
                tenants={visibleTenants}
                updatePlanType={updatePlanType}
              />
            ) : null}

            {view === "payment_plans" ? <PaymentPlansView installmentStates={installmentStates} onSendPlan={openPlanAcceptance} onShiftPayday={shiftPlanNextPayday} payments={payments} properties={properties} tenants={visibleTenants} /> : null}

            {view === "plan_acceptance" ? (
              <PaymentPlanAcceptanceView
                acceptanceRecords={planAcceptanceRecords}
                activityLogs={activityLogs}
                generatedPlanPdfs={generatedPlanPdfs}
                onAcceptPlan={acceptPaymentPlan}
                onBack={() => setView("payment_plans")}
                onQuickSmsAccept={(typedName) => acceptPaymentPlan("sms_yes", typedName)}
                paymentPlanDescription={describePaymentPlan(planAcceptanceTenant.plan)}
                property={planAcceptanceProperty}
                selectedInstallments={planAcceptanceInstallments}
                tenant={planAcceptanceTenant}
              />
            ) : null}

            {view === "new_tenant" ? (
              <NewTenantView
                createTenantProfile={createTenantProfile}
                draft={newTenantDraft}
                error={newTenantError}
                fieldErrors={newTenantFieldErrors}
                onClearFieldError={clearTenantFieldError}
                saving={actionBusy.saveTenant}
                setDraft={setNewTenantDraft}
                step={newTenantStep}
                onStepChange={setNewTenantStep}
              />
            ) : null}

            {view === "documents" ? (
              <DocumentsView
                approveDocument={approveDocument}
                approvingDocumentId={actionBusy.approvingDocumentId}
                sendingDocumentId={actionBusy.sendingDocumentId}
                documents={documents}
                generateDocuments={generateDocuments}
                undoGeneratedDocuments={undoGeneratedDocuments}
                canUndoGeneratedDocuments={lastGeneratedDocumentIds.length > 0}
                generatingDrafts={actionBusy.generateDrafts}
                sendDocument={sendDocument}
                tenants={tenants}
                properties={properties}
              />
            ) : null}
            {view === "ledger" ? <LedgerView installmentStates={filteredInstallmentStates} payments={payments} exportCsv={exportCsv} /> : null}
            {view === "reminders" ? <ReminderView communicationReceipts={communicationReceipts} reminders={reminders} documents={documents} tenants={tenants} queueReminder={queueReminder} queueReminderForSend={queueReminderForSend} sendReminder={sendReminder} onOpenDocuments={() => setView("documents")} /> : null}
            {view === "reports" ? <ReportsView installmentStates={installmentStates} payments={payments} exportCsv={exportCsv} /> : null}
            {view === "settings" ? <SettingsView userRole={userRole} sessionToken={sessionToken} /> : null}
            {view === "mobile_app" ? <MobileOptionsView /> : null}
            {view === "security" ? <SecurityView auditEvents={auditEvents} /> : null}
            {view === "privacy" ? <PrivacyView /> : null}
            {view === "terms" ? <TermsView /> : null}
          </>
        )}
      </section>
    </main>
  );
}

function DashboardView(props: {
  filteredInstallmentStates: InstallmentState[];
  onSelectTenant: (id: string) => void;
  onViewLedger: () => void;
  queueReminder: (tenant: Tenant, state?: InstallmentState) => void;
}) {
  const tenantSummaries = summarizeByTenant(props.filteredInstallmentStates);
  const dueNow = props.filteredInstallmentStates.filter((item) => item.status === "upcoming" || item.status === "window_open" || item.status === "partial" || item.status === "late").slice(0, 3);
  const overdue = props.filteredInstallmentStates.filter((item) => item.status === "late" || item.status === "missed" || item.status === "partial").slice(0, 3);
  const collected = props.filteredInstallmentStates.reduce((sum, item) => sum + item.paidAmount, 0);
  const goal = props.filteredInstallmentStates.reduce((sum, item) => sum + item.expectedAmount, 0);
  const percent = goal > 0 ? Math.min(100, Math.round((collected / goal) * 100)) : 0;
  const progressStyle = { "--progress": `${percent * 3.6}deg` } as CSSProperties;

  return (
    <div className="premium-dashboard-grid">
      <section className="panel premium-panel span-2">
        <div className="premium-panel-head">
          <h2>Upcoming Payments</h2>
          <button className="text-link" onClick={props.onViewLedger} type="button">View all</button>
        </div>
        <div className="premium-table upcoming-table">
          <div className="premium-table-head">
            <span>Tenant</span>
            <span>Property</span>
            <span>Due Date</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          {dueNow.map((item) => (
            <article key={`${item.tenant.id}-${item.label}`}>
              <div className="identity-cell">
                <span className="avatar-chip">{item.tenant.firstName[0]}{item.tenant.lastInitial}</span>
                <div>
                  <strong>{item.tenant.firstName} {item.tenant.lastInitial}</strong>
                  <small>{planLabel(item.tenant.plan.planType)} Plan</small>
                </div>
              </div>
              <div>
                <strong>{item.property.address}</strong>
                <small>{item.property.unitNumber ? `Unit ${item.property.unitNumber}` : item.property.city}</small>
              </div>
              <div>
                <strong>{shortDate(item.windowStart)}</strong>
                <small>{daysUntil(toInputDate(item.windowStart)) <= 0 ? "Due now" : `in ${daysUntil(toInputDate(item.windowStart))} days`}</small>
              </div>
              <b>{money(item.balance || item.expectedAmount)}</b>
              <StatusPill status={item.status} />
            </article>
          ))}
        </div>
        <button className="text-link centered-link" onClick={props.onViewLedger} type="button">
          View all upcoming payments <Send size={16} />
        </button>
      </section>

      <section className="panel premium-panel span-2">
        <div className="premium-panel-head">
          <h2>Overdue Tenants</h2>
          <button className="text-link" onClick={props.onViewLedger} type="button">View all</button>
        </div>
        <div className="premium-table overdue-table">
          <div className="premium-table-head">
            <span>Tenant</span>
            <span>Property</span>
            <span>Days Late</span>
            <span>Balance</span>
          </div>
          {overdue.map((item) => (
            <article key={`${item.tenant.id}-${item.label}`}>
              <div className="identity-cell">
                <span className="avatar-chip warm">{item.tenant.firstName[0]}{item.tenant.lastInitial}</span>
                <div>
                  <strong>{item.tenant.firstName} {item.tenant.lastInitial}</strong>
                  <small>{planLabel(item.tenant.plan.planType)} Plan</small>
                </div>
              </div>
              <div>
                <strong>{item.property.address}</strong>
                <small>{item.property.unitNumber ? `Unit ${item.property.unitNumber}` : item.property.city}</small>
              </div>
              <b className="danger-text">{Math.max(1, Math.abs(daysUntil(toInputDate(item.graceEnd))))} days</b>
              <b className="danger-text">{money(item.balance)}</b>
            </article>
          ))}
        </div>
        <button className="text-link centered-link" onClick={props.onViewLedger} type="button">
          View all overdue payments <Send size={16} />
        </button>
      </section>

      <aside className="panel premium-panel collection-widget">
        <div className="premium-panel-head">
          <h2>Rent Collected This Month</h2>
          <NotebookPen size={19} />
        </div>
        <div className="progress-ring" style={progressStyle}>
          <div>
            <strong>{money(collected)}</strong>
            <span>of {money(goal)} goal</span>
          </div>
        </div>
        <div className="progress-lines">
          <span><i /> Collected <b>{money(collected)} ({percent}%)</b></span>
          <span><i className="remaining" /> Remaining <b>{money(Math.max(goal - collected, 0))} ({100 - percent}%)</b></span>
        </div>
        <div className="goal-bar"><span style={{ width: `${percent}%` }} /></div>
      </aside>

      <section className="panel premium-panel activity-panel span-4">
        <div className="premium-panel-head">
          <h2>Recent Activity</h2>
          <button className="text-link" onClick={props.onViewLedger} type="button">View all</button>
        </div>
        <div className="activity-list">
          <article>
            <span className="activity-icon success"><DollarSign size={18} /></span>
            <div><strong>Payment received from John D.</strong><small>123 Main Street - Cash App</small></div>
            <b className="success-text">+{money(450)}</b>
            <time>May 31, 2026</time>
            <span>2:15 PM</span>
          </article>
          <article>
            <span className="activity-icon purple"><FileText size={18} /></span>
            <div><strong>Statement sent to Maria S.</strong><small>45 Oak Street - May 2026</small></div>
            <StatusPill status="sent" />
            <time>May 31, 2026</time>
            <span>10:30 AM</span>
          </article>
          <article>
            <span className="activity-icon blue"><Send size={18} /></span>
            <div><strong>Reminder sent to Robert K.</strong><small>88 Pine Street - Payment due Jun 3</small></div>
            <StatusPill status="sent" />
            <time>May 30, 2026</time>
            <span>4:45 PM</span>
          </article>
          <article>
            <span className="activity-icon danger"><AlertTriangle size={18} /></span>
            <div><strong>Late payment detected for Maria S.</strong><small>45 Oak Street - 5 days late</small></div>
            <span className="late-badge">5 days late</span>
            <time>May 30, 2026</time>
            <span>9:10 AM</span>
          </article>
        </div>
      </section>

      <aside className="promo-card">
        <button className="promo-close" type="button">×</button>
        <h2>Stay on top of payments</h2>
        <p>Automated reminders help you collect on time, every time.</p>
        <div className="phone-illustration" aria-hidden="true">
          <div><BellRing size={34} /></div>
        </div>
        <button className="primary-button" onClick={() => dueNow[0] ? props.queueReminder(dueNow[0].tenant, dueNow[0]) : undefined} type="button">
          Create Reminder
        </button>
      </aside>
    </div>
  );
}

function RentDueView(props: { installmentStates: InstallmentState[]; initialFilter?: "all" | "due" | "overdue" }) {
  const [filter, setFilter] = useState<"all" | "due" | "overdue">(props.initialFilter ?? "all");
  const openStates = props.installmentStates.filter((item) => item.balance > 0);
  const visibleStates = openStates.filter((item) => {
    if (filter === "overdue") return item.status === "late" || item.status === "missed" || item.status === "partial";
    if (filter === "due") return item.status === "upcoming" || item.status === "window_open";
    return true;
  });

  return (
    <section className="panel">
      <PanelHead eyebrow="Collections" title="Due and upcoming installments" icon={DollarSign} />
      <div className="segmented">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} type="button">All</button>
        <button className={filter === "due" ? "active" : ""} onClick={() => setFilter("due")} type="button">Due soon</button>
        <button className={filter === "overdue" ? "active" : ""} onClick={() => setFilter("overdue")} type="button">Overdue</button>
      </div>
      <div className="workflow-table">
        <div className="workflow-table-head rent-due-row">
          <span>Tenant</span>
          <span>Property</span>
          <span>Due Date</span>
          <span>Amount Due</span>
          <span>Status</span>
        </div>
        {visibleStates.map((item) => (
          <article className="rent-due-row" key={`${item.tenant.id}-${item.label}`}>
            <div>
              <strong>{item.tenant.firstName} {item.tenant.lastInitial}</strong>
              <small>{planLabel(item.tenant.plan.planType)}</small>
            </div>
            <div>
              <strong>{item.property.address}</strong>
              <small>{item.property.unitNumber ? `Unit ${item.property.unitNumber}` : `${item.property.city}, ${item.property.state}`}</small>
            </div>
            <div>
              <strong>{shortDate(item.windowStart)}</strong>
              <small>{formatWindow(item.windowStart, item.windowEnd)}</small>
            </div>
            <b>{money(item.balance)}</b>
            <StatusPill status={item.status} />
          </article>
        ))}
        {visibleStates.length === 0 ? <div className="empty-state">No open rent balances in the current filter.</div> : null}
      </div>
    </section>
  );
}

function PaymentPlansView(props: { installmentStates: InstallmentState[]; onSendPlan: (tenantId: string) => void; onShiftPayday: (tenantId: string) => void; payments: Payment[]; properties: Property[]; tenants: Tenant[] }) {
  const tenantSummaries = summarizeByTenant(props.installmentStates);

  return (
    <section className="panel">
      <PanelHead eyebrow="Tenants" title="Recurring schedules" icon={CalendarClock}>
        <span className="quiet-note">Send a plan so the tenant can review and accept without creating an account.</span>
      </PanelHead>
      <div className="workflow-table">
        <div className="workflow-table-head payment-plan-summary-row">
          <span>Tenant Name</span>
          <span>Property Address</span>
          <span>Monthly Rent</span>
          <span>Current Balance</span>
          <span>Amount Collected</span>
          <span>Amount Remaining</span>
          <span>Next Expected Payment</span>
          <span>Planned Payment Amount</span>
          <span>Last Payment Received</span>
          <span>Status</span>
          <span>Plan Actions</span>
        </div>
        {tenantSummaries.map((summary) => {
          const tenant = summary.tenant;
          const property = props.properties.find((item) => item.id === tenant.propertyId);
          const tenantInstallments = props.installmentStates.filter((item) => item.tenant.id === tenant.id);
          const nextInstallment = tenantInstallments.find((item) => item.balance > 0) ?? tenantInstallments[0];
          const lastPayment = props.payments.filter((payment) => payment.tenantId === tenant.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
          const currentBalance = summary.balance;
          const amountCollected = summary.paid;
          const plannedPaymentAmount = nextInstallment?.expectedAmount ?? tenant.plan.monthlyRent;
          return (
            <article className="payment-plan-summary-row" key={tenant.id}>
              <div>
                <strong>{tenant.firstName} {tenant.lastInitial}</strong>
                <small>{tenant.plan.planName}</small>
              </div>
              <div>
                <strong>{property?.address ?? "Unassigned property"}</strong>
                <small>{property?.city ?? "Unknown location"}</small>
              </div>
              <span>{money(tenant.plan.monthlyRent)}</span>
              <span>{money(currentBalance)}</span>
              <span>{money(amountCollected)}</span>
              <span>{money(currentBalance)}</span>
              <span>{nextInstallment ? friendlyDate(nextInstallment.windowStart.toISOString().slice(0, 10)) : "TBD"}</span>
              <span>{money(plannedPaymentAmount)}</span>
              <span>{lastPayment ? friendlyDate(lastPayment.receivedDate) : "No payments yet"}</span>
              <StatusPill status={summary.status} />
              <div className="payment-plan-actions">
                <button className="secondary-button compact" onClick={() => props.onSendPlan(tenant.id)} type="button">
                  <Send size={16} /> Send Plan
                </button>
                <button className="secondary-button compact" onClick={() => props.onShiftPayday(tenant.id)} type="button">
                  <CalendarClock size={16} /> Shift Payday
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PaymentPlanAcceptanceView(props: {
  acceptanceRecords: PlanAcceptanceRecord[];
  activityLogs: PlanActivityLogEntry[];
  generatedPlanPdfs: GeneratedPlanPdf[];
  onAcceptPlan: (acceptedVia: "link" | "sms_yes", typedName: string) => void;
  onBack: () => void;
  onQuickSmsAccept: (typedName: string) => void;
  paymentPlanDescription: string;
  property: Property;
  selectedInstallments: InstallmentState[];
  tenant: Tenant;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [typedName, setTypedName] = useState(`${props.tenant.firstName} ${props.tenant.lastName}`);
  const [acceptanceMode, setAcceptanceMode] = useState<"link" | "sms_yes">("link");
  const nextInstallment = props.selectedInstallments.find((item) => item.balance > 0) ?? props.selectedInstallments[0];
  const secureLink = `https://rentflex.example/accept/${props.tenant.id}/${toInputDate(today)}`;
  const smsMessage = [
    "RentFlex Payment Plan",
    `Property: ${props.property.address}`,
    `Monthly Rent: ${money(props.tenant.plan.monthlyRent)}`,
    "",
    "Expected Payment Pattern:",
    props.paymentPlanDescription,
    "",
    "Reply YES to accept this payment plan."
  ].join("\n");
  const latestRecord = props.acceptanceRecords.find((record) => record.tenantId === props.tenant.id) ?? null;
  const latestPdf = props.generatedPlanPdfs.find((item) => item.tenantId === props.tenant.id) ?? null;
  const latestLog = props.activityLogs.find((item) => item.tenantId === props.tenant.id) ?? null;

  return (
    <div className="content-grid document-grid">
      <section className="panel">
        <PanelHead eyebrow="Plan acceptance" title="Tenant review page" icon={CheckCircle2}>
          <button className="text-link" onClick={props.onBack} type="button">Back to plans</button>
        </PanelHead>
        <p className="section-copy">Tenants can review the plan and accept in under a minute without creating an account.</p>

        <div className="acceptance-shell">
          <article className="acceptance-preview">
            <h3>RentFlex Payment Plan</h3>
            <div className="acceptance-row"><span>Tenant</span><strong>{props.tenant.firstName} {props.tenant.lastName}</strong></div>
            <div className="acceptance-row"><span>Property</span><strong>{props.property.address}</strong></div>
            <div className="acceptance-row"><span>Monthly Rent</span><strong>{money(props.tenant.plan.monthlyRent)}</strong></div>
            <div className="acceptance-row"><span>Payment Schedule</span><strong>{props.paymentPlanDescription}</strong></div>
            <div className="acceptance-row"><span>Next Expected Payment</span><strong>{nextInstallment ? friendlyDate(toInputDate(nextInstallment.windowStart)) : "TBD"}</strong></div>
            <p className="acceptance-note">This payment plan is intended to help organize expected payments and does not replace the lease agreement.</p>
            <div className="acceptance-link-block">
              <span>Secure link</span>
              <strong>{secureLink}</strong>
            </div>
          </article>

          <article className="acceptance-form-card">
            <div className="acceptance-toggle">
              <button className={acceptanceMode === "link" ? "toggle-pill active" : "toggle-pill"} onClick={() => setAcceptanceMode("link")} type="button">Link acceptance</button>
              <button className={acceptanceMode === "sms_yes" ? "toggle-pill active" : "toggle-pill"} onClick={() => setAcceptanceMode("sms_yes")} type="button">SMS reply YES</button>
            </div>

            {acceptanceMode === "link" ? (
              <>
                <label className="acceptance-checkbox">
                  <input checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} type="checkbox" />
                  <span>I have reviewed this payment plan.</span>
                </label>
                <label className="acceptance-field">
                  <span>Type Full Name</span>
                  <input value={typedName} onChange={(event) => setTypedName(event.target.value)} />
                </label>
                <button className="primary-button" disabled={!reviewed || typedName.trim().length < 3} onClick={() => props.onAcceptPlan("link", typedName)} type="button">
                  Accept Payment Plan
                </button>
              </>
            ) : (
              <>
                <div className="sms-preview">
                  <h3>SMS Sent</h3>
                  <pre>{smsMessage}</pre>
                </div>
                <label className="acceptance-field">
                  <span>Reply typed by tenant</span>
                  <input value={typedName} onChange={(event) => setTypedName(event.target.value)} placeholder="Tenant replies YES" />
                </label>
                <button className="primary-button" disabled={typedName.trim().length < 3} onClick={() => props.onQuickSmsAccept(typedName)} type="button">
                  Record YES Reply
                </button>
              </>
            )}
          </article>
        </div>

        {latestRecord ? (
          <article className="acceptance-success-card">
            <StatusPill status="sent" />
            <strong>Thank You.</strong>
            <p>Your payment plan has been accepted. A copy has been saved to your tenant record.</p>
            <div className="acceptance-success-actions">
              <button className="secondary-button compact" onClick={props.onBack} type="button">View Plan</button>
              <button
                className="secondary-button compact"
                disabled={!latestPdf}
                onClick={() => {
                  if (!latestPdf) return;
                  const blob = new Blob([latestPdf.content], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = latestPdf.fileName;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                type="button"
              >
                Download PDF
              </button>
            </div>
          </article>
        ) : null}
      </section>

      <section className="panel">
        <PanelHead eyebrow="Activity" title="Acceptance log" icon={FileText} />
        {latestRecord ? (
          <article className="acceptance-log-card">
            <StatusPill status="sent" />
            <strong>{latestRecord.tenantName}</strong>
            <span>{latestRecord.propertyAddress}</span>
            <span>{friendlyDate(latestRecord.acceptedAt.slice(0, 10))} at {new Date(latestRecord.acceptedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            <span>Agreement version {latestRecord.agreementVersion}</span>
            {latestLog ? <span>{latestLog.title} - {latestLog.details}</span> : null}
          </article>
        ) : (
          <div className="empty-state">No acceptance records yet.</div>
        )}
      </section>
    </div>
  );
}

function PropertiesView(props: { properties: Property[]; tenants: Tenant[]; installmentStates: InstallmentState[] }) {
  return (
    <section className="panel">
      <PanelHead eyebrow="Properties" title="Houses and balances" icon={Home} />
      <div className="property-grid">
        {props.properties.map((property) => {
          const tenant = props.tenants.find((item) => item.propertyId === property.id);
          const states = props.installmentStates.filter((item) => item.property.id === property.id);
          const paid = states.reduce((sum, item) => sum + item.paidAmount, 0);
          const balance = states.reduce((sum, item) => sum + item.balance, 0);
          return (
            <article className="property-card" key={property.id}>
              <div className="property-image" aria-hidden="true">
                <Home size={42} />
              </div>
              <div className="property-body">
                <StatusPill status={property.status === "active" ? tenantStatus(states) : "inactive"} />
                <h2>{property.address}</h2>
                <p>{property.city}, {property.state}</p>
                <div className="property-metrics">
                  <span>Tenant <strong>{tenant ? `${tenant.firstName} ${tenant.lastInitial}` : "Vacant"}</strong></span>
                  <span>Paid <strong>{money(paid)}</strong></span>
                  <span>Open <strong>{money(balance)}</strong></span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TenantsView(props: {
  onAddTenant: () => void;
  onDownloadCsvTemplate: () => void;
  onDownloadImportIssues: () => void;
  onImportCsv: (file: File) => Promise<void>;
  importingCsv: boolean;
  importReport: CsvImportReport | null;
  hasImportIssues: boolean;
  savingPayment: boolean;
  savingPromise: boolean;
  paymentDraft: { amount: string; installmentLabel: string; method: PaymentMethod; note: string };
  promiseDraft: { amount: string; date: string; note: string };
  promises: PromiseToPay[];
  property: Property;
  query: string;
  maskValue: (value: string) => string;
  recordPayment: () => void;
  recordPromise: () => void;
  selectedBalance: number;
  selectedInstallments: InstallmentState[];
  selectedTenant: Tenant;
  setPaymentDraft: (draft: { amount: string; installmentLabel: string; method: PaymentMethod; note: string }) => void;
  setPromiseDraft: (draft: { amount: string; date: string; note: string }) => void;
  setQuery: (value: string) => void;
  setSelectedTenantId: (id: string) => void;
  showSensitive: boolean;
  tenants: Tenant[];
  toggleSensitive: () => void;
  updatePlanType: (planType: PlanType) => void;
}) {
  const tenantPromises = props.promises.filter((promise) => promise.tenantId === props.selectedTenant.id);

  return (
    <div className="content-grid tenant-detail-grid">
      <section className="panel">
        <PanelHead eyebrow="Tenant directory" title="Profiles" icon={UserRound}>
          <div className="panel-actions">
            <button className="secondary-button compact" onClick={props.onDownloadCsvTemplate} type="button">Template CSV</button>
            <label className="secondary-button compact" aria-disabled={props.importingCsv}>
              {props.importingCsv ? "Importing..." : "Import CSV"}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void props.onImportCsv(file);
                  event.currentTarget.value = "";
                }}
                disabled={props.importingCsv}
                style={{ display: "none" }}
              />
            </label>
            <button className="primary-button compact" onClick={props.onAddTenant} type="button"><Plus size={16} /> Add Tenant</button>
          </div>
        </PanelHead>
        {props.importReport ? (
          <article className="import-report-card" aria-live="polite">
            <strong>Last CSV import</strong>
            <div className="import-report-grid">
              <span>Total rows <b>{props.importReport.totalRows}</b></span>
              <span>Valid rows <b>{props.importReport.validRows}</b></span>
              <span>Imported <b>{props.importReport.importedRows}</b></span>
              <span>Skipped duplicates <b>{props.importReport.skippedRows}</b></span>
              <span>Invalid <b>{props.importReport.invalidRows}</b></span>
            </div>
            {props.importReport.sampleErrors.length > 0 ? (
              <ul>
                {props.importReport.sampleErrors.slice(0, 3).map((error) => <li key={error}>{error}</li>)}
              </ul>
            ) : null}
            {props.hasImportIssues ? (
              <div className="import-report-actions">
                <button className="secondary-button compact" onClick={props.onDownloadImportIssues} type="button">Download Issues CSV</button>
              </div>
            ) : null}
          </article>
        ) : null}
        <label className="search-box">
          <Search size={17} />
          <input value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Search tenants, phone, Cash App, Chime, property" />
        </label>
        <div className="tenant-list">
          {props.tenants.map((tenant) => (
            <button
              className={tenant.id === props.selectedTenant.id ? "tenant-select active" : "tenant-select"}
              key={tenant.id}
              onClick={() => props.setSelectedTenantId(tenant.id)}
              type="button"
            >
              <span>{tenant.firstName[0]}{tenant.lastInitial[0]}</span>
              <div>
                <strong>{tenant.firstName} {tenant.lastInitial}</strong>
                <small>{props.maskValue(tenant.cashAppTag)}</small>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel tenant-profile">
        <PanelHead eyebrow="Tenant profile" title={`${props.selectedTenant.firstName} ${props.selectedTenant.lastInitial}`} icon={NotebookPen} />
        <div className="profile-band">
          <div>
            <span><Home size={16} /> {props.property.address}</span>
            <span><Mail size={16} /> {props.selectedTenant.email}</span>
            <span><Phone size={16} /> {props.selectedTenant.phone}</span>
            <span><CalendarClock size={16} /> Lease Start: {friendlyDate(props.selectedTenant.startOfLease)}</span>
            <span><UserRound size={16} /> {accountTypeLabel(props.selectedTenant.accountType)}</span>
            <span><WalletCards size={16} /> Preferred: {methodLabel(props.selectedTenant.preferredPaymentMethod)}</span>
          </div>
          <strong>{money(props.selectedBalance)}</strong>
        </div>

        <div className="payment-setup">
          <div className="panel-head-inline">
            <h3>Tenant Payment Setup</h3>
            <button className="secondary-button compact" onClick={props.toggleSensitive} type="button">{props.showSensitive ? "Hide" : "Reveal"}</button>
          </div>
          <div>
            <span>Cash App <strong>{props.maskValue(props.selectedTenant.cashAppTag)}</strong></span>
            <span>Chime <strong>{props.maskValue(props.selectedTenant.chimeSign)}</strong></span>
            <span>Chime phone <strong>{props.maskValue(props.selectedTenant.chimePhone)}</strong></span>
            <span>Backup <strong>{methodLabel(props.selectedTenant.backupPaymentMethod)}</strong></span>
          </div>
        </div>

        <div className="schedule-builder">
          <h3>Payment Schedule</h3>
          <div className="segmented">
            {(["monthly", "twice_monthly", "weekly", "custom"] as PlanType[]).map((type) => (
              <button className={props.selectedTenant.plan.planType === type ? "active" : ""} key={type} onClick={() => props.updatePlanType(type)} type="button">
                {planLabel(type)}
              </button>
            ))}
          </div>
          <div className="installment-list">
            {props.selectedInstallments.map((item) => (
              <article key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{formatWindow(item.windowStart, item.windowEnd)} - Grace through {shortDate(item.graceEnd)}</span>
                </div>
                <b>{money(item.expectedAmount)}</b>
                <StatusPill status={item.status} />
              </article>
            ))}
          </div>
        </div>

        <div className="action-grid">
          <div className="form-card">
            <h3>Record Payment</h3>
            <label>
              <span>Installment</span>
              <select
                value={props.paymentDraft.installmentLabel}
                onChange={(event) => props.setPaymentDraft({ ...props.paymentDraft, installmentLabel: event.target.value })}
              >
                {props.selectedTenant.plan.installments.map((installment) => (
                  <option key={installment.label}>{installment.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Method</span>
              <select
                value={props.paymentDraft.method}
                onChange={(event) => props.setPaymentDraft({ ...props.paymentDraft, method: event.target.value as PaymentMethod })}
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>{methodLabel(method)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Amount Received</span>
              <input value={props.paymentDraft.amount} onChange={(event) => props.setPaymentDraft({ ...props.paymentDraft, amount: event.target.value })} inputMode="decimal" />
            </label>
            <label>
              <span>Note</span>
              <textarea value={props.paymentDraft.note} onChange={(event) => props.setPaymentDraft({ ...props.paymentDraft, note: event.target.value })} rows={3} />
            </label>
            <button className="primary-button" disabled={props.savingPayment} onClick={props.recordPayment} type="button">
              <Plus size={18} /> {props.savingPayment ? "Saving..." : "Save Payment"}
            </button>
          </div>

          <div className="form-card">
            <h3>Promise To Pay</h3>
            <label>
              <span>Promised Amount</span>
              <input value={props.promiseDraft.amount} onChange={(event) => props.setPromiseDraft({ ...props.promiseDraft, amount: event.target.value })} inputMode="decimal" />
            </label>
            <label>
              <span>Promised Date</span>
              <input type="date" value={props.promiseDraft.date} onChange={(event) => props.setPromiseDraft({ ...props.promiseDraft, date: event.target.value })} />
            </label>
            <label>
              <span>Note</span>
              <textarea value={props.promiseDraft.note} onChange={(event) => props.setPromiseDraft({ ...props.promiseDraft, note: event.target.value })} rows={3} />
            </label>
            <button className="secondary-button" disabled={props.savingPromise} onClick={props.recordPromise} type="button">
              <CalendarClock size={18} /> {props.savingPromise ? "Saving..." : "Save Promise"}
            </button>
          </div>
        </div>

        <div className="promise-strip">
          {tenantPromises.map((promise) => (
            <span key={promise.id}>{money(promise.promisedAmount)} on {friendlyDate(promise.promisedDate)} - {promise.status}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function NewTenantView(props: {
  createTenantProfile: () => void;
  draft: NewTenantDraft;
  error: string;
  fieldErrors: Partial<Record<string, string>>;
  onClearFieldError: (field: string) => void;
  saving: boolean;
  setDraft: (draft: NewTenantDraft) => void;
  step: number;
  onStepChange: (step: number) => void;
}) {
  const WIZARD_STEPS = ["Tenant & Property", "Rent Details", "Payment Setup", "Schedule & Reminders"] as const;
  const updateDraft = (patch: Partial<NewTenantDraft>) => props.setDraft({ ...props.draft, ...patch });
  const updatePlanRow = (index: number, patch: Partial<NewTenantDraft["planRows"][number]>) => {
    updateDraft({
      planRows: props.draft.planRows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)
    });
  };

  return (
    <section className="panel">
      <PanelHead eyebrow="Add tenant" title="Add Tenant" icon={UserRound} />

      <div className="wizard-steps">
        {WIZARD_STEPS.map((label, index) => (
          <button
            key={label}
            className={`wizard-step-pill${index === props.step ? " active" : ""}${index < props.step ? " done" : ""}`}
            onClick={() => { if (index < props.step) props.onStepChange(index); }}
            type="button"
            aria-current={index === props.step ? "step" : undefined}
          >
            <span className="wizard-step-num">{index < props.step ? "✓" : index + 1}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {props.error ? <p className="form-error" style={{ marginBottom: 14 }}>{props.error}</p> : null}

      <div className="setup-grid">
        {props.step === 0 ? (
          <>
            <FormSection title="Tenant Information">
              <label><span>First Name <abbr title="required">*</abbr></span><input value={props.draft.firstName} onChange={(event) => { updateDraft({ firstName: event.target.value }); props.onClearFieldError("firstName"); }} autoFocus />{props.fieldErrors.firstName ? <small className="field-error">{props.fieldErrors.firstName}</small> : null}</label>
              <label><span>Last Name <abbr title="required">*</abbr></span><input value={props.draft.lastName} onChange={(event) => { updateDraft({ lastName: event.target.value }); props.onClearFieldError("lastName"); }} />{props.fieldErrors.lastName ? <small className="field-error">{props.fieldErrors.lastName}</small> : null}</label>
              <label><span>Phone Number <abbr title="required">*</abbr></span><input value={props.draft.phone} onChange={(event) => { updateDraft({ phone: event.target.value }); props.onClearFieldError("phone"); }} inputMode="tel" />{props.fieldErrors.phone ? <small className="field-error">{props.fieldErrors.phone}</small> : null}</label>
              <label><span>Email Address</span><input value={props.draft.email} onChange={(event) => updateDraft({ email: event.target.value })} inputMode="email" /></label>
            </FormSection>
            <FormSection title="Property">
              <label><span>Street Address</span><input value={props.draft.address} onChange={(event) => updateDraft({ address: event.target.value })} /></label>
              <label><span>City</span><input value={props.draft.city} onChange={(event) => updateDraft({ city: event.target.value })} /></label>
              <label><span>State</span><input value={props.draft.state} onChange={(event) => updateDraft({ state: event.target.value })} /></label>
              <label><span>ZIP Code</span><input value={props.draft.zip} onChange={(event) => updateDraft({ zip: event.target.value })} inputMode="numeric" /></label>
              <label><span>Unit Number</span><input value={props.draft.unitNumber} onChange={(event) => updateDraft({ unitNumber: event.target.value })} /></label>
            </FormSection>
          </>
        ) : null}

        {props.step === 1 ? (
          <FormSection title="Rent Details" wide>
            <label><span>Start of Lease <abbr title="required">*</abbr></span><input max={toInputDate(today)} required type="date" value={props.draft.startOfLease} onChange={(event) => { updateDraft({ startOfLease: event.target.value }); props.onClearFieldError("startOfLease"); }} />{props.fieldErrors.startOfLease ? <small className="field-error">{props.fieldErrors.startOfLease}</small> : null}</label>
            <label><span>Move-In Date</span><input type="date" value={props.draft.moveInDate} onChange={(event) => { updateDraft({ moveInDate: event.target.value }); props.onClearFieldError("moveInDate"); }} />{props.fieldErrors.moveInDate ? <small className="field-error">{props.fieldErrors.moveInDate}</small> : null}</label>
            <label><span>Lease Due Date</span><input type="date" value={props.draft.leaseDueDate} onChange={(event) => updateDraft({ leaseDueDate: event.target.value })} /></label>
            <label className="wide-field"><span>Account Type</span><select value={props.draft.accountType} onChange={(event) => updateDraft({ accountType: event.target.value as AccountType })}>
              {accountTypes.map((type) => <option key={type} value={type}>{accountTypeLabel(type)}</option>)}
            </select></label>
            <label><span>Monthly Rent <abbr title="required">*</abbr></span><input value={props.draft.monthlyRent} onChange={(event) => { updateDraft({ monthlyRent: event.target.value }); props.onClearFieldError("monthlyRent"); }} inputMode="decimal" />{props.fieldErrors.monthlyRent ? <small className="field-error">{props.fieldErrors.monthlyRent}</small> : null}</label>
            <label><span>Late Fee</span><input value={props.draft.lateFee} onChange={(event) => updateDraft({ lateFee: event.target.value })} inputMode="decimal" /></label>
            <label><span>Grace Period Days</span><input value={props.draft.graceDays} onChange={(event) => updateDraft({ graceDays: event.target.value })} inputMode="numeric" /></label>
            <label><span>Current Balance</span><input value={props.draft.currentBalance} onChange={(event) => updateDraft({ currentBalance: event.target.value })} inputMode="decimal" /></label>
          </FormSection>
        ) : null}

        {props.step === 2 ? (
          <FormSection title="Payment Setup" wide>
            <CheckboxGrid
              values={paymentMethods}
              selected={props.draft.paymentMethods}
              labelFor={methodLabel}
              onChange={(methods) => updateDraft({ paymentMethods: methods, preferredPaymentMethod: methods[0] ?? props.draft.preferredPaymentMethod })}
            />
            <label><span>Preferred Method</span><select value={props.draft.preferredPaymentMethod} onChange={(event) => updateDraft({ preferredPaymentMethod: event.target.value as PaymentMethod })}>
              {paymentMethods.map((method) => <option key={method} value={method}>{methodLabel(method)}</option>)}
            </select></label>
            <label><span>Cash App Tag</span><input value={props.draft.cashAppTag} onChange={(event) => updateDraft({ cashAppTag: event.target.value })} placeholder="$TenantTag" /></label>
            <label><span>Chime Sign</span><input value={props.draft.chimeSign} onChange={(event) => updateDraft({ chimeSign: event.target.value })} placeholder="$ChimeName" /></label>
            <label><span>Chime Phone</span><input value={props.draft.chimePhone} onChange={(event) => updateDraft({ chimePhone: event.target.value })} inputMode="tel" /></label>
          </FormSection>
        ) : null}

        {props.step === 3 ? (
          <>
            <FormSection title="Payment Schedule" wide>
              <label><span>Plan Name</span><input value={props.draft.planName} onChange={(event) => updateDraft({ planName: event.target.value })} /></label>
              <label><span>Plan Status</span><select value={props.draft.planStatus} onChange={(event) => updateDraft({ planStatus: event.target.value as PlanStatus })}>
                {planStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select></label>
              <label><span>Payment Frequency</span><select value={props.draft.paymentFrequency} onChange={(event) => updateDraft({ paymentFrequency: event.target.value as PlanType })}>
                {planTypes.map((type) => <option key={type} value={type}>{planLabel(type)}</option>)}
              </select></label>
              <label><span>Typical Payday</span><select value={props.draft.typicalPayday} onChange={(event) => updateDraft({ typicalPayday: event.target.value as Weekday })}>
                {weekdayOptions.map((day) => <option key={day} value={day}>{weekdayLabel(day)}</option>)}
              </select></label>
              <label><span>Next Expected Payday</span><input type="date" value={props.draft.nextExpectedPayday} onChange={(event) => updateDraft({ nextExpectedPayday: event.target.value })} /></label>
              <label><span>Schedule Type</span><select value={props.draft.planType} onChange={(event) => updateDraft({ planType: event.target.value as PlanType, paymentFrequency: event.target.value as PlanType })}>
                {planTypes.map((type) => <option key={type} value={type}>{planLabel(type)}</option>)}
              </select></label>
              <div className="plan-row-list">
                {props.draft.planRows.map((row, index) => (
                  <article key={index}>
                    <input value={row.label} onChange={(event) => updatePlanRow(index, { label: event.target.value })} aria-label="Plan row label" />
                    <input value={row.amount} onChange={(event) => updatePlanRow(index, { amount: event.target.value })} aria-label="Plan row amount" inputMode="decimal" />
                    <input value={row.windowStartDay} onChange={(event) => updatePlanRow(index, { windowStartDay: event.target.value })} aria-label="Start day" inputMode="numeric" />
                    <input value={row.windowEndDay} onChange={(event) => updatePlanRow(index, { windowEndDay: event.target.value })} aria-label="End day" inputMode="numeric" />
                  </article>
                ))}
              </div>
              <button className="secondary-button compact" onClick={() => updateDraft({ planRows: [...props.draft.planRows, { label: "Custom Payment", amount: "0", windowStartDay: "1", windowEndDay: "1" }] })} type="button">
                <Plus size={16} /> Add Date / Amount
              </button>
            </FormSection>
            <FormSection title="Reminders" wide>
              <CheckboxGrid values={reminderOffsets} selected={props.draft.reminderOffsets} labelFor={reminderLabel} onChange={(offsets) => updateDraft({ reminderOffsets: offsets })} />
              <CheckboxGrid values={deliveryMethods} selected={props.draft.deliveryMethods} labelFor={deliveryLabel} onChange={(methods) => updateDraft({ deliveryMethods: methods })} />
            </FormSection>
            <FormSection title="Memo / Notes" wide>
              <label className="wide-field"><span>Internal Notes</span><textarea value={props.draft.memo} onChange={(event) => updateDraft({ memo: event.target.value })} rows={5} /></label>
              <label><span>Emergency Contact</span><input value={props.draft.emergencyContact} onChange={(event) => updateDraft({ emergencyContact: event.target.value })} /></label>
              <label><span>Emergency Phone</span><input value={props.draft.emergencyPhone} onChange={(event) => updateDraft({ emergencyPhone: event.target.value })} /></label>
              <label><span>Lease End Date</span><input type="date" value={props.draft.leaseEndDate} onChange={(event) => { updateDraft({ leaseEndDate: event.target.value }); props.onClearFieldError("leaseEndDate"); }} />{props.fieldErrors.leaseEndDate ? <small className="field-error">{props.fieldErrors.leaseEndDate}</small> : null}</label>
              <label><span>Security Deposit</span><input value={props.draft.securityDeposit} onChange={(event) => updateDraft({ securityDeposit: event.target.value })} inputMode="decimal" /></label>
              <label><span>Backup Method</span><select value={props.draft.backupPaymentMethod} onChange={(event) => updateDraft({ backupPaymentMethod: event.target.value as PaymentMethod })}>
                {paymentMethods.map((method) => <option key={method} value={method}>{methodLabel(method)}</option>)}
              </select></label>
              <label><span>Chime Email</span><input value={props.draft.chimeEmail} onChange={(event) => updateDraft({ chimeEmail: event.target.value })} inputMode="email" /></label>
            </FormSection>
          </>
        ) : null}
      </div>

      <div className="wizard-nav">
        {props.step > 0 ? (
          <button className="secondary-button" onClick={() => props.onStepChange(props.step - 1)} type="button">← Back</button>
        ) : <span />}
        <span className="wizard-progress">Step {props.step + 1} of {WIZARD_STEPS.length}</span>
        {props.step < WIZARD_STEPS.length - 1 ? (
          <button className="primary-button" onClick={() => props.onStepChange(props.step + 1)} type="button">Next →</button>
        ) : (
          <button className="primary-button" disabled={props.saving} onClick={props.createTenantProfile} type="button">
            <Plus size={16} /> {props.saving ? "Saving..." : "Save Tenant"}
          </button>
        )}
      </div>
    </section>
  );
}

function FormSection({ children, title, wide = false }: { children: React.ReactNode; title: string; wide?: boolean }) {
  return (
    <section className={wide ? "form-section wide-section" : "form-section"}>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function CheckboxGrid<T extends string>(props: {
  labelFor: (value: T) => string;
  onChange: (values: T[]) => void;
  selected: T[];
  values: T[];
}) {
  return (
    <div className="checkbox-grid">
      {props.values.map((value) => (
        <label key={value}>
          <input
            checked={props.selected.includes(value)}
            onChange={(event) => {
              props.onChange(event.target.checked ? [...props.selected, value] : props.selected.filter((item) => item !== value));
            }}
            type="checkbox"
          />
          <span>{props.labelFor(value)}</span>
        </label>
      ))}
    </div>
  );
}

function DocumentsView(props: {
  approveDocument: (documentId: string) => void;
  approvingDocumentId: string;
  canUndoGeneratedDocuments: boolean;
  documents: RentDocument[];
  generatingDrafts: boolean;
  generateDocuments: () => void;
  properties: Property[];
  sendingDocumentId: string;
  sendDocument: (documentId: string) => void;
  tenants: Tenant[];
  undoGeneratedDocuments: () => void;
}) {
  const sortedDocuments = props.documents;
  const pageSize = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedDocuments.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedDocuments = sortedDocuments.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="content-grid document-grid">
      <section className="panel">
        <PanelHead eyebrow="Documents" title="Approval queue" icon={FileText}>
          <div className="panel-actions">
            <button className="primary-button compact" disabled={props.generatingDrafts} onClick={props.generateDocuments} type="button">
              <Plus size={16} /> {props.generatingDrafts ? "Generating..." : "Generate Drafts"}
            </button>
            <button className="secondary-button compact" onClick={props.undoGeneratedDocuments} disabled={!props.canUndoGeneratedDocuments || props.generatingDrafts} type="button">
              Undo auto-create
            </button>
          </div>
        </PanelHead>
        <div className="document-stack">
          {pagedDocuments.map((document) => {
            const tenant = props.tenants.find((item) => item.id === document.tenantId);
            const property = props.properties.find((item) => item.id === tenant?.propertyId);
            return (
              <article className="document-card" key={document.id}>
                <div className="document-topline">
                  <StatusPill status={document.status} />
                  <span>{document.kind}</span>
                </div>
                <div className="document-title-row">
                  <div>
                    <h3>{document.title}</h3>
                    <p>{tenant?.firstName} {tenant?.lastInitial} - {property?.address}</p>
                  </div>
                  <strong>{money(document.amountDue)}</strong>
                </div>
                <p>{document.body}</p>
                <div className="delivery-row">
                  <span><Mail size={15} /> {tenant?.email}</span>
                  <span><Phone size={15} /> {tenant?.phone}</span>
                  <span><CalendarClock size={15} /> Due {friendlyDate(document.dueDate)}</span>
                </div>
                <div className="document-actions">
                  <button className="secondary-button compact" onClick={() => props.approveDocument(document.id)} disabled={document.status !== "draft" || props.approvingDocumentId === document.id} type="button">
                    <CheckCircle2 size={16} /> {props.approvingDocumentId === document.id ? "Approving..." : "Approve"}
                  </button>
                  <button className="primary-button compact" onClick={() => props.sendDocument(document.id)} disabled={document.status !== "approved" || props.sendingDocumentId === document.id} type="button">
                    <Send size={16} /> {props.sendingDocumentId === document.id ? "Sending..." : "Send Email/Text"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <div className="pagination-row">
          <button className="secondary-button compact" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage <= 1} type="button">Previous</button>
          <span>Page {safePage} of {totalPages}</span>
          <button className="secondary-button compact" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage >= totalPages} type="button">Next</button>
        </div>
      </section>

      <section className="panel">
        <PanelHead eyebrow="Document preview" title="Tenant-ready format" icon={ReceiptText} />
        <div className="statement-preview">
          <div>
            <strong>RentFlex Payment Ledger</strong>
            <span>Invoice / Statement</span>
          </div>
          <h3>Amount Due</h3>
          <strong>{money(sortedDocuments[0]?.amountDue ?? 0)}</strong>
          <p>{sortedDocuments[0]?.body ?? "Generate drafts from open rent balances."}</p>
          <dl>
            <div><dt>Delivery</dt><dd>Email and text after landlord approval</dd></div>
            <div><dt>Payment methods</dt><dd>Cash App, Chime, cash, money order, Zelle, other</dd></div>
            <div><dt>Ledger proof</dt><dd>Expected amount, received amount, notes, timestamp</dd></div>
          </dl>
        </div>
      </section>
    </div>
  );
}

function LedgerView(props: { installmentStates: InstallmentState[]; payments: Payment[]; exportCsv: () => void }) {
  const ledgerRows = buildLedgerRows(props.installmentStates, props.payments);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [statusPage, setStatusPage] = useState(1);
  const ledgerSize = 14;
  const statusSize = 12;
  const ledgerPages = Math.max(1, Math.ceil(ledgerRows.length / ledgerSize));
  const statusPages = Math.max(1, Math.ceil(props.installmentStates.length / statusSize));
  const pagedLedgerRows = ledgerRows.slice((ledgerPage - 1) * ledgerSize, ledgerPage * ledgerSize);
  const pagedStatusRows = props.installmentStates.slice((statusPage - 1) * statusSize, statusPage * statusSize);

  useEffect(() => {
    if (ledgerPage > ledgerPages) setLedgerPage(ledgerPages);
  }, [ledgerPage, ledgerPages]);

  useEffect(() => {
    if (statusPage > statusPages) setStatusPage(statusPages);
  }, [statusPage, statusPages]);

  return (
    <section className="panel">
      <PanelHead eyebrow="Rent ledger" title="Expected vs received" icon={ReceiptText}>
        <button className="secondary-button compact" onClick={props.exportCsv} type="button">
          <Download size={16} /> Export CSV
        </button>
      </PanelHead>
      <h3 className="section-subtitle first-subtitle">Automatic Ledger</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Charge</th>
              <th>Payment</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {pagedLedgerRows.map((row, index) => (
              <tr key={`${row.date}-${row.description}-${index}`}>
                <td>{friendlyDate(row.date)}</td>
                <td>{row.description}</td>
                <td>{money(row.charge)}</td>
                <td>{money(row.payment)}</td>
                <td>{money(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination-row">
        <button className="secondary-button compact" onClick={() => setLedgerPage((current) => Math.max(1, current - 1))} disabled={ledgerPage <= 1} type="button">Previous</button>
        <span>Ledger page {ledgerPage} of {ledgerPages}</span>
        <button className="secondary-button compact" onClick={() => setLedgerPage((current) => Math.min(ledgerPages, current + 1))} disabled={ledgerPage >= ledgerPages} type="button">Next</button>
      </div>

      <h3 className="section-subtitle">Installment Status</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Property</th>
              <th>Installment</th>
              <th>Window</th>
              <th>Expected</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pagedStatusRows.map((item) => (
              <tr key={`${item.tenant.id}-${item.label}`}>
                <td>{item.tenant.firstName} {item.tenant.lastInitial}</td>
                <td>{item.property.address}</td>
                <td>{item.label}</td>
                <td>{formatWindow(item.windowStart, item.windowEnd)}</td>
                <td>{money(item.expectedAmount)}</td>
                <td>{money(item.paidAmount)}</td>
                <td>{money(item.balance)}</td>
                <td><StatusPill status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination-row">
        <button className="secondary-button compact" onClick={() => setStatusPage((current) => Math.max(1, current - 1))} disabled={statusPage <= 1} type="button">Previous</button>
        <span>Status page {statusPage} of {statusPages}</span>
        <button className="secondary-button compact" onClick={() => setStatusPage((current) => Math.min(statusPages, current + 1))} disabled={statusPage >= statusPages} type="button">Next</button>
      </div>

      <h3 className="section-subtitle">Payment History</h3>
      <VirtualPaymentHistory payments={props.payments} />
    </section>
  );
}

function VirtualPaymentHistory(props: { payments: Payment[] }) {
  const rowHeight = 82;
  const viewportHeight = 330;
  const overscan = 3;
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = props.payments.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(props.payments.length, startIndex + visibleCount);
  const visiblePayments = props.payments.slice(startIndex, endIndex);

  return (
    <div className="virtual-history-shell">
      <div className="virtual-history-list" style={{ height: viewportHeight }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
            {visiblePayments.map((payment) => (
              <article className="virtual-history-item" key={payment.id}>
                <strong>{money(payment.amount)}</strong>
                <span>{payment.installmentLabel} - {friendlyDate(payment.receivedDate)} - {methodLabel(payment.method)}</span>
                <small>{payment.note}</small>
              </article>
            ))}
          </div>
        </div>
      </div>
      <span className="quiet-note">Showing {visiblePayments.length} of {props.payments.length} payment rows in view.</span>
    </div>
  );
}

function ReminderView(props: {
  communicationReceipts: CommunicationReceipt[];
  reminders: ReminderLog[];
  documents: RentDocument[];
  tenants: Tenant[];
  queueReminder: (tenant: Tenant) => void;
  queueReminderForSend: (reminderId: string) => void;
  sendReminder: (reminderId: string) => void;
  onOpenDocuments: () => void;
}) {
  const draftCount = props.reminders.filter((reminder) => reminder.status === "draft").length;
  const queuedCount = props.reminders.filter((reminder) => reminder.status === "queued").length;
  const sentCount = props.reminders.filter((reminder) => reminder.status === "sent").length;
  const drafts = props.documents.filter((document) => document.status === "draft").length;
  const approved = props.documents.filter((document) => document.status === "approved").length;
  const sentDocs = props.documents.filter((document) => document.status === "sent").length;

  return (
    <section className="panel">
      <PanelHead eyebrow="Messages" title="Drafts and tenant messages" icon={MessageSquareText} />
      <p className="section-copy">Build draft reminders, queue them for review, then mark sent after delivery.</p>
      <div className="reminder-stats">
        <article>
          <strong>{props.reminders.length}</strong>
          <span>Total reminders</span>
        </article>
        <article>
          <strong>{draftCount}</strong>
          <span>Drafts</span>
        </article>
        <article>
          <strong>{queuedCount}</strong>
          <span>Queued</span>
        </article>
        <article>
          <strong>{sentCount}</strong>
          <span>Sent</span>
        </article>
      </div>

      <div className="reminder-stats">
        <article>
          <strong>{drafts}</strong>
          <span>Draft documents</span>
        </article>
        <article>
          <strong>{approved}</strong>
          <span>Approved documents</span>
        </article>
        <article>
          <strong>{sentDocs}</strong>
          <span>Sent documents</span>
        </article>
        <article>
          <button className="secondary-button compact" onClick={props.onOpenDocuments} type="button">Open Documents</button>
        </article>
      </div>

      <div className="reminder-actions">
        {props.tenants.map((tenant) => (
          <button className="secondary-button compact" key={tenant.id} onClick={() => props.queueReminder(tenant)} type="button">
            <BellRing size={16} /> {tenant.firstName} {tenant.lastInitial}
          </button>
        ))}
      </div>

      <div className="reminder-list">
        {props.reminders.length === 0 ? (
          <div className="empty-state">No reminder drafts yet.</div>
        ) : (
          props.reminders.map((reminder) => {
            const tenant = props.tenants.find((item) => item.id === reminder.tenantId);
            const reminderDate = friendlyDate(reminder.sendDate);
            return (
              <article className="reminder-card" key={reminder.id}>
                <div className="reminder-card-head">
                  <div>
                    <strong>{tenant?.firstName} {tenant?.lastInitial}</strong>
                    <span>{tenant?.phone}</span>
                  </div>
                  <span className={`reminder-status ${reminder.status}`}>{reminder.status}</span>
                </div>
                <div className="reminder-card-meta">
                  <span>Send date: {reminderDate}</span>
                  <span>Delivery: SMS or email draft</span>
                </div>
                <pre className="reminder-message">{reminder.message}</pre>
                <div className="reminder-card-actions">
                  <button className="secondary-button compact" disabled={reminder.status !== "draft"} onClick={() => props.queueReminderForSend(reminder.id)} type="button">
                    Queue for send
                  </button>
                  <button className="primary-button compact" disabled={reminder.status === "sent"} onClick={() => props.sendReminder(reminder.id)} type="button">
                    Mark sent
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <h3 className="section-subtitle">Communication receipts</h3>
      <div className="history-list">
        {props.communicationReceipts.slice(0, 10).map((receipt) => {
          const tenant = props.tenants.find((item) => item.id === receipt.tenantId);
          return (
            <article key={receipt.id}>
              <strong>{receipt.channel === "document" ? "Document" : "Reminder"} receipt</strong>
              <span>{tenant?.firstName} {tenant?.lastInitial} - {friendlyDate(receipt.createdAt.slice(0, 10))}</span>
              <small>{receipt.id} - {receipt.summary}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LateView(props: { installmentStates: InstallmentState[]; promises: PromiseToPay[]; queueReminder: (tenant: Tenant, state?: InstallmentState) => void }) {
  const lateItems = props.installmentStates.filter((item) => item.status === "late" || item.status === "missed" || item.status === "partial");
  return (
    <section className="panel">
      <PanelHead eyebrow="Overdue" title="Open balances and broken windows" icon={AlertTriangle} />
      <div className="late-list">
        {lateItems.map((item) => {
          const openPromises = props.promises.filter((promise) => promise.tenantId === item.tenant.id && promise.status === "open");
          return (
            <article key={`${item.tenant.id}-${item.label}`}>
              <div>
                <StatusPill status={item.status} />
                <h3>{item.tenant.firstName} {item.tenant.lastInitial} - {item.property.address}</h3>
                <p>{item.label}: {money(item.balance)} remaining after window {formatWindow(item.windowStart, item.windowEnd)}.</p>
                {openPromises.map((promise) => <span key={promise.id}>Promise: {money(promise.promisedAmount)} on {friendlyDate(promise.promisedDate)}</span>)}
              </div>
              <button className="primary-button" onClick={() => props.queueReminder(item.tenant, item)} type="button">
                <BellRing size={18} /> Draft Notice
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReportsView(props: { installmentStates: InstallmentState[]; payments: Payment[]; exportCsv: () => void }) {
  const rows = summarizeByTenant(props.installmentStates);
  return (
    <section className="panel">
      <PanelHead eyebrow="Reports" title="Monthly owner report" icon={Download}>
        <button className="primary-button compact" onClick={props.exportCsv} type="button">
          <Download size={16} /> Export CSV
        </button>
      </PanelHead>
      <div className="report-grid">
        {rows.map((row) => (
          <article className="report-card" key={row.tenant.id}>
            <StatusPill status={row.status} />
            <h3>{row.property.address}</h3>
            <p>{row.tenant.firstName} {row.tenant.lastInitial} - {planLabel(row.tenant.plan.planType)}</p>
            <div>
              <span>Expected <strong>{money(row.expected)}</strong></span>
              <span>Received <strong>{money(row.paid)}</strong></span>
              <span>Balance <strong>{money(row.balance)}</strong></span>
            </div>
          </article>
        ))}
      </div>
      <p className="quiet-note">{props.payments.length} payment records include entered-by, timestamp, method, and notes for dispute clarity.</p>
    </section>
  );
}

function SettingsView(props: { userRole: UserRole; sessionToken: string }) {
  const [cashAppTag, setCashAppTag] = useState("$YourRentCashTag");
  const [chimeName, setChimeName] = useState("$YourChimeName");
  const [saved, setSaved] = useState(false);
  const sessionPayload = useMemo(() => decodeSessionTokenPayload(props.sessionToken), [props.sessionToken]);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <section className="panel">
      <PanelHead eyebrow="Settings" title="Payment Workflow Settings" icon={Settings} />
      <div className="settings-form">
        <label className="settings-field">
          <span>Your Cash App Tag</span>
          <input value={cashAppTag} onChange={(e) => setCashAppTag(e.target.value)} placeholder="$YourRentCashTag" />
        </label>
        <label className="settings-field">
          <span>Your Chime Name / Tag</span>
          <input value={chimeName} onChange={(e) => setChimeName(e.target.value)} placeholder="$YourChimeName" />
        </label>
        <article className="settings-grid-card">
          <strong>Active Access Role</strong>
          <span>{props.userRole === "owner" ? "Owner (full access)" : props.userRole === "manager" ? "Manager" : "Viewer"}</span>
          <small>{sessionPayload?.email ?? "Signed in session"}</small>
        </article>
        <div className="settings-info-grid">
          <article>
            <strong>Reminder Style</strong>
            <span>Professional rent schedule messages only</span>
          </article>
          <article>
            <strong>Payment Tracking</strong>
            <span>Cash App and Chime — manual confirmation in the ledger</span>
          </article>
          <article>
            <strong>Future Processing</strong>
            <span>Investigate ACH or rent-payment platforms later</span>
          </article>
          <article>
            <strong>Grace Window</strong>
            <span>1 to 3 days per tenant plan</span>
          </article>
        </div>
        <div className="settings-actions">
          <button className="primary-button" onClick={save} type="button">
            <CheckCircle2 size={16} /> Save Settings
          </button>
          {saved ? <span className="settings-saved">✓ Saved</span> : null}
        </div>
        <p className="settings-legal">
          RentFlex Ledger stores your tenant and payment data securely. Use this tool to manage
          records and reminders. It does not replace a formal lease agreement or legal counsel.
        </p>
      </div>
    </section>
  );
}

function SecurityView(props: { auditEvents: AuditEvent[] }) {
  return (
    <section className="panel">
      <PanelHead eyebrow="Security" title="Security and audit center" icon={Lock} />
      <div className="settings-info-grid">
        <article>
          <strong>Session policy</strong>
          <span>Automatic timeout after 20 minutes of inactivity.</span>
        </article>
        <article>
          <strong>Auth gate</strong>
          <span>Production routes require sign-in before financial actions.</span>
        </article>
        <article>
          <strong>Role controls</strong>
          <span>Viewer role cannot save payments, promises, reminders, or documents.</span>
        </article>
        <article>
          <strong>Idempotency</strong>
          <span>Critical write endpoints use replay-safe request keys.</span>
        </article>
      </div>
      <h3 className="section-subtitle">Append-only activity log</h3>
      <div className="history-list">
        {props.auditEvents.slice(0, 20).map((event) => (
          <article key={event.id}>
            <strong>{event.action.replaceAll("_", " ")}</strong>
            <span>{event.actorRole} - {friendlyDate(event.createdAt.slice(0, 10))}</span>
            <small>{event.details}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function PrivacyView() {
  return (
    <section className="panel legal-page">
      <PanelHead eyebrow="Legal" title="Privacy Policy" icon={Shield} />
      <p>RentFlex Ledger stores landlord-entered tenant and payment data to support rent tracking, communication drafts, and reporting.</p>
      <p>Data is used only to provide the service experience and operational logs. Access is controlled by account role.</p>
      <p>Do not store prohibited sensitive personal identifiers in free-text fields. Contact support to request data export or deletion guidance.</p>
    </section>
  );
}

function TermsView() {
  return (
    <section className="panel legal-page">
      <PanelHead eyebrow="Legal" title="Terms of Service" icon={FileText} />
      <p>RentFlex Ledger is a workflow and recordkeeping tool. Users remain responsible for lawful notices, lease obligations, and jurisdiction-specific compliance.</p>
      <p>The platform does not provide legal advice. Use generated drafts as operational templates and review before delivery.</p>
      <p>Continued use indicates acceptance of updates to product features, security controls, and policy documents.</p>
    </section>
  );
}

function AppSkeleton() {
  return (
    <section className="skeleton-shell" aria-label="Loading dashboard">
      <div className="skeleton-line short" />
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <div className="skeleton-panel" />
    </section>
  );
}

function MobileOptionsView() {
  const platforms = [
    {
      title: "Android app",
      subtitle: "Capacitor wrapper for Google Play and emulator testing.",
      detail: "Open the app in Android Studio after syncing the web build.",
      route: "http://10.0.2.2:5175"
    },
    {
      title: "iPhone app",
      subtitle: "Capacitor wrapper for iOS and simulator testing.",
      detail: "Use the same React codebase and open it in Xcode on macOS.",
      route: "http://localhost:5175"
    },
    {
      title: "Shared backend",
      subtitle: "One backend for web, Android, and iPhone.",
      detail: "Keep tenant data, reminders, payments, and reports synced everywhere.",
      route: "PostgreSQL + Railway"
    }
  ];

  const mobileFeatures = [
    "Tenant management",
    "Schedules",
    "Payment tracking",
    "SMS reminders",
    "PDF reports",
    "Email reports",
    "Push notifications",
    "Camera document scans",
    "Offline mode"
  ];

  const setupSteps = [
    "npm install @capacitor/core @capacitor/cli",
    "npx cap init",
    "npm install @capacitor/android @capacitor/ios",
    "npx cap add android",
    "npx cap add ios",
    "npm run build",
    "npx cap sync"
  ];

  return (
    <div className="content-grid">
      <section className="panel">
        <PanelHead eyebrow="Mobile" title="Phone options for the app" icon={Phone} />
        <p className="section-copy">
          Keep the existing web app as the shared source of truth, then package it once for Android and iPhone with Capacitor.
        </p>
        <div className="setup-grid">
          {platforms.map((platform) => (
            <article key={platform.title} className="settings-grid-card mobile-option-card">
              <strong>{platform.title}</strong>
              <span>{platform.subtitle}</span>
              <div className="mobile-route">{platform.route}</div>
              <span>{platform.detail}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelHead eyebrow="Setup" title="Capacitor workflow" icon={ClipboardList} />
        <div className="mobile-steps">
          {setupSteps.map((step, index) => (
            <div className="mobile-step" key={step}>
              <span>{index + 1}</span>
              <code>{step}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelHead eyebrow="App scope" title="Mobile features to include" icon={MessageSquareText} />
        <div className="mobile-chip-list">
          {mobileFeatures.map((feature) => (
            <span className="mobile-chip" key={feature}>{feature}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, tone, value }: { icon: typeof DollarSign; label: string; tone: string; value: string }) {
  return (
    <article className={`metric-card ${tone}`}>
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PanelHead({ children, eyebrow, icon: Icon, title }: { children?: React.ReactNode; eyebrow: string; icon: typeof Home; title: string }) {
  return (
    <div className="panel-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <div className="panel-actions">
        {children}
        <Icon size={24} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: PaymentStatus | DocumentStatus | "inactive" }) {
  return <span className={`status-pill ${status}`}>{status.replace("_", " ")}</span>;
}

const navSections: Array<{ title: string; items: Array<{ id: ViewId; label: string; icon: typeof Home }> }> = [
  {
    title: "Dashboard",
    items: [{ id: "dashboard", label: "Dashboard", icon: Home }]
  },
  {
    title: "Collections",
    items: [
      { id: "rent_due", label: "Due and Upcoming", icon: DollarSign },
      { id: "reminders", label: "Messages", icon: BellRing }
    ]
  },
  {
    title: "Tenants",
    items: [
      { id: "tenants", label: "Tenants", icon: UsersRound },
      { id: "payment_plans", label: "Schedules", icon: CalendarClock }
    ]
  },
  {
    title: "Properties",
    items: [{ id: "properties", label: "Properties", icon: Home }]
  },
  {
    title: "Accounting",
    items: [
      { id: "ledger", label: "Rent Ledger", icon: ReceiptText },
      { id: "documents", label: "Documents", icon: FileText }
    ]
  },
  {
    title: "Management",
    items: [
      { id: "reports", label: "Reports", icon: Download },
      { id: "security", label: "Security Center", icon: Shield },
      { id: "settings", label: "Settings", icon: Settings },
      { id: "mobile_app", label: "Mobile Setup", icon: Phone }
    ]
  }
];

const paymentMethods: PaymentMethod[] = ["cash_app", "chime", "zelle", "venmo", "paypal", "ach", "cash", "money_order", "other"];
const accountTypes: AccountType[] = ["section_8", "cash_paying", "ssi_disability", "social_security", "employment", "pension", "fixed_income", "mixed_income", "other"];
const planTypes: PlanType[] = ["monthly", "twice_monthly", "weekly", "bi_weekly", "custom"];
const planStatuses: PlanStatus[] = ["active", "paused", "completed", "cancelled"];
const weekdayOptions: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const reminderOffsets: ReminderOffset[] = ["three_days_before", "one_day_before", "payment_day", "two_days_late", "seven_days_late"];
const deliveryMethods: DeliveryMethod[] = ["sms", "email", "push", "in_app"];

function buildInstallmentStates(tenants: Tenant[], properties: Property[], payments: Payment[]): InstallmentState[] {
  return tenants.flatMap((tenant) => {
    const property = properties.find((item) => item.id === tenant.propertyId) ?? properties[0];
    return tenant.plan.installments.map((installment) => {
      const windowStart = installment.expectedDate ? parseInputDate(installment.expectedDate) : new Date(today.getFullYear(), today.getMonth(), installment.windowStartDay);
      const windowEnd = installment.expectedDate ? parseInputDate(installment.expectedDate) : new Date(today.getFullYear(), today.getMonth(), installment.windowEndDay);
      const graceEnd = addDays(windowEnd, tenant.plan.graceDays);
      const paidAmount = payments
        .filter((payment) => payment.tenantId === tenant.id && payment.installmentLabel === installment.label)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const balance = Math.max(installment.amount - paidAmount, 0);
      const status = getStatus(paidAmount, installment.amount, windowStart, windowEnd, graceEnd);
      return {
        tenant,
        property,
        label: installment.label,
        expectedAmount: installment.amount,
        paidAmount,
        balance,
        windowStart,
        windowEnd,
        graceEnd,
        status
      };
    });
  });
}

function buildLedgerRows(states: InstallmentState[], payments: Payment[]): LedgerRow[] {
  const tenantMap = new Map(states.map((state) => [state.tenant.id, state]));
  const chargeEvents = Array.from(new Set(states.map((state) => state.tenant.id))).map((tenantId) => {
    const state = tenantMap.get(tenantId)!;
    return {
      amount: state.tenant.plan.monthlyRent,
      date: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      description: `${state.tenant.firstName} ${state.tenant.lastInitial} Monthly Rent`,
      type: "charge" as const
    };
  });
  const paymentEvents = payments.map((payment) => {
    const state = tenantMap.get(payment.tenantId);
    const tenantName = state ? `${state.tenant.firstName} ${state.tenant.lastInitial}` : "Tenant";
    return {
      amount: payment.amount,
      date: payment.receivedDate,
      description: `${tenantName} ${methodLabel(payment.method)} Payment`,
      type: "payment" as const
    };
  });
  let balance = 0;
  return [...chargeEvents, ...paymentEvents]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.type === "charge" ? -1 : 1))
    .map((event) => {
      balance += event.type === "charge" ? event.amount : -event.amount;
      return {
        date: event.date,
        description: event.description,
        charge: event.type === "charge" ? event.amount : 0,
        payment: event.type === "payment" ? event.amount : 0,
        balance
      };
    });
}

function getStatus(paid: number, expected: number, windowStart: Date, windowEnd: Date, graceEnd: Date): PaymentStatus {
  if (paid >= expected) return "paid";
  if (paid > 0) return "partial";
  if (today < windowStart) return "upcoming";
  if (today >= windowStart && today <= windowEnd) return "window_open";
  if (today > windowEnd && today <= graceEnd) return "late";
  return "missed";
}

function summarizeByTenant(states: InstallmentState[]) {
  const ids = Array.from(new Set(states.map((item) => item.tenant.id)));
  return ids.map((id) => {
    const tenantStates = states.filter((item) => item.tenant.id === id);
    const expected = tenantStates.reduce((sum, item) => sum + item.expectedAmount, 0);
    const paid = tenantStates.reduce((sum, item) => sum + item.paidAmount, 0);
    const balance = tenantStates.reduce((sum, item) => sum + item.balance, 0);
    return {
      tenant: tenantStates[0].tenant,
      property: tenantStates[0].property,
      expected,
      paid,
      balance,
      status: tenantStatus(tenantStates)
    };
  });
}

function tenantStatus(states: InstallmentState[]): PaymentStatus {
  if (states.some((item) => item.status === "missed" || item.status === "late")) return "late";
  if (states.some((item) => item.status === "partial")) return "partial";
  if (states.some((item) => item.status === "window_open")) return "window_open";
  if (states.every((item) => item.status === "paid" || item.status === "upcoming")) return states.some((item) => item.status === "paid") ? "paid" : "upcoming";
  return "upcoming";
}

function createPlanFromType(
  planType: PlanType,
  monthlyRent: number,
  graceDays: number,
  typicalPayday: Weekday = "friday",
  nextExpectedPayday: string = toInputDate(today),
  leaseDueDate?: string,
  existingInstallments: PaymentPlan["installments"] = []
): PaymentPlan {
  return createPlanFromSchedule(planType, monthlyRent, graceDays, typicalPayday, nextExpectedPayday, leaseDueDate, existingInstallments);
}

function createPlanFromSchedule(planType: PlanType, monthlyRent: number, graceDays: number, typicalPayday: Weekday, nextExpectedPayday: string, leaseDueDate?: string, existingInstallments: PaymentPlan["installments"] = []): PaymentPlan {
  const installments = planType === "custom" && existingInstallments.length > 0
    ? existingInstallments
    : generateInstallments(planType, monthlyRent, nextExpectedPayday, existingInstallments);

  const planNameMap: Record<PlanType, string> = {
    monthly: "Monthly Rent Plan",
    twice_monthly: "Semi-Monthly Rent Plan",
    weekly: "Weekly Rent Plan",
    bi_weekly: "Bi-Weekly Rent Plan",
    custom: "Custom Payment Plan"
  };

  return {
    planName: planNameMap[planType],
    status: "active",
    monthlyRent,
    planType,
    paymentFrequency: planType,
    graceDays,
    typicalPayday,
    nextExpectedPayday,
    leaseDueDate,
    installments
  };
}

function generateInstallments(planType: PlanType, monthlyRent: number, nextExpectedPayday: string, existingInstallments: PaymentPlan["installments"] = []) {
  const anchorDate = parseInputDate(nextExpectedPayday);
  if (Number.isNaN(anchorDate.getTime())) {
    return existingInstallments.length > 0 ? existingInstallments : [];
  }

  if (planType === "weekly") {
    const baseAmount = Math.floor(monthlyRent / 4);
    const remainder = monthlyRent - baseAmount * 4;
    return Array.from({ length: 4 }, (_, index) => {
      const date = addDays(anchorDate, index * 7);
      return {
        label: `Week ${index + 1} rent`,
        amount: index === 3 ? baseAmount + remainder : baseAmount,
        windowStartDay: date.getDate(),
        windowEndDay: date.getDate(),
        expectedDate: toInputDate(date)
      };
    });
  }

  if (planType === "bi_weekly") {
    const firstAmount = Math.floor(monthlyRent / 2);
    return [0, 14].map((offset, index) => {
      const date = addDays(anchorDate, offset);
      return {
        label: `Bi-weekly payment ${index + 1}`,
        amount: index === 0 ? firstAmount : monthlyRent - firstAmount,
        windowStartDay: date.getDate(),
        windowEndDay: date.getDate(),
        expectedDate: toInputDate(date)
      };
    });
  }

  if (planType === "twice_monthly") {
    const firstAmount = Math.floor(monthlyRent / 2);
    return [0, 15].map((offset, index) => {
      const date = addDays(anchorDate, offset);
      return {
        label: `Payment ${index + 1}`,
        amount: index === 0 ? firstAmount : monthlyRent - firstAmount,
        windowStartDay: date.getDate(),
        windowEndDay: date.getDate(),
        expectedDate: toInputDate(date)
      };
    });
  }

  if (planType === "custom") {
    return [
      { label: "Custom payment 1", amount: Math.round(monthlyRent * 0.34), windowStartDay: anchorDate.getDate(), windowEndDay: anchorDate.getDate(), expectedDate: toInputDate(anchorDate) },
      { label: "Custom payment 2", amount: Math.round(monthlyRent * 0.33), windowStartDay: addDays(anchorDate, 14).getDate(), windowEndDay: addDays(anchorDate, 14).getDate(), expectedDate: toInputDate(addDays(anchorDate, 14)) },
      { label: "Custom payment 3", amount: monthlyRent - Math.round(monthlyRent * 0.67), windowStartDay: addDays(anchorDate, 28).getDate(), windowEndDay: addDays(anchorDate, 28).getDate(), expectedDate: toInputDate(addDays(anchorDate, 28)) }
    ];
  }

  return [{ label: "Monthly rent", amount: monthlyRent, windowStartDay: anchorDate.getDate(), windowEndDay: anchorDate.getDate(), expectedDate: toInputDate(anchorDate) }];
}

function advanceDateByFrequency(date: Date, frequency: PlanType) {
  if (frequency === "weekly") return addDays(date, 7);
  if (frequency === "bi_weekly") return addDays(date, 14);
  if (frequency === "twice_monthly") return addDays(date, 15);
  if (frequency === "monthly") return addDays(date, 30);
  return addDays(date, 14);
}

function parseInputDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function buildReminderMessage(tenant: Tenant, property?: Property, state?: InstallmentState) {
  const amount = state ? money(state.balance || state.expectedAmount) : money(tenant.plan.installments[0].amount);
  const window = state ? formatWindow(state.windowStart, state.windowEnd) : "your payment window";
  return `Hi ${tenant.firstName}, this is your rent reminder for ${property?.address ?? "your property"}. Your ${state?.label ?? "rent installment"} is ${amount} and is expected ${window}. ${paymentInstruction(tenant)} Reply PAID after sending payment or HELP if you need to speak with the landlord.`;
}

function createRentDocument(state: InstallmentState, tenantPromises: PromiseToPay[]): RentDocument {
  const openPromise = tenantPromises.find((promise) => promise.status === "open");
  const kind: DocumentKind = state.status === "partial" || state.status === "late" || state.status === "missed" ? "statement" : "invoice";
  const promiseCopy = openPromise ? ` Open promise: ${money(openPromise.promisedAmount)} on ${friendlyDate(openPromise.promisedDate)}.` : "";
  return {
    id: `doc-${state.tenant.id}-${state.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    tenantId: state.tenant.id,
    kind,
    title: kind === "invoice" ? `${state.label} invoice` : `${monthLabel} balance statement`,
    amountDue: state.balance,
    issueDate: toInputDate(today),
    dueDate: toInputDate(state.graceEnd),
    delivery: ["email", "text"],
    status: "draft",
    body: `${kind === "invoice" ? "Invoice" : "Statement"} for ${state.property.address}. ${state.label} expected ${money(state.expectedAmount)}, received ${money(state.paidAmount)}, balance due ${money(state.balance)}. ${paymentInstruction(state.tenant)} Backup method: ${methodLabel(state.tenant.backupPaymentMethod)}.${promiseCopy}`
  };
}

function paymentInstruction(tenant: Tenant) {
  if (tenant.preferredPaymentMethod === "chime") {
    return `You can pay by Chime to ChimeSign ${tenant.chimeSign}, phone ${tenant.chimePhone}, or email ${tenant.chimeEmail}.`;
  }
  if (tenant.preferredPaymentMethod === "cash_app") {
    return `You can pay by Cash App to ${tenant.cashAppTag}.`;
  }
  return `You can pay by ${methodLabel(tenant.preferredPaymentMethod)} or use backup method ${methodLabel(tenant.backupPaymentMethod)}.`;
}

function methodLabel(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    ach: "ACH Bank Transfer",
    cash_app: "Cash App",
    chime: "Chime",
    cash: "Cash",
    money_order: "Money Order",
    paypal: "PayPal",
    venmo: "Venmo",
    zelle: "Zelle",
    other: "Other"
  };
  return labels[method];
}

function accountTypeLabel(accountType: AccountType) {
  const labels: Record<AccountType, string> = {
    section_8: "Section 8 / Housing Choice Voucher",
    cash_paying: "Cash Paying Tenant",
    ssi_disability: "SSI / Disability Income",
    social_security: "Social Security Income",
    employment: "Employment Income",
    pension: "Pension Income",
    fixed_income: "Fixed Income",
    mixed_income: "Mixed Income Sources",
    other: "Other"
  };
  return labels[accountType];
}

function statusLabel(status: PlanStatus) {
  return status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reminderLabel(reminder: ReminderOffset) {
  const labels: Record<ReminderOffset, string> = {
    three_days_before: "3 Days Before Payment",
    one_day_before: "1 Day Before Payment",
    payment_day: "Payment Day",
    two_days_late: "2 Days Late",
    seven_days_late: "7 Days Late"
  };
  return labels[reminder];
}

function weekdayLabel(day: Weekday) {
  return day.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function deliveryLabel(delivery: DeliveryMethod) {
  const labels: Record<DeliveryMethod, string> = {
    sms: "SMS",
    email: "Email",
    push: "Push Notification",
    in_app: "In-App Notification"
  };
  return labels[delivery];
}

function numberFromDraft(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseTenantCsv(csv: string): CsvParseResult {
  const rows = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (rows.length < 2) {
    return { rows: [], invalidIssues: [], invalidRows: 0, totalRows: 0, sampleErrors: ["CSV needs a header row and at least one data row."] };
  }

  const headers = splitCsvLine(rows[0]).map((header) => normalizeCsvHeader(header));
  const output: ParsedTenantCsvRow[] = [];
  const invalidIssues: CsvImportIssue[] = [];
  const sampleErrors: string[] = [];
  let invalidRows = 0;

  rows.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const values = splitCsvLine(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const firstName = (record.first_name || record.firstname || record.first || "").trim();
    const lastName = (record.last_name || record.lastname || record.last || "").trim();
    const phone = (record.phone || record.phone_number || "").trim();
    const email = (record.email || "").trim();
    const address = (record.address || record.street || "").trim();
    const city = (record.city || "").trim();
    const state = (record.state || "").trim();
    const zip = (record.zip || record.postal || "").trim();
    const unitNumber = (record.unit || record.unit_number || "").trim();
    const preferredPaymentMethodRaw = (record.preferred_payment_method || record.payment_method || "money_order").trim();
    const cashAppTag = (record.cash_app_tag || record.cashapptag || "").trim();
    const chimeSign = (record.chime_sign || record.chime || "").trim();
    const chimePhone = (record.chime_phone || "").trim();
    const monthlyRentRaw = (record.monthly_rent || record.rent || "").trim();
    const monthlyRent = Number(record.monthly_rent || record.rent || "0");
    if (!firstName || !lastName || !phone || !address || !Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      invalidRows += 1;
      invalidIssues.push({
        rowNumber,
        reason: "Missing required fields or invalid monthly_rent",
        firstName,
        lastName,
        phone,
        email,
        address,
        city,
        state,
        zip,
        unitNumber,
        monthlyRent: monthlyRentRaw,
        preferredPaymentMethod: preferredPaymentMethodRaw,
        cashAppTag,
        chimeSign,
        chimePhone
      });
      if (sampleErrors.length < 6) {
        sampleErrors.push(`Row ${rowNumber}: missing required fields or invalid monthly_rent.`);
      }
      return;
    }

    output.push({
      sourceRowNumber: rowNumber,
      firstName,
      lastName,
      phone,
      email,
      address,
      city: city || "City",
      state: state || "NJ",
      zip,
      unitNumber,
      monthlyRent,
      preferredPaymentMethod: normalizePaymentMethod(preferredPaymentMethodRaw),
      cashAppTag,
      chimeSign,
      chimePhone
    });
  });

  return {
    rows: output,
    invalidIssues,
    invalidRows,
    totalRows: rows.length - 1,
    sampleErrors
  };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function normalizeCsvHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizePaymentMethod(value: string): PaymentMethod {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (paymentMethods.includes(normalized as PaymentMethod)) return normalized as PaymentMethod;
  return "money_order";
}

function isValidPastOrTodayDate(value: string) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date <= today;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(value);
}

function planLabel(planType: PlanType) {
  if (planType === "twice_monthly") return "Semi-Monthly";
  if (planType === "bi_weekly") return "Bi-Weekly";
  return planType.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function describePaymentPlan(plan: PaymentPlan) {
  return plan.installments
    .map((item) => `${money(item.amount)} ${item.label.toLowerCase()} (${ordinalDay(item.windowStartDay)}-${ordinalDay(item.windowEndDay)})`)
    .join(", ");
}

function ordinalDay(day: number) {
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${suffix}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysUntil(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function friendlyDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatWindow(start: Date, end: Date) {
  return `${shortDate(start)}-${end.getDate()}`;
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function loadAppState(signal?: AbortSignal): Promise<AppState> {
  const response = await fetch("/api/state", { signal });
  if (!response.ok) throw new Error("Unable to load app state");
  return response.json() as Promise<AppState>;
}

async function apiPost(path: string, body: unknown, options?: { idempotencyKey?: string; signal?: AbortSignal; headers?: Record<string, string> }) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options?.idempotencyKey) headers["X-Idempotency-Key"] = options.idempotencyKey;
  if (typeof window !== "undefined") {
    const sessionToken = localStorage.getItem("rentflex-session-token");
    if (sessionToken) headers["X-Session-Token"] = sessionToken;
  }
  if (options?.headers) Object.assign(headers, options.headers);
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers,
    method: "POST",
    signal: options?.signal
  });
  if (!response.ok) return undefined;
  return response.json();
}

async function apiPatch(path: string, body?: unknown, options?: { idempotencyKey?: string; signal?: AbortSignal; headers?: Record<string, string> }) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (options?.idempotencyKey) headers["X-Idempotency-Key"] = options.idempotencyKey;
  if (typeof window !== "undefined") {
    const sessionToken = localStorage.getItem("rentflex-session-token");
    if (sessionToken) headers["X-Session-Token"] = sessionToken;
  }
  if (options?.headers) Object.assign(headers, options.headers);
  const response = await fetch(path, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    method: "PATCH",
    signal: options?.signal
  });
  if (!response.ok) return undefined;
  return response.json();
}

async function trackAnalyticsEvent(name: string, payload: Record<string, unknown>) {
  try {
    await apiPost("/api/analytics", {
      id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name,
      payload
    });
  } catch {
    // Best-effort telemetry only.
  }
}

function isSessionTokenValid(token: string) {
  const payload = decodeSessionTokenPayload(token);
  return Boolean(payload && payload.expiresAt > Date.now());
}

function decodeSessionTokenPayload(token: string): { email: string; expiresAt: number; issuedAt: number; role: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const decoded = atob(parts[0].replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(decoded) as { email?: string; expiresAt?: number; issuedAt?: number; role?: string };
    if (typeof parsed.email !== "string" || typeof parsed.expiresAt !== "number" || typeof parsed.issuedAt !== "number" || typeof parsed.role !== "string") return null;
    return { email: parsed.email, expiresAt: parsed.expiresAt, issuedAt: parsed.issuedAt, role: parsed.role };
  } catch {
    return null;
  }
}
