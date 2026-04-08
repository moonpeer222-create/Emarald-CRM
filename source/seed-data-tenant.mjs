// Seed data to Firestore with correct tenant structure (ES Module)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD6R-PqhvL_o4nJzWH1QTyZGlgMvE2PRp0",
  authDomain: "wasi-app-1.firebaseapp.com",
  projectId: "wasi-app-1",
  storageBucket: "wasi-app-1.firebasestorage.app",
  messagingSenderId: "105328982582974249503",
  appId: "1:105328982582974249503:web:some-app-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Default tenant ID (single-tenant setup)
const TENANT_ID = "default";

// Sample data
const customers = [
  {
    id: "cust-001",
    name: "Ali Khan",
    email: "ali.khan@email.com",
    phone: "+92-300-1234567",
    address: "Lahore, Pakistan",
    createdAt: new Date().toISOString()
  },
  {
    id: "cust-002",
    name: "Sara Ahmed",
    email: "sara.ahmed@email.com",
    phone: "+92-300-7654321",
    address: "Karachi, Pakistan",
    createdAt: new Date().toISOString()
  },
  {
    id: "cust-003",
    name: "Muhammad Hassan",
    email: "hassan@email.com",
    phone: "+92-301-2345678",
    address: "Islamabad, Pakistan",
    createdAt: new Date().toISOString()
  },
  {
    id: "cust-004",
    name: "Fatima Zahra",
    email: "fatima@email.com",
    phone: "+92-302-3456789",
    address: "Lahore, Pakistan",
    createdAt: new Date().toISOString()
  },
  {
    id: "cust-005",
    name: "Usman Ali",
    email: "usman@email.com",
    phone: "+92-303-4567890",
    address: "Rawalpindi, Pakistan",
    createdAt: new Date().toISOString()
  }
];

const deals = [
  {
    id: "deal-001",
    title: "UK Visa Application",
    value: 150000,
    currency: "PKR",
    status: "active",
    customerId: "cust-001",
    createdAt: new Date().toISOString()
  },
  {
    id: "deal-002",
    title: "Canada PR",
    value: 250000,
    currency: "PKR",
    status: "active",
    customerId: "cust-002",
    createdAt: new Date().toISOString()
  },
  {
    id: "deal-003",
    title: "Schengen Visa",
    value: 75000,
    currency: "PKR",
    status: "pending",
    customerId: "cust-003",
    createdAt: new Date().toISOString()
  },
  {
    id: "deal-004",
    title: "Umrah Package",
    value: 180000,
    currency: "PKR",
    status: "active",
    customerId: "cust-004",
    createdAt: new Date().toISOString()
  },
  {
    id: "deal-005",
    title: "Dubai Employment Visa",
    value: 120000,
    currency: "PKR",
    status: "active",
    customerId: "cust-005",
    createdAt: new Date().toISOString()
  }
];

