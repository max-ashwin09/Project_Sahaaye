import { Queue, Worker } from 'bullmq';

export const mediaQueue = new Queue('media-processing', {
  connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 },
});

export const mediaWorker = new Worker('media-processing', async (job) => {
  console.log(`Processing media job ${job.id}: Stripping EXIF, blurring faces...`);
  // Connect to internal ai-services container
}, { connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 } });
