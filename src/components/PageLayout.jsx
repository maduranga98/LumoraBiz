// src/components/PageLayout.jsx
import React from "react";
import { Link } from "react-router-dom";

const PageLayout = ({ children, title, subtitle, actions }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content Area */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header */}
          {(title || subtitle || actions) && (
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  {title && (
                    <h1 className="text-3xl font-bold text-gray-900">
                      {title}
                    </h1>
                  )}
                  {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
                </div>
                {actions && (
                  <div className="flex items-center space-x-3">{actions}</div>
                )}
              </div>
            </div>
          )}

          {/* Page Content */}
          <div className="space-y-6">{children}</div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} Lumora Ventures Pvt Ltd. All rights
                reserved.
              </p>
            </div>
            <div className="mt-2 md:mt-0 flex items-center space-x-4">
              <Link
                to="/privacy"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to="/terms"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Terms of Service
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to="/support"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Support
              </Link>
              <span className="text-gray-300">|</span>
              <a
                href="mailto:support@lumoraventures.com"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PageLayout;
