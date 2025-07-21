import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const uploadToS3 = async (fileContent: Buffer, fileExtension: string) => {
  const fileName = `${uuidv4()}.${fileExtension}`;
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: fileName,
    Body: fileContent,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
    return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
};

export const deleteFilesFromS3 = async () => {
  const bucketName = process.env.AWS_BUCKET_NAME!;
  const logoFileName = 'logo-min.png';

  try {
    const listObjectsParams = {
      Bucket: bucketName,
    };
    const listObjectsCommand = new ListObjectsV2Command(listObjectsParams);
    const listedObjects = await s3.send(listObjectsCommand);

    if (listedObjects.Contents) {
      for (const object of listedObjects.Contents) {
        if (object.Key !== logoFileName) {
          const deleteObjectParams = {
            Bucket: bucketName,
            Key: object.Key,
          };
          const deleteObjectCommand = new DeleteObjectCommand(deleteObjectParams);
          await s3.send(deleteObjectCommand);
          console.log(`Deleted ${object.Key} from S3.`);
        }
      }
    }
  } catch (error) {
    console.error("Error deleting files from S3:", error);
    throw error;
  }
};