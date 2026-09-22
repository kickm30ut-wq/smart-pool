import {
  UserModel,
  LocationModel,
  TripModel,
  PoolModel,
  NotificationModel,
  getDb,
  saveDb,
} from '../src/lib/db.ts';
import { getEstimatedFare } from '../src/lib/fare.ts';

export function getDemoFriday(): string {
  // 2026-09-22 is Tuesday, so upcoming Friday is 2026-09-25
  return '2026-09-25';
}

export function seedDatabase(force: boolean = false): void {
  const db = getDb();

  // If already seeded and not forced, return
  if (!force && db.users.length > 5 && db.locations.length > 4 && db.trips.length > 10) {
    console.log('Database already contains seed data. Skipping seed.');
    return;
  }

  console.log('🌱 Seeding Smart Pooling Database...');

  // Reset collections
  db.users = [];
  db.locations = [];
  db.trips = [];
  db.pools = [];
  db.notifications = [];

  // 1. Seed Locations (6+ locations)
  const locUST = LocationModel.create({
    name: 'UST Global Campus',
    shortName: 'UST Campus',
    type: 'CAMPUS',
    description: 'Main Software Development Center and Global Delivery Center',
    landmark: 'Main Gate Security Gate 1, Technopark Phase II',
    active: true,
  });

  const locTVC = LocationModel.create({
    name: 'Trivandrum Central Railway Station',
    shortName: 'Trivandrum Central',
    type: 'RAILWAY_STATION',
    description: 'Major railway transit terminus in Thampanoor, Kerala',
    landmark: 'Platform 1 Main Entrance / Prepaid Auto Stand',
    active: true,
  });

  const locThampanoor = LocationModel.create({
    name: 'Thampanoor Central Bus Stand',
    shortName: 'Thampanoor Bus Stand',
    type: 'BUS_STAND',
    description: 'KSRTC Central Bus Station & Inter-state travel hub',
    landmark: 'Bus Terminal Concourse Waiting Area',
    active: true,
  });

  const locAirport = LocationModel.create({
    name: 'Trivandrum International Airport (TRV)',
    shortName: 'Trivandrum Airport',
    type: 'AIRPORT',
    description: 'Domestic and International departure terminal',
    landmark: 'Terminal 2 Departures Drop-off zone',
    active: true,
  });

  const locKazhakkoottam = LocationModel.create({
    name: 'Kazhakkoottam Junction',
    shortName: 'Kazhakkoottam',
    type: 'OTHER',
    description: 'NH 66 transit junction and residential hub',
    landmark: 'Near Kazhakkoottam Police Station / Flyover',
    active: true,
  });

  const locTechnoparkPhase1 = LocationModel.create({
    name: 'Technopark Phase I Campus',
    shortName: 'Technopark Phase 1',
    type: 'TECH_PARK',
    description: 'Bhavani & Thejaswini Buildings entrance hub',
    landmark: 'Main Security Checkpoint & Bus Bay',
    active: true,
  });

  const locLulu = LocationModel.create({
    name: 'LuLu Mall Thiruvananthapuram',
    shortName: 'LuLu Mall',
    type: 'OTHER',
    description: 'Shopping, dining, and transit hub along NH 66',
    landmark: 'East Entrance Pick-up Area',
    active: true,
  });

  // 2. Seed Employees & 1 Admin (10-15 employees)
  const userSteven = UserModel.create({
    employeeId: 'UST1042',
    name: 'Steven Paul',
    email: 'steven.paul@ust.com',
    initials: 'SP',
    department: 'Cloud Solutions Engineering',
    role: 'EMPLOYEE',
    active: true,
    phone: '+91 98471 23450',
  });

  const userArun = UserModel.create({
    employeeId: 'UST1089',
    name: 'Arun Kumar',
    email: 'arun.kumar@ust.com',
    initials: 'AK',
    department: 'Data Platform & Analytics',
    role: 'EMPLOYEE',
    active: true,
    phone: '+91 98471 88921',
  });

  const userNeha = UserModel.create({
    employeeId: 'UST1154',
    name: 'Neha S',
    email: 'neha.s@ust.com',
    initials: 'NS',
    department: 'Digital Experience / UI Engineering',
    role: 'EMPLOYEE',
    active: true,
    phone: '+91 97455 11029',
  });

  const userRahul = UserModel.create({
    employeeId: 'UST1201',
    name: 'Rahul R',
    email: 'rahul.r@ust.com',
    initials: 'RR',
    department: 'Cybersecurity Operations',
    role: 'EMPLOYEE',
    active: true,
    phone: '+91 94470 54321',
  });

  const userPriya = UserModel.create({
    employeeId: 'UST1245',
    name: 'Priya N',
    email: 'priya.n@ust.com',
    initials: 'PN',
    department: 'AI & Generative Solutions',
    role: 'EMPLOYEE',
    active: true,
    phone: '+91 98950 33412',
  });

  const userAkash = UserModel.create({
    employeeId: 'UST1312',
    name: 'Akash M',
    email: 'akash.m@ust.com',
    initials: 'AM',
    department: 'DevOps & SRE',
    role: 'EMPLOYEE',
    active: true,
    phone: '+91 94001 99283',
  });

  const userAnjali = UserModel.create({
    employeeId: 'UST1380',
    name: 'Anjali S',
    email: 'anjali.s@ust.com',
    initials: 'AS',
    department: 'Quality Engineering & Testing',
    role: 'EMPLOYEE',
    active: true,
    phone: '+91 98460 77123',
  });

  const userVishnu = UserModel.create({
    employeeId: 'UST1420',
    name: 'Vishnu K',
    email: 'vishnu.k@ust.com',
    initials: 'VK',
    department: 'Fullstack Platform Services',
    role: 'EMPLOYEE',
    active: true,
    phone: '+91 94461 44021',
  });

  const userMeera = UserModel.create({
    employeeId: 'UST1499',
    name: 'Meera R',
    email: 'meera.r@ust.com',
    initials: 'MR',
    department: 'Product Strategy & Management',
    role: 'EMPLOYEE',
    active: true,
    phone: '+91 97472 66319',
  });

  const userNikhil = UserModel.create({
    employeeId: 'UST1532',
    name: 'Nikhil P',
    email: 'nikhil.p@ust.com',
    initials: 'NP',
    department: 'Enterprise Architecture',
    role: 'EMPLOYEE',
    active: true,
    phone: '+91 98477 55190',
  });

  const userAdmin = UserModel.create({
    employeeId: 'UST0010',
    name: 'Admin User (Transport Operations)',
    email: 'transport.admin@ust.com',
    initials: 'AD',
    department: 'Corporate Facilities & Transport',
    role: 'ADMIN',
    active: true,
    phone: '+91 98470 00001',
  });

  const friday = getDemoFriday();
  const today = '2026-09-22';

  // 3. Guaranteed Hackathon Demo Scenario
  // Steven: UST → Trivandrum Central, Friday 6:00 PM (or Searching)
  // Arun: UST → Trivandrum Central, Friday 5:50 PM
  // Neha: UST → Trivandrum Central, Friday 6:10 PM
  // Rahul: UST → Airport, Friday 6:00 PM

  // Arun's Friday trip
  const tripArun = TripModel.create({
    userId: userArun._id,
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: friday,
    departureTime: '17:50', // 5:50 PM
    flexibleMinutes: 15,
    status: 'SEARCHING',
  });

  // Neha's Friday trip
  const tripNeha = TripModel.create({
    userId: userNeha._id,
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: friday,
    departureTime: '18:10', // 6:10 PM
    flexibleMinutes: 15,
    status: 'SEARCHING',
  });

  // Rahul's Friday trip to Airport (incompatible route with Trivandrum Central)
  TripModel.create({
    userId: userRahul._id,
    fromLocationId: locUST._id,
    toLocationId: locAirport._id,
    travelDate: friday,
    departureTime: '18:00',
    flexibleMinutes: 15,
    status: 'SEARCHING',
  });

  // Priya's Friday trip to Thampanoor at 6:05 PM
  TripModel.create({
    userId: userPriya._id,
    fromLocationId: locUST._id,
    toLocationId: locThampanoor._id,
    travelDate: friday,
    departureTime: '18:05',
    flexibleMinutes: 15,
    status: 'SEARCHING',
  });

  // Vishnu's Friday trip to Kazhakkoottam at 5:45 PM
  TripModel.create({
    userId: userVishnu._id,
    fromLocationId: locUST._id,
    toLocationId: locKazhakkoottam._id,
    travelDate: friday,
    departureTime: '17:45',
    flexibleMinutes: 15,
    status: 'SEARCHING',
  });

  // 4. Seed an Active Upcoming Pool for Steven (for demonstration on dashboard)
  // E.g., Today's ride from UST Campus to LuLu Mall or Kazhakkoottam
  const tripStevenActive = TripModel.create({
    userId: userSteven._id,
    fromLocationId: locUST._id,
    toLocationId: locKazhakkoottam._id,
    travelDate: today,
    departureTime: '18:15',
    flexibleMinutes: 15,
    status: 'POOLED',
  });

  const tripAkashActive = TripModel.create({
    userId: userAkash._id,
    fromLocationId: locUST._id,
    toLocationId: locKazhakkoottam._id,
    travelDate: today,
    departureTime: '18:15',
    flexibleMinutes: 15,
    status: 'POOLED',
  });

  const tripAnjaliActive = TripModel.create({
    userId: userAnjali._id,
    fromLocationId: locUST._id,
    toLocationId: locKazhakkoottam._id,
    travelDate: today,
    departureTime: '18:20',
    flexibleMinutes: 15,
    status: 'POOLED',
  });

  const activePool = PoolModel.create({
    fromLocationId: locUST._id,
    toLocationId: locKazhakkoottam._id,
    travelDate: today,
    suggestedDepartureTime: '18:15',
    pickupPoint: 'Main Gate, UST Campus',
    memberIds: [userSteven._id, userAkash._id, userAnjali._id],
    tripIds: [tripStevenActive._id, tripAkashActive._id, tripAnjaliActive._id],
    maxPassengers: 4,
    estimatedFare: 150,
    status: 'OPEN',
    createdBy: userSteven._id,
  });

  TripModel.updateById(tripStevenActive._id, { poolId: activePool._id });
  TripModel.updateById(tripAkashActive._id, { poolId: activePool._id });
  TripModel.updateById(tripAnjaliActive._id, { poolId: activePool._id });

  // 5. Seed Historical Completed Pools & Trips (30+ trips)
  const historicalDates = [
    '2026-09-18', // Last Friday
    '2026-09-17',
    '2026-09-16',
    '2026-09-15',
    '2026-09-14',
    '2026-09-11', // Prior Friday
  ];

  // Completed Pool 1 (Last Friday: UST -> TVC Railway Station)
  const hTrip1 = TripModel.create({
    userId: userSteven._id,
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: historicalDates[0],
    departureTime: '18:00',
    flexibleMinutes: 15,
    status: 'COMPLETED',
  });
  const hTrip2 = TripModel.create({
    userId: userArun._id,
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: historicalDates[0],
    departureTime: '17:55',
    flexibleMinutes: 15,
    status: 'COMPLETED',
  });
  const hTrip3 = TripModel.create({
    userId: userNeha._id,
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: historicalDates[0],
    departureTime: '18:05',
    flexibleMinutes: 15,
    status: 'COMPLETED',
  });

  const compPool1 = PoolModel.create({
    fromLocationId: locUST._id,
    toLocationId: locTVC._id,
    travelDate: historicalDates[0],
    suggestedDepartureTime: '18:00',
    pickupPoint: 'UST Main Gate Security',
    memberIds: [userSteven._id, userArun._id, userNeha._id],
    tripIds: [hTrip1._id, hTrip2._id, hTrip3._id],
    maxPassengers: 4,
    estimatedFare: 180,
    status: 'COMPLETED',
    createdBy: userSteven._id,
  });
  TripModel.updateById(hTrip1._id, { poolId: compPool1._id });
  TripModel.updateById(hTrip2._id, { poolId: compPool1._id });
  TripModel.updateById(hTrip3._id, { poolId: compPool1._id });

  // Completed Pool 2 (UST -> Airport)
  const hTrip4 = TripModel.create({
    userId: userRahul._id,
    fromLocationId: locUST._id,
    toLocationId: locAirport._id,
    travelDate: historicalDates[1],
    departureTime: '16:30',
    flexibleMinutes: 15,
    status: 'COMPLETED',
  });
  const hTrip5 = TripModel.create({
    userId: userPriya._id,
    fromLocationId: locUST._id,
    toLocationId: locAirport._id,
    travelDate: historicalDates[1],
    departureTime: '16:35',
    flexibleMinutes: 15,
    status: 'COMPLETED',
  });
  const hTrip6 = TripModel.create({
    userId: userMeera._id,
    fromLocationId: locUST._id,
    toLocationId: locAirport._id,
    travelDate: historicalDates[1],
    departureTime: '16:40',
    flexibleMinutes: 15,
    status: 'COMPLETED',
  });

  const compPool2 = PoolModel.create({
    fromLocationId: locUST._id,
    toLocationId: locAirport._id,
    travelDate: historicalDates[1],
    suggestedDepartureTime: '16:35',
    pickupPoint: 'Phase II Food Court Entrance',
    memberIds: [userRahul._id, userPriya._id, userMeera._id],
    tripIds: [hTrip4._id, hTrip5._id, hTrip6._id],
    maxPassengers: 4,
    estimatedFare: 250,
    status: 'COMPLETED',
    createdBy: userRahul._id,
  });
  TripModel.updateById(hTrip4._id, { poolId: compPool2._id });
  TripModel.updateById(hTrip5._id, { poolId: compPool2._id });
  TripModel.updateById(hTrip6._id, { poolId: compPool2._id });

  // Completed Pool 3 (UST -> Thampanoor Bus Stand)
  const hTrip7 = TripModel.create({
    userId: userAkash._id,
    fromLocationId: locUST._id,
    toLocationId: locThampanoor._id,
    travelDate: historicalDates[2],
    departureTime: '18:45',
    flexibleMinutes: 15,
    status: 'COMPLETED',
  });
  const hTrip8 = TripModel.create({
    userId: userNikhil._id,
    fromLocationId: locUST._id,
    toLocationId: locThampanoor._id,
    travelDate: historicalDates[2],
    departureTime: '18:50',
    flexibleMinutes: 15,
    status: 'COMPLETED',
  });

  const compPool3 = PoolModel.create({
    fromLocationId: locUST._id,
    toLocationId: locThampanoor._id,
    travelDate: historicalDates[2],
    suggestedDepartureTime: '18:45',
    pickupPoint: 'UST Main Gate',
    memberIds: [userAkash._id, userNikhil._id],
    tripIds: [hTrip7._id, hTrip8._id],
    maxPassengers: 4,
    estimatedFare: 180,
    status: 'COMPLETED',
    createdBy: userAkash._id,
  });
  TripModel.updateById(hTrip7._id, { poolId: compPool3._id });
  TripModel.updateById(hTrip8._id, { poolId: compPool3._id });

  // Additional 20 historical trips for rich analytics
  const allUsers = [userSteven, userArun, userNeha, userRahul, userPriya, userAkash, userAnjali, userVishnu, userMeera, userNikhil];
  const allLocs = [locTVC, locThampanoor, locAirport, locKazhakkoottam, locTechnoparkPhase1, locLulu];

  for (let i = 0; i < 24; i++) {
    const usr = allUsers[i % allUsers.length];
    const dest = allLocs[i % allLocs.length];
    const date = historicalDates[i % historicalDates.length];
    const hour = 17 + (i % 3);
    const min = (i * 10) % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const status = i % 5 === 0 ? 'CANCELLED' : 'COMPLETED';

    TripModel.create({
      userId: usr._id,
      fromLocationId: locUST._id,
      toLocationId: dest._id,
      travelDate: date,
      departureTime: timeStr,
      flexibleMinutes: 15,
      status: status,
    });
  }

  // 6. Seed In-App Notifications for Steven
  NotificationModel.create({
    userId: userSteven._id,
    title: 'Welcome to Smart Pooling',
    message: 'Find colleagues heading your way, share the ride, and split the fare seamlessly.',
    type: 'SYSTEM',
    read: true,
  });

  NotificationModel.create({
    userId: userSteven._id,
    title: 'Pool Confirmed',
    message: 'Akash and Anjali joined your pool to Kazhakkoottam today at 6:15 PM.',
    type: 'POOL_JOIN',
    poolId: activePool._id,
    read: false,
  });

  NotificationModel.create({
    userId: userSteven._id,
    title: 'Smart Commute Match',
    message: 'Arun and Neha are travelling to Trivandrum Central this Friday around 6:00 PM!',
    type: 'TRIP_MATCH',
    read: false,
  });

  saveDb();
  console.log(`✅ Seeding complete: ${db.users.length} users, ${db.locations.length} locations, ${db.trips.length} trips, ${db.pools.length} pools.`);
}

// If executed directly via `tsx scripts/seed.ts`
if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase(true);
}
