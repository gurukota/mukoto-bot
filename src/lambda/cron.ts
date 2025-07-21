import { deleteFilesFromS3 } from '../../src/utils/s3.js';

export const handler = async () => {
  try {
    await deleteFilesFromS3();
    console.log('Successfully deleted files from S3.');
  } catch (error) {
    console.error('Error deleting files from S3:', error);
  }
};