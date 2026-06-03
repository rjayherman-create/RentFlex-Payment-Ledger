export const propertiesSeed = [
  { id: "prop-1", address: "123 Main Street", city: "Newark", state: "NJ", zip: "07102", unitNumber: "1", status: "active" },
  { id: "prop-2", address: "45 Oak Street", city: "Irvington", state: "NJ", zip: "07111", unitNumber: "2B", status: "active" },
  { id: "prop-3", address: "88 Pine Street", city: "East Orange", state: "NJ", zip: "07017", unitNumber: "", status: "active" },
  { id: "prop-4", address: "14 Bergen Avenue", city: "Jersey City", state: "NJ", zip: "07305", unitNumber: "", status: "inactive" }
];

export const tenantsSeed = [
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
    reminderOffsets: ["three_days_before", "due_today", "three_days_late"],
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
    reminderOffsets: ["seven_days_before", "three_days_before", "due_today", "seven_days_late"],
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
    reminderOffsets: ["three_days_before", "due_today", "three_days_late"],
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

export const paymentsSeed = [
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

export const promisesSeed = [
  { id: "promise-1", tenantId: "tenant-2", promisedAmount: 125, promisedDate: "2026-06-05", note: "Tenant promised to send remaining first installment after shift.", status: "open" },
  { id: "promise-2", tenantId: "tenant-3", promisedAmount: 250, promisedDate: "2026-06-04", note: "Asked for one extra day on week 1.", status: "open" }
];

export const documentsSeed = [
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
