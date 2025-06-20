// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { routes } from "./routes/routes.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const App = () => {
  // Recursive function to render routes with proper structure
  const renderRoute = (route, index) => {
    const key = route.path || `route-${index}`;

    if (route.children) {
      return (
        <Route key={key} path={route.path} element={route.element}>
          {route.children.map((child, childIndex) => {
            if (child.index) {
              return (
                <Route key={`${key}-index`} index element={child.element} />
              );
            } else {
              return (
                <Route
                  key={child.path || `${key}-child-${childIndex}`}
                  path={child.path}
                  element={child.element}
                />
              );
            }
          })}
        </Route>
      );
    }

    return <Route key={key} path={route.path} element={route.element} />;
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App min-h-screen bg-gray-50">
            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
                success: {
                  style: {
                    background: "#10B981",
                  },
                },
                error: {
                  style: {
                    background: "#EF4444",
                  },
                },
              }}
            />

            {/* Main Routes */}
            <Routes>{routes.map(renderRoute)}</Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
