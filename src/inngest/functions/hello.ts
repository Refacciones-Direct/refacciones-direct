import { inngest } from '@/inngest/client';

export const helloWorld = inngest.createFunction(
  { id: 'hello-world' },
  { event: 'test/hello' },
  async ({ event, step }) => {
    const greeting = await step.run('create-greeting', async () => {
      return `Hello, ${event.data.message}!`;
    });

    await step.sleep('brief-pause', '1s');

    const result = await step.run('finalize', async () => {
      return { greeting, timestamp: new Date().toISOString() };
    });

    return result;
  },
);
