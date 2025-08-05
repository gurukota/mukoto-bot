import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { logger } from './logger.js';
import { ExternalAPIError } from './errorHandler.js';

const s3 = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadToS3 = async (
  fileContent: Buffer,
  fileExtension: string
): Promise<string> => {
  const fileName = `${uuidv4()}.${fileExtension}`;
  const params = {
    Bucket: config.AWS_S3_BUCKET,
    Key: fileName,
    Body: fileContent,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
    const s3Url = `https://${params.Bucket}.s3.${config.AWS_REGION}.amazonaws.com/${fileName}`;
    logger.info('File uploaded to S3 successfully', { fileName, s3Url });
    return s3Url;
  } catch (error) {
    logger.error('Error uploading to S3:', { error, fileName });
    throw new ExternalAPIError('AWS S3', 'Failed to upload file');
  }
};

export const deleteFilesFromS3 = async (): Promise<void> => {
  const bucketName = config.AWS_S3_BUCKET;
  const logoFileName = 'logo-min.png';

  try {
    const listObjectsParams = {
      Bucket: bucketName,
    };
    const listObjectsCommand = new ListObjectsV2Command(listObjectsParams);
    const listedObjects = await s3.send(listObjectsCommand);

    if (listedObjects.Contents) {
      let deletedCount = 0;
      for (const object of listedObjects.Contents) {
        if (object.Key !== logoFileName) {
          const deleteObjectParams = {
            Bucket: bucketName,
            Key: object.Key,
          };
          const deleteObjectCommand = new DeleteObjectCommand(
            deleteObjectParams
          );
          await s3.send(deleteObjectCommand);
          logger.debug(`Deleted ${object.Key} from S3`);
          deletedCount++;
        }
      }
      logger.info(`Successfully deleted ${deletedCount} files from S3`);
    } else {
      logger.info('No files found to delete from S3');
    }
  } catch (error) {
    logger.error('Error deleting files from S3:', error);
    throw new ExternalAPIError('AWS S3', 'Failed to delete files');
  }
};
