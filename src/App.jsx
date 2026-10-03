import { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import ToolGroup from './pages/ToolGroup';
import { tools } from './data/tools';

function PageLoading() {
  return (
    <div className="page-loading">
      <span className="spinner" />
      loading tool…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Individual tool pages — specific paths FIRST */}
          {tools.map((tool) => {
            const ToolComponent = tool.component;
            return (
              <Route
                key={tool.id}
                path={tool.path}
                element={
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoading />}>
                      <ToolComponent />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
            );
          })}

          {/* Group pages — /tools/typing, /tools/image (catch leftover) */}
          <Route path="/tools/:groupId" element={<ToolGroup />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}