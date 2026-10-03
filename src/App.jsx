import { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
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

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}