const cases = [
  {
    id: "EMR-2025-1001",
    customerId: "cust-001",
    customerName: "Ali Khan",
    fatherName: "Ahmed Khan",
    phone: "+92-300-1234567",
    email: "ali.khan@email.com",
    cnic: "35201-1234567-1",
    passport: "AB123456",
    country: "United Kingdom",
    jobType: "Engineer",
    jobDescription: "Software Engineer position",
    address: "Lahore, Pakistan",
    city: "Lahore",
    maritalStatus: "single",
    dateOfBirth: "1990-05-15",
    emergencyContact: {
      name: "Ahmed Khan",
      phone: "+92-300-9999999",
      relationship: "father"
    },
    education: "Graduate",
    experience: "5 years",
    agentId: "AGENT-1",
    agentName: "Agent One",
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    timeline: [
      {
        id: "TL-001",
        date: new Date().toISOString(),
        title: "Case Created",
        description: "New case created by Agent One",
        type: "status",
        user: "Agent One"
      }
    ],
    documents: [],
    payments: [],
    medical: null,
    notes: [],
    priority: "high",
    totalFee: 150000,
    paidAmount: 50000,
    pipelineType: "visa",
    pipelineStageKey: "document_collection",
    currentStage: 1,
    stageStartedAt: new Date().toISOString(),
    stageDeadlineAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    isOverdue: false,
    documentChecklist: {},
    documentChecklistFiles: {},
    status: "document_collection"
  },
  {
    id: "EMR-2025-1002",
    customerId: "cust-002",
    customerName: "Sara Ahmed",
    fatherName: "Mohammed Ahmed",
    phone: "+92-300-7654321",
    email: "sara.ahmed@email.com",
    cnic: "35201-7654321-2",
    passport: "CD789012",
    country: "Canada",
    jobType: "Nurse",
    jobDescription: "Healthcare position",
    address: "Karachi, Pakistan",
    city: "Karachi",
    maritalStatus: "married",
    dateOfBirth: "1988-08-20",
    emergencyContact: {
      name: "Mohammed Ahmed",
      phone: "+92-300-8888888",
      relationship: "father"
    },
    education: "Postgraduate",
    experience: "8 years",
    agentId: "AGENT-1",
    agentName: "Agent One",
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    timeline: [
      {
        id: "TL-002",
        date: new Date().toISOString(),
        title: "Case Created",
        description: "New case created by Agent One",
        type: "status",
        user: "Agent One"
      }
    ],
    documents: [],
    payments: [],
    medical: null,
    notes: [],
    priority: "medium",
    totalFee: 250000,
    paidAmount: 100000,
    pipelineType: "visa",
    pipelineStageKey: "document_collection",
    currentStage: 1,
    stageStartedAt: new Date().toISOString(),
    stageDeadlineAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    isOverdue: false,
    documentChecklist: {},
    documentChecklistFiles: {},
    status: "document_collection"
  },
  {
    id: "EMR-2025-1003",
    customerId: "cust-003",
    customerName: "Muhammad Hassan",
    fatherName: "Ali Hassan",
    phone: "+92-301-2345678",
    email: "hassan@email.com",
    cnic: "35201-2345678-3",
    passport: "EF345678",
    country: "France",
    jobType: "Chef",
    jobDescription: "Restaurant position",
    address: "Islamabad, Pakistan",
    city: "Islamabad",
    maritalStatus: "single",
    dateOfBirth: "1992-03-10",
    emergencyContact: {
      name: "Ali Hassan",
      phone: "+92-301-7777777",
      relationship: "father"
    },
    education: "Intermediate",
    experience: "3 years",
    agentId: "AGENT-1",
    agentName: "Agent One",
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    timeline: [
      {
        id: "TL-003",
        date: new Date().toISOString(),
        title: "Case Created",
        description: "New case created by Agent One",
        type: "status",
        user: "Agent One"
      }
    ],
    documents: [],
    payments: [],
    medical: null,
    notes: [],
    priority: "medium",
    totalFee: 75000,
    paidAmount: 25000,
    pipelineType: "visa",
    pipelineStageKey: "document_collection",
    currentStage: 1,
    stageStartedAt: new Date().toISOString(),
    stageDeadlineAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    isOverdue: false,
    documentChecklist: {},
    documentChecklistFiles: {},
    status: "document_collection"
  },
  {
    id: "EMR-2025-1004",
    customerId: "cust-004",
    customerName: "Fatima Zahra",
    fatherName: "Hussain Zahra",
    phone: "+92-302-3456789",
    email: "fatima@email.com",
    cnic: "35201-3456789-4",
    passport: "GH901234",
    country: "Saudi Arabia",
    jobType: "Teacher",
    jobDescription: "School position",
    address: "Lahore, Pakistan",
    city: "Lahore",
    maritalStatus: "married",
    dateOfBirth: "1985-12-05",
    emergencyContact: {
      name: "Hussain Zahra",
      phone: "+92-302-6666666",
      relationship: "father"
    },
    education: "Graduate",
    experience: "10 years",
    agentId: "AGENT-1",
    agentName: "Agent One",
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    timeline: [
      {
        id: "TL-004",
        date: new Date().toISOString(),
        title: "Case Created",
        description: "New case created by Agent One",
        type: "status",
        user: "Agent One"
      }
    ],
    documents: [],
    payments: [],
    medical: null,
    notes: [],
    priority: "high",
    totalFee: 180000,
    paidAmount: 180000,
    pipelineType: "visa",
    pipelineStageKey: "document_collection",
    currentStage: 1,
    stageStartedAt: new Date().toISOString(),
    stageDeadlineAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    isOverdue: false,
    documentChecklist: {},
    documentChecklistFiles: {},
    status: "document_collection"
  },
  {
    id: "EMR-2025-1005",
    customerId: "cust-005",
    customerName: "Usman Ali",
    fatherName: "Khalid Ali",
    phone: "+92-303-4567890",
    email: "usman@email.com",
    cnic: "35201-4567890-5",
    passport: "IJ567890",
    country: "Dubai",
    jobType: "Driver",
    jobDescription: "Transport company",
    address: "Rawalpindi, Pakistan",
    city: "Rawalpindi",
    maritalStatus: "single",
    dateOfBirth: "1995-07-25",
    emergencyContact: {
      name: "Khalid Ali",
      phone: "+92-303-5555555",
      relationship: "father"
    },
    education: "High School",
    experience: "2 years",
    agentId: "AGENT-1",
    agentName: "Agent One",
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    timeline: [
      {
        id: "TL-005",
        date: new Date().toISOString(),
        title: "Case Created",
        description: "New case created by Agent One",
        type: "status",
        user: "Agent One"
      }
    ],
    documents: [],
    payments: [],
    medical: null,
    notes: [],
    priority: "low",
    totalFee: 120000,
    paidAmount: 40000,
    pipelineType: "visa",
    pipelineStageKey: "document_collection",
    currentStage: 1,
    stageStartedAt: new Date().toISOString(),
    stageDeadlineAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    isOverdue: false,
    documentChecklist: {},
    documentChecklistFiles: {},
    status: "document_collection"
  }
];

