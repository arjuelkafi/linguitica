import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
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

function requireActiveUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Silakan masuk akun terlebih dahulu untuk mengakses fitur kelas.');
  }
  return uid;
}

function isNetworkUnavailableError(error: unknown): boolean {
  const errObj = error as { code?: string; message?: string } | null;
  const code = String(errObj?.code || '').toLowerCase();
  const message = String(errObj?.message || '').toLowerCase();
  return (
    code.includes('unavailable') ||
    code.includes('network') ||
    message.includes('client is offline') ||
    message.includes('failed to get document because the client is offline') ||
    message.includes('network error')
  );
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
        currentLevelId: Math.min(8, Math.max(1, stats.currentLevelId)),
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
        currentLevelId: Math.min(8, Math.max(1, stats.currentLevelId)),
        completedLessons: completedBounded,
        unlockedLessons: unlockedBounded,
        updatedAt: serverTimestamp(),
      });
    }

    // Update student progress inside each joined classroom; clean up stale refs if removed
    const joinedSnap = await getDocs(collection(db, 'users', currentUid, 'joinedClasses'));
    if (!joinedSnap.empty) {
      await Promise.all(
        joinedSnap.docs.map(async (joinedDoc) => {
          const classId = joinedDoc.id;
          const memberRef = doc(db, 'classrooms', classId, 'members', currentUid);
          try {
            const memberSnap = await getDoc(memberRef);
            if (!memberSnap.exists()) {
              await deleteDoc(doc(db, 'users', currentUid, 'joinedClasses', classId));
              return;
            }
            await updateDoc(memberRef, {
              studentName: safeName,
              xp: Math.max(0, stats.xp),
              streak: Math.max(0, stats.streak),
              completedLessonsCount: stats.completedLessons.length,
              accuracyRate,
              currentLevelId: Math.min(8, Math.max(1, stats.currentLevelId)),
              updatedAt: serverTimestamp(),
            });
          } catch {
            // Do not crash user progress sync if a single classroom membership was revoked
          }
        })
      );
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
        unlockedLessons:
          Array.isArray(data.unlockedLessons) && data.unlockedLessons.length > 0
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
  const currentUid = requireActiveUid();
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
  const classRef = doc(db, 'classrooms', code);

  try {
    const existingSnap = await getDocFromServer(classRef);
    if (existingSnap.exists()) {
      throw new Error(`Kode kelas ${code} sudah dipakai. Gunakan kode lain.`);
    }
    await setDoc(classRef, {
      code,
      name,
      description,
      ownerId: currentUid,
      ownerName: user.name.trim().slice(0, 80) || 'Guru',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('sudah dipakai')) {
      throw error;
    }
    if (isNetworkUnavailableError(error)) {
      throw new Error('Tidak dapat terhubung ke server kelas. Periksa koneksi internetmu lalu coba lagi.');
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

export async function listTeacherClassrooms(_userId: string): Promise<Classroom[]> {
  const currentUid = requireActiveUid();
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
    if (isNetworkUnavailableError(error)) {
      throw new Error('Tidak dapat memuat daftar kelas. Periksa koneksi internetmu.');
    }
    handleFirestoreError(error, OperationType.LIST, 'classrooms');
  }
}

export async function listClassroomMembers(
  classCode: string,
  _ownerId: string
): Promise<ClassroomMember[]> {
  const currentUid = requireActiveUid();
  const code = normalizeClassCode(classCode);

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
    if (isNetworkUnavailableError(error)) {
      throw new Error('Tidak dapat memuat data murid. Periksa koneksi internetmu.');
    }
    handleFirestoreError(error, OperationType.LIST, `classrooms/${code}/members`);
  }
}

export async function removeStudentFromClassroom(
  classCode: string,
  studentUid: string
): Promise<void> {
  requireActiveUid();
  const code = normalizeClassCode(classCode);

  try {
    await deleteDoc(doc(db, 'classrooms', code, 'members', studentUid));
  } catch (error) {
    if (isNetworkUnavailableError(error)) {
      throw new Error('Tidak dapat mengeluarkan murid. Periksa koneksi internetmu.');
    }
    handleFirestoreError(error, OperationType.DELETE, `classrooms/${code}/members/${studentUid}`);
  }
}

export async function deleteTeacherClassroom(classCode: string): Promise<void> {
  const currentUid = requireActiveUid();
  const code = normalizeClassCode(classCode);

  try {
    const membersQ = query(
      collection(db, 'classrooms', code, 'members'),
      where('ownerId', '==', currentUid)
    );
    const membersSnap = await getDocs(membersQ);
    if (!membersSnap.empty) {
      const batch = writeBatch(db);
      membersSnap.forEach((mDoc) => batch.delete(mDoc.ref));
      await batch.commit();
    }
    await deleteDoc(doc(db, 'classrooms', code));
  } catch (error) {
    if (isNetworkUnavailableError(error)) {
      throw new Error('Tidak dapat menghapus kelas. Periksa koneksi internetmu.');
    }
    handleFirestoreError(error, OperationType.DELETE, `classrooms/${code}`);
  }
}

export async function joinClassroomByCode(
  user: UserProfile,
  stats: UserStats,
  rawCode: string
): Promise<JoinedClassroom> {
  const currentUid = requireActiveUid();
  const code = normalizeClassCode(rawCode);
  if (code.length < 3) {
    throw new Error('Kode kelas minimal 3 karakter huruf atau angka.');
  }

  const accuracyRate = computeOverallAccuracy(
    stats.totalCorrectAnswers,
    stats.totalQuestionsAnswered
  );

  const classRef = doc(db, 'classrooms', code);
  let classData: Record<string, unknown> | null = null;
  try {
    const classSnap = await getDocFromServer(classRef);
    if (!classSnap.exists()) {
      throw new Error(`Kelas dengan kode ${code} tidak ditemukan.`);
    }
    classData = classSnap.data();
  } catch (error) {
    if (error instanceof Error && error.message.includes('tidak ditemukan')) {
      throw error;
    }
    if (isNetworkUnavailableError(error)) {
      throw new Error('Tidak dapat terhubung ke server kelas. Periksa koneksi internetmu lalu coba lagi.');
    }
    handleFirestoreError(error, OperationType.GET, `classrooms/${code}`);
  }

  const ownerId = String(classData?.ownerId || '');
  const className = String(classData?.name || code);
  const teacherName = String(classData?.ownerName || 'Guru');
  const safeStudentName = user.name.trim().slice(0, 80) || 'Murid';
  const clampedLevel = Math.min(8, Math.max(1, stats.currentLevelId));

  try {
    const memberRef = doc(db, 'classrooms', code, 'members', currentUid);
    const joinedRef = doc(db, 'users', currentUid, 'joinedClasses', code);
    const [memberSnap, joinedSnap] = await Promise.all([
      getDocFromServer(memberRef),
      getDocFromServer(joinedRef),
    ]);

    const batch = writeBatch(db);
    if (memberSnap.exists()) {
      batch.update(memberRef, {
        studentName: safeStudentName,
        xp: Math.max(0, stats.xp),
        streak: Math.max(0, stats.streak),
        completedLessonsCount: stats.completedLessons.length,
        accuracyRate,
        currentLevelId: clampedLevel,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(memberRef, {
        userId: currentUid,
        ownerId,
        classId: code,
        studentName: safeStudentName,
        xp: Math.max(0, stats.xp),
        streak: Math.max(0, stats.streak),
        completedLessonsCount: stats.completedLessons.length,
        accuracyRate,
        currentLevelId: clampedLevel,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (!joinedSnap.exists()) {
      batch.set(joinedRef, {
        classId: code,
        userId: currentUid,
        className,
        teacherName,
        joinedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    if (isNetworkUnavailableError(error)) {
      throw new Error('Tidak dapat terhubung ke server kelas. Periksa koneksi internetmu lalu coba lagi.');
    }
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

export async function listStudentJoinedClasses(_userId: string): Promise<JoinedClassroom[]> {
  const currentUid = requireActiveUid();
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
    if (isNetworkUnavailableError(error)) {
      throw new Error('Tidak dapat memuat kelas yang diikuti. Periksa koneksi internetmu.');
    }
    handleFirestoreError(error, OperationType.LIST, `users/${currentUid}/joinedClasses`);
  }
}

export async function leaveStudentClassroom(_userId: string, classCode: string): Promise<void> {
  const currentUid = requireActiveUid();
  const code = normalizeClassCode(classCode);

  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'classrooms', code, 'members', currentUid));
    batch.delete(doc(db, 'users', currentUid, 'joinedClasses', code));
    await batch.commit();
  } catch (error) {
    if (isNetworkUnavailableError(error)) {
      throw new Error('Tidak dapat keluar dari kelas. Periksa koneksi internetmu.');
    }
    handleFirestoreError(error, OperationType.DELETE, `users/${currentUid}/joinedClasses/${code}`);
  }
}
