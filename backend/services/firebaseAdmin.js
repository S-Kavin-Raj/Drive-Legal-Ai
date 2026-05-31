const fs = require('fs')
const path = require('path')
const admin = require('firebase-admin')

// Check if credentials are present in the environment or default paths
function hasCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return true
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) return true
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true

  // Check default gcloud configuration directory
  const home = process.env.USERPROFILE || process.env.HOME
  if (home) {
    const defaultPath = path.join(home, '.config', 'gcloud', 'application_default_credentials.json')
    if (fs.existsSync(defaultPath)) return true
  }

  return false
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const resolved = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    return JSON.parse(fs.readFileSync(resolved, 'utf8'))
  }

  return null
}

// --- MOCK FIRESTORE IMPLEMENTATION ---
class MockDocumentSnapshot {
  constructor(id, data) {
    this.id = id
    this._data = data
  }
  data() {
    return this._data
  }
  exists() {
    return !!this._data
  }
}

class MockQuerySnapshot {
  constructor(docs) {
    this.docs = docs
    this.empty = docs.length === 0
  }
}

class MockDocumentReference {
  constructor(id, collectionRef) {
    this.id = id
    this._collectionRef = collectionRef
  }
  async get() {
    const data = this._collectionRef._db.readDoc(this._collectionRef._name, this.id)
    return new MockDocumentSnapshot(this.id, data)
  }
  async set(data, options = {}) {
    this._collectionRef._db.writeDoc(this._collectionRef._name, this.id, data, options.merge)
  }
  async update(data) {
    this._collectionRef._db.updateDoc(this._collectionRef._name, this.id, data)
  }
}

class MockQuery {
  constructor(db, collectionName, docs) {
    this._db = db
    this._collectionName = collectionName
    this._docs = docs
  }

  where(field, op, val) {
    let filtered = this._docs
    if (op === '==') {
      filtered = this._docs.filter(doc => doc[field] === val)
    }
    return new MockQuery(this._db, this._collectionName, filtered)
  }

  orderBy(field, direction = 'asc') {
    const sorted = [...this._docs].sort((a, b) => {
      let valA = a[field]
      let valB = b[field]

      if (valA && typeof valA.toDate === 'function') valA = valA.toDate()
      if (valB && typeof valB.toDate === 'function') valB = valB.toDate()

      if (valA instanceof Date) valA = valA.getTime()
      if (valB instanceof Date) valB = valB.getTime()

      if (valA < valB) return direction === 'asc' ? -1 : 1
      if (valA > valB) return direction === 'asc' ? 1 : -1
      return 0
    })
    return new MockQuery(this._db, this._collectionName, sorted)
  }

  limit(num) {
    return new MockQuery(this._db, this._collectionName, this._docs.slice(0, num))
  }

  async get() {
    const snaps = this._docs.map(doc => {
      const data = { ...doc }
      delete data.id
      return new MockDocumentSnapshot(doc.id, data)
    })
    return new MockQuerySnapshot(snaps)
  }
}

class MockCollectionReference extends MockQuery {
  constructor(db, name) {
    super(db, name, [])
    this._name = name
  }

  get _docs() {
    return this._db.readCollection(this._name)
  }
  set _docs(val) {}

  doc(id) {
    const docId = id || Math.random().toString(36).substring(2, 10)
    return new MockDocumentReference(docId, this)
  }

  async add(data) {
    const id = Math.random().toString(36).substring(2, 10)
    const cleanData = this._db.sanitizeData(data)
    this._db.writeDoc(this._name, id, cleanData)
    return new MockDocumentReference(id, this)
  }
}

class MockFirestore {
  constructor() {
    this.filepath = path.join(__dirname, '..', '.mockdb.json')
    this._initDb()
  }

