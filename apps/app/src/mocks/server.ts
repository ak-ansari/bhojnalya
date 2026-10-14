// MSW at the HTTP boundary for component tests. A request with no handler
// fails the test, so a screen that calls the network unexpectedly is caught.
import { setupServer } from 'msw/node';

import { handlers } from './handlers';

export const server = setupServer(...handlers);
