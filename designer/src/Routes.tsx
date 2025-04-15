import React from 'react';
import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

import { Home } from './pages/Home';

// Lazy load the designer pages
const Designer = React.lazy(() => import('./pages/designer/Designer'));
const Timeline = React.lazy(() => import('./pages/designer/Timeline'));
const GridGenerator = React.lazy(() => import('./pages/generators/GridGenerator'));
const SvgImporter = React.lazy(() => import('./pages/generators/SvgImporter'));
const ObjImporter = React.lazy(() => import('./pages/generators/ObjImporter'));
const Settings = React.lazy(() => import('./pages/Settings'));

export function AppRoutes() {
  return (
    <RouterRoutes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        
        {/* Designer routes */}
        <Route path="/designer" element={
          <React.Suspense fallback={<div>Loading...</div>}>
            <Designer />
          </React.Suspense>
        } />
        
        <Route path="/timeline" element={
          <React.Suspense fallback={<div>Loading...</div>}>
            <Timeline />
          </React.Suspense>
        } />
        
        {/* Generator routes */}
        <Route path="/generators/grid" element={
          <React.Suspense fallback={<div>Loading...</div>}>
            <GridGenerator />
          </React.Suspense>
        } />
        
        <Route path="/generators/svg" element={
          <React.Suspense fallback={<div>Loading...</div>}>
            <SvgImporter />
          </React.Suspense>
        } />
        
        <Route path="/generators/obj" element={
          <React.Suspense fallback={<div>Loading...</div>}>
            <ObjImporter />
          </React.Suspense>
        } />
        
        <Route path="/settings" element={
          <React.Suspense fallback={<div>Loading...</div>}>
            <Settings />
          </React.Suspense>
        } />
        
        {/* Catch all route - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </RouterRoutes>
  );
} 