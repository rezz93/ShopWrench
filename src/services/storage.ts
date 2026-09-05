import { Job, PartItem, JobStatus, PartStatus, VehicleDetails } from '../types';
import {
  auth,
  db,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
} from './firebase';

const STORAGE_KEY = 'autoshop_jobs_v1';

const INITIAL_JOBS: Job[] = [
  {
    id: 'job-101',
    status: 'Waiting on Parts',
    customer_name: 'Dave Miller',
    vin: '1FTFW1ED4MFA12345',
    vehicle_details: {
      year: '2021',
      make: 'Ford',
      model: 'F-150',
      engine: '3.5L V6 Turbo EcoBoost',
      drivetrain: '4WD / 4x4',
      bodyClass: 'Pickup',
      trim: 'Lariat SuperCrew',
    },
    parts_list: [
      {
        id: 'p-1',
        part_name: 'Front Ceramic Brake Pads',
        status: 'Ordered',
        addedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: 'p-2',
        part_name: 'Vented Front Brake Rotors (Pair)',
        status: 'Needed',
        addedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      },
      {
        id: 'p-3',
        part_name: 'Brake Caliper Pin Boot Kit',
        status: 'Arrived',
        addedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      },
    ],
    service_notes: 'Grinding noise from front axle during heavy braking. Rotors severely scored.',
    created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
  },
  {
    id: 'job-102',
    status: 'In Progress',
    customer_name: 'Sarah Jenkins',
    vin: '4S4BSANC1L3123456',
    vehicle_details: {
      year: '2020',
      make: 'Subaru',
      model: 'Outback',
      engine: '2.5L 4-Cyl Boxer',
      drivetrain: 'AWD (All-Wheel Drive)',
      bodyClass: 'Station Wagon/Sport Utility',
      trim: 'Premium',
    },
    parts_list: [
      {
        id: 'p-4',
        part_name: 'Serpentine Drive Belt',
        status: 'Arrived',
        addedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        id: 'p-5',
        part_name: 'Spark Plug Set (Iridium x4)',
        status: 'Arrived',
        addedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        id: 'p-6',
        part_name: 'Engine Oil Filter (OEM)',
        status: 'Arrived',
        addedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      },
    ],
    service_notes: '60,000-mile comprehensive maintenance tune-up & fluids flush.',
    created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    id: 'job-103',
    status: 'In Progress',
    customer_name: 'Carlos Ruiz',
    vin: '1G1ZE5ST2HF123456',
    vehicle_details: {
      year: '2017',
      make: 'Chevrolet',
      model: 'Malibu',
      engine: '1.5L Turbo 4-Cyl',
      drivetrain: 'FWD (Front-Wheel Drive)',
      bodyClass: 'Sedan',
      trim: 'LT',
    },
    parts_list: [
      {
        id: 'p-7',
        part_name: 'Bank 1 Upstream O2 Sensor',
        status: 'Needed',
        addedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'p-8',
        part_name: 'Mass Air Flow (MAF) Sensor',
        status: 'Ordered',
        addedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
    ],
    service_notes: 'Check Engine Light Code P0171 (System Too Lean Bank 1). Rough idle at stops.',
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

// In-memory cache
let cachedJobs: Job[] | null = null;

export function getStoredJobs(): Job[] {
  if (cachedJobs) return cachedJobs;
  if (typeof window === 'undefined') return INITIAL_JOBS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_JOBS));
      cachedJobs = INITIAL_JOBS;
      return INITIAL_JOBS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedJobs = parsed;
      return parsed;
    }
    cachedJobs = INITIAL_JOBS;
    return INITIAL_JOBS;
  } catch (err) {
    console.error('Failed to read stored jobs:', err);
    return INITIAL_JOBS;
  }
}

export function saveJobs(jobs: Job[], skipCloud = false): void {
  cachedJobs = jobs;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    window.dispatchEvent(new Event('autoshop_jobs_updated'));
  } catch (err) {
    console.error('Failed to save jobs to storage:', err);
  }
}

