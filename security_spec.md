# Security Specification for Linguitica Firestore Rules

## 1. Data Invariants
1. **User Isolation**: Only the authenticated user matching `{userId}` may read, create, or update `/users/{userId}` and `/users/{userId}/joinedClasses/{classId}`.
2. **Classroom Ownership**: Every `/classrooms/{classId}` document must have `ownerId == request.auth.uid` on creation, and `ownerId`, `code`, and `createdAt` are immutable thereafter.
3. **Classroom Membership Sync**: A `/classrooms/{classId}/members/{memberId}` document cannot exist without an existing parent `/classrooms/{classId}`, and its `ownerId` must match the parent classroom's `ownerId`.
4. **Teacher Visibility & Student Isolation**: Only the classroom's `ownerId` (teacher/admin) or the member themselves (`userId == request.auth.uid`) may read or list `/classrooms/{classId}/members`.
5. **Strict Schema & Bounds**: Every string has explicit `.size()` bounds, IDs match `^[a-zA-Z0-9_-]+$`, arrays have bounded sizes, and timestamps use `request.time`.

## 2. The "Dirty Dozen" Attack Payloads
1. Unauthenticated read/write to `/users/user1`. -> Expect PERMISSION_DENIED.
2. User A trying to read or overwrite `/users/userB`. -> Expect PERMISSION_DENIED.
3. Shadow field injection on `/users/{uid}` (e.g., adding `isAdmin: true`). -> Expect PERMISSION_DENIED.
4. Client-spoofed `createdAt` or `updatedAt` timestamp instead of `request.time`. -> Expect PERMISSION_DENIED.
5. Oversized `name` (> 80 chars) on `/users/{uid}`. -> Expect PERMISSION_DENIED.
6. Creating a classroom `/classrooms/ENG101` with `ownerId` set to another UID. -> Expect PERMISSION_DENIED.
7. Non-owner attempting to update or delete `/classrooms/ENG101`. -> Expect PERMISSION_DENIED.
8. Attempt to mutate immutable `ownerId` or `code` during classroom update. -> Expect PERMISSION_DENIED.
9. Creating a `/classrooms/NONEXISTENT/members/{uid}` orphaned member record. -> Expect PERMISSION_DENIED.
10. Creating a classroom member record with mismatched `ownerId` compared to parent classroom. -> Expect PERMISSION_DENIED.
11. Student A attempting to update or delete Student B's `/classrooms/ENG101/members/studentB` document. -> Expect PERMISSION_DENIED.
12. Blanket `list` query on `/classrooms` without filtering by `ownerId == request.auth.uid`. -> Expect PERMISSION_DENIED.