  _initDb() {
    if (fs.existsSync(this.filepath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.filepath, 'utf8'))
        return
      } catch (e) {
        console.error('Failed to parse mock database, resetting.', e)
      }
    }

    // Default Seed Data
    this.data = {
      trafficRules: {
        rule_helmet: {
          keyword: 'helmet',
          synonyms: ['no helmet', 'without helmet', 'protective headgear'],
          section: '129/194D MV Act',
          violation: 'Driving without protective headgear (No Helmet)',
          fine: 1000,
        },
        rule_speeding: {
          keyword: 'speeding',
          synonyms: ['overspeeding', 'over speeding', 'speed limit exceeded', 'radar speed'],
          section: '183 MV Act',
          violation: 'Exceeding permissible speed limits (Over-speeding)',
          fine: 2000,
        },
        rule_redlight: {
          keyword: 'redlight',
          synonyms: ['red light', 'traffic signal violation', 'jumping signal', 'red signal'],
          section: '119/177 MV Act',
          violation: 'Disobeying traffic control signals (Red Light Violation)',
          fine: 1000,
        },
        rule_triple: {
          keyword: 'triple',
          synonyms: ['triple riding', 'three riders', 'carrying two passengers', 'triples'],
          section: '128/194C MV Act',
          violation: 'Carrying more than one passenger on a two-wheeler (Triple Riding)',
          fine: 1000,
        },
      },
      documents: {},
      complianceHistory: {},
      routeAnalyses: {},
      challanReports: {},
      awarenessScores: {},
    }
    this._save()
  }

  _save() {
    try {
      fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2), 'utf8')
    } catch (e) {
      console.error('Failed to save mock database.', e)
    }
  }

  sanitizeData(data) {
    const clean = { ...data }
    Object.keys(clean).forEach(key => {
      const val = clean[key]
      if (val && val._serverTimestampPlaceholder) {
        clean[key] = new Date().toISOString()
      }
    })
    return clean
  }

  readCollection(name) {
    if (!this.data[name]) this.data[name] = {}
    return Object.entries(this.data[name]).map(([id, docData]) => {
      const copy = { ...docData }
      Object.keys(copy).forEach(k => {
        const val = copy[k]
        if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/)) {
          const date = new Date(val)
          copy[k] = {
            toDate: () => date,
            toDateString: () => date.toDateString(),
            toISOString: () => val,
          }
        }
      })
      return { id, ...copy }
    })
  }

  readDoc(colName, docId) {
    if (!this.data[colName]) this.data[colName] = {}
    return this.data[colName][docId] || null
  }

  writeDoc(colName, docId, docData, merge = false) {
    if (!this.data[colName]) this.data[colName] = {}
    const clean = this.sanitizeData(docData)
    if (merge && this.data[colName][docId]) {
      this.data[colName][docId] = { ...this.data[colName][docId], ...clean }
    } else {
      this.data[colName][docId] = clean
    }
    this._save()
  }

  updateDoc(colName, docId, docData) {
    if (!this.data[colName] || !this.data[colName][docId]) {
      throw new Error(`Document ${colName}/${docId} not found to update.`)
    }
    const clean = this.sanitizeData(docData)
    this.data[colName][docId] = { ...this.data[colName][docId], ...clean }
    this._save()
  }

  collection(name) {
    return new MockCollectionReference(this, name)
  }
}

const mockAdmin = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => ({ _serverTimestampPlaceholder: true }),
    },
  },
}

// Initialize db and admin variables
let db
let adminExport

if (hasCredentials()) {
  try {
    if (admin.apps.length === 0) {
      const serviceAccount = loadServiceAccount()
      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
        })
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID,
        })
      }
    }
    db = admin.firestore()
    adminExport = admin
    console.log('Firebase Admin initialized successfully in production mode.')
  } catch (err) {
    console.warn('Firebase Admin initialization failed. Falling back to local offline MockFirestore.', err.message)
    db = new MockFirestore()
    adminExport = mockAdmin
  }
} else {
  console.log('---------------------------------------------------------')
  console.log('WARNING: Firebase credentials not found.')
  console.log('Running in OFFLINE / MOCK MODE using a local database.')
  console.log(`Data will be saved to: ${path.join(__dirname, '..', '.mockdb.json')}`)
  console.log('---------------------------------------------------------')
  db = new MockFirestore()
  adminExport = mockAdmin
}

module.exports = {
  admin: adminExport,
  db,
}
