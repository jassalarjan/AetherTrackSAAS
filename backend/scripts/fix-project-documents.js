import mongoose from 'mongoose';
import Project from '../models/Project.js';
import dotenv from 'dotenv';

dotenv.config();

const fixProjectDocuments = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all projects
    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        let needsUpdate = false;
        
        if (project.documents && Array.isArray(project.documents)) {
          const fixedDocuments = project.documents.map(doc => {
            // If doc is a string (legacy format), convert it
            if (typeof doc === 'string') {
              needsUpdate = true;
              console.log(`  Converting string document: ${doc}`);
              return {
                name: doc,
                url: doc,
                type: '',
                size: 0,
                uploadedAt: new Date()
              };
            }
            
            // If doc is an object but missing required fields
            if (typeof doc === 'object') {
              const hasIssue = !doc.url || doc.url === undefined;
              if (hasIssue) {
                needsUpdate = true;
                console.log(`  Fixing malformed document in project: ${project.name}`);
                console.log(`    Original:`, doc);
              }
              
              return {
                name: doc.name || 'Unknown Document',
                url: doc.url || '',
                type: doc.type || '',
                size: doc.size || 0,
                uploadedAt: doc.uploadedAt || new Date(),
                uploadedBy: doc.uploadedBy || null
              };
            }
            
            return doc;
          });

          if (needsUpdate) {
            project.documents = fixedDocuments;
            await project.save();
            fixedCount++;
            console.log(`✓ Fixed project: ${project.name} (${project._id})`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error fixing project ${project._id}:`, error.message);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total projects: ${projects.length}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`No changes needed: ${projects.length - fixedCount - errorCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

fixProjectDocuments();