async function seedData() {
  try {
    console.log("🌱 Starting data seeding with tenant structure...");
    console.log(`📁 Tenant ID: ${TENANT_ID}`);

    // Seed customers to tenant collection
    console.log("📝 Seeding customers...");
    for (const customer of customers) {
      await setDoc(doc(db, "tenants", TENANT_ID, "customers", customer.id), customer);
      console.log(`  ✓ Customer: ${customer.name}`);
    }

    // Seed deals to tenant collection
    console.log("💼 Seeding deals...");
    for (const deal of deals) {
      await setDoc(doc(db, "tenants", TENANT_ID, "deals", deal.id), deal);
      console.log(`  ✓ Deal: ${deal.title}`);
    }

    // Seed cases to tenant collection
    console.log("📂 Seeding cases...");
    for (const c of cases) {
      await setDoc(doc(db, "tenants", TENANT_ID, "cases", c.id), c);
      console.log(`  ✓ Case: ${c.id} - ${c.customerName}`);
    }

    console.log("\n✅ All data seeded successfully!");
    console.log(`\n📊 Summary:`);
    console.log(`  • Customers: ${customers.length}`);
    console.log(`  • Deals: ${deals.length}`);
    console.log(`  • Cases: ${cases.length}`);
    console.log(`\n🔗 Firestore path: tenants/${TENANT_ID}/`);
    console.log(`\n💡 IMPORTANT: The app will automatically detect this data after page refresh.`);
    console.log(`   Make sure 'crm_tenant_id' is set to 'default' in localStorage.`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

seedData();
