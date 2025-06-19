// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { routes } from "./routes/routes.jsx";

const App = () => {
  const renderRoute = (route) => {
    if (route.children) {
      return (
        <Route key={route.path} path={route.path} element={route.element}>
          {route.children.map((child) =>
            child.index ? (
              <Route key="index" index element={child.element} />
            ) : (
              <Route
                key={child.path}
                path={child.path}
                element={child.element}
              />
            )
          )}
        </Route>
      );
    }

    return <Route key={route.path} path={route.path} element={route.element} />;
  };

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>{routes.map(renderRoute)}</Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
