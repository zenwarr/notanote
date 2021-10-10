import { initTestBackend } from '../client/backend/TestBackend';
import { configure } from 'mobx';
import { AppThemeProvider } from '../client/Theme';


configure({
  enforceActions: "never"
});


export const decorators = [
  (Story) => {
    initTestBackend();
    return <AppThemeProvider>
      <Story/>
    </AppThemeProvider>
  }
]

export const parameters = {
  layout: 'fullscreen',
};