// Write a single job to Firestore (shared shop ledger for seamless PC & Phone sync)
async function syncJobToFirestore(job: Job): Promise<void> {
  try {
    const jobRef = doc(db, 'shop_jobs', job.id);
    await setDoc(jobRef, {
      ...job,
      syncedAt: new Date().toISOString(),
    }, { merge: true });

    // Also mirror to authenticated user path if user is signed in
    const user = auth.currentUser;
    if (user) {
      const userJobRef = doc(db, 'users', user.uid, 'jobs', job.id);
      await setDoc(userJobRef, {
        ...job,
        userId: user.uid,
        syncedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    console.error('Error syncing job to Firestore shop_jobs:', err);
  }
}

// Delete a single job from Firestore
async function deleteJobFromFirestore(jobId: string): Promise<void> {
  try {
    const jobRef = doc(db, 'shop_jobs', jobId);
    await deleteDoc(jobRef);

    const user = auth.currentUser;
    if (user) {
      const userJobRef = doc(db, 'users', user.uid, 'jobs', jobId);
      await deleteDoc(userJobRef);
    }
  } catch (err) {
    console.error('Error deleting job from Firestore shop_jobs:', err);
  }
}

export function createNewJob(params: {
  customer_name: string;
  vin: string;
  vehicle_details: VehicleDetails;
  service_notes?: string;
  initial_parts?: string[];
}): Job {
  const newJob: Job = {
    id: `job-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    status: 'In Progress',
    customer_name: params.customer_name.trim() || 'Walk-In Customer',
    vin: params.vin.trim().toUpperCase(),
    vehicle_details: params.vehicle_details,
    parts_list: (params.initial_parts || []).map((name, idx) => ({
      id: `p-${Date.now()}-${idx}`,
      part_name: name.trim(),
      status: 'Needed',
      addedAt: new Date().toISOString(),
    })),
    service_notes: params.service_notes || '',
    created_at: new Date().toISOString(),
  };

  const current = getStoredJobs();
  const updated = [newJob, ...current];
  saveJobs(updated);

  // Sync to Cloud in background
  syncJobToFirestore(newJob);

  return newJob;
}

export function updateJob(id: string, updates: Partial<Job>): Job | null {
  const current = getStoredJobs();
  const index = current.findIndex((j) => j.id === id);
  if (index === -1) return null;

  const updatedJob: Job = {
    ...current[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  current[index] = updatedJob;
  saveJobs(current);

  // Sync to Cloud in background
  syncJobToFirestore(updatedJob);

  return updatedJob;
}

export function deleteJob(id: string): void {
  const current = getStoredJobs();
  const filtered = current.filter((j) => j.id !== id);
  saveJobs(filtered);

  // Delete from Cloud in background
  deleteJobFromFirestore(id);
}

export function deleteMultipleJobs(ids: string[]): void {
  const current = getStoredJobs();
  const idSet = new Set(ids);
  const filtered = current.filter((j) => !idSet.has(j.id));
  saveJobs(filtered);

  ids.forEach((id) => deleteJobFromFirestore(id));
}

export function deleteCompletedJobs(): number {
  const current = getStoredJobs();
  const completedJobs = current.filter((j) => j.status === 'Completed');
  const filtered = current.filter((j) => j.status !== 'Completed');
  saveJobs(filtered);

  completedJobs.forEach((j) => deleteJobFromFirestore(j.id));
  return completedJobs.length;
}

export function addPartToJob(jobId: string, partName: string): PartItem | null {
  const cleanName = partName.trim();
  if (!cleanName) return null;

  const current = getStoredJobs();
  const index = current.findIndex((j) => j.id === jobId);
  if (index === -1) return null;

  const newPart: PartItem = {
    id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    part_name: cleanName,
    status: 'Needed',
    addedAt: new Date().toISOString(),
  };

  current[index].parts_list = [...current[index].parts_list, newPart];
  current[index].updated_at = new Date().toISOString();
  saveJobs(current);

  syncJobToFirestore(current[index]);
  return newPart;
}

export function updatePartStatus(jobId: string, partId: string, nextStatus: PartStatus): boolean {
  const current = getStoredJobs();
  const jobIdx = current.findIndex((j) => j.id === jobId);
  if (jobIdx === -1) return false;

  const partIdx = current[jobIdx].parts_list.findIndex((p) => p.id === partId);
  if (partIdx === -1) return false;

  current[jobIdx].parts_list[partIdx].status = nextStatus;
  current[jobIdx].updated_at = new Date().toISOString();
  saveJobs(current);

  syncJobToFirestore(current[jobIdx]);
  return true;
}

export function deletePartFromJob(jobId: string, partId: string): boolean {
  const current = getStoredJobs();
  const jobIdx = current.findIndex((j) => j.id === jobId);
  if (jobIdx === -1) return false;

  current[jobIdx].parts_list = current[jobIdx].parts_list.filter((p) => p.id !== partId);
  current[jobIdx].updated_at = new Date().toISOString();
  saveJobs(current);

  syncJobToFirestore(current[jobIdx]);
  return true;
}

export function cyclePartStatus(currentStatus: PartStatus): PartStatus {
  if (currentStatus === 'Needed') return 'Ordered';
  if (currentStatus === 'Ordered') return 'Arrived';
  return 'Needed';
}

// Upload all local jobs to Firestore (shop_jobs collection)
export async function uploadLocalJobsToCloud(userId?: string): Promise<number> {
  const localJobs = getStoredJobs();
  if (localJobs.length === 0) return 0;

  let count = 0;
  for (const job of localJobs) {
    try {
      const jobRef = doc(db, 'shop_jobs', job.id);
      await setDoc(jobRef, {
        ...job,
        syncedAt: new Date().toISOString(),
      }, { merge: true });

      if (userId) {
        const userJobRef = doc(db, 'users', userId, 'jobs', job.id);
        await setDoc(userJobRef, {
          ...job,
          userId,
          syncedAt: new Date().toISOString(),
        }, { merge: true });
      }
      count++;
    } catch (e) {
      console.error(`Failed to sync job ${job.id} to cloud:`, e);
    }
  }
  return count;
}

// Force an immediate fetch from Firestore shop_jobs
export async function fetchCloudJobs(): Promise<Job[]> {
  try {
    const snap = await getDocs(collection(db, 'shop_jobs'));
    const cloudJobs: Job[] = [];
    snap.forEach((docSnap) => {
      cloudJobs.push(docSnap.data() as Job);
    });
    if (cloudJobs.length > 0) {
      cloudJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      cachedJobs = cloudJobs;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudJobs));
      window.dispatchEvent(new Event('autoshop_jobs_updated'));
      return cloudJobs;
    }
    return getStoredJobs();
  } catch (err) {
    console.error('Failed to fetch jobs from shop_jobs:', err);
    return getStoredJobs();
  }
}

// Set up real-time listener for Firestore jobs (works without login across PC & phone)
export function setupRealtimeSync(
  onUpdate: (cloudJobs: Job[]) => void,
  userId?: string
): () => void {
  // Listen directly to the shared shop collection
  const jobsCol = collection(db, 'shop_jobs');

  const unsubscribe = onSnapshot(
    jobsCol,
    (snapshot) => {
      if (snapshot.empty) {
        // First time initialization: upload current local jobs so they populate Firestore
        const existing = getStoredJobs();
        if (existing.length > 0) {
          uploadLocalJobsToCloud(userId);
        }
        return;
      }

      const cloudJobs: Job[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Job;
        cloudJobs.push(data);
      });

      // Sort by created_at descending
      cloudJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      cachedJobs = cloudJobs;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudJobs));
      onUpdate(cloudJobs);
    },
    (err) => {
      console.error('Firestore real-time sync notice:', err);
    }
  );

  return unsubscribe;
}
