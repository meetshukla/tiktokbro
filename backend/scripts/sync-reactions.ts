/**
 * Sync Reactions Library Script
 * 
 * Scans the reactions-library folder and syncs with MongoDB.
 * Run with: npx ts-node scripts/sync-reactions.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Reaction } from '../src/models/reaction.model';

const REACTIONS_DIR = path.join(__dirname, '..', 'reactions-library');

interface ReactionFolder {
  folderName: string;
  videoFile: string | null;
  firstFrameFile: string | null;
}

async function scanReactionsFolder(): Promise<ReactionFolder[]> {
  if (!fs.existsSync(REACTIONS_DIR)) {
    console.log(`Creating reactions-library folder at: ${REACTIONS_DIR}`);
    fs.mkdirSync(REACTIONS_DIR, { recursive: true });
    return [];
  }

  const folders = fs.readdirSync(REACTIONS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const folderPath = path.join(REACTIONS_DIR, dirent.name);
      const files = fs.readdirSync(folderPath);
      
      // Find video file (mp4, mov, webm)
      const videoFile = files.find(f => 
        /^video\.(mp4|mov|webm)$/i.test(f)
      ) || null;
      
      // Find first frame (jpg, png)
      const firstFrameFile = files.find(f => 
        /^first-frame\.(jpg|jpeg|png)$/i.test(f)
      ) || null;
      
      return {
        folderName: dirent.name,
        videoFile,
        firstFrameFile,
      };
    });

  return folders;
}

function formatName(folderName: string): string {
  // Convert folder-name or folder_name to "Folder Name"
  return folderName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

async function syncReactions() {
  console.log('🔄 Syncing reactions library with MongoDB...\n');

  await connectDatabase();

  const folders = await scanReactionsFolder();
  
  if (folders.length === 0) {
    console.log('📁 No folders found in reactions-library/');
    console.log('   Add folders with video.mp4 and first-frame.jpg files');
    await disconnectDatabase();
    return;
  }

  let added = 0;
  let skipped = 0;
  let invalid = 0;

  for (const folder of folders) {
    // Check if folder has required files
    if (!folder.videoFile || !folder.firstFrameFile) {
      console.log(`⚠️  ${folder.folderName}: Missing files`);
      if (!folder.videoFile) console.log('      - Missing video.(mp4|mov|webm)');
      if (!folder.firstFrameFile) console.log('      - Missing first-frame.(jpg|png)');
      invalid++;
      continue;
    }

    // Check if already exists in DB
    const existing = await Reaction.findOne({ reactionId: folder.folderName });
    if (existing) {
      console.log(`⏭️  ${folder.folderName}: Already in database`);
      skipped++;
      continue;
    }

    // Add to database with actual file names
    const reaction = new Reaction({
      reactionId: folder.folderName,
      name: formatName(folder.folderName),
      category: 'uncategorized', // Default category
      videoUrl: `/reactions-library/${folder.folderName}/${folder.videoFile}`,
      firstFrameUrl: `/reactions-library/${folder.folderName}/${folder.firstFrameFile}`,
      duration: 5, // Default duration - you can update manually
    });

    await reaction.save();
    console.log(`✅ ${folder.folderName}: Added to database`);
    added++;
  }

  console.log('\n📊 Sync complete:');
  console.log(`   Added: ${added}`);
  console.log(`   Skipped (already exists): ${skipped}`);
  console.log(`   Invalid (missing files): ${invalid}`);

  await disconnectDatabase();
}

// Run the sync
syncReactions().catch(err => {
  console.error('Error syncing reactions:', err);
  process.exit(1);
});
