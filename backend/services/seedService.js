const { db } = require('./firebaseAdmin')

const SEED_RULES = [
  {
    ruleId: 'rule_helmet',
    category: 'Safety',
    title: 'Two-Wheeler Helmet Mandate',
    description: 'Every person riding or driving a two-wheeled motorcycle of any class in a public place must wear protective headgear (helmet) conforming to Indian Standard (IS) specifications securely fastened. Violations lead to immediate fines and potential license suspensions.',
    vehicleType: 'bike',
    fineAmount: 1000,
    sectionReference: 'Section 129 / 194D MV Act',
    keywords: ['helmet', 'protective headgear', 'two wheeler', 'motorcycle', 'riding'],
    state: 'National'
  },
  {
    ruleId: 'rule_seatbelt',
    category: 'Safety',
    title: 'Seat Belt Compliance',
    description: 'Any person driving a motor vehicle, or riding in a motor vehicle equipped with seat belts in the front seat or front-facing passenger seats, must wear the seat belt securely. Failure to comply is a punishable offence.',
    vehicleType: 'car',
    fineAmount: 1000,
    sectionReference: 'Section 194B MV Act',
    keywords: ['seat belt', 'seatbelt', 'safety belt', 'front seat', 'passenger seat'],
    state: 'National'
  },
  {
    ruleId: 'rule_license',
    category: 'Documentation',
    title: 'Driving License Requirement',
    description: 'No person shall drive a motor vehicle in any public place unless he holds an effective driving license issued to him authorising him to drive the vehicle class. Driving without a license or with an expired license is strictly prohibited and subject to severe penalties.',
    vehicleType: 'all',
    fineAmount: 5000,
    sectionReference: 'Section 3 / 181 MV Act',
    keywords: ['license', 'licence', 'driving license', 'driving licence', 'dl'],
    state: 'National'
  },
  {
    ruleId: 'rule_insurance',
    category: 'Documentation',
    title: 'Third Party Vehicle Insurance',
    description: 'No person shall use, except as a passenger, or cause or allow any other person to use, a motor vehicle in a public place, unless there is in force in relation to the use of the vehicle by that person or that other person, a policy of insurance complying with statutory third-party requirements.',
    vehicleType: 'all',
    fineAmount: 2000,
    sectionReference: 'Section 146 / 196 MV Act',
    keywords: ['insurance', 'third party', 'policy', 'third-party insurance'],
    state: 'National'
  },
  {
    ruleId: 'rule_puc',
    category: 'Documentation',
    title: 'Pollution Under Control (PUC) Certificate',
    description: 'Every motor vehicle operating in a public place must carry a valid Pollution Under Control (PUC) certificate issued by an authorised checking centre. Operating a vehicle without a valid PUC is a severe environmental violation.',
    vehicleType: 'all',
    fineAmount: 10000,
    sectionReference: 'Section 190(2) MV Act',
    keywords: ['puc', 'pollution', 'emission', 'smoke certificate', 'pollution under control'],
    state: 'National'
  },
  {
    ruleId: 'rule_rc',
    category: 'Documentation',
    title: 'Registration Certificate (RC)',
    description: 'No person shall drive any motor vehicle in any public place unless the vehicle is registered in accordance with Motor Vehicle Act provisions, and the certificate of registration (RC) has not been suspended or cancelled.',
    vehicleType: 'car',
    fineAmount: 5000,
    sectionReference: 'Section 39 / 192 MV Act',
    keywords: ['rc', 'registration', 'registration certificate', 'rc book'],
    state: 'National'
  },
  {
    ruleId: 'rule_speeding',
    category: 'Speed',
    title: 'Permissible Speed Limits',
    description: 'No person shall drive a motor vehicle or cause or allow a motor vehicle to be driven in any public place at a speed exceeding the maximum speed or below the minimum speed fixed for the vehicle or road category.',
    vehicleType: 'all',
    fineAmount: 2000,
    sectionReference: 'Section 112 / 183 MV Act',
    keywords: ['speeding', 'overspeeding', 'speed limit', 'exceeding speed'],
    state: 'National'
  },
  {
    ruleId: 'rule_mobile',
    category: 'Driving',
    title: 'Mobile Phone Usage While Driving',
    description: 'Using a handheld mobile phone or communication device while driving a motor vehicle is strictly prohibited as it causes high driver distraction and safety hazards. Violators face immediate heavy fines and seizure of credentials.',
    vehicleType: 'all',
    fineAmount: 5000,
    sectionReference: 'Section 184(c) MV Act',
    keywords: ['mobile', 'phone', 'cellphone', 'calling', 'texting', 'distraction'],
    state: 'National'
  },
  {
    ruleId: 'rule_signal',
    category: 'Driving',
    title: 'Disobeying Traffic Signals',
    description: 'Every driver of a motor vehicle shall drive the vehicle in conformity with any indication given by mandatory traffic signs, signals, or markings. Red light jumping and signal evasion are major triggers for crashes and carry heavy penalties.',
    vehicleType: 'all',
    fineAmount: 1000,
    sectionReference: 'Section 119 / 177 MV Act',
    keywords: ['signal', 'red light', 'traffic light', 'junction', 'jumping signal'],
    state: 'National'
  },
  {
    ruleId: 'rule_parking',
    category: 'Driving',
    title: 'Obstruction and No Parking Zones',
    description: 'No person in charge of a motor vehicle shall cause or allow the vehicle to remain at rest in any public place in such a manner or in such a position as to cause, or hold likely to cause, danger, obstruction, or undue inconvenience to other users of the road.',
    vehicleType: 'all',
    fineAmount: 500,
    sectionReference: 'Section 122 / 177 MV Act',
    keywords: ['parking', 'no parking', 'obstruction', 'tow zone'],
    state: 'National'
  },
  {
    ruleId: 'rule_commercial_fc',
    category: 'Commercial',
    title: 'Fitness Certificate (FC) Requirement',
    description: 'A transport vehicle or commercial carriage shall not be deemed to be validly registered unless it carries a valid Certificate of Fitness issued by RTO authorities. Operating an unfit heavy vehicle carries heavy penalties and safety bans.',
    vehicleType: 'commercial',
    fineAmount: 5000,
    sectionReference: 'Section 56 / 192 MV Act',
    keywords: ['fc', 'fitness', 'fitness certificate', 'commercial', 'heavy vehicle'],
    state: 'National'
  }
]

