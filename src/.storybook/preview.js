import { initTestBackend } from '../client/backend/TestBackend';
import { CssBaseline } from '@material-ui/core';


export const decorators = [
  (Story) => {
    initTestBackend();
    return <>
      <CssBaseline/>
      <Story/>
    </>
  }
]

export const parameters = {
  layout: 'fullscreen',
};
