import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  Classroom,
  ClassroomMember,
  JoinedClassroom,
  UserProfile,
  UserStats,
} from '../types';
import { computeOverallAccuracy, normalizeClassCode } from '../utils/gameLogic';

const LOCAL_CLASSROOMS_KEY = 'linguitica_local_classrooms_v1';
const LOCAL_MEMBERS_KEY = 'linguitica_local_members_v1';
const LOCAL_JOINED_KEY = 'linguitica_local_joined_v1';

// Helper to safely read/write local fallback stores
function readLocalMap<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalMap<T>(key: string, data: Record<string, T>): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

export function isFirebaseAuthActive(): boolean {
  return Boolean(auth.currentUser);
}

// Sync User Document & Joined Class Progress to Firestore
export async function syncUserProgressToCloud(
  user: UserProfile,
  stats: UserStats
): Promise<boolean> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return false;

  const accuracyRate = computeOverallAccuracy(
    stats.totalCorrectAnswers,
    stats.totalQuestionsAnswered
  );

  const userRef = doc(db, 'users', currentUid);
  const completedBounded = stats.completedLessons.slice(0, 100);
  const unlockedBounded = stats.unlockedLessons.slice(0, 100);

  const safeName = user.name.trim().slice(0, 80) || 'Learner';
  const safeUsername = user.username.trim().slice(0, 60) || 'learner';

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: currentUid,
        name: safeName,
        username: safeUsername,
        role: user.role,
        xp: Math.max(0, stats.xp),
        coins: Math.max(0, stats.coins),
        hearts: Math.min(5, Math.max(0, stats.hearts)),
        streak: Math.max(0, stats.streak),
        longestStreak: Math.max(0, stats.longestStreak),
        lastActiveDate: (stats.lastActiveDate || '').slice(0, 20),
        completedLessonsCount: stats.completedLessons.length,
        accuracyRate,
        currentLevelId: Math.min(5, Math.max(1, stats.currentLevelId)),
        completedLessons: completedBounded,
        unlockedLessons: unlockedBounded,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        name: safeName,
        username: safeUsername,
        role: user.role,
        xp: Math.max(0, stats.xp),
        coins: Math.max(0, stats.coins),
        hearts: Math.min(5, Math.max(0, stats.hearts)),
        streak: Math.max(0, stats.streak),
        longestStreak: Math.max(0, stats.longestStreak),
        lastActiveDate: (stats.lastActiveDate || '').slice(0, 20),
        completedLessonsCount: stats.completedLessons.length,
        accuracyRate,
        currentLevelId: Math.min(5, Math.max(1, stats.currentLevelId)),
        completedLessons: completedBounded,
        unlockedLessons: unlockedBounded,
        updatedAt: serverTimestamp(),
      });
    }

    // Also update student progress inside all joined classrooms
    const joinedSnap = await getDocs(collection(db, 'users', currentUid, 'joinedClasses'));
    if (!joinedSnap.empty) {
      const batch = writeBatch(db);
      joinedSnap.forEach((joinedDoc) => {
        const classId = joinedDoc.id;
        const memberRef = doc(db, 'classrooms', classId, 'members', currentUid);
        batch.update(memberRef, {
          studentName: safeName,
          xp: Math.max(0, stats.xp),
          streak: Math.max(0, stats.streak),
          completedLessonsCount: stats.completedLessons.length,
          accuracyRate,
          currentLevelId: Math.min(5, Math.max(1, stats.currentLevelId)),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${currentUid}`);
  }
}

export async function fetchUserFromCloud(uid: string): Promise<{
  profilePartial?: Partial<UserProfile>;
  statsPartial?: Partial<UserStats>;
} | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      profilePartial: {
        name: data.name,
        username: data.username,
        role: data.role,
        isCloudSynced: true,
      },
      statsPartial: {
        xp: typeof data.xp === 'number' ? data.xp : 0,
        coins: typeof data.coins === 'number' ? data.coins : 50,
        hearts: typeof data.hearts === 'number' ? data.hearts : 5,
        streak: typeof data.streak === 'number' ? data.streak : 0,
        longestStreak: typeof data.longestStreak === 'number' ? data.longestStreak : 0,
        lastActiveDate: data.lastActiveDate || '',
        currentLevelId: typeof data.currentLevelId === 'number' ? data.currentLevelId : 1,
        completedLessons: Array.isArray(data.completedLessons) ? data.completedLessons : [],
        unlockedLessons: Array.isArray(data.unlockedLessons) && data.unlockedLessons.length > 0
          ? data.unlockedLessons
          : ['l1-1-1'],
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

// Create Classroom (Teacher/Admin)
export async function createClassroomRecord(
  user: UserProfile,
  rawName: string,
  rawCode: string,
  rawDesc: string
): Promise<Classroom> {
  const code = normalizeClassCode(rawCode);
  const name = rawName.trim().slice(0, 100);
  const description = rawDesc.trim().slice(0, 200);

  if (code.length < 3) {
    throw new Error('Kode kelas minimal 3 karakter huruf atau angka.');
  }
  if (name.length < 2) {
    throw new Error('Nama kelas minimal 2 karakter.');
  }

  const nowIso = new Date().toISOString();
  const currentUid = auth.currentUser?.uid;

  if (currentUid) {
    const classRef = doc(db, 'classrooms', code);
    try {
      const existingSnap = await getDoc(classRef);
      if (existingSnap.exists()) {
        throw new Error(`Kode kelas ${code} sudah dipakai. Gunakan kode lain.`);
      }
      await setDoc(classRef, {
        code,
        name,
        description,
        ownerId: currentUid,
        ownerName: user.name.trim().slice(0, 80),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('sudah dipakai')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.CREATE, `classrooms/${code}`);
    }

    return {
      code,
      name,
      description,
      ownerId: currentUid,
      ownerName: user.name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  // Local fallback if user has not connected Firebase Auth yet
  const localMap = readLocalMap<Classroom>(LOCAL_CLASSROOMS_KEY);
  if (localMap[code]) {
    throw new Error(`Kode kelas ${code} sudah ada di perangkat ini.`);
  }
  const newClass: Classroom = {
    code,
    name,
    description,
    ownerId: user.id,
    ownerName: user.name,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  localMap[code] = newClass;
  writeLocalMap(LOCAL_CLASSROOMS_KEY, localMap);
  return newClass;
}

export async function listTeacherClassrooms(userId: string): Promise<Classroom[]> {
  const currentUid = auth.currentUser?.uid;
  if (currentUid) {
    try {
      const q = query(collection(db, 'classrooms'), where('ownerId', '==', currentUid));
      const snap = await getDocs(q);
      const list: Classroom[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          code: d.code,
          name: d.name,
          description: d.description || '',
          ownerId: d.ownerId,
          ownerName: d.ownerName,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString(),
        });
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'classrooms');
    }
  }

  const localMap = readLocalMap<Classroom>(LOCAL_CLASSROOMS_KEY);
  return Object.values(localMap).filter((c) => c.ownerId === userId);
}

export async function listClassroomMembers(
  classCode: string,
  ownerId: string
): Promise<ClassroomMember[]> {
  const code = normalizeClassCode(classCode);
  const currentUid = auth.currentUser?.uid;

  if (currentUid) {
    try {
      const q = query(
        collection(db, 'classrooms', code, 'members'),
        where('ownerId', '==', currentUid)
      );
      const snap = await getDocs(q);
      const members: ClassroomMember[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        members.push({
          userId: d.userId,
          ownerId: d.ownerId,
          classId: d.classId,
          studentName: d.studentName,
          xp: d.xp || 0,
          streak: d.streak || 0,
          completedLessonsCount: d.completedLessonsCount || 0,
          accuracyRate: d.accuracyRate || 0,
          currentLevelId: d.currentLevelId || 1,
          joinedAt: d.joinedAt?.toDate ? d.joinedAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString(),
        });
      });
      return members.sort((a, b) => b.xp - a.xp);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `classrooms/${code}/members`);
    }
  }

  const localMembers = readLocalMap<Record<string, ClassroomMember>>(LOCAL_MEMBERS_KEY);
  const classRoster = localMembers[code] || {};
  return Object.values(classRoster)
    .filter((m) => m.ownerId === ownerId)
    .sort((a, b) => b.xp - a.xp);
}

export async function removeStudentFromClassroom(
  classCode: string,
  studentUid: string
): Promise<void> {
  const code = normalizeClassCode(classCode);
  const currentUid = auth.currentUser?.uid;

  if (currentUid) {
    try {
      await deleteDoc(doc(db, 'classrooms', code, 'members', studentUid));
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `classrooms/${code}/members/${studentUid}`);
    }
  }

  const localMembers = readLocalMap<Record<string, ClassroomMember>>(LOCAL_MEMBERS_KEY);
  if (localMembers[code]) {
    delete localMembers[code][studentUid];
    writeLocalMap(LOCAL_MEMBERS_KEY, localMembers);
  }
}

export async function deleteTeacherClassroom(classCode: string): Promise<void> {
  const code = normalizeClassCode(classCode);
  const currentUid = auth.currentUser?.uid;

  if (currentUid) {
    try {
      await deleteDoc(doc(db, 'classrooms', code));
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `classrooms/${code}`);
    }
  }

  const localMap = readLocalMap<Classroom>(LOCAL_CLASSROOMS_KEY);
  delete localMap[code];
  writeLocalMap(LOCAL_CLASSROOMS_KEY, localMap);
}

export async function joinClassroomByCode(
  user: UserProfile,
  stats: UserStats,
  rawCode: string
): Promise<JoinedClassroom> {
  const code = normalizeClassCode(rawCode);
  if (code.length < 3) {
    throw new Error('Kode kelas tidak valid.');
  }

  const accuracyRate = computeOverallAccuracy(
    stats.totalCorrectAnswers,
    stats.totalQuestionsAnswered
  );
  const currentUid = auth.currentUser?.uid;

  if (currentUid) {
    const classRef = doc(db, 'classrooms', code);
    let classData: Record<string, unknown> | null = null;
    try {
      const classSnap = await getDoc(classRef);
      if (!classSnap.exists()) {
        throw new Error(`Kelas dengan kode ${code} tidak ditemukan.`);
      }
      classData = classSnap.data();
    } catch (error) {
      if (error instanceof Error && error.message.includes('tidak ditemukan')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.GET, `classrooms/${code}`);
    }

    const ownerId = String(classData?.ownerId || '');
    const className = String(classData?.name || code);
    const teacherName = String(classData?.ownerName || 'Guru');

    try {
      const batch = writeBatch(db);
      const memberRef = doc(db, 'classrooms', code, 'members', currentUid);
      batch.set(memberRef, {
        userId: currentUid,
        ownerId,
        classId: code,
        studentName: user.name.trim().slice(0, 80),
        xp: Math.max(0, stats.xp),
        streak: Math.max(0, stats.streak),
        completedLessonsCount: stats.completedLessons.length,
        accuracyRate,
        currentLevelId: Math.min(5, Math.max(1, stats.currentLevelId)),
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const joinedRef = doc(db, 'users', currentUid, 'joinedClasses', code);
      batch.set(joinedRef, {
        classId: code,
        userId: currentUid,
        className,
        teacherName,
        joinedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `classrooms/${code}/members/${currentUid}`);
    }

    return {
      classId: code,
      userId: currentUid,
      className,
      teacherName,
      joinedAt: new Date().toISOString(),
    };
  }

  // Local fallback
  const localClasses = readLocalMap<Classroom>(LOCAL_CLASSROOMS_KEY);
  const targetClass = localClasses[code];
  if (!targetClass) {
    throw new Error(`Kelas dengan kode ${code} tidak ditemukan.`);
  }

  const nowIso = new Date().toISOString();
  const localMembers = readLocalMap<Record<string, ClassroomMember>>(LOCAL_MEMBERS_KEY);
  if (!localMembers[code]) localMembers[code] = {};
  localMembers[code][user.id] = {
    userId: user.id,
    ownerId: targetClass.ownerId,
    classId: code,
    studentName: user.name,
    xp: stats.xp,
    streak: stats.streak,
    completedLessonsCount: stats.completedLessons.length,
    accuracyRate,
    currentLevelId: stats.currentLevelId,
    joinedAt: nowIso,
    updatedAt: nowIso,
  };
  writeLocalMap(LOCAL_MEMBERS_KEY, localMembers);

  const localJoined = readLocalMap<Record<string, JoinedClassroom>>(LOCAL_JOINED_KEY);
  if (!localJoined[user.id]) localJoined[user.id] = {};
  const joinedRecord: JoinedClassroom = {
    classId: code,
    userId: user.id,
    className: targetClass.name,
    teacherName: targetClass.ownerName,
    joinedAt: nowIso,
  };
  localJoined[user.id][code] = joinedRecord;
  writeLocalMap(LOCAL_JOINED_KEY, localJoined);

  return joinedRecord;
}

export async function listStudentJoinedClasses(userId: string): Promise<JoinedClassroom[]> {
  const currentUid = auth.currentUser?.uid;
  if (currentUid) {
    try {
      const snap = await getDocs(collection(db, 'users', currentUid, 'joinedClasses'));
      const list: JoinedClassroom[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          classId: d.classId,
          userId: d.userId,
          className: d.className,
          teacherName: d.teacherName,
          joinedAt: d.joinedAt?.toDate ? d.joinedAt.toDate().toISOString() : new Date().toISOString(),
        });
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${currentUid}/joinedClasses`);
    }
  }

  const localJoined = readLocalMap<Record<string, JoinedClassroom>>(LOCAL_JOINED_KEY);
  return Object.values(localJoined[userId] || {});
}

export async function leaveStudentClassroom(userId: string, classCode: string): Promise<void> {
  const code = normalizeClassCode(classCode);
  const currentUid = auth.currentUser?.uid;

  if (currentUid) {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'classrooms', code, 'members', currentUid));
      batch.delete(doc(db, 'users', currentUid, 'joinedClasses', code));
      await batch.commit();
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${currentUid}/joinedClasses/${code}`);
    }
  }

  const localMembers = readLocalMap<Record<string, ClassroomMember>>(LOCAL_MEMBERS_KEY);
  if (localMembers[code]) {
    delete localMembers[code][userId];
    writeLocalMap(LOCAL_MEMBERS_KEY, localMembers);
  }
  const localJoined = readLocalMap<Record<string, JoinedClassroom>>(LOCAL_JOINED_KEY);
  if (localJoined[userId]) {
    delete localJoined[userId][code];
    writeLocalMap(LOCAL_JOINED_KEY, localJoined);
  }
}

export function syncLocalJoinedMembershipProgress(user: UserProfile, stats: UserStats): void {
  if (auth.currentUser) return;
  const accuracyRate = computeOverallAccuracy(
    stats.totalCorrectAnswers,
    stats.totalQuestionsAnswered
  );
  const localJoined = readLocalMap<Record<string, JoinedClassroom>>(LOCAL_JOINED_KEY);
  const userJoined = Object.keys(localJoined[user.id] || {});
  if (userJoined.length === 0) return;

  const localMembers = readLocalMap<Record<string, ClassroomMember>>(LOCAL_MEMBERS_KEY);
  for (const code of userJoined) {
    if (localMembers[code] && localMembers[code][user.id]) {
      localMembers[code][user.id] = {
        ...localMembers[code][user.id],
        studentName: user.name,
        xp: stats.xp,
        streak: stats.streak,
        completedLessonsCount: stats.completedLessons.length,
        accuracyRate,
        currentLevelId: stats.currentLevelId,
        updatedAt: new Date().toISOString(),
      };
    }
  }
  writeLocalMap(LOCAL_MEMBERS_KEY, localMembers);
}
