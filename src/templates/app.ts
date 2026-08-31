/**
 * Saola Application Entry Point
 * 
 * This file initializes the Saola application and registers all views.
 * Import and use views from the auto-generated views.ts registry.
 */

import { app, Application } from '@saolabs/client';
import views from './views.js';

// Get Application instance
const App: Application = app('App') as Application;

// Register all views from the combined registry
App.View.setViewRegistry(views);

// Export for use in other modules
export { App, views };
export default App;
