/**
 * Content Index Migration Script
 *
 * Creates a `content_index` Firestore collection that maps child content IDs
 * (chapters, tracks, course sessions) to their parent documents.
 *
 * This eliminates N+1 queries — instead of fetching ALL series/albums to find
 * one chapter/track, we do a single doc read from content_index.
 *
 * Usage:
 *   node scripts/migrateContentIndex.js              # Run migration
 *   node scripts/migrateContentIndex.js --dry-run    # Preview without writing
 *
 * Prerequisites:
 * - serviceAccountKey.json in the project root
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: serviceAccountKey.json not found in project root.');
  console.error('Download it from Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const dryRun = process.argv.includes('--dry-run');

async function migrateContentIndex() {
  console.log(dryRun ? '=== DRY RUN (no writes) ===' : '=== Migrating content_index ===');

  const batch = db.batch();
  let count = 0;

  // 1. Index series chapters
  console.log('\nProcessing series...');
  const seriesSnapshot = await db.collection('series').get();
  for (const seriesDoc of seriesSnapshot.docs) {
    const series = seriesDoc.data();
    const chapters = series.chapters || [];
    for (const chapter of chapters) {
      if (!chapter.id) continue;
      const indexDoc = {
        contentType: 'series_chapter',
        parentId: seriesDoc.id,
        parentCollection: 'series',
        parentTitle: series.title,
        parentThumbnailUrl: series.thumbnailUrl || null,
        contentTitle: chapter.title,
        duration_minutes: chapter.duration_minutes || 0,
      };
      console.log(`  [chapter] ${chapter.id} -> series/${seriesDoc.id} (${series.title}: ${chapter.title})`);
      if (!dryRun) {
        batch.set(db.collection('content_index').doc(chapter.id), indexDoc);
      }
      count++;
    }
  }

  // 2. Index album tracks
  console.log('\nProcessing albums...');
  const albumsSnapshot = await db.collection('albums').get();
  for (const albumDoc of albumsSnapshot.docs) {
    const album = albumDoc.data();
    const tracks = album.tracks || [];
    for (const track of tracks) {
      if (!track.id) continue;
      const indexDoc = {
        contentType: 'album_track',
        parentId: albumDoc.id,
        parentCollection: 'albums',
        parentTitle: album.title,
        parentThumbnailUrl: album.thumbnailUrl || null,
        contentTitle: track.title,
        duration_minutes: track.duration_minutes || 0,
      };
      console.log(`  [track] ${track.id} -> albums/${albumDoc.id} (${album.title}: ${track.title})`);
      if (!dryRun) {
        batch.set(db.collection('content_index').doc(track.id), indexDoc);
      }
      count++;
    }
  }

  // 3. Index course sessions (already have courseId, but index for consistency)
  console.log('\nProcessing courses...');
  const coursesSnapshot = await db.collection('courses').get();
  for (const courseDoc of coursesSnapshot.docs) {
    const course = courseDoc.data();
    // Sessions are loaded on-demand via getCourseById, check course_sessions subcollection
    const sessionsSnapshot = await db.collection('courses').doc(courseDoc.id).collection('sessions').get();
    for (const sessionDoc of sessionsSnapshot.docs) {
      const session = sessionDoc.data();
      const indexDoc = {
        contentType: 'course_session',
        parentId: courseDoc.id,
        parentCollection: 'courses',
        parentTitle: course.title,
        parentThumbnailUrl: course.thumbnailUrl || null,
        contentTitle: session.title,
        duration_minutes: session.duration_minutes || 0,
        courseCode: course.code || null,
        sessionCode: session.code || null,
      };
      console.log(`  [session] ${sessionDoc.id} -> courses/${courseDoc.id} (${course.title}: ${session.title})`);
      if (!dryRun) {
        batch.set(db.collection('content_index').doc(sessionDoc.id), indexDoc);
      }
      count++;
    }
  }

  if (!dryRun && count > 0) {
    console.log(`\nCommitting ${count} documents...`);
    await batch.commit();
    console.log('Done!');
  } else {
    console.log(`\n${count} documents would be written.`);
  }

  // 4. Also backfill legacy favorites with denormalized data
  console.log('\n=== Backfilling legacy favorites ===');
  let backfillCount = 0;
  const favoritesSnapshot = await db.collection('user_favorites').get();
  const backfillBatch = db.batch();

  for (const favDoc of favoritesSnapshot.docs) {
    const fav = favDoc.data();
    // Skip if already has denormalized title
    if (fav.title) continue;

    const contentId = fav.content_id;
    const contentType = fav.content_type;
    if (!contentId || !contentType) continue;

    // Look up in the index we just built (or read from Firestore)
    let resolved = null;

    if (['series_chapter', 'album_track', 'course_session'].includes(contentType)) {
      const indexDoc = await db.collection('content_index').doc(contentId).get();
      if (indexDoc.exists) {
        const data = indexDoc.data();
        resolved = {
          title: `${data.parentTitle}: ${data.contentTitle}`,
          thumbnail_url: data.parentThumbnailUrl,
          duration_minutes: data.duration_minutes,
          course_code: data.courseCode || null,
          session_code: data.sessionCode || null,
        };
      }
    } else {
      // Direct collection lookup for standalone content types
      const collectionMap = {
        meditation: 'guided_meditations',
        bedtime_story: 'bedtime_stories',
        breathing_exercise: 'breathing_exercises',
        nature_sound: 'sleep_sounds',
        emergency: 'emergency_meditations',
        sleep_meditation: 'sleep_meditations',
      };
      const collName = collectionMap[contentType];
      if (collName) {
        const contentDoc = await db.collection(collName).doc(contentId).get();
        if (contentDoc.exists) {
          const data = contentDoc.data();
          resolved = {
            title: data.title || data.name || 'Untitled',
            thumbnail_url: data.thumbnail_url || data.thumbnailUrl || null,
            duration_minutes: data.duration_minutes || 0,
          };
        }
      }
    }

    if (resolved) {
      console.log(`  Backfilling favorite ${favDoc.id}: ${resolved.title}`);
      if (!dryRun) {
        backfillBatch.update(favDoc.ref, resolved);
      }
      backfillCount++;
    }
  }

  if (!dryRun && backfillCount > 0) {
    console.log(`\nCommitting ${backfillCount} favorite backfills...`);
    await backfillBatch.commit();
    console.log('Done!');
  } else {
    console.log(`\n${backfillCount} favorites would be backfilled.`);
  }

  console.log(`\nSummary: ${count} index docs, ${backfillCount} favorites backfilled.`);
}

migrateContentIndex().catch(console.error);
