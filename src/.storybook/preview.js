import { initTestBackend } from '../client/backend/TestBackend';


export const decorators = [
  (Story) => {
    initTestBackend();
    return <Story />
  }
]
