import { EventSchemas, Inngest } from 'inngest';

type Events = {
  'test/hello': {
    data: {
      message: string;
    };
  };
};

export const inngest = new Inngest({
  id: 'refaccionesdirect',
  schemas: new EventSchemas().fromRecord<Events>(),
});