const SEED_SCHOOL_ZONES = [
  { name: 'Coimbatore International School Zone', coordinates: [77.0601, 11.0284], speedLimitKmh: 30 },
  { name: 'Tiruppur Public School Crossing', coordinates: [77.3450, 11.1150], speedLimitKmh: 25 },
  { name: 'Madurai Central Academy Zone', coordinates: [78.1220, 9.9300], speedLimitKmh: 30 }
]

const SEED_HOSPITAL_ZONES = [
  { name: 'KG General Hospital Silent Area', coordinates: [76.9680, 10.9980], speedLimitKmh: 30 },
  { name: 'Tiruppur Government Medical Hospital', coordinates: [77.3390, 11.1050], speedLimitKmh: 30 },
  { name: 'Madurai Apollo Super-specialty Hospital', coordinates: [78.1450, 9.9280], speedLimitKmh: 35 }
]

const SEED_ACCIDENT_ZONES = [
  { name: 'Avinashi Road Blindspot Junction', coordinates: [77.0200, 11.0150], riskLevel: 'High', description: 'Frequent lane-merging collisions reported due to fast flyover descent.' },
  { name: 'Tiruppur Junction Narrow Intersection', coordinates: [77.3411, 11.1085], riskLevel: 'Medium', description: 'Pedestrian heavy congestion causing frequent blindspot knocks.' },
  { name: 'Madurai Highway Bypass Interchange', coordinates: [78.1198, 9.9252], riskLevel: 'High', description: 'Sharp high-speed curve with poor nighttime illumination.' }
]

const SEED_SPEED_ZONES = [
  { name: 'NH-47 Speed Restricted Corridor', coordinates: [77.1200, 11.0300], speedLimitKmh: 50, vehicleType: 'all' },
  { name: 'Tiruppur Municipal Slow Sector', coordinates: [77.3500, 11.1200], speedLimitKmh: 30, vehicleType: 'all' },
  { name: 'Madurai Bypass High-Speed Control Trap', coordinates: [78.0900, 9.9400], speedLimitKmh: 60, vehicleType: 'commercial' }
]

async function seedCollectionIfEmpty(collectionName, data) {
  try {
    const snapshot = await db.collection(collectionName).limit(1).get()
    if (!snapshot.empty) {
      console.log(`[SeedService] Collection "${collectionName}" already contains data. Skipping seed.`)
      return
    }

    console.log(`[SeedService] Seeding collection "${collectionName}" with ${data.length} records...`)
    
    // Write records
    for (const item of data) {
      const payload = {
        ...item,
        createdAt: new Date().toISOString()
      }
      // If ruleId exists, we can use it as document ID for stable retrieval
      if (item.ruleId) {
        await db.collection(collectionName).doc(item.ruleId).set(payload)
      } else {
        await db.collection(collectionName).add(payload)
      }
    }
    console.log(`[SeedService] Successfully seeded "${collectionName}".`)
  } catch (err) {
    console.error(`[SeedService] Error seeding "${collectionName}":`, err.message)
  }
}

async function seedTrafficRules() {
  console.log('[SeedService] Starting database seed processes...')
  await seedCollectionIfEmpty('trafficRules', SEED_RULES)
  await seedCollectionIfEmpty('schoolZones', SEED_SCHOOL_ZONES)
  await seedCollectionIfEmpty('hospitalZones', SEED_HOSPITAL_ZONES)
  await seedCollectionIfEmpty('accidentZones', SEED_ACCIDENT_ZONES)
  await seedCollectionIfEmpty('speedZones', SEED_SPEED_ZONES)
  console.log('[SeedService] Seeding processes completed successfully.')
}

module.exports = {
  seedTrafficRules
}